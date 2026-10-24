import type { CreateApplicationRequest, LoanPurpose } from './api'

export interface FinancingPreviewRequest {
  companyId: string
  amount: number
  purpose: LoanPurpose
  needByDate: string
  termMonths?: number
}
export interface PreviewNote { code: string; text: string }
export interface AmountSuggestion { amount: number; basis: 'AutoApprovalLimit' | 'RevenueShare' | 'DebtLoad' | 'ProductMaximum'; text: string }
export interface FinancingOption {
  productCode: string
  productName: string
  productType: string
  isRecommended: boolean
  amount: number
  termMonths: number
  termSuggested: boolean
  termRange: { min: number; max: number }
  cost: { interestRate: number; maxInterestRate: number; monthlyPayment: number; maxMonthlyPayment: number; totalPayment: number; totalInterest: number; maxTotalInterest: number }
  affordability: { monthlyProfit: number | null; currentDebtPayments: number; debtLoad: number | null; level: 'Comfortable' | 'Moderate' | 'Elevated' | 'High' | 'InsufficientData'; profitBasis: 'NetProfit' | 'RevenueMinusExpenses' | null; explanation: string }
  funding: { decisionPath: 'Auto' | 'ManualReview'; businessDays: number; expectedDate: string; inTime: boolean; explanation: string }
  suggestedAmount: AmountSuggestion | null
  explanations: PreviewNote[]
  limitations: PreviewNote[]
  requirements: PreviewNote[]
  applyWith: CreateApplicationRequest
}
export interface FinancingPreview {
  calculatedAt: string
  calculationDate: string
  company: { id: string; name: string; inn: string; businessAgeMonths: number }
  request: { amount: number; purpose: LoanPurpose; purposeTitle: string; needByDate: string; daysUntilNeeded: number; termMonths: number | null }
  summary: string
  disclaimer: string
  options: FinancingOption[]
  notCompared: Array<{ productCode: string; productName: string; productType: string; reason: PreviewNote }>
  unsuitable: Array<{ productCode: string; productName: string; reasons: PreviewNote[]; suggestedAmount: AmountSuggestion | null }>
}
