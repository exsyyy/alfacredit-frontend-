import type { LoanPurpose } from '../../types/api'

export interface FinancingDraft { companyId: string; amount: string; purpose: LoanPurpose | ''; needByDate: string; termMonths: string; selectedCode: string }
export const emptyDraft: FinancingDraft = { companyId: '', amount: '', purpose: '', needByDate: '', termMonths: '', selectedCode: '' }
export const draftKey = (owner: string) => `alfacredit.financing.v2.${owner}`
export function readDraft(owner: string): FinancingDraft {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey(owner)) ?? 'null')
    if (saved && Object.keys(emptyDraft).every((key) => typeof saved[key] === 'string')) return { ...emptyDraft, ...saved }
  } catch { /* Start a fresh draft if storage is unavailable or damaged. */ }
  return { ...emptyDraft }
}
export const money = (value: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value).replace(/\s/g, ' ')} ₽`
export function calendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(year, month - 1, day, 12))
}
export function moscowToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-')
}
export function latestNeedDate(today = moscowToday()) {
  const [year, month, day] = today.split('-').map(Number)
  const max = new Date(Date.UTC(year + 2, month - 1, day))
  if (max.getUTCMonth() !== month - 1) max.setUTCDate(0)
  return `${max.getUTCFullYear()}-${String(max.getUTCMonth() + 1).padStart(2, '0')}-${String(max.getUTCDate()).padStart(2, '0')}`
}
export function validateNeed(draft: FinancingDraft) {
  const errors: Record<string, string> = {}
  if (!draft.companyId) errors.companyId = 'Выберите компанию.'
  if (!draft.purpose) errors.purpose = 'Выберите цель финансирования.'
  if (!/^\d+$/.test(draft.amount) || Number(draft.amount) <= 0 || Number(draft.amount) > 1000000000) errors.amount = 'Укажите сумму от 1 до 1 000 000 000 ₽.'
  const [year, month, day] = draft.needByDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.needByDate) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || draft.needByDate < moscowToday() || draft.needByDate > latestNeedDate()) errors.needByDate = 'Выберите дату от сегодняшнего дня до двух лет вперёд по Москве.'
  if (draft.termMonths && (!/^\d+$/.test(draft.termMonths) || Number(draft.termMonths) < 1 || Number(draft.termMonths) > 120)) errors.termMonths = 'Срок должен быть целым числом от 1 до 120 месяцев.'
  return errors
}
