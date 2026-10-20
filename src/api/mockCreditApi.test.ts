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
})
