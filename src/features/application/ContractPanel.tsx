import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem, Application, Contract, SignCodeResponse } from '../../types/api'

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))

interface Props {
  api: CreditApi
  application: Application
  busy: boolean
  onBegin: (action: 'requestCode' | 'signContract') => boolean
  onEnd: () => void
  onUpdated: (application: Application) => void
  onReload: () => void
  onAuthExpired?: () => void
}

export default function ContractPanel({ api, application, busy, onBegin, onEnd, onUpdated, onReload, onAuthExpired }: Props) {
  const summary = application.contract!
  const [contract, setContract] = useState<Contract | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [code, setCode] = useState('')
  const [issued, setIssued] = useState<SignCodeResponse | null>(null)
  const [error, setError] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [documentHtml, setDocumentHtml] = useState('')
  const [documentBusy, setDocumentBusy] = useState(false)
  const [documentError, setDocumentError] = useState('')
  const [documentReady, setDocumentReady] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const mounted = useRef(true)
  const documentLock = useRef(false)
  const documentGeneration = useRef(0)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    let active = true
    setContract(null)
    setLoadError('')
    setDocumentUrl('')
    setDocumentHtml('')
    setDocumentError('')
    setDocumentReady(false)
    setDocumentBusy(false)
    documentLock.current = false
    documentGeneration.current += 1
    api.getContract(application.id).then((result) => { if (active) setContract(result) }).catch((problem: ApiProblem) => {
      if (!active) return
      if (problem?.status === 401) onAuthExpired?.()
      else setLoadError(problem?.title || 'Не удалось загрузить договор.')
    })
    return () => { active = false }
  }, [api, application.id, summary.id, summary.status, application.disbursement?.status, application.disbursement?.completedAt, reload, onAuthExpired])

  useEffect(() => () => { if (documentUrl) URL.revokeObjectURL(documentUrl) }, [documentUrl])

  const signing = summary.signing
  const codeExpired = Boolean(signing.codeExpiresAt && Date.parse(signing.codeExpiresAt) <= Date.now())
  const canSign = application.availableActions.includes('signContract') && summary.status === 'AwaitingSignature' && Date.parse(summary.signingDeadline) > Date.now()
  const hasCode = Boolean(signing.codeRequestedAt)
  const codeUsable = hasCode && !codeExpired && signing.attemptsLeft > 0

  async function requestCode() {
    if (!canSign || !signing.canRequestCode || !onBegin('requestCode')) return
    setError('')
    setCode('')
    setIssued(null)
    try {
      const result = await api.requestSigningCode(application.id)
      if (!mounted.current) return
      setIssued(result)
      onUpdated(await api.getApplication(application.id))
    } catch (problem) {
      const issue = problem as ApiProblem
      if (issue?.status === 401) onAuthExpired?.()
      else { setError(issue?.detail || issue?.title || 'Не удалось получить код. Повторите запрос.'); onReload() }
    } finally { if (mounted.current) onEnd() }
  }

  async function sign(event: FormEvent) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) { setError('Введите 6 цифр кода подтверждения.'); return }
    if (!canSign || !codeUsable || !onBegin('signContract')) return
    setError('')
    try {
      const updated = await api.signContract(application.id, code)
      if (!mounted.current) return
      setCode('')
      setIssued(null)
      onUpdated(updated)
    } catch (problem) {
      const issue = problem as ApiProblem
      if (issue?.status === 401) onAuthExpired?.()
      else {
        const codeErrors = Object.entries(issue?.errors ?? {}).find(([key]) => key.toLowerCase() === 'code')?.[1]
        setError(codeErrors?.[0] || issue?.detail || issue?.title || 'Не удалось подписать договор. Повторите попытку.')
        onReload()
      }
    } finally { if (mounted.current) onEnd() }
  }

  async function loadDocument() {
    if (documentLock.current) return
    documentLock.current = true
    const generation = documentGeneration.current
    setDocumentBusy(true)
    setDocumentError('')
    setDocumentReady(false)
    try {
      const blob = await api.getContractDocument(application.id)
      const html = await blob.text()
      if (mounted.current && generation === documentGeneration.current) { setDocumentHtml(html); setDocumentUrl(URL.createObjectURL(blob)) }
    } catch (problem) {
      if (!mounted.current || generation !== documentGeneration.current) return
      const issue = problem as ApiProblem
      if (issue?.status === 401) onAuthExpired?.()
      else setDocumentError(issue?.title || 'Не удалось загрузить печатную форму. Повторите запрос.')
    } finally { if (mounted.current && generation === documentGeneration.current) { documentLock.current = false; setDocumentBusy(false) } }
  }

  return <section className="contract-panel" aria-label="Кредитный договор">
    <div className="panel-heading"><span className="panel-number">✎</span><div><h2>Договор {summary.number}</h2><p>{summary.signedAt ? `Подписан ${date(summary.signedAt)}` : summary.status === 'AwaitingSignature' ? `Подпишите до ${date(summary.signingDeadline)}` : summary.status === 'Expired' ? 'Срок подписания истёк' : 'Договор отменён'}</p></div></div>
    <dl className="offer-terms"><div><dt>Сумма кредита</dt><dd>{money(summary.amount)}</dd></div><div><dt>Срок и ставка</dt><dd>{summary.termMonths} мес. · {summary.interestRate} %</dd></div><div><dt>Ежемесячный платёж</dt><dd>{money(summary.monthlyPayment)}</dd></div><div><dt>Всего к возврату</dt><dd>{money(summary.totalPayment)}</dd></div><div><dt>Переплата</dt><dd>{money(summary.totalInterest)}</dd></div><div><dt>Счёт зачисления</dt><dd className="account-number">{summary.disbursementAccount}</dd></div></dl>
    {loadError ? <div className="submit-error" role="alert">{loadError}<button className="text-button" type="button" onClick={() => setReload((value) => value + 1)}>Повторить загрузку договора</button></div> : !contract ? <p role="status">Загружаем договор и график платежей…</p> : <>
      <p className="contract-parties">{contract.lender.name}<br />Заёмщик: {contract.borrower.name}, ИНН {contract.borrower.inn}</p>
      <details className="schedule" open><summary>График платежей · {contract.schedule.length} платежей</summary><p>{application.disbursement?.status === 'Completed' ? 'Даты платежей рассчитаны от даты выдачи средств.' : 'До выдачи средств даты платежей ориентировочные.'}</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Прокрутка графика"><table aria-label="График платежей"><thead><tr><th scope="col">№</th><th scope="col">Дата</th><th scope="col">Платёж</th><th scope="col">Основной долг</th><th scope="col">Проценты</th><th scope="col">Остаток</th></tr></thead><tbody>{contract.schedule.map((row) => <tr key={row.number}><td>{row.number}</td><td>{new Intl.DateTimeFormat('ru-RU').format(new Date(`${row.dueDate}T12:00:00`))}</td><td>{money(row.payment)}</td><td>{money(row.principal)}</td><td>{money(row.interest)}</td><td>{money(row.balance)}</td></tr>)}</tbody></table></div></details>
      <button type="button" className="secondary-button" disabled={documentBusy || busy} onClick={() => void loadDocument()}>{documentBusy ? 'Загружаем документ…' : 'Открыть печатную форму'}</button>
      {documentError && <p className="submit-error" role="alert">{documentError}</p>}
      {documentUrl && <div className="document-preview"><div className="action-buttons"><button type="button" className="secondary-button" disabled={!documentReady} onClick={() => { try { frame.current?.contentWindow?.print() } catch { setDocumentError('Скачайте документ и откройте его для печати.') } }}>Печать</button><a className="text-link" href={documentUrl} download={`${summary.number}.html`}>Скачать HTML</a><button type="button" className="text-button" onClick={() => setDocumentUrl('')}>Закрыть документ</button></div><iframe ref={frame} title="Печатная форма договора" srcDoc={documentHtml} sandbox="allow-same-origin allow-modals" onLoad={() => setDocumentReady(true)} /></div>}
    </>}
    {canSign && <div className="signing-panel"><h3>Подписание договора</h3><p>Ознакомьтесь с условиями и графиком платежей, затем подтвердите подписание кодом.</p>
      <button type="button" className="secondary-button" disabled={busy || !signing.canRequestCode || !contract} onClick={() => void requestCode()}>{busy ? 'Выполняем запрос…' : hasCode ? 'Получить новый код' : 'Получить код'}</button>
      {issued?.demoCode && issued.codeExpiresAt === signing.codeExpiresAt && !codeExpired && <div className="demo-code-panel"><p className="simulation-note" role="note">Имитация SMS. Демо-код: {issued.demoCode}. Настоящее SMS не отправлялось.</p><button type="button" className="secondary-button" disabled={busy} onClick={() => { setCode(issued.demoCode!); setError('') }}>Вставить демо-код</button><p>Код возвращён тестовым API для проверки полного сценария. После обновления страницы запросите новый код.</p></div>}
      {issued && !issued.demoCode && <p role="status">Код отправлен в ленту событий кабинета.</p>}
      {hasCode && <form onSubmit={(event) => void sign(event)} noValidate><label htmlFor="signing-code">Код подтверждения</label><div className="code-controls"><input id="signing-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} aria-describedby="signing-help" disabled={busy} /><button className="primary-button" type="submit" disabled={busy || !codeUsable || code.length !== 6 || !contract}>Подписать договор</button></div><div id="signing-help"><p>Осталось попыток: {signing.attemptsLeft}</p><p>Код действует до {date(signing.codeExpiresAt!)}</p></div></form>}
      {codeExpired && <p className="submit-error" role="alert">Срок действия кода истёк. Запросите новый код.</p>}
      {hasCode && signing.attemptsLeft <= 0 && <p className="submit-error" role="alert">Попытки исчерпаны. Запросите новый код.</p>}
      {error && <p className="submit-error" role="alert">{error}</p>}
    </div>}
  </section>
}
