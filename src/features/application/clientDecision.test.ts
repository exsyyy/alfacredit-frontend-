import { describe, expect, it } from 'vitest'
import type { Application } from '../../types/api'
import { clientStatusTitle, displayOffer } from './clientDecision'

describe('client decision presentation', () => {
  it.each([
    ['Approved', 'Одобрено'],
    ['ApprovedWithConditions', 'Одобрено с условиями'],
    ['ManualReview', 'Заявку рассматривает менеджер'],
    ['Rejected', 'Банк не одобрил заявку'],
  ])('uses the client label for %s', (code, expected) => {
    expect(clientStatusTitle({ code, title: 'Старое название' })).toBe(expected)
  })

  it.each(['ContractSigning', 'Signed', 'Disbursed', 'Cancelled', 'OfferExpired'])('keeps the current %s status instead of the old approval', code => {
    expect(clientStatusTitle({ code, title: 'Текущий этап' })).toBe('Текущий этап')
  })

  it('does not present a non-final recommendation as an offer', () => {
    const application = { status: { code: 'ManualReview' }, decision: { type: 'Approved', isFinal: false }, offer: { response: 'Pending' } } as Application
    expect(displayOffer(application)).toBeNull()
    expect(displayOffer({ ...application, status: { ...application.status, code: 'Rejected' } })).toBeNull()
    expect(displayOffer({ ...application, status: { ...application.status, code: 'Cancelled' } })).toBeNull()
  })

  it('supports old approvals without a decision and optional or null totals', () => {
    const application = { status: { code: 'Approved' }, decision: null, offer: { response: 'Pending', totalPayment: null, totalInterest: null } } as Application
    expect(displayOffer(application)).toBe(application.offer)
    expect(displayOffer({ ...application, offer: null })).toBeNull()
  })
})
