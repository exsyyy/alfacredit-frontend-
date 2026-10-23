import type { Application, Contract, ContractSummary } from '../types/api'
import { mockCompanies } from './mockData'

export function demoContract(application: Application, timestamp: string, summary?: ContractSummary): Contract {
  const offer = application.offer!
  const company = mockCompanies.find(({ id }) => id === application.company.id)!
  const amount = offer.amount
  const rate = offer.interestRate / 1200
  const payment = Math.round((rate ? amount * rate / (1 - (1 + rate) ** -offer.termMonths) : amount / offer.termMonths) * 100) / 100
  let balance = amount
  const schedule = Array.from({ length: offer.termMonths }, (_, index) => {
    const due = new Date(timestamp)
    due.setUTCMonth(due.getUTCMonth() + index + 1, 1)
    const interest = Math.round(balance * rate * 100) / 100
    const principal = index === offer.termMonths - 1 ? balance : Math.min(balance, Math.round((payment - interest) * 100) / 100)
    balance = Math.round((balance - principal) * 100) / 100
    return { number: index + 1, dueDate: due.toISOString().slice(0, 10), payment: Math.round((principal + interest) * 100) / 100, principal, interest, balance }
  })
  const totalPayment = Math.round(schedule.reduce((sum, row) => sum + row.payment, 0) * 100) / 100
  return {
    id: `demo-contract-${application.id}`, number: `KD-${application.number.replace('AC-', '')}`,
    status: 'AwaitingSignature', applicationId: application.id, applicationNumber: application.number,
    lender: { name: 'АльфаКредит — демонстрационный банк' },
    borrower: { companyId: company.id, name: company.name, inn: company.inn, ogrn: company.ogrn, address: company.address, headName: company.headName },
    product: application.product, purpose: application.purpose, purposeTitle: application.purposeTitle,
    amount, termMonths: offer.termMonths, interestRate: offer.interestRate, monthlyPayment: payment,
    totalPayment, totalInterest: Math.round((totalPayment - amount) * 100) / 100,
    disbursementAccount: '40702810000000000001', createdAt: timestamp,
    signingDeadline: new Date(Date.parse(timestamp) + 5 * 86400000).toISOString(), signedAt: null,
    signing: { codeRequestedAt: null, codeExpiresAt: null, attemptsLeft: 5, canRequestCode: true },
    documentUrl: `/api/applications/${application.id}/contract/document`,
    ...summary, signedBy: summary?.signedAt ? { userId: application.createdByUserId, fullName: 'Демо-клиент' } : null,
    signatureMethod: summary?.signedAt ? 'DemoCode' : null, schedule,
  }
}
