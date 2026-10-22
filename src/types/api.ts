/** JSON contracts from backend docs/api.md. Dates are ISO 8601 strings, money is RUB. */
export type LoanPurpose = 'WorkingCapital' | 'Equipment' | 'Expansion' | 'Refinancing' | 'Other'

export interface Product {
  code: string
  name: string
  description: string
  type: string
  minAmount: number
  maxAmount: number
  minTermMonths: number
  maxTermMonths: number
  baseRate: number
  allowedPurposes: Array<{ code: LoanPurpose; title: string }>
  minBusinessAgeMonths: number
  requiresCollateral: boolean
}

export interface Company {
  id: string
  inn: string
  ogrn: string
  name: string
  legalForm: string
  okved: string
  registeredAt: string
  businessAgeMonths: number
  address: string
  headName: string
  taxRegime: string
  annualRevenue: number
  annualExpenses: number | null
  netProfit: number | null
  monthlyDebtPayments: number
  employeesCount: number
  myRole: string | null
}

export interface CreateApplicationRequest {
  companyId: string
  productCode: string
  amount: number
  termMonths: number
  purpose: LoanPurpose
  purposeDescription?: string
}

export interface CreateApplicationResponse {
  id: string
  number: string
  status: string
}

export interface ApplicationStatus {
  code: string
  title: string
  description: string
  clientNextAction: string
  bankNextAction: string
  isTerminal: boolean
  progressStep: number
  totalSteps: number
}

export interface ApplicationHistoryEntry {
  fromStatus: string | null
  toStatus: string
  toStatusTitle: string
  actor: string
  actorUserId: string | null
  comment: string | null
  occurredAt: string
}

export type DecisionType = 'Approved' | 'ApprovedWithConditions' | 'Rejected' | 'ManualReview'

export interface Decision {
  type: DecisionType
  isFinal: boolean
  decidedBy: 'Auto' | 'Manager'
  recommendedType: DecisionType | null
  approvedAmount: number | null
  approvedTermMonths: number | null
  interestRate: number | null
  monthlyPayment: number | null
  conditions: string | null
  reasons: Array<{ code: string; title: string; explanation: string }>
  decidedAt: string
}

export interface Offer {
  id: string
  amount: number
  termMonths: number
  interestRate: number
  monthlyPayment: number
  expiresAt: string
  response: 'Pending' | 'Accepted' | 'Declined' | 'Expired'
  respondedAt: string | null
}

export interface ApplicationSummary {
  id: string
  number: string
  status: ApplicationStatus
  company: { id: string; name: string; inn: string }
  product: { code: string; name: string }
  amount: number
  termMonths: number
  purpose: LoanPurpose
  purposeTitle: string
  createdAt: string
  updatedAt: string
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface Application {
  id: string
  number: string
  status: ApplicationStatus
  company: { id: string; name: string; inn: string }
  product: { code: string; name: string }
  amount: number
  termMonths: number
  purpose: LoanPurpose
  purposeTitle: string
  purposeDescription: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  availableActions: string[]
  decision: Decision | null
  offer: Offer | null
  history: ApplicationHistoryEntry[]
}

export interface ApiProblem {
  type?: string
  title: string
  status: number
  detail?: string
  errors?: Record<string, string[]>
  traceId?: string
}

export interface AuthUser {
  id: string
  login: string
  fullName: string
  role: 'Client' | 'Manager' | 'Admin'
}

export interface AuthSession {
  accessToken: string
  expiresAt: string
  user: AuthUser
}

export interface ApplicationFormValues {
  companyId: string
  productCode: string
  amount: string
  termMonths: string
  purpose: LoanPurpose | ''
  purposeDescription: string
}

export type FieldErrors = Partial<Record<keyof ApplicationFormValues, string>>
