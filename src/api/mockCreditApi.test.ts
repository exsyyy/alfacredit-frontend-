import { beforeEach, describe, expect, it } from 'vitest'
import { createMockCreditApi } from './mockCreditApi'

const request = {
  companyId: '01a15975-ea5f-7a4f-863b-9035b3b8b2ca',
  productCode: 'working-capital',
  amount: 1500000,
  termMonths: 12,
  purpose: 'WorkingCapital' as const,
  purposeDescription: 'Закупка товара',
}

describe('mock credit API', () => {
  beforeEach(() => localStorage.clear())

  it('creates a submitted application and retrieves it after API recreation', async () => {
    const api = createMockCreditApi({
      storage: localStorage,
      delayMs: 0,
      idFactory: () => 'application-1',
      now: () => '2026-10-20T13:17:20.000Z',
    })
    const created = await api.createApplication(request)
    expect(created).toEqual({ id: 'application-1', number: 'AC-000001', status: 'Submitted' })

    const reloaded = await createMockCreditApi({ storage: localStorage, delayMs: 0 }).getApplication(created.id)
    expect(reloaded).toMatchObject({
      id: 'application-1',
      amount: 1500000,
      termMonths: 12,
      purpose: 'WorkingCapital',
      company: { name: 'ООО «Ромашка»' },
      product: { name: 'Оборотный кредит' },
      status: { code: 'Submitted', title: 'Отправлена', clientNextAction: expect.any(String) },
    })
    expect(reloaded.history).toHaveLength(1)
  })

  it('rejects an unknown application instead of showing invented data', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    await expect(api.getApplication('missing')).rejects.toMatchObject({ status: 404 })
  })

  it('returns field errors for a request outside the selected product limits', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    await expect(api.createApplication({ ...request, amount: -1 })).rejects.toMatchObject({
      status: 400,
      errors: { amount: [expect.any(String)] },
    })
  })

  it('lists saved applications newest first and cancels a submitted application', async () => {
    let index = 0
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0, idFactory: () => `app-${++index}` })
    await api.createApplication(request)
    await api.createApplication({ ...request, amount: 1800000 })
    const page = await api.listApplications()
    expect(page).toMatchObject({ page: 1, totalCount: 2, totalPages: 1 })
    expect(page.items.map((item) => item.id)).toEqual(['app-2', 'app-1'])
    const canceled = await api.cancelApplication('app-2')
    expect(canceled.status.code).toBe('Cancelled')
    expect(canceled.availableActions).toEqual([])
    await expect(api.cancelApplication('app-2')).rejects.toMatchObject({ status: 409 })
  })

  it('responds to a pending demo offer only when the action is available', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0, idFactory: () => 'app-1' })
    await api.createApplication(request)
    const application = await api.getApplication('app-1')
    application.status.code = 'Approved'
    application.availableActions = ['acceptOffer', 'declineOffer']
    application.offer = {
      id: 'offer-1', amount: 1200000, termMonths: 12, interestRate: 16,
      monthlyPayment: 110000, expiresAt: '2099-01-01T00:00:00Z', response: 'Pending', respondedAt: null,
    }
    localStorage.setItem('alfacredit.demo.applications.v1', JSON.stringify([application]))
    const accepted = await api.acceptOffer('app-1')
    expect(accepted.offer?.response).toBe('Accepted')
    expect(accepted.availableActions).toEqual([])
    await expect(api.declineOffer('app-1')).rejects.toMatchObject({ status: 409 })
  })
})
