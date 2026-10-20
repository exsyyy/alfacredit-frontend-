import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem, ApplicationFormValues, Company, FieldErrors, Product } from '../../types/api'
import { toCreateRequest, validateApplicationForm } from './validation'

const initialValues: ApplicationFormValues = {
  companyId: '', productCode: '', amount: '', termMonths: '', purpose: '', purposeDescription: '',
}
const formatMoney = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`

export default function ApplicationFormPage({ api, isDemo = true }: { api: CreditApi; isDemo?: boolean }) {
  const navigate = useNavigate()
  const [values, setValues] = useState<ApplicationFormValues>(initialValues)
  const [products, setProducts] = useState<Product[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const product = products.find((item) => item.code === values.productCode)

  useEffect(() => {
    let active = true
    Promise.all([api.getProducts(), api.getCompanies()])
      .then(([nextProducts, nextCompanies]) => {
        if (!active) return
        setProducts(nextProducts)
        setCompanies(nextCompanies)
        setLoadError('')
      })
      .catch(() => { if (active) setLoadError('Не удалось загрузить продукты и компании.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, reloadKey])

  function update<K extends keyof ApplicationFormValues>(key: K, value: ApplicationFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value, ...(key === 'productCode' ? { purpose: '' } : {}) }))
    setErrors((current) => ({ ...current, [key]: undefined, ...(key === 'productCode' ? { purpose: undefined } : {}) }))
    setSubmitError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateApplicationForm(values, product)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setSubmitError('')
    try {
      const response = await api.createApplication(toCreateRequest(values))
      navigate(`/applications/${response.id}`, { state: { justSaved: true } })
    } catch (error) {
      const issue = error as ApiProblem
      if (issue?.errors) {
        const fieldErrors: FieldErrors = {}
        for (const [field, messages] of Object.entries(issue.errors)) {
          if (field in initialValues) fieldErrors[field as keyof ApplicationFormValues] = messages[0]
        }
        setErrors(fieldErrors)
      }
      setSubmitError(issue?.title || 'Не удалось отправить заявку. Попробуйте снова.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <div className="page-intro">
        <div><p className="section-kicker">Кредитование бизнеса</p><h1>Новая заявка</h1>
          <p className="intro-copy">Выберите условия финансирования. Мы покажем все введённые сведения перед дальнейшей обработкой.</p>
        </div>
        <div className="intro-index" aria-hidden="true">01<span>/ 02</span></div>
      </div>
      {loading ? <div className="state-panel" role="status">Загружаем продукты и сведения о компании…</div> :
        loadError ? <div className="state-panel error-panel" role="alert">{loadError}<button type="button" className="text-button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1) }}>Повторить загрузку</button></div> :
        <div className="content-grid">
          <form className="form-panel" onSubmit={submit} noValidate>
            <div className="panel-heading"><span className="panel-number">1</span><div><h2>Параметры заявки</h2><p>Все поля, кроме описания цели, обязательны.</p></div></div>
            <div className="form-fields">
              <div className="field full-width">
                <label htmlFor="companyId">Компания</label>
                <select id="companyId" value={values.companyId} onChange={(event) => update('companyId', event.target.value)} aria-invalid={!!errors.companyId} aria-describedby={errors.companyId ? 'companyId-error' : undefined}>
                  <option value="">Выберите компанию</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name} · ИНН {company.inn}</option>)}
                </select>
                {errors.companyId && <p className="field-error" id="companyId-error">{errors.companyId}</p>}
              </div>
              <div className="field full-width">
                <label htmlFor="productCode">Кредитный продукт</label>
                <select id="productCode" value={values.productCode} onChange={(event) => update('productCode', event.target.value)} aria-invalid={!!errors.productCode} aria-describedby={errors.productCode ? 'productCode-error' : undefined}>
                  <option value="">Выберите продукт</option>
                  {products.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
                {errors.productCode && <p className="field-error" id="productCode-error">{errors.productCode}</p>}
              </div>
              <div className="field">
                <label htmlFor="amount">Сумма кредита</label>
                <div className="input-suffix"><input id="amount" inputMode="decimal" placeholder="Например, 1 500 000" value={values.amount} onChange={(event) => update('amount', event.target.value)} aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'amount-error' : undefined} /><span>₽</span></div>
                {errors.amount && <p className="field-error" id="amount-error">{errors.amount}</p>}
              </div>
              <div className="field">
                <label htmlFor="termMonths">Срок, месяцев</label>
                <input id="termMonths" inputMode="numeric" placeholder="Например, 12" value={values.termMonths} onChange={(event) => update('termMonths', event.target.value)} aria-invalid={!!errors.termMonths} aria-describedby={errors.termMonths ? 'termMonths-error' : undefined} />
                {errors.termMonths && <p className="field-error" id="termMonths-error">{errors.termMonths}</p>}
              </div>
              <div className="field full-width">
                <label htmlFor="purpose">Цель финансирования</label>
                <select id="purpose" value={values.purpose} onChange={(event) => update('purpose', event.target.value as ApplicationFormValues['purpose'])} aria-invalid={!!errors.purpose} aria-describedby={errors.purpose ? 'purpose-error' : undefined}>
                  <option value="">Выберите цель</option>
                  {product?.allowedPurposes.map((option) => <option key={option.code} value={option.code}>{option.title}</option>)}
                </select>
                {errors.purpose && <p className="field-error" id="purpose-error">{errors.purpose}</p>}
              </div>
              <div className="field full-width">
                <label htmlFor="purposeDescription">Описание цели <span className="optional">необязательно</span></label>
                <textarea id="purposeDescription" rows={3} maxLength={1001} placeholder="Например, закупка товара к сезону" value={values.purposeDescription} onChange={(event) => update('purposeDescription', event.target.value)} aria-invalid={!!errors.purposeDescription} aria-describedby={errors.purposeDescription ? 'purposeDescription-error' : undefined} />
                <span className="char-count">{values.purposeDescription.length} / 1000</span>
                {errors.purposeDescription && <p className="field-error" id="purposeDescription-error">{errors.purposeDescription}</p>}
              </div>
            </div>
            {submitError && <div className="submit-error" role="alert">{submitError}<p>Введённые данные остались в форме. Исправьте отмеченные поля или повторите отправку.</p></div>}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Отправляем…' : submitError ? 'Попробовать снова' : 'Отправить заявку'}</button>
              <p>{isDemo ? 'В демо-режиме заявка сохраняется только на вашем устройстве.' : 'Заявка будет отправлена в локальный API и сохранена в тестовой базе.'}</p>
            </div>
          </form>
          <aside className="side-column">
            <div className="product-panel">
              <p className="side-label">Выбранный продукт</p>
              {product ? <><h2>{product.name}</h2><p className="product-description">{product.description}</p>
                <div className="product-spec"><span>Сумма</span><strong>{formatMoney(product.minAmount)} — {formatMoney(product.maxAmount)}</strong></div>
                <div className="product-spec"><span>Срок</span><strong>{product.minTermMonths}–{product.maxTermMonths} мес.</strong></div>
                <div className="product-spec"><span>Базовая ставка</span><strong>от {product.baseRate} % годовых</strong></div>
                {product.requiresCollateral && <p className="product-note">Для продукта требуется залог.</p>}
              </> : <><h2>Условия появятся здесь</h2><p className="product-description">Выберите продукт в форме, чтобы увидеть доступные сумму, срок и цели.</p></>}
            </div>
            <div className="help-panel"><span className="help-icon" aria-hidden="true">i</span><p>После отправки вы увидите номер заявки, её статус и следующий шаг.</p></div>
          </aside>
        </div>}
    </main>
  )
}
