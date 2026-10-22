import type { CreditApi } from './creditApi'
import type { Application, ApiProblem, CreateApplicationRequest } from '../types/api'
import { mockCompanies, mockProducts, purposeTitles } from './mockData'

const storageKey = 'alfacredit.demo.applications.v1'

interface MockOptions {
  storage: Storage
  delayMs?: number
  idFactory?: () => string
  now?: () => string
  failCreate?: boolean
}

const problem = (status: number, title: string, errors?: Record<string, string[]>): ApiProblem => ({
  title, status, ...(errors ? { errors } : {}),
})

export function createMockCreditApi(options: MockOptions): CreditApi {
  const pause = () => new Promise<void>((resolve) => setTimeout(resolve, options.delayMs ?? 350))
  const idFactory = options.idFactory ?? (() => crypto.randomUUID())
  const now = options.now ?? (() => new Date().toISOString())

  const readAll = (): Application[] => {
    try {
      const raw = options.storage.getItem(storageKey)
      return raw ? JSON.parse(raw) as Application[] : []
    } catch {
      throw problem(500, 'Не удалось прочитать демо-заявки из браузера.')
    }
  }

  const saveAll = (applications: Application[]) => {
    try {
      options.storage.setItem(storageKey, JSON.stringify(applications))
    } catch {
      throw problem(500, 'Не удалось сохранить демо-заявку в браузере.')
    }
  }

  const changeApplication = async (id: string, action: 'acceptOffer' | 'declineOffer' | 'cancel') => {
    await pause()
    const applications = readAll()
    const index = applications.findIndex((item) => item.id === id)
    if (index < 0) throw problem(404, 'Заявка не найдена.')
    const current = applications[index]
    if (!current.availableActions.includes(action) ||
      (action !== 'cancel' && (current.offer?.response !== 'Pending' || new Date(current.offer.expiresAt).getTime() <= Date.now()))) {
      throw problem(409, 'Это действие больше недоступно. Обновите заявку.')
    }
    const timestamp = now()
    const code = action === 'cancel' ? 'Cancelled' : action === 'acceptOffer' ? 'ContractSigning' : 'OfferDeclined'
    const title = action === 'cancel' ? 'Отменена' : action === 'acceptOffer' ? 'Предложение принято' : 'Предложение отклонено'
    const updated: Application = {
      ...current,
      status: { ...current.status, code, title, description: title, clientNextAction: action === 'acceptOffer' ? 'Ожидайте подготовки договора.' : 'Действие сохранено.', isTerminal: action !== 'acceptOffer' },
      offer: current.offer ? { ...current.offer, response: action === 'cancel' ? current.offer.response : action === 'acceptOffer' ? 'Accepted' : 'Declined', respondedAt: action === 'cancel' ? current.offer.respondedAt : timestamp } : null,
      availableActions: [], updatedAt: timestamp,
      history: [...current.history, { fromStatus: current.status.code, toStatus: code, toStatusTitle: title, actor: 'Client', actorUserId: current.createdByUserId, comment: title, occurredAt: timestamp }],
    }
    applications[index] = updated
    saveAll(applications)
    return updated
  }

  return {
    async getProducts() {
      await pause()
      return mockProducts
    },
    async getCompanies() {
      await pause()
      return mockCompanies
    },
    async createApplication(request: CreateApplicationRequest) {
      await pause()
      if (options.failCreate) throw problem(503, 'Демо-сервис временно недоступен.')

      const company = mockCompanies.find((item) => item.id === request.companyId)
      const product = mockProducts.find((item) => item.code === request.productCode)
      const errors: Record<string, string[]> = {}
      if (!company) errors.companyId = ['Выберите компанию из списка.']
      if (!product) errors.productCode = ['Выберите продукт из списка.']
      if (!Number.isFinite(request.amount) || request.amount <= 0 ||
        (product && (request.amount < product.minAmount || request.amount > product.maxAmount))) {
        errors.amount = ['Сумма не соответствует условиям продукта.']
      }
      if (!Number.isInteger(request.termMonths) || request.termMonths < 1 || request.termMonths > 120 ||
        (product && (request.termMonths < product.minTermMonths || request.termMonths > product.maxTermMonths))) {
        errors.termMonths = ['Срок не соответствует условиям продукта.']
      }
      if (!request.purpose || (product && !product.allowedPurposes.some(({ code }) => code === request.purpose))) {
        errors.purpose = ['Цель недоступна для этого продукта.']
      }
      if (Object.keys(errors).length) throw problem(400, 'Ошибка валидации', errors)

      const applications = readAll()
      const id = idFactory()
      const timestamp = now()
      const number = `AC-${String(applications.length + 1).padStart(6, '0')}`
      const application: Application = {
        id, number,
        status: {
          code: 'Submitted', title: 'Отправлена',
          description: 'В демо-режиме заявка сохранена и помечена как отправленная.',
          clientNextAction: 'После подключения API банк начнёт проверку. Сейчас это демонстрационный шаг.',
          bankNextAction: 'Ожидает подключения API.',
          isTerminal: false, progressStep: 1, totalSteps: 6,
        },
        company: { id: company!.id, name: company!.name, inn: company!.inn },
        product: { code: product!.code, name: product!.name },
        amount: request.amount, termMonths: request.termMonths,
        purpose: request.purpose, purposeTitle: purposeTitles[request.purpose],
        purposeDescription: request.purposeDescription ?? null,
        createdByUserId: '01a15619-f9cc-70fe-bad8-2c6a70edfbd5',
        createdAt: timestamp, updatedAt: timestamp,
        availableActions: ['cancel'],
        decision: null, offer: null,
        history: [{
          fromStatus: null, toStatus: 'Submitted', toStatusTitle: 'Отправлена',
          actor: 'Client', actorUserId: '01a15619-f9cc-70fe-bad8-2c6a70edfbd5',
          comment: 'Заявка создана и отправлена.', occurredAt: timestamp,
        }],
      }
      saveAll([...applications, application])
      return { id, number, status: 'Submitted' }
    },
    async getApplication(id: string) {
      await pause()
      const application = readAll().find((item) => item.id === id)
      if (!application) throw problem(404, 'Заявка не найдена.')
      return application
    },
    async listApplications(page = 1) {
      await pause()
      const pageSize = 20
      const applications = readAll().reverse()
      const items = applications.slice((page - 1) * pageSize, page * pageSize).map((item) => ({
        id: item.id, number: item.number, status: item.status, company: item.company,
        product: item.product, amount: item.amount, termMonths: item.termMonths,
        purpose: item.purpose, purposeTitle: item.purposeTitle, createdAt: item.createdAt, updatedAt: item.updatedAt,
      }))
      return { items, page, pageSize, totalCount: applications.length, totalPages: Math.ceil(applications.length / pageSize) }
    },
    acceptOffer: (id) => changeApplication(id, 'acceptOffer'),
    declineOffer: (id) => changeApplication(id, 'declineOffer'),
    cancelApplication: (id) => changeApplication(id, 'cancel'),
  }
}
