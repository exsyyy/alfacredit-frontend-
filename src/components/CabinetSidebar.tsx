import { NavLink } from 'react-router-dom'
import useMotionNavigate from './useMotionNavigate'

const links = [
  { to: '/financing', title: 'Подобрать кредит', icon: 'M4 5h16v14H4z M8 5V3h8v2 M4 10h16 M10 10v3h4v-3' },
  { to: '/applications', title: 'Мои заявки', icon: 'M7 3h10l4 4v14H7z M17 3v5h4 M3 7v14 M11 12h6 M11 16h6' },
  { to: '/catalog', title: 'Каталог', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
]
export default function CabinetSidebar() {
  const navigate = useMotionNavigate()
  return <aside className="cabinet-sidebar"><div className="cabinet-sidebar-inner">
    <p className="sidebar-caption">Кредитование бизнеса</p>
    <nav aria-label="Основная навигация">{links.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => `cabinet-nav${isActive ? ' active' : ''}`} onClick={(event) => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(link.to) } }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={link.icon} /></svg>{link.title}</NavLink>)}</nav>
    <div className="sidebar-journey"><p className="sidebar-caption">Путь к финансированию</p><ol><li><b>Подбор условий</b><span>Сравните стоимость</span></li><li><b>Решение банка</b><span>После проверки данных</span></li><li><b>Договор и подпись</b><span>Если кредит одобрен</span></li><li><b>Получение денег</b><span>На счёт компании</span></li></ol></div>
    <p className="sidebar-footnote">Предварительные условия<br />не являются одобрением.</p>
  </div></aside>
}
