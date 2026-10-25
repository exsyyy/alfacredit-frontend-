import type { Application, DecisionType } from '../types/api'
import { mockCompanies, mockProducts } from './mockData'

/** Synthetic client-facing responses; no score or internal grade is displayed. */
export function mockDecisionApplication(type: DecisionType): Application {
  const final = type !== 'ManualReview'
  const approved = type === 'Approved' || type === 'ApprovedWithConditions'
  const conditions = type === 'ApprovedWithConditions' ? 'До подписания предоставьте выписку по расчётному счёту и поручительство собственника.' : null
  const descriptions = {
    Approved: 'Банк готов предоставить финансирование на запрошенных условиях.',
    ApprovedWithConditions: 'Предложение включает дополнительные требования к документам.',
    ManualReview: 'Для завершения проверки необходимо решение менеджера.',
    Rejected: 'По результатам проверки банк не готов предоставить финансирование.',
  }
  const company = mockCompanies[0]
  const product = mockProducts[0]
  const rate = type === 'ApprovedWithConditions' ? 22.5 : 19.5
  const monthlyPayment = type === 'ApprovedWithConditions' ? 140752.78 : 138593.06
  const totalPayment = type === 'ApprovedWithConditions' ? 1689033.3 : 1663116.74
  const timestamp = '2026-10-25T15:00:00Z'
  return {
    id: `example-${type}`, number: 'AC-DEMO',
    status: { code: type, title: type, description: descriptions[type], clientNextAction: approved ? 'Ознакомьтесь с предложением и выберите доступное действие.' : type === 'ManualReview' ? 'Дождитесь решения менеджера. Карточка обновляется автоматически.' : 'Ознакомьтесь с причинами. За дополнительными пояснениями обратитесь в банк.', bankNextAction: '', isTerminal: type === 'Rejected', progressStep: 4, totalSteps: 6 },
    company: { id: company.id, name: company.name, inn: company.inn }, product: { code: product.code, name: product.name },
    amount: 1500000, termMonths: 12, purpose: 'WorkingCapital', purposeTitle: 'Пополнение оборотных средств', purposeDescription: null,
    createdByUserId: 'demo-client', createdAt: timestamp, updatedAt: timestamp,
    availableActions: approved ? ['acceptOffer', 'declineOffer'] : type === 'ManualReview' ? ['cancel'] : [],
    decision: { type, isFinal: final, decidedBy: 'Auto', isSimulated: false, recommendedType: type === 'ManualReview' ? 'Approved' : null,
      approvedAmount: approved ? 1500000 : null, approvedTermMonths: approved ? 12 : null, interestRate: approved ? rate : null, monthlyPayment: approved ? monthlyPayment : null, conditions,
      reasons: [{ code: type === 'Rejected' ? 'business_too_young' : type === 'ManualReview' ? 'additional_check' : 'risk_grade', title: type === 'Rejected' ? 'Недостаточный срок работы компании' : type === 'ManualReview' ? 'Дополнительная проверка' : 'Результат оценки', explanation: type === 'Rejected' ? 'Для выбранного продукта компания должна работать не менее года.' : type === 'ManualReview' ? 'Менеджер проверит сведения о компании и условиях финансирования.' : 'Финансовые показатели позволяют рассмотреть финансирование на предложенных условиях.' }], decidedAt: timestamp },
    offer: approved ? { id: 'demo-offer', amount: 1500000, termMonths: 12, interestRate: rate, monthlyPayment, totalPayment, totalInterest: totalPayment - 1500000, expiresAt: '2099-01-01T00:00:00Z', response: 'Pending', respondedAt: null } : null,
    contract: null, disbursement: null,
    history: [{ fromStatus: 'Deciding', toStatus: type, toStatusTitle: type, actor: 'System', actorUserId: null, comment: descriptions[type], occurredAt: timestamp }],
  }
}
