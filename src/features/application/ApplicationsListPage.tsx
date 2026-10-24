import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { calendarDate } from '../financing/financingDraft'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem, ApplicationSummary } from '../../types/api'

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value))

export default function ApplicationsListPage({ api, onAuthExpired }: { api: CreditApi; onAuthExpired?: () => void }) {
  const [items, setItems] = useState<ApplicationSummary[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const load = async (nextPage: number) => {
    if (nextPage > 1) setLoadingMore(true)
    else setLoading(true)
    setError('')
    try {
      const result = await api.listApplications(nextPage)
      setItems((current) => nextPage === 1 ? result.items : [...current, ...result.items])
      setPage(result.page)
      setTotalPages(result.totalPages)
    } catch (problem) {
      const issue = problem as ApiProblem
      if (issue?.status === 401) { onAuthExpired?.(); return }
      setError(issue?.title || 'Не удалось загрузить заявки.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { void load(1) }, [api])

  return <main className="page">
    <div className="page-intro"><div><p className="section-kicker">Кредитование бизнеса</p><h1>Мои заявки</h1><p className="intro-copy">Откройте заявку, чтобы посмотреть решение банка и ответить на предложение.</p></div><Link className="primary-button button-link" to="/">Новая заявка</Link></div>
    {loading && <div className="state-panel" role="status">Загружаем заявки…</div>}
    {!loading && error && items.length === 0 && <div className="state-panel error-panel" role="alert"><h2>{error}</h2><p>Проверьте соединение и попробуйте ещё раз.</p><button type="button" className="secondary-button" onClick={() => void load(1)}>Повторить</button></div>}
    {!loading && !error && items.length === 0 && <div className="state-panel"><h2>У вас пока нет заявок</h2><p>Заполните форму, чтобы создать первую заявку.</p><Link className="primary-button button-link" to="/">Создать заявку</Link></div>}
    {items.length > 0 && <div className="application-list">{items.map((item) => <Link className="application-list-item" key={item.id} to={`/applications/${encodeURIComponent(item.id)}`} aria-label={`Заявка ${item.number}`}><div className="application-list-head"><strong>{item.number}</strong><span className="status-badge"><span />{item.status.title}</span></div><h2>{item.company.name}</h2><p>{item.product.name} · {money(item.amount)} · {item.termMonths} мес.</p><small>Создана {date(item.createdAt)}</small>{item.needByDate && <small>Деньги нужны к {calendarDate(item.needByDate)}</small>}</Link>)}</div>}
    {items.length > 0 && error && <div className="refresh-error" role="alert"><span>{error}</span><button type="button" className="secondary-button" onClick={() => void load(page + 1)}>Повторить</button></div>}
    {page < totalPages && <button type="button" className="secondary-button load-more" disabled={loadingMore} onClick={() => void load(page + 1)}>{loadingMore ? 'Загружаем…' : 'Показать ещё'}</button>}
  </main>
}
