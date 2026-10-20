import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { CreditApi } from '../../api/creditApi'
import type { Application } from '../../types/api'

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))

export default function ApplicationPage({ api, isDemo = true }: { api: CreditApi; isDemo?: boolean }) {
  const { id } = useParams()
  const location = useLocation()
  const justSaved = Boolean((location.state as { justSaved?: boolean } | null)?.justSaved)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    if (!id) { setError('Не указан идентификатор заявки.'); setLoading(false); return }
    api.getApplication(id)
      .then((result) => { if (active) { setApplication(result); setError('') } })
      .catch((problem: { title?: string }) => { if (active) setError(problem.title || 'Не удалось загрузить заявку.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, id, reloadKey])

  if (loading) return <main className="page"><div className="state-panel" role="status">Загружаем заявку…</div></main>
  if (error || !application) return <main className="page"><div className="state-panel error-panel" role="alert"><h1>{error || 'Заявка не найдена.'}</h1><p>Проверьте ссылку или повторите загрузку.</p><button type="button" className="secondary-button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1) }}>Повторить</button><Link to="/" className="text-link">Новая заявка</Link></div></main>

  return (
    <main className="page">
      <Link className="back-link" to="/">← К форме заявки</Link>
      <div className="detail-heading"><div><p className="section-kicker">Кредитование бизнеса</p><h1>Заявка {application.number}</h1><p className="intro-copy">Создана {date(application.createdAt)}</p></div><span className="status-badge"><span />{application.status.title}</span></div>
      {justSaved && <div className="success-banner" role="status">{isDemo ? 'Заявка сохранена в этом браузере. Вы можете вернуться к ней по этой ссылке.' : 'Заявка сохранена в тестовой базе. Вы можете вернуться к ней по этой ссылке после входа.'}</div>}
      <div className="content-grid detail-grid">
        <div className="detail-main">
          <section className="next-step-panel"><p className="side-label">Текущий статус</p><h2>{application.status.title}</h2><p>{application.status.description}</p><div className="next-action"><span className="next-action-icon" aria-hidden="true">✓</span><div><strong>Что делать дальше</strong><p>{application.status.clientNextAction}</p></div></div></section>
          <section className="details-panel"><div className="panel-heading"><span className="panel-number">2</span><div><h2>Сведения о заявке</h2><p>Проверьте данные, которые вы указали.</p></div></div>
            <dl className="detail-list"><div><dt>Номер заявки</dt><dd>{application.number}</dd></div><div><dt>Идентификатор</dt><dd className="id-value">{application.id}</dd></div><div><dt>Компания</dt><dd>{application.company.name}<small>ИНН {application.company.inn}</small></dd></div><div><dt>Продукт</dt><dd>{application.product.name}</dd></div><div><dt>Сумма</dt><dd>{money(application.amount)}</dd></div><div><dt>Срок</dt><dd>{application.termMonths} мес.</dd></div><div><dt>Цель</dt><dd>{application.purposeTitle}</dd></div>{application.purposeDescription && <div><dt>Описание цели</dt><dd>{application.purposeDescription}</dd></div>}</dl>
          </section>
        </div>
        <aside className="side-column"><div className="progress-panel"><p className="side-label">Ход рассмотрения</p><div className="progress-number"><strong>{application.status.progressStep}</strong><span>из {application.status.totalSteps}</span></div><div className="progress-track"><span style={{ width: `${application.status.progressStep / application.status.totalSteps * 100}%` }} /></div><p>Заявка отправлена</p></div><div className="history-panel"><p className="side-label">История</p>{application.history.map((entry, index) => <div className="history-item" key={`${entry.occurredAt}-${index}`}><span className="history-marker" /><div><strong>{entry.toStatusTitle}</strong><time>{date(entry.occurredAt)}</time>{entry.comment && <p>{entry.comment}</p>}</div></div>)}</div></aside>
      </div>
    </main>
  )
}
