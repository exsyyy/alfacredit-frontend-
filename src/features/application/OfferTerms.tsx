import type { Application } from '../../types/api'
import { calendarDate, money } from '../financing/financingDraft'
import { displayOffer } from './clientDecision'

export default function OfferTerms({ application }: { application: Application }) {
  const offer = displayOffer(application)
  if (!offer) return ['Approved', 'ApprovedWithConditions'].includes(application.status.code) && (!application.decision || application.decision.isFinal) ? <p className="intro-copy">Условия предложения пока не переданы банком.</p> : null
  const changedAmount = application.amount !== offer.amount
  const changedTerm = application.termMonths !== offer.termMonths
  const expiry = offer.expiresAt && Number.isFinite(Date.parse(offer.expiresAt)) ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(offer.expiresAt)) : null
  return <section className="offer-panel" aria-label="Кредитное предложение">
    <div className="panel-heading"><span className="panel-number">✓</span><div><h2>Предложение банка</h2><p>{offer.response === 'Pending' ? expiry ? `Действует до ${expiry}` : 'Срок действия предложения пока не передан.' : `Статус: ${offer.response === 'Accepted' ? 'принято' : offer.response === 'Declined' ? 'отклонено' : 'истекло'}`}</p></div></div>
    <div className="table-scroll"><table className="comparison-table" aria-label="Запрошено и предложено"><thead><tr><th>Условия</th><th>Запрошено</th><th>Предложено</th></tr></thead><tbody>
      <tr><th scope="row">Сумма</th><td>{money(application.amount)}</td><td className={changedAmount ? 'changed-term' : undefined}>{money(offer.amount)}{changedAmount && <small>Изменено</small>}</td></tr>
      <tr><th scope="row">Срок возврата</th><td>{application.termMonths} мес.</td><td className={changedTerm ? 'changed-term' : undefined}>{offer.termMonths} мес.{changedTerm && <small>Изменено</small>}</td></tr>
    </tbody></table></div>
    <dl className="offer-terms"><div><dt>Ставка</dt><dd>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(offer.interestRate)} %</dd></div><div><dt>Ежемесячный платёж</dt><dd>{money(offer.monthlyPayment)}</dd></div>{typeof offer.totalPayment === 'number' && <div><dt>Общая выплата</dt><dd>{money(offer.totalPayment)}</dd></div>}{typeof offer.totalInterest === 'number' && <div><dt>Переплата</dt><dd>{money(offer.totalInterest)}</dd></div>}</dl>
    {(offer.totalPayment == null || offer.totalInterest == null) && <p className="intro-copy">{['overdraft', 'credit-line'].includes(application.product.code) && (offer.totalPayment === null || offer.totalInterest === null) ? 'Итоговая стоимость зависит от фактического использования лимита.' : 'Полная стоимость предложения пока не передана банком.'}</p>}
    {application.needByDate && <p>Деньги нужны к {calendarDate(application.needByDate)}</p>}
  </section>
}
