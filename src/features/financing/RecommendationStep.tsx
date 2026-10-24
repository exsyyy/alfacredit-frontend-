import { Link } from 'react-router-dom'
import type { FinancingOption, FinancingPreview } from '../../types/financing'
import { calendarDate, money } from './financingDraft'

interface Props { data: FinancingPreview | null; fresh: boolean; busy: boolean; selectedCode: string; term: string; termError?: string; onTerm: (value: string) => void; onSelect: (code: string) => void; onAmount: (amount: number) => void; onBack: () => void; onContinue: () => void }
export function OptionTerms({ option }: { option: FinancingOption }) {
  const { cost } = option
  const rate = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
  return <dl className="offer-terms preview-terms"><div><dt>Сумма</dt><dd>{money(option.amount)}</dd></div><div><dt>Срок возврата</dt><dd>{option.termMonths} мес.</dd></div><div><dt>Ставка</dt><dd>{rate.format(cost.interestRate)}–{rate.format(cost.maxInterestRate)} %</dd></div><div><dt>Платёж в месяц</dt><dd>{money(cost.monthlyPayment)} — {money(cost.maxMonthlyPayment)}</dd></div><div><dt>Общая выплата от</dt><dd>{money(cost.totalPayment)}</dd></div><div><dt>Переплата</dt><dd>{money(cost.totalInterest)} — {money(cost.maxTotalInterest)}</dd></div></dl>
}
export default function RecommendationStep({ data, fresh, busy, selectedCode, term, termError, onTerm, onSelect, onAmount, onBack, onContinue }: Props) {
  const primary = data?.options.find((item) => item.isRecommended) ?? data?.options[0]
  const alternative = data?.options.find((item) => item.productCode !== primary?.productCode && item.productCode === selectedCode) ?? data?.options.find((item) => item.productCode !== primary?.productCode)
  const options = [primary, alternative].filter((item): item is FinancingOption => Boolean(item))
  const selected = data?.options.find((item) => item.productCode === selectedCode)
  return <><div className="flow-heading"><p className="section-kicker">Шаг 2 из 3 · Рекомендация</p><h1>Выберите подходящий вариант</h1><p className="intro-copy">Дата получения денег и срок возврата кредита — разные параметры.</p></div>
    <div className="term-editor"><div className="field"><label htmlFor="preview-term">Срок возврата, месяцев</label><input id="preview-term" inputMode="numeric" value={term} placeholder={selected ? `Подобран: ${selected.termMonths}` : 'Подобрать автоматически'} onChange={(event) => { if (!/[-+.,eE]/.test(event.target.value)) onTerm(event.target.value.replace(/\D/g, '')) }} aria-invalid={!!termError} aria-describedby="term-help" />{termError && <p className="field-error">{termError}</p>}<small id="term-help">{selected ? `Для выбранного продукта: ${selected.termRange.min}–${selected.termRange.max} месяцев. ` : ''}Пустое поле — подбор срока банком.</small></div><button className="text-button" type="button" onClick={() => onTerm('')}>Подобрать срок автоматически</button></div>
    {(busy || !data) && <p className="refresh-note" role="status">Рассчитываем предварительные условия…</p>}
    {data && <><div className="preview-summary"><h2>{data.summary}</h2><p>Расчёт на {calendarDate(data.calculationDate)} по Москве. Предварительные условия.</p><p>{data.disclaimer}</p></div>
      {selectedCode && !selected && fresh && <p className="submit-error" role="alert">Ранее выбранный продукт больше не подходит. Выберите другой вариант или измените параметры.</p>}
      <div className={`preview-options${fresh ? '' : ' updating'}`} aria-busy={!fresh}>{options.map((option) => <section className={`preview-option${selectedCode === option.productCode ? ' selected' : ''}`} key={option.productCode} aria-label={option.productName}>
        <span className="option-tag">{option.isRecommended ? 'Рекомендуем' : 'Альтернатива'}</span><h2>{option.productName}</h2><OptionTerms option={option} />
        <div className={`funding-estimate${option.funding.inTime ? '' : ' late'}`}><strong>{option.funding.inTime ? 'При одобрении ориентировочно' : 'Позже нужной даты, ориентировочно'} {calendarDate(option.funding.expectedDate)}</strong><p>{option.funding.explanation}</p></div>
        <p className="affordability"><b>{option.affordability.level === 'InsufficientData' ? 'Недостаточно данных для оценки нагрузки' : 'Оценка нагрузки'}</b><br />{option.affordability.explanation}</p>
        <ul className="preview-notes">{option.explanations.map((note) => <li key={note.code}>{note.text}</li>)}</ul>
        {option.limitations.length > 0 && <details><summary>Ограничения и возможные изменения</summary><ul className="preview-notes">{option.limitations.map((note) => <li key={note.code}>{note.text}</li>)}</ul></details>}
        {option.requirements.length > 0 && <div><strong>Что понадобится</strong><ul className="preview-notes">{option.requirements.map((note) => <li key={note.code}>{note.text}</li>)}</ul></div>}
        {option.suggestedAmount && <div className="amount-suggestion"><p>{option.suggestedAmount.text}</p><button type="button" className="secondary-button" disabled={!fresh} onClick={() => onAmount(option.suggestedAmount!.amount)}>Пересчитать на {money(option.suggestedAmount.amount)}</button></div>}
        <label className="option-choice"><input type="radio" name="financing-option" aria-label={`Выбрать ${option.productName}`} checked={selectedCode === option.productCode} disabled={!fresh} onChange={() => onSelect(option.productCode)} />Выбрать этот вариант</label>
      </section>)}</div>
      {data.options.length === 0 && <div className="state-panel"><h2>Подходящих вариантов пока нет</h2><p>Измените потребность или изучите причины ниже.</p></div>}
      {data.unsuitable.length > 0 && <details className="other-products" open={data.options.length === 0}><summary>Почему другие продукты не подходят</summary>{data.unsuitable.map((item) => <div key={item.productCode}><h3>{item.productName}</h3><ul>{item.reasons.map((note) => <li key={note.code}>{note.text}</li>)}</ul>{item.suggestedAmount && <><p>{item.suggestedAmount.text}</p><button className="secondary-button" type="button" disabled={!fresh} onClick={() => onAmount(item.suggestedAmount!.amount)}>Пересчитать на {money(item.suggestedAmount.amount)}</button></>}</div>)}</details>}
      {data.notCompared.length > 0 && <section className="other-products" aria-label="Продукты вне сравнения"><h2>Продукты с лимитом — отдельно</h2>{data.notCompared.map((item) => <div key={item.productCode}><h3>{item.productName}</h3><p>{item.reason.text}</p><Link className="text-link" to={`/catalog?product=${encodeURIComponent(item.productCode)}`}>Оформить {item.productName}</Link></div>)}</section>}
    </>}
    <div className="flow-actions"><button type="button" className="secondary-button" onClick={onBack}>Изменить потребность</button><button type="button" className="primary-button" disabled={!fresh || !selected} onClick={onContinue}>Проверить данные</button></div>
  </>
}
