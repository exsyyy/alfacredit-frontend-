import type { Application } from '../../types/api'

export default function DecisionDetails({ application }: { application: Application }) {
  const { decision, status } = application
  const reasons = (decision?.reasons ?? []).filter(reason => reason.title?.trim() || reason.explanation?.trim())
  const comment = [...(application.history ?? [])].reverse().find(entry => entry.toStatus === status.code && entry.comment?.trim())?.comment
  const conditionalApproval = status.code === 'ApprovedWithConditions' && (!decision || (decision.isFinal && decision.type === 'ApprovedWithConditions'))
  return <>
    {decision?.isSimulated && <p className="simulation-note" role="note">Решение менеджера смоделировано. Настоящий сотрудник заявку не рассматривал.</p>}
    {decision?.isFinal && decision.conditions?.trim() && <div className="decision-detail"><strong>Условия предложения</strong><p>{decision.conditions}</p></div>}
    {reasons.length > 0 && <div className="decision-detail"><strong>{status.code === 'Rejected' ? 'Причины отказа' : status.code === 'ManualReview' ? 'Почему требуется рассмотрение менеджера' : conditionalApproval ? 'Причины предложения условий' : 'Основания решения'}</strong><ul className="reason-list">{reasons.map((reason, index) => <li key={`${reason.code}-${index}`}>{reason.title?.trim() && <b>{reason.title}</b>}{reason.explanation?.trim() && <span>{reason.explanation}</span>}</li>)}</ul></div>}
    {status.code === 'NeedsClarification' && <div className="decision-detail"><strong>Какие данные нужны</strong><p>{comment || 'Перечень дополнительных данных пока не передан. Проверьте историю заявки позже.'}</p></div>}
    {status.code === 'Rejected' && reasons.length === 0 && <div className="decision-detail"><strong>Причина отказа</strong><p>{comment || 'Причина пока не указана. Уточните её у банка.'}</p></div>}
  </>
}
