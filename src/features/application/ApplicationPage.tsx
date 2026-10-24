import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem, Application } from '../../types/api'
import ContractPanel from './ContractPanel'
import { calendarDate } from '../financing/financingDraft'
import AnimatedStatus from '../../components/AnimatedStatus'

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))

const processingStatuses = new Set(['Submitted', 'Validating', 'Enriching', 'Scoring', 'Deciding', 'ManualReview', 'ContractSigning', 'Signed'])
const shouldRefresh = (application: Application, isDemo: boolean) => !application.status.isTerminal && ((application.offer?.response === 'Pending') || (processingStatuses.has(application.status.code) && (!isDemo || ['ContractSigning', 'Signed'].includes(application.status.code))))
type Action = 'acceptOffer' | 'declineOffer' | 'cancel'

export default function ApplicationPage({ api, isDemo = true, onAuthExpired }: { api: CreditApi; isDemo?: boolean; onAuthExpired?: () => void }) {
  const { id } = useParams()
  const location = useLocation()
  const justSaved = Boolean((location.state as { justSaved?: boolean } | null)?.justSaved)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingAction, setPendingAction] = useState<Action | 'requestCode' | 'signContract' | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const actionLock = useRef(false)
  const requestGeneration = useRef(0)
  const statusPanel = useRef<HTMLElement>(null)
  const scrollAfterSigning = useRef(false)

  useEffect(() => {
    if (!scrollAfterSigning.current || !['Signed', 'Disbursed'].includes(application?.status.code ?? '')) return
    scrollAfterSigning.current = false
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    statusPanel.current?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [application?.status.code])

  useEffect(() => {
    let active = true
    let hasApplication = Boolean(application)
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!id) { setError('Не указан идентификатор заявки.'); setLoading(false); return }
    const load = async () => {
      const generation = requestGeneration.current
      try {
        const result = await api.getApplication(id)
        if (!active || generation !== requestGeneration.current || actionLock.current) return
        setApplication(result)
        hasApplication = true
        setError('')
        setRefreshError('')
        if (shouldRefresh(result, isDemo)) timer = setTimeout(load, 2500)
      } catch (problem) {
        if (!active || generation !== requestGeneration.current || actionLock.current) return
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

  const beginAction = (action: Action | 'requestCode' | 'signContract') => {
    if (actionLock.current) return false
    actionLock.current = true
    requestGeneration.current += 1
    setPendingAction(action)
    return true
  }
  const endAction = () => {
    actionLock.current = false
    setPendingAction(null)
    setReloadKey((key) => key + 1)
  }

  const runAction = async (action: Action) => {
    if (!id || !beginAction(action)) return
    setActionError('')
    try {
      const updated = action === 'acceptOffer' ? await api.acceptOffer(id)
        : action === 'declineOffer' ? await api.declineOffer(id)
          : await api.cancelApplication(id)
      setApplication(updated)
    } catch (problem) {
      const issue = problem as ApiProblem
      if (issue?.status === 401) { onAuthExpired?.(); return }
      setActionError(issue?.title || 'Не удалось выполнить действие. Повторите попытку.')
    } finally {
      endAction()
    }
  }

  if (loading) return <main className="page"><div className="state-panel" role="status">Загружаем заявку…</div></main>
  if (error || !application) return <main className="page"><div className="state-panel error-panel" role="alert"><h1>{error || 'Заявка не найдена.'}</h1><p>Проверьте ссылку или повторите загрузку.</p><button type="button" className="secondary-button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1) }}>Повторить</button><Link to="/applications" className="text-link">Мои заявки</Link></div></main>

  const decisionComment = [...application.history].reverse().find((entry) => entry.toStatus === application.status.code && entry.comment?.trim())?.comment
  const refreshing = shouldRefresh(application, isDemo) && !refreshError
  const actions = application.availableActions ?? []
  const reasons = application.decision?.reasons ?? []

  return (
    <main className="page">
      <Link className="back-link" to="/applications">← Мои заявки</Link>
      <div className="detail-heading"><div><p className="section-kicker">Кредитование бизнеса</p><h1>Заявка {application.number}</h1><p className="intro-copy">Создана {date(application.createdAt)}</p></div><span className="status-badge" key={application.status.code}><span />{application.status.title}</span></div>
      {justSaved && <div className="success-banner" role="status">{isDemo ? 'Заявка сохранена в этом браузере. Вы можете вернуться к ней через «Мои заявки».' : 'Заявка сохранена в тестовой базе. Вы можете вернуться к ней через «Мои заявки».'}</div>}
      {refreshing && <p className="refresh-note" role="status">Обновляем статус автоматически</p>}
      {refreshError && <div className="refresh-error" role="alert"><span>{refreshError}</span><button type="button" className="secondary-button" onClick={() => setReloadKey((key) => key + 1)}>Повторить обновление</button></div>}
      <div className="content-grid detail-grid">
        <div className="detail-main">
          <AnimatedStatus statusKey={`${application.id}-${application.status.code}`} panelRef={statusPanel}><p className="side-label">Текущий статус</p><h2>{application.status.title}</h2><p className="status-description">{application.status.description}</p><div className="next-action"><span className="next-action-icon" aria-hidden="true">✓</span><div><strong>Что делать дальше</strong><p>{application.status.clientNextAction}</p></div></div>
            {application.decision?.isSimulated && <p className="simulation-note" role="note">Решение менеджера смоделировано. Настоящий сотрудник заявку не рассматривал.</p>}
            {application.decision?.conditions && <div className="decision-detail"><strong>Изменённые условия</strong><p>{application.decision.conditions}</p></div>}
            {reasons.length > 0 && <div className="decision-detail"><strong>{application.status.code === 'Rejected' ? 'Причины отказа' : application.status.code === 'ApprovedWithConditions' ? 'Почему изменились условия' : 'Основания решения'}</strong><ul className="reason-list">{reasons.map((reason) => <li key={reason.code}><b>{reason.title}</b><span>{reason.explanation}</span></li>)}</ul></div>}
            {application.status.code === 'NeedsClarification' && <div className="decision-detail"><strong>Какие данные нужны</strong><p>{decisionComment || 'Перечень дополнительных данных пока не передан. Проверьте историю заявки позже.'}</p></div>}
            {application.status.code === 'Rejected' && reasons.length === 0 && <div className="decision-detail"><strong>Причина отказа</strong><p>{decisionComment || 'Причина пока не указана. Уточните её у банка.'}</p></div>}
          </AnimatedStatus>
          {application.contract && <ContractPanel key={`${application.id}-${application.contract.id}`} api={api} application={application} busy={pendingAction !== null} onBegin={beginAction} onEnd={endAction} onUpdated={setApplication} onSigned={() => { scrollAfterSigning.current = true }} onReload={() => setReloadKey((key) => key + 1)} onAuthExpired={onAuthExpired} />}
          {application.status.code === 'Signed' && <section className="disbursement-panel" aria-label="Выдача кредита"><h2>Ожидаем выдачи средств</h2><p>Договор подписан. Карточка обновляется автоматически до завершения выдачи.</p>{application.disbursement?.status === 'Failed' && <p className="submit-error" role="alert">{application.disbursement.error || 'Выдача пока не выполнена.'} Следите за статусом заявки. Если задержка сохраняется, обратитесь в банк.</p>}</section>}
          {application.disbursement?.status === 'Completed' && <section className="disbursement-panel" aria-label="Выдача кредита"><h2>Кредит выдан</h2><dl className="detail-list"><div><dt>Сумма выдачи</dt><dd>{money(application.disbursement.amount)}</dd></div><div><dt>Счёт зачисления</dt><dd className="account-number">{application.disbursement.account}</dd></div><div><dt>Дата выдачи</dt><dd>{application.disbursement.completedAt ? date(application.disbursement.completedAt) : 'Уточняется'}</dd></div><div><dt>Платёжное поручение</dt><dd>{application.disbursement.paymentOrderNumber || 'Уточняется'}</dd></div></dl></section>}
          {application.offer && <section className="offer-panel" aria-label="Кредитное предложение"><div className="panel-heading"><span className="panel-number">✓</span><div><h2>Предложение банка</h2><p>{application.offer.response === 'Pending' ? `Действует до ${date(application.offer.expiresAt)}` : `Статус: ${application.offer.response === 'Accepted' ? 'принято' : application.offer.response === 'Declined' ? 'отклонено' : 'истекло'}`}</p></div></div>
            <div className="table-scroll"><table className="comparison-table" aria-label="Запрошено и одобрено"><thead><tr><th>Условия</th><th>Запрошено</th><th>Одобрено</th></tr></thead><tbody><tr><th scope="row">Сумма</th><td>{money(application.amount)}</td><td>{money(application.offer.amount)}</td></tr><tr><th scope="row">Срок возврата</th><td>{application.termMonths} мес.</td><td>{application.offer.termMonths} мес.</td></tr></tbody></table></div>
            <dl className="offer-terms"><div><dt>Ставка</dt><dd>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(application.offer.interestRate)} %</dd></div><div><dt>Ежемесячный платёж</dt><dd>{money(application.offer.monthlyPayment)}</dd></div>{typeof application.offer.totalPayment === 'number' && <div><dt>Общая выплата</dt><dd>{money(application.offer.totalPayment)}</dd></div>}{typeof application.offer.totalInterest === 'number' && <div><dt>Переплата</dt><dd>{money(application.offer.totalInterest)}</dd></div>}</dl>
            {application.offer.totalPayment === undefined && <p className="intro-copy">Общая выплата и переплата пока не переданы банком.</p>}
            {application.needByDate && <p>Деньги нужны к {calendarDate(application.needByDate)}</p>}
          </section>}
          {(actions.includes('acceptOffer') || actions.includes('declineOffer') || actions.includes('cancel')) && <section className="action-panel" aria-label="Действия по заявке"><h2>Действия по заявке</h2><div className="action-buttons">{actions.includes('acceptOffer') && <button type="button" className="primary-button" disabled={pendingAction !== null} onClick={() => void runAction('acceptOffer')}>{pendingAction === 'acceptOffer' ? 'Принимаем…' : 'Принять предложение'}</button>}{actions.includes('declineOffer') && <button type="button" className="secondary-button" disabled={pendingAction !== null} onClick={() => void runAction('declineOffer')}>{pendingAction === 'declineOffer' ? 'Отклоняем…' : 'Отклонить предложение'}</button>}{actions.includes('cancel') && <button type="button" className="secondary-button" disabled={pendingAction !== null} onClick={() => void runAction('cancel')}>{pendingAction === 'cancel' ? 'Отменяем…' : 'Отменить заявку'}</button>}</div>{actionError && <div className="submit-error" role="alert">{actionError}</div>}</section>}
          {actionError && !actions.some((action) => ['acceptOffer', 'declineOffer', 'cancel'].includes(action)) && <div className="submit-error" role="alert">{actionError}</div>}
          <section className="details-panel"><div className="panel-heading"><span className="panel-number">2</span><div><h2>Сведения о заявке</h2><p>Проверьте данные, которые вы указали.</p></div></div>
            <dl className="detail-list"><div><dt>Номер заявки</dt><dd>{application.number}</dd></div><div><dt>Идентификатор</dt><dd className="id-value">{application.id}</dd></div><div><dt>Компания</dt><dd>{application.company.name}<small>ИНН {application.company.inn}</small></dd></div><div><dt>Продукт</dt><dd>{application.product.name}</dd></div><div><dt>Сумма</dt><dd>{money(application.amount)}</dd></div><div><dt>Срок</dt><dd>{application.termMonths} мес.</dd></div><div><dt>Цель</dt><dd>{application.purposeTitle}</dd></div>{application.purposeDescription && <div><dt>Описание цели</dt><dd>{application.purposeDescription}</dd></div>}</dl>
          </section>
        </div>
        <aside className="side-column"><div className="progress-panel"><p className="side-label">Ход рассмотрения</p><div className="progress-number"><strong>{application.status.progressStep}</strong><span>из {application.status.totalSteps}</span></div><div className="progress-track"><span style={{ width: `${application.status.progressStep / application.status.totalSteps * 100}%` }} /></div><p>{application.status.title}</p></div><div className="history-panel"><p className="side-label">История</p>{application.history.map((entry, index) => <div className="history-item" key={`${entry.occurredAt}-${index}`}><span className="history-marker" /><div><strong>{entry.toStatusTitle}</strong><time>{date(entry.occurredAt)}</time>{entry.comment && <p>{entry.comment}</p>}</div></div>)}</div></aside>
      </div>
    </main>
  )
}
