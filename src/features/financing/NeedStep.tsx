import type { Company } from '../../types/api'
import MoneyInput from '../../components/MoneyInput'
import { purposeTitles } from '../../api/mockData'
import { latestNeedDate, moscowToday, type FinancingDraft } from './financingDraft'

interface Props { draft: FinancingDraft; companies: Company[]; errors: Record<string, string>; update: (field: keyof FinancingDraft, value: string) => void; onContinue: () => void }
export default function NeedStep({ draft, companies, errors, update, onContinue }: Props) {
  const error = (field: string) => errors[field] && <p className="field-error" id={`need-${field}-error`}>{errors[field]}</p>
  return <><div className="flow-heading"><p className="section-kicker">Шаг 1 из 3 · Потребность</p><h1>На что нужны деньги?</h1><p className="intro-copy">Расскажите о задаче — подберём финансирование и покажем предварительную стоимость.</p></div>
    <div className="content-grid"><form className="form-panel flow-form" onSubmit={(event) => { event.preventDefault(); onContinue() }} noValidate>
      {companies.length === 1 ? <div className="company-summary"><span className="side-label">Ваша компания</span><strong>{companies[0].name}</strong><span>ИНН {companies[0].inn}</span><small>Компания выбрана автоматически</small></div> : <div className="field"><label htmlFor="need-company">Компания</label><select id="need-company" value={draft.companyId} onChange={(event) => update('companyId', event.target.value)} aria-invalid={!!errors.companyId}><option value="">Выберите компанию</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name} · ИНН {company.inn}</option>)}</select>{error('companyId')}</div>}
      <div className="field"><label htmlFor="need-purpose">Цель финансирования</label><select id="need-purpose" value={draft.purpose} onChange={(event) => update('purpose', event.target.value)} aria-invalid={!!errors.purpose}><option value="">Выберите цель</option>{Object.entries(purposeTitles).map(([code, title]) => <option key={code} value={code}>{title}</option>)}</select>{error('purpose')}</div>
      <div className="field"><label htmlFor="need-amount">Сумма кредита</label><div className="input-suffix"><MoneyInput id="need-amount" value={draft.amount} onChange={(value) => update('amount', value)} placeholder="1 500 000" aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'need-amount-error' : undefined} /><span>₽</span></div>{error('amount')}</div>
      <div className="field"><label htmlFor="need-date">К какой дате нужны деньги</label><input id="need-date" type="date" min={moscowToday()} max={latestNeedDate()} value={draft.needByDate} onChange={(event) => update('needByDate', event.target.value)} aria-invalid={!!errors.needByDate} aria-describedby="need-date-help" /><small id="need-date-help">Это дата получения денег. Срок возврата выберете на следующем шаге.</small>{error('needByDate')}</div>
      <div className="flow-actions"><button type="submit" className="primary-button">Подобрать финансирование</button></div>
    </form><aside className="side-column"><div className="help-panel"><p className="side-label">Сначала — понятные условия</p><h2>Сравним стоимость</h2><p>Покажем платёж, общую выплату, переплату и ориентир получения денег при одобрении.</p><p>Точные условия банк предложит после проверки заявки.</p></div></aside></div>
  </>
}
