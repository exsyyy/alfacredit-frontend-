import { describe, expect, it } from 'vitest'
import { emptyDraft, latestNeedDate, moscowToday, validateNeed } from './financingDraft'

describe('calendar-only financing dates', () => {
  it('uses the Moscow day across the UTC day boundary', () => {
    expect(moscowToday(new Date('2026-10-24T20:59:59Z'))).toBe('2026-10-24')
    expect(moscowToday(new Date('2026-10-24T21:00:00Z'))).toBe('2026-10-25')
    expect(latestNeedDate('2028-02-29')).toBe('2030-02-28')
  })
  it('rejects an impossible calendar date in a restored draft', () => {
    const year = Number(moscowToday().slice(0, 4)) + 1
    const errors = validateNeed({ ...emptyDraft, companyId: 'company', amount: '1500000', purpose: 'WorkingCapital', needByDate: `${year}-02-31` })
    expect(errors.needByDate).toBeDefined()
  })
})
