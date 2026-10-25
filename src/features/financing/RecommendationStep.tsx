import type { FinancingOption, FinancingPreview } from '../../types/financing'
import { calendarDate, money } from './financingDraft'
import Disclosure from '../../components/Disclosure'

interface Props { data: FinancingPreview | null; fresh: boolean; busy: boolean; selectedCode: string; term: string; termError?: string; onTerm: (value: string) => void; onAutoTerm: () => void; onSelect: (code: string) => void; onAmount: (amount: number) => void; onBack: () => void; onContinue: () => void }
export function OptionTerms({ option }: { option: FinancingOption }) {
  const { cost } = option
  const rate = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
  return <dl className="offer-terms preview-terms"><div><dt>Сумма</dt><dd>{money(option.amount)}</dd></div><div><dt>Срок возврата</dt><dd>{option.termMonths} мес.</dd></div><div><dt>Ставка</dt><dd>{rate.format(cost.interestRate)}–{rate.format(cost.maxInterestRate)} %</dd></div><div><dt>Платёж в месяц</dt><dd>{money(cost.monthlyPayment)} — {money(cost.maxMonthlyPayment)}</dd></div><div><dt>Общая выплата от</dt><dd>{money(cost.totalPayment)}</dd></div><div><dt>Переплата</dt><dd>{money(cost.totalInterest)} — {money(cost.maxTotalInterest)}</dd></div></dl>
}
export default function RecommendationStep({ data, fresh, busy, selectedCode, term, termError, onTerm, onAutoTerm, onSelect, onAmount, onBack, onContinue }: Props) {
  const primary = data?.options.find((item) => item.isRecommended) ?? data?.options[0]
  const alternative = data?.options.find((item) => item.productCode !== primary?.productCode && item.productCode === selectedCode) ?? data?.options.find((item) => item.productCode !== primary?.productCode)
  const options = [primary, alternative].filter((item): item is FinancingOption => Boolean(item))
  const selected = data?.options.find((item) => item.productCode === selectedCode)
  const rate = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
  const principalShare = selected && selected.cost.totalPayment > 0 ? Math.min(100, Math.max(0, selected.amount / selected.cost.totalPayment * 100)) : 0
  return <><div className="flow-heading"><div><p className="section-kicker">Шаг 2 из 3 · Рекомендация</p><h1>Выберите подходящий вариант</h1><p className="intro-copy">Сравните стоимость и выберите условия для вашей задачи.</p></div>{data && <div className="calculation-date"><span>Расчёт по Москве</span><strong>{calendarDate(data.calculationDate)}</strong></div>}</div>
    {data && <section className="need-recap" aria-label="Ваша потребность"><div><span>Вам нужно</span><strong>{money(data.request.amount)}</strong></div><div><span>Цель финансирования</span><b>{data.request.purposeTitle}</b><small>{data.company.name}</small></div><div><span>Деньги нужны к</span><b>{calendarDate(data.request.needByDate)}</b></div></section>}
    <div className="comparison-toolbar"><h2>Подходящие варианты</h2></div>
    {(busy || !data) && <p className="refresh-note" role="status">Рассчитываем предварительные условия…</p>}
    <>
      {selectedCode && !selected && fresh && <p className="submit-error" role="alert">Ранее выбранный продукт больше не подходит. Выберите другой вариант или измените параметры.</p>}
      <div className="recommendation-workspace">
      <div className="comparison-main">
      {options.length > 0 && <div className={`financing-table-wrap${fresh ? '' : ' updating'}`} aria-busy={!fresh}><table className="financing-table" aria-label="Сравнение предварительных условий"><thead><tr><th scope="col">Продукт</th><th scope="col">Ставка</th><th scope="col">Платёж в месяц от</th><th scope="col">Общая выплата от</th></tr></thead><tbody>{options.map(option => <tr key={option.productCode} className={selectedCode === option.productCode ? 'selected' : ''}><th scope="row"><label className="comparison-choice"><input type="radio" name="financing-option" aria-label={`Выбрать ${option.productName}`} checked={selectedCode === option.productCode} disabled={!fresh} onChange={() => onSelect(option.productCode)} /><span><strong>{option.productName}</strong><small className={option.isRecommended ? 'recommended-label' : ''}>{option.isRecommended ? 'Рекомендуем' : 'Альтернатива'}</small></span></label></th><td>{rate(option.cost.interestRate)}–{rate(option.cost.maxInterestRate)} %</td><td>{money(option.cost.monthlyPayment)}</td><td>{money(option.cost.totalPayment)}</td></tr>)}</tbody></table></div>}
      <section className="cost-breakdown" aria-label="Стоимость выбранного варианта" aria-busy={busy}>
        <div className="cost-breakdown-heading"><h2>Состав общей выплаты</h2><div className="term-editor"><div className="field"><label htmlFor="preview-term">Срок возврата, месяцев</label><input id="preview-term" inputMode="numeric" value={term} placeholder={selected ? `Подобран: ${selected.termMonths}` : 'Автоматически'} onChange={(event) => { if (!/[-+.,eE]/.test(event.target.value)) onTerm(event.target.value.replace(/\D/g, '')) }} aria-invalid={!!termError} aria-describedby={termError ? 'preview-term-error' : undefined} />{termError && <p id="preview-term-error" className="field-error">{termError}</p>}</div><button className="text-button" type="button" disabled={busy} onClick={onAutoTerm}>Подобрать автоматически</button></div></div>
        {selected && <div className={fresh ? '' : 'updating'}><dl className="cost-breakdown-values"><div><dt>Общая выплата от</dt><dd>{money(selected.cost.totalPayment)}</dd></div><div><dt>Переплата</dt><dd>{money(selected.cost.totalInterest)} — {money(selected.cost.maxTotalInterest)}</dd></div></dl>
        <div className="cost-proportions" role="img" aria-label={`При базовой ставке: сумма кредита ${money(selected.amount)}, проценты ${money(selected.cost.totalInterest)}`}><span style={{ width: `${principalShare}%` }} /><span /></div><div className="cost-proportions-legend"><span>Кредит {money(selected.amount)}</span><span>Проценты от {money(selected.cost.totalInterest)}</span></div>
        <p className="cost-range-note">Расчёт предварительный. Ставка и итоговая стоимость зависят от решения банка.</p></div>}
      </section>
      </div>
      <aside className="selection-summary" aria-label="Выбранные условия">
        <p className="side-label">Ваш выбор</p>{selected ? <><h2>{selected.productName}</h2><div className={`selected-payment${fresh ? '' : ' updating'}`}><span>Ежемесячный платёж от</span><strong>{money(selected.cost.monthlyPayment)}</strong><small>до {money(selected.cost.maxMonthlyPayment)}</small></div><dl className="selection-facts"><div><dt>Сумма</dt><dd>{money(selected.amount)}</dd></div><div><dt>Срок возврата</dt><dd>{selected.termMonths} мес.</dd></div><div><dt>Ставка годовых</dt><dd>{rate(selected.cost.interestRate)}–{rate(selected.cost.maxInterestRate)} %</dd></div></dl></> : <p className="selection-empty">Выберите подходящий вариант в таблице.</p>}
        <button type="button" className="primary-button" disabled={!fresh || !selected} onClick={onContinue}>Проверить данные</button><p className="selection-note">Заявку отправим после проверки данных на следующем шаге.</p>
      </aside>
      </div>
      {selected && <section className="selected-explanation" aria-label="Объяснение выбранного варианта"><div className={`funding-estimate${selected.funding.inTime ? '' : ' late'}`}><strong>{selected.funding.inTime ? 'При одобрении ориентировочно' : 'Позже нужной даты, ориентировочно'} {calendarDate(selected.funding.expectedDate)}</strong><p>{selected.funding.explanation}</p></div><div className="selected-explanation-body"><p className="affordability"><b>{selected.affordability.level === 'InsufficientData' ? 'Недостаточно данных для оценки нагрузки' : 'Оценка нагрузки'}</b><br />{selected.affordability.explanation}</p><ul className="preview-notes">{selected.explanations.map(note => <li key={note.code}>{note.text}</li>)}</ul>
        {selected.limitations.length > 0 && <Disclosure summary="Ограничения и возможные изменения"><ul className="preview-notes">{selected.limitations.map(note => <li key={note.code}>{note.text}</li>)}</ul></Disclosure>}
        {selected.requirements.length > 0 && <Disclosure summary="Что понадобится"><ul className="preview-notes">{selected.requirements.map(note => <li key={note.code}>{note.text}</li>)}</ul></Disclosure>}
        {selected.suggestedAmount && <div className="amount-suggestion"><p>{selected.suggestedAmount.text}</p><button type="button" className="secondary-button" disabled={!fresh} onClick={() => onAmount(selected.suggestedAmount!.amount)}>Пересчитать на {money(selected.suggestedAmount.amount)}</button></div>}
      </div></section>}
      {data?.options.length === 0 && <div className="state-panel"><h2>Подходящих вариантов пока нет</h2><p>Измените потребность или изучите причины ниже.</p></div>}
      {data && data.unsuitable.length > 0 && <Disclosure className="other-products" defaultOpen={data.options.length === 0} summary="Почему другие продукты не подходят">{data.unsuitable.map((item) => <div key={item.productCode}><h3>{item.productName}</h3><ul>{item.reasons.map((note) => <li key={note.code}>{note.text}</li>)}</ul>{item.suggestedAmount && <><p>{item.suggestedAmount.text}</p><button className="secondary-button" type="button" disabled={!fresh} onClick={() => onAmount(item.suggestedAmount!.amount)}>Пересчитать на {money(item.suggestedAmount.amount)}</button></>}</div>)}</Disclosure>}
      {data && <p className="preview-disclaimer">{data.disclaimer}</p>}
    </>
    <div className="flow-actions"><button type="button" className="secondary-button" onClick={onBack}>Изменить потребность</button></div>
  </>
}
