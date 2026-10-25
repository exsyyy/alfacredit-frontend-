import { describe, expect, it } from 'vitest'
import { validateApplicationForm, toCreateRequest } from './validation'
import type { ApplicationFormValues, Product } from '../../types/api'

const product: Product = {
  code: 'working-capital',
  name: 'Оборотный кредит',
  description: 'Пополнение оборотных средств',
  type: 'WorkingCapital',
  minAmount: 300000,
  maxAmount: 10000000,
  minTermMonths: 3,
  maxTermMonths: 24,
  baseRate: 19.5,
  allowedPurposes: [{ code: 'WorkingCapital', title: 'Пополнение оборотных средств' }],
  minBusinessAgeMonths: 12,
  requiresCollateral: false, preliminaryPayment: null,
}

const valid: ApplicationFormValues = {
  companyId: 'company-1',
  productCode: 'working-capital',
  amount: '1 500 000',
  termMonths: '12',
  purpose: 'WorkingCapital',
  purposeDescription: 'Закупка товара',
}

describe('application form validation', () => {
  it('requires company, product, amount, term and purpose', () => {
    const errors = validateApplicationForm({
      companyId: '', productCode: '', amount: '', termMonths: '', purpose: '', purposeDescription: '',
    }, undefined)
    expect(Object.keys(errors)).toEqual(['companyId', 'productCode', 'amount', 'termMonths', 'purpose'])
  })

  it('rejects negative and out-of-range amounts', () => {
    expect(validateApplicationForm({ ...valid, amount: '-10' }, product).amount).toMatch(/больше нуля/)
    expect(validateApplicationForm({ ...valid, amount: '200000' }, product).amount).toMatch(/300 000/)
  })

  it('rejects fractional and out-of-range terms', () => {
    expect(validateApplicationForm({ ...valid, termMonths: '12.5' }, product).termMonths).toMatch(/целым/)
    expect(validateApplicationForm({ ...valid, termMonths: '30' }, product).termMonths).toMatch(/3 до 24/)
  })

  it('rejects purposes unavailable for the product', () => {
    expect(validateApplicationForm({ ...valid, purpose: 'Equipment' }, product).purpose).toMatch(/недоступна/)
  })

  it('normalizes a valid form into the API request', () => {
    expect(validateApplicationForm(valid, product)).toEqual({})
    expect(toCreateRequest(valid)).toEqual({
      companyId: 'company-1',
      productCode: 'working-capital',
      amount: 1500000,
      termMonths: 12,
      purpose: 'WorkingCapital',
      purposeDescription: 'Закупка товара',
    })
  })
})
