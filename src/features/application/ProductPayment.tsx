import { useEffect, useState } from 'react'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem, PreliminaryPayment } from '../../types/api'
import { money } from '../financing/financingDraft'

export default function ProductPayment({ api, productCode, amount, termMonths }: { api: CreditApi; productCode: string; amount: string; termMonths: string }) {
  const [result, setResult] = useState<{ key: string; data?: PreliminaryPayment | null; error?: string }>({ key: '' })
  const [retry, setRetry] = useState(0)
  const valid = /^\d+$/.test(amount) && Number(amount) > 0 && Number(amount) <= 1000000000 && /^\d+$/.test(termMonths) && Number(termMonths) >= 1 && Number(termMonths) <= 120
  const key = valid ? JSON.stringify({ productCode, amount: Number(amount), termMonths: Number(termMonths) }) : ''
  useEffect(() => {
    if (!key) return
    const { productCode: code, ...query } = JSON.parse(key) as { productCode: string; amount: number; termMonths: number }
    const controller = new AbortController()
    let active = true
    setResult({ key })
    const timer = setTimeout(() => {
      api.getProducts(query, controller.signal).then(products => {
        if (active) setResult({ key, data: products.find(product => product.code === code)?.preliminaryPayment ?? null })
      }).catch((error: ApiProblem) => {
        if (active) setResult({ key, error: error?.title || 'Не удалось рассчитать платёж.' })
      })
    }, 300)
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [api, key, retry])
  const current = result.key === key ? result : null
  const payment = current?.data
  return <section className="catalog-payment" aria-label="Предварительный ежемесячный платёж">
    <p className="catalog-payment-label">Предварительный ежемесячный платёж</p>
    {!key ? <p className="catalog-payment-hint">Укажите сумму и срок кредита.</p> : current?.error ? <div role="alert"><p>{current.error}</p><button type="button" className="text-button" onClick={() => setRetry(value => value + 1)}>Повторить расчёт платежа</button></div> : current?.data === undefined ? <p className="catalog-payment-hint" role="status">Рассчитываем платёж…</p> : payment ? <>
      {payment.available && typeof payment.monthlyPayment === 'number' ? <strong className="catalog-payment-value">{money(payment.monthlyPayment)}</strong> : <strong className="catalog-payment-unavailable">{payment.notes.some(note => note.code === 'limit_product') ? 'Заранее не определяется' : 'Расчёт недоступен'}</strong>}
      {payment.notes.filter(note => note.code !== 'preliminary').map(note => <p className="catalog-payment-hint" key={note.code}>{note.text}</p>)}
    </> : <p className="catalog-payment-hint">API не передал предварительный расчёт.</p>}
  </section>
}
