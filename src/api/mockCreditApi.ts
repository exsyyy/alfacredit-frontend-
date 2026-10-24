import type { CreditApi } from './creditApi'
import type { Application, ApiProblem, CreateApplicationRequest } from '../types/api'
import { mockCompanies, mockProducts, purposeTitles } from './mockData'
import { demoContract } from './mockContract'
import { mockFinancingPreview } from './mockFinancingData'

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
      contract: action === 'acceptOffer' ? demoContract(current, timestamp) : current.contract ? { ...current.contract, status: 'Cancelled', signing: { ...current.contract.signing, canRequestCode: false } } : null,
      availableActions: action === 'acceptOffer' ? ['signContract', 'cancel'] : [], updatedAt: timestamp,
      history: [...current.history, { fromStatus: current.status.code, toStatus: code, toStatusTitle: title, actor: 'Client', actorUserId: current.createdByUserId, comment: title, occurredAt: timestamp }],
    }
    applications[index] = updated
    saveAll(applications)
    return updated
  }

  return {
    async previewFinancing(body, signal) {
      await pause()
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (body.amount !== 1500000 || body.purpose !== 'WorkingCapital' || (body.termMonths !== undefined && body.termMonths !== 12)) throw problem(422, 'Демо-пример: 1 500 000 ₽ на оборотные средства, срок 12 месяцев. Для других параметров подключите API.')
      const company = mockCompanies.find((item) => item.id === body.companyId)
      if (!company) throw problem(400, 'Выберите компанию.')
      const result = structuredClone(mockFinancingPreview)
      result.company = { id: company.id, name: company.name, inn: company.inn, businessAgeMonths: company.businessAgeMonths }
      result.request = { ...result.request, needByDate: body.needByDate, termMonths: body.termMonths ?? null }
      for (const option of result.options) {
        option.applyWith = { ...option.applyWith, companyId: body.companyId, needByDate: body.needByDate }
        option.termSuggested = body.termMonths === undefined
      }
      return result
    },
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
        needByDate: request.needByDate ?? null,
        createdByUserId: '01a15619-f9cc-70fe-bad8-2c6a70edfbd5',
        createdAt: timestamp, updatedAt: timestamp,
        availableActions: ['cancel'],
        decision: null, offer: null, contract: null, disbursement: null,
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
      const applications = readAll()
      const application = applications.find((item) => item.id === id)
      if (!application) throw problem(404, 'Заявка не найдена.')
      if (application.status.code === 'Signed' && Date.parse(now()) - Date.parse(application.contract!.signedAt!) >= 2000) {
        application.status = { ...application.status, code: 'Disbursed', title: 'Средства выданы', description: 'Демонстрационная выдача завершена. Реальные средства не переводились.', clientNextAction: 'Ознакомьтесь с графиком платежей.', progressStep: 6, isTerminal: true }
        application.disbursement = { id: `demo-disbursement-${id}`, amount: application.contract!.amount, account: application.contract!.disbursementAccount, paymentOrderNumber: `DEMO-${application.number}`, status: 'Completed', requestedAt: application.contract!.signedAt!, completedAt: now(), error: null }
        application.updatedAt = now()
        application.history.push({ fromStatus: 'Signed', toStatus: 'Disbursed', toStatusTitle: 'Средства выданы (демо)', actor: 'System', actorUserId: null, comment: 'Имитация выдачи: деньги не переводились.', occurredAt: now() })
        saveAll(applications)
      }
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
        needByDate: item.needByDate ?? null,
      }))
      return { items, page, pageSize, totalCount: applications.length, totalPages: Math.ceil(applications.length / pageSize) }
    },
    acceptOffer: (id) => changeApplication(id, 'acceptOffer'),
    declineOffer: (id) => changeApplication(id, 'declineOffer'),
    cancelApplication: (id) => changeApplication(id, 'cancel'),
    async getContract(id) {
      await pause()
      const application = readAll().find((item) => item.id === id)
      if (!application?.contract) throw problem(404, 'Договор ещё не сформирован.')
      return demoContract(application, application.contract.createdAt, application.contract)
    },
    async getContractDocument(id) {
      const contract = await this.getContract(id)
      return new Blob([`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Демонстрационный договор</title><body><h1>Демонстрационный договор ${contract.number}</h1><p>Имитация. Юридической силы не имеет.</p><p>Сумма: ${contract.amount} RUB. Срок: ${contract.termMonths} мес. Ставка: ${contract.interestRate}%.</p></body></html>`], { type: 'text/html' })
    },
    async requestSigningCode(id) {
      await pause()
      const applications = readAll()
      const application = applications.find((item) => item.id === id)
      if (!application?.contract || !application.availableActions.includes('signContract') || Date.parse(application.contract.signingDeadline) <= Date.parse(now())) throw problem(409, 'Подписание недоступно.')
      const codeExpiresAt = new Date(Date.parse(now()) + 600000).toISOString()
      application.contract.signing = { codeRequestedAt: now(), codeExpiresAt, attemptsLeft: 5, canRequestCode: true }
      saveAll(applications)
      return { contractNumber: application.contract.number, deliveredVia: 'Feed', codeExpiresAt, attemptsLeft: 5, demoCode: '123456' }
    },
    async signContract(id, code) {
      await pause()
      const applications = readAll()
      const application = applications.find((item) => item.id === id)
      const contract = application?.contract
      if (!application || !contract || !application.availableActions.includes('signContract') || Date.parse(contract.signingDeadline) <= Date.parse(now())) throw problem(409, 'Подписание недоступно.')
      if (!contract.signing.codeExpiresAt || Date.parse(contract.signing.codeExpiresAt) <= Date.parse(now()) || contract.signing.attemptsLeft <= 0) throw problem(409, 'Код истёк или попытки исчерпаны. Запросите новый код.')
      if (code !== '123456') {
        contract.signing.attemptsLeft -= 1
        saveAll(applications)
        throw problem(400, 'Неверный код.', { code: ['Неверный код подтверждения.'] })
      }
      contract.status = 'Signed'
      contract.signedAt = now()
      contract.signing.canRequestCode = false
      application.status = { ...application.status, code: 'Signed', title: 'Договор подписан', description: 'Договор подписан. Готовим демонстрационную выдачу.', clientNextAction: 'Ожидайте выдачи.', progressStep: 5, isTerminal: false }
      application.availableActions = []
      application.updatedAt = now()
      application.history.push({ fromStatus: 'ContractSigning', toStatus: 'Signed', toStatusTitle: 'Договор подписан (демо)', actor: 'Client', actorUserId: application.createdByUserId, comment: 'Подписано демонстрационным кодом.', occurredAt: now() })
      saveAll(applications)
      return application
    },
  }
}
