import type { Application, ApplicationStatus, Offer } from '../../types/api'

export function clientStatusTitle(status: Pick<ApplicationStatus, 'code' | 'title'>): string {
  const titles: Record<string, string> = {
    Approved: 'Одобрено',
    ApprovedWithConditions: 'Одобрено с условиями',
    ManualReview: 'Заявку рассматривает менеджер',
    Rejected: 'Банк не одобрил заявку',
  }
  return titles[status.code] ?? status.title
}

export function displayOffer(application: Application): Offer | null {
  if (!application.offer || application.decision?.isFinal === false) return null
  const approved = ['Approved', 'ApprovedWithConditions'].includes(application.status.code)
  if (approved && (!application.decision || (application.decision.isFinal && ['Approved', 'ApprovedWithConditions'].includes(application.decision.type)))) return application.offer
  if (['ContractSigning', 'Signed', 'Disbursed', 'Cancelled', 'OfferDeclined', 'OfferExpired'].includes(application.status.code)) return application.offer
  return null
}
