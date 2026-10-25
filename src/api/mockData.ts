import type { Company, LoanPurpose, Product } from '../types/api'

export const purposeTitles: Record<LoanPurpose, string> = {
  WorkingCapital: 'Пополнение оборотных средств',
  Equipment: 'Покупка оборудования или транспорта',
  Expansion: 'Расширение бизнеса',
  Refinancing: 'Рефинансирование',
  Other: 'Другая цель',
}

const purposes = (...codes: LoanPurpose[]) => codes.map((code) => ({ code, title: purposeTitles[code] }))

/** Synthetic product examples follow backend SeedData; these are not live offers. */
export const mockProducts: Product[] = [
  {
    code: 'working-capital', name: 'Оборотный кредит', type: 'WorkingCapital',
    description: 'На закупки, сезонные расходы и пополнение оборотных средств.',
    minAmount: 300000, maxAmount: 10000000, minTermMonths: 3, maxTermMonths: 24,
    baseRate: 19.5, allowedPurposes: purposes('WorkingCapital', 'Other'),
    minBusinessAgeMonths: 12, requiresCollateral: false, preliminaryPayment: null,
  },
  {
    code: 'express', name: 'Экспресс-кредит', type: 'Express',
    description: 'Небольшая сумма на короткий срок с минимальным пакетом документов.',
    minAmount: 100000, maxAmount: 3000000, minTermMonths: 3, maxTermMonths: 18,
    baseRate: 23, allowedPurposes: purposes('WorkingCapital', 'Equipment', 'Expansion', 'Refinancing', 'Other'),
    minBusinessAgeMonths: 6, requiresCollateral: false, preliminaryPayment: null,
  },
  {
    code: 'overdraft', name: 'Овердрафт', type: 'Overdraft',
    description: 'Лимит к расчётному счёту для закрытия кассовых разрывов.',
    minAmount: 100000, maxAmount: 5000000, minTermMonths: 1, maxTermMonths: 12,
    baseRate: 21, allowedPurposes: purposes('WorkingCapital'),
    minBusinessAgeMonths: 6, requiresCollateral: false, preliminaryPayment: null,
  },
  {
    code: 'credit-line', name: 'Кредитная линия', type: 'CreditLine',
    description: 'Возобновляемый лимит для регулярных закупок и расширения.',
    minAmount: 500000, maxAmount: 20000000, minTermMonths: 6, maxTermMonths: 36,
    baseRate: 18.5, allowedPurposes: purposes('WorkingCapital', 'Expansion', 'Equipment'),
    minBusinessAgeMonths: 12, requiresCollateral: false, preliminaryPayment: null,
  },
  {
    code: 'investment', name: 'Инвестиционный кредит', type: 'Investment',
    description: 'Долгосрочное финансирование оборудования и новых направлений.',
    minAmount: 1000000, maxAmount: 50000000, minTermMonths: 12, maxTermMonths: 84,
    baseRate: 17.5, allowedPurposes: purposes('Equipment', 'Expansion', 'Refinancing'),
    minBusinessAgeMonths: 24, requiresCollateral: true, preliminaryPayment: null,
  },
]

export const mockCompanies: Company[] = [
  {
    id: '01a15975-ea5f-7a4f-863b-9035b3b8b2ca',
    inn: '7701234567', ogrn: '1157746123456', name: 'ООО «Ромашка»', legalForm: 'Ooo',
    okved: '47.11', registeredAt: '2019-03-12', businessAgeMonths: 91,
    address: 'Москва, ул. Садовая, д. 12', headName: 'Иванова Мария Сергеевна', taxRegime: 'Osno',
    annualRevenue: 48000000, annualExpenses: 40800000, netProfit: 7200000,
    monthlyDebtPayments: 150000, employeesCount: 24, myRole: 'Director',
  },
]
