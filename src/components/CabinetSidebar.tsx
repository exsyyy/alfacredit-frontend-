import { NavLink } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import useMotionNavigate from './useMotionNavigate'

const links = [
  { to: '/financing', title: 'Подобрать кредит', icon: 'M4 5h16v14H4z M8 5V3h8v2 M4 10h16 M10 10v3h4v-3' },
  { to: '/applications', title: 'Мои заявки', icon: 'M7 3h10l4 4v14H7z M17 3v5h4 M3 7v14 M11 12h6 M11 16h6' },
  { to: '/catalog', title: 'Каталог', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
]
export default function CabinetSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useMotionNavigate()
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [open, onClose])
  return <><button type="button" className={`menu-backdrop${open ? ' visible' : ''}`} aria-label="Закрыть боковое меню" tabIndex={-1} aria-hidden={!open} onClick={onClose} /><aside ref={panel} id="cabinet-menu" className={`cabinet-sidebar${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}><div className="cabinet-sidebar-inner">
    <p className="sidebar-caption">Кредитование бизнеса</p>
    <nav aria-label="Основная навигация">{links.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => `cabinet-nav${isActive ? ' active' : ''}`} onClick={(event) => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onClose(); navigate(link.to) } }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={link.icon} /></svg>{link.title}</NavLink>)}</nav>
  </div></aside></>
}
