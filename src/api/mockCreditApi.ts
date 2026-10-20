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
        availableActions: [],
        history: [{
          fromStatus: null, toStatus: 'Submitted', toStatusTitle: 'Отправлена',
          actor: 'Client', actorUserId: '01a15619-f9cc-70fe-bad8-2c6a70edfbd5',
          comment: 'Заявка создана и отправлена.', occurredAt: timestamp,
        }],
      }
      try {
        options.storage.setItem(storageKey, JSON.stringify([...applications, application]))
      } catch {
        throw problem(500, 'Не удалось сохранить демо-заявку в браузере.')
      }
      return { id, number, status: 'Submitted' }
    },
    async getApplication(id: string) {
      await pause()
      const application = readAll().find((item) => item.id === id)
      if (!application) throw problem(404, 'Заявка не найдена.')
      return application
    },
  }
}
