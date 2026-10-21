import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem, Application } from '../../types/api'

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))

const processingStatuses = new Set(['Submitted', 'Validating', 'Enriching', 'Scoring', 'Deciding', 'ManualReview', 'Signed'])
const shouldRefresh = (application: Application) => !application.status.isTerminal && processingStatuses.has(application.status.code)

export default function ApplicationPage({ api, isDemo = true, onAuthExpired }: { api: CreditApi; isDemo?: boolean; onAuthExpired?: () => void }) {
  const { id } = useParams()
  const location = useLocation()
  const justSaved = Boolean((location.state as { justSaved?: boolean } | null)?.justSaved)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    let hasApplication = Boolean(application)
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!id) { setError('Не указан идентификатор заявки.'); setLoading(false); return }
    const load = async () => {
      try {
        const result = await api.getApplication(id)
        if (!active) return
        setApplication(result)
        hasApplication = true
        setError('')
        setRefreshError('')
        if (!isDemo && shouldRefresh(result)) timer = setTimeout(load, 2500)
      } catch (problem) {
        if (!active) return
        const issue = problem as ApiProblem
        if (issue?.status === 401) { onAuthExpired?.(); return }
        const message = issue?.title || 'Не удалось обновить заявку.'
        if (hasApplication) setRefreshError(message)
        else setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false; if (timer) clearTimeout(timer) }
  }, [api, id, isDemo, onAuthExpired, reloadKey])

  if (loading) return <main className="page"><div className="state-panel" role="status">Загружаем заявку…</div></main>
  if (error || !application) return <main className="page"><div className="state-panel error-panel" role="alert"><h1>{error || 'Заявка не найдена.'}</h1><p>Проверьте ссылку или повторите загрузку.</p><button type="button" className="secondary-button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1) }}>Повторить</button><Link to="/" className="text-link">Новая заявка</Link></div></main>

  const decisionComment = [...application.history].reverse().find((entry) => entry.toStatus === application.status.code && entry.comment?.trim())?.comment
  const refreshing = !isDemo && shouldRefresh(application) && !refreshError

  return (
    <main className="page">
      <Link className="back-link" to="/">← К форме заявки</Link>
      <div className="detail-heading"><div><p className="section-kicker">Кредитование бизнеса</p><h1>Заявка {application.number}</h1><p className="intro-copy">Создана {date(application.createdAt)}</p></div><span className="status-badge"><span />{application.status.title}</span></div>
      {justSaved && <div className="success-banner" role="status">{isDemo ? 'Заявка сохранена в этом браузере. Вы можете вернуться к ней по этой ссылке.' : 'Заявка сохранена в тестовой базе. Вы можете вернуться к ней по этой ссылке после входа.'}</div>}
      {refreshing && <p className="refresh-note" role="status">Обновляем статус автоматически</p>}
      {refreshError && <div className="refresh-error" role="alert"><span>{refreshError}</span><button type="button" className="secondary-button" onClick={() => setReloadKey((key) => key + 1)}>Повторить обновление</button></div>}
      <div className="content-grid detail-grid">
        <div className="detail-main">
          <section className="next-step-panel"><p className="side-label">Текущий статус</p><h2>{application.status.title}</h2><p>{application.status.description}</p><div className="next-action"><span className="next-action-icon" aria-hidden="true">✓</span><div><strong>Что делать дальше</strong><p>{application.status.clientNextAction}</p></div></div>
            {application.status.code === 'Approved' && <div className="decision-detail"><strong>Запрошенные условия</strong><p>{money(application.amount)} на {application.termMonths} мес. Подробные условия предложения банк пока не передаёт через API.</p></div>}
            {application.status.code === 'ApprovedWithConditions' && <div className="decision-detail"><strong>Предложены другие условия</strong><p>Точные сумма, срок и ставка пока не передаются через API. Дождитесь условий банка перед подтверждением.</p></div>}
            {application.status.code === 'NeedsClarification' && <div className="decision-detail"><strong>Какие данные нужны</strong><p>{decisionComment || 'Перечень дополнительных данных пока не передан. Проверьте историю заявки позже.'}</p></div>}
            {application.status.code === 'Rejected' && <div className="decision-detail"><strong>Причина отказа</strong><p>{decisionComment || 'Причина пока не передана через API. Уточните её у банка.'}</p></div>}
          </section>
          <section className="details-panel"><div className="panel-heading"><span className="panel-number">2</span><div><h2>Сведения о заявке</h2><p>Проверьте данные, которые вы указали.</p></div></div>
            <dl className="detail-list"><div><dt>Номер заявки</dt><dd>{application.number}</dd></div><div><dt>Идентификатор</dt><dd className="id-value">{application.id}</dd></div><div><dt>Компания</dt><dd>{application.company.name}<small>ИНН {application.company.inn}</small></dd></div><div><dt>Продукт</dt><dd>{application.product.name}</dd></div><div><dt>Сумма</dt><dd>{money(application.amount)}</dd></div><div><dt>Срок</dt><dd>{application.termMonths} мес.</dd></div><div><dt>Цель</dt><dd>{application.purposeTitle}</dd></div>{application.purposeDescription && <div><dt>Описание цели</dt><dd>{application.purposeDescription}</dd></div>}</dl>
          </section>
        </div>
        <aside className="side-column"><div className="progress-panel"><p className="side-label">Ход рассмотрения</p><div className="progress-number"><strong>{application.status.progressStep}</strong><span>из {application.status.totalSteps}</span></div><div className="progress-track"><span style={{ width: `${application.status.progressStep / application.status.totalSteps * 100}%` }} /></div><p>{application.status.title}</p></div><div className="history-panel"><p className="side-label">История</p>{application.history.map((entry, index) => <div className="history-item" key={`${entry.occurredAt}-${index}`}><span className="history-marker" /><div><strong>{entry.toStatusTitle}</strong><time>{date(entry.occurredAt)}</time>{entry.comment && <p>{entry.comment}</p>}</div></div>)}</div></aside>
      </div>
    </main>
  )
}
