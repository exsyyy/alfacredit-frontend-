import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import useMotionNavigate from '../../components/useMotionNavigate'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem, Company } from '../../types/api'
import type { FinancingPreviewRequest } from '../../types/financing'
import NeedStep from './NeedStep'
import RecommendationStep from './RecommendationStep'
import ReviewStep from './ReviewStep'
import { draftKey, readDraft, validateNeed, type FinancingDraft } from './financingDraft'
import { useFinancingPreview } from './useFinancingPreview'

export default function FinancingFlowPage({ api, owner, isDemo, onAuthExpired }: { api: CreditApi; owner: string; isDemo: boolean; onAuthExpired?: () => void }) {
  const navigate = useMotionNavigate()
  const location = useLocation()
  const step = location.pathname.split('/').pop() ?? 'need'
  const [draft, setDraft] = useState(() => readDraft(owner))
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingLock = useRef(false)
  const submitted = useRef(false)
  const preview = useFinancingPreview(api, onAuthExpired)
  const validation = validateNeed(draft)
  const valid = Object.keys(validation).length === 0 && companies.some((company) => company.id === draft.companyId)
  const body: FinancingPreviewRequest = { companyId: draft.companyId, amount: Number(draft.amount), purpose: draft.purpose as FinancingPreviewRequest['purpose'], needByDate: draft.needByDate, ...(draft.termMonths ? { termMonths: Number(draft.termMonths) } : {}) }
  const bodyKey = JSON.stringify(body)
  const fresh = valid && preview.key === bodyKey && !preview.busy && !preview.error
  const selected = preview.data?.options.find((option) => option.productCode === draft.selectedCode)

  useEffect(() => {
    if (submitted.current) return
    try { sessionStorage.setItem(draftKey(owner), JSON.stringify(draft)) } catch { /* Keep the in-memory draft usable. */ }
  }, [draft, owner])
  useEffect(() => {
    let active = true
    setLoading(true)
    api.getCompanies().then((result) => {
      if (!active) return
      setCompanies(result)
      setLoadError(result.length ? '' : 'Нет доступных компаний для оформления заявки.')
      if (result.length === 1) setDraft((current) => ({ ...current, companyId: result[0].id }))
    }).catch((problem: ApiProblem) => {
      if (!active) return
      if (problem?.status === 401) onAuthExpired?.()
      else setLoadError(problem?.title || 'Не удалось загрузить компании.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, onAuthExpired, reload])
  useEffect(() => {
    if (step === 'need' || !valid || preview.key === bodyKey) return
    const timer = setTimeout(() => void preview.run(JSON.parse(bodyKey) as FinancingPreviewRequest), 300)
    return () => clearTimeout(timer)
  }, [bodyKey, step, valid, preview.run])
  useEffect(() => {
    if (fresh && !draft.selectedCode && preview.data?.options.length) {
      const recommended = preview.data.options.find((option) => option.isRecommended) ?? preview.data.options[0]
      setDraft((current) => ({ ...current, selectedCode: recommended.productCode }))
    }
  }, [fresh, draft.selectedCode, preview.data])
  useEffect(() => {
    if (!preview.error?.errors) return
    const fieldErrors: Record<string, string> = {}
    for (const [key, messages] of Object.entries(preview.error.errors)) {
      const field = key.charAt(0).toLowerCase() + key.slice(1)
      if (messages[0]) fieldErrors[field] = messages[0]
    }
    setErrors(fieldErrors)
  }, [preview.error])

  const update = (field: keyof FinancingDraft, value: string) => {
    if (field === 'termMonths') value = value.replace(/^0+(?=\d)/, '')
    if (draft[field] === value) return
    preview.cancel()
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setSaveError('')
  }
  async function submit() {
    if (!fresh || !selected || savingLock.current) return
    savingLock.current = true
    setSaving(true)
    setSaveError('')
    try {
      const created = await api.createApplication(selected.applyWith)
      submitted.current = true
      try { sessionStorage.removeItem(draftKey(owner)) } catch { /* The saved card remains available from the list. */ }
      navigate(`/applications/${created.id}`, { state: { justSaved: true } })
    } catch (problem) {
      const issue = problem as ApiProblem
      if (issue?.status === 401) onAuthExpired?.()
      else setSaveError(issue?.detail || issue?.title || 'Не удалось отправить заявку. Данные сохранены, проверьте соединение и повторите попытку.')
    } finally { savingLock.current = false; setSaving(false) }
  }

  if (!['need', 'recommendation', 'review'].includes(step)) return <Navigate to="/financing/need" replace />
  if (loading) return <main className="page"><div className="state-panel" role="status">Загружаем сведения компании…</div></main>
  if (loadError) return <main className="page"><div className="state-panel error-panel" role="alert">{loadError}<button type="button" className="secondary-button" onClick={() => setReload((current) => current + 1)}>Повторить загрузку</button></div></main>
  if (step !== 'need' && !valid && !validation.termMonths) return <Navigate to="/financing/need" replace />
  if (step === 'review' && fresh && !selected) return <Navigate to="/financing/recommendation" replace />
  return <main className="page financing-page">
    <nav className="flow-progress" aria-label="Шаги оформления">{['Потребность', 'Рекомендация', 'Проверка'].map((label, index) => <span key={label} aria-current={['need', 'recommendation', 'review'][index] === step ? 'step' : undefined}><b>{index + 1}</b>{label}</span>)}</nav>
    {isDemo && <p className="simulation-note">Демо-пример из документации: 1 500 000 ₽ на оборотные средства, 12 месяцев. Для других параметров нужен API.</p>}
    {preview.error && <div className="refresh-error" role="alert"><div><strong>{preview.error.title}</strong>{preview.error.detail && <p>{preview.error.detail}</p>}{preview.error.errors && <ul>{Object.values(preview.error.errors).flat().map((message) => <li key={message}>{message}</li>)}</ul>}</div><button type="button" className="secondary-button" disabled={!valid || preview.busy} onClick={() => void preview.run(body)}>Повторить расчёт</button></div>}
    {saveError && <div className="submit-error" role="alert">{saveError}</div>}
    {step === 'need' ? <NeedStep draft={draft} companies={companies} errors={errors} update={update} onContinue={() => { const nextErrors = validateNeed(draft); delete nextErrors.termMonths; setErrors(nextErrors); if (Object.keys(nextErrors).length === 0) navigate('/financing/recommendation') }} /> : step === 'review' ? fresh && selected && preview.data ? <ReviewStep data={preview.data} option={selected} company={companies.find((company) => company.id === draft.companyId)} saving={saving} onBack={() => navigate('/financing/recommendation')} onSubmit={() => void submit()} /> : <section className="state-panel"><h1>Восстанавливаем выбранные условия</h1><p role="status">{preview.error ? 'Не удалось обновить расчёт. Повторите запрос или вернитесь к вариантам.' : 'Проверяем актуальность расчёта перед отправкой заявки…'}</p><button type="button" className="secondary-button" onClick={() => navigate('/financing/recommendation')}>Вернуться к вариантам</button></section> : <RecommendationStep data={preview.data} fresh={fresh} busy={preview.busy} selectedCode={draft.selectedCode} term={draft.termMonths} termError={validation.termMonths} onTerm={(value) => update('termMonths', value)} onAutoTerm={() => { if (draft.termMonths) update('termMonths', ''); else { const { termMonths: _term, ...automaticBody } = body; void preview.run(automaticBody) } }} onSelect={(code) => setDraft((current) => ({ ...current, selectedCode: code }))} onAmount={(amount) => update('amount', String(amount))} onBack={() => navigate('/financing/need')} onContinue={() => { if (fresh && selected) navigate('/financing/review') }} />}
    <p className="catalog-link"><Link className="text-link" to="/catalog">Перейти к обычной заявке из каталога</Link></p>
  </main>
}
