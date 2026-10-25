import type { Company } from '../../types/api'
import type { FinancingOption, FinancingPreview } from '../../types/financing'
import { calendarDate, money } from './financingDraft'
import { OptionTerms } from './RecommendationStep'

export default function ReviewStep({ data, option, company, saving, onBack, onSubmit }: { data: FinancingPreview; option: FinancingOption; company?: Company; saving: boolean; onBack: () => void; onSubmit: () => void }) {
  return <><div className="flow-heading"><p className="section-kicker">Шаг 3 из 3 · Проверка</p><h1>Проверьте данные перед отправкой</h1></div>
    <div className="content-grid"><section className="details-panel"><h2>Компания и потребность</h2><dl className="detail-list"><div><dt>Компания</dt><dd>{data.company.name}<small>ИНН {data.company.inn}</small></dd></div>{company && <><div><dt>Руководитель</dt><dd>{company.headName}</dd></div><div><dt>Адрес</dt><dd>{company.address}</dd></div><div><dt>Годовая выручка</dt><dd>{money(company.annualRevenue)}</dd></div><div><dt>Чистая прибыль за год</dt><dd>{company.netProfit === null ? 'Нет данных' : money(company.netProfit)}</dd></div></>}<div><dt>Цель</dt><dd>{data.request.purposeTitle}</dd></div><div><dt>Запрошенная сумма</dt><dd>{money(data.request.amount)}</dd></div><div><dt>К какой дате нужны деньги</dt><dd>{calendarDate(data.request.needByDate)}</dd></div></dl></section>
    <section className="preview-option"><span className="option-tag">Предварительные условия</span><h2>{option.productName}</h2><OptionTerms option={option} /><p>{data.disclaimer}</p></section></div>
    <div className="flow-actions"><button type="button" className="secondary-button" disabled={saving} onClick={onBack}>Вернуться к вариантам</button><button type="button" className="primary-button" disabled={saving} onClick={onSubmit}>{saving ? 'Отправляем…' : 'Отправить заявку'}</button></div>
  </>
}
