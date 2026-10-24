import { useCallback, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import type { CreditApi } from './api/creditApi'
import type { AuthApi } from './api/httpAuthApi'
import ApplicationFormPage from './features/application/ApplicationFormPage'
import ApplicationPage from './features/application/ApplicationPage'
import ApplicationsListPage from './features/application/ApplicationsListPage'
import LoginPanel from './features/auth/LoginPanel'
import StorageNotice from './features/privacy/StorageNotice'
import FinancingFlowPage from './features/financing/FinancingFlowPage'
import { draftKey } from './features/financing/financingDraft'

export default function App({ api, auth }: { api: CreditApi; auth?: AuthApi }) {
  const [session, setSession] = useState(() => auth?.current() ?? null)
  const isDemo = !auth
  const onAuthExpired = useCallback(() => { auth?.logout(); setSession(null) }, [auth])

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="АльфаКредит — новая заявка">
            <span className="brand-mark">а</span><span>Альфа<span className="brand-light">Кредит</span></span>
          </Link>
          <nav aria-label="Основная навигация"><NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/financing">Подобрать кредит</NavLink><NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/catalog">Каталог</NavLink><NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/applications">Мои заявки</NavLink></nav>
          {session ? <div className="account-controls"><span>{session.user.fullName}</span><button type="button" onClick={() => { try { sessionStorage.removeItem(draftKey(session.user.id)) } catch { /* Storage may be unavailable. */ } auth?.logout(); setSession(null) }}>Выйти</button></div> : <span className="header-caption">Кабинет предпринимателя</span>}
        </div>
      </header>
      <div className="demo-ribbon" role="note"><span className="demo-dot" /> {isDemo ? 'Демо-режим: данные сохраняются только в этом браузере. Банк не получает заявку.' : 'Локальный API: заявка сохраняется в тестовой базе бэкенда.'}</div>
      {auth && !session ? <LoginPanel auth={auth} onLogin={setSession} /> :
        <Routes>
          <Route path="/" element={<Navigate to="/financing/need" replace />} />
          <Route path="/financing/*" element={<FinancingFlowPage key={session?.user.id ?? 'demo'} owner={session?.user.id ?? 'demo'} api={api} isDemo={isDemo} onAuthExpired={onAuthExpired} />} />
          <Route path="/catalog" element={<ApplicationFormPage api={api} isDemo={isDemo} onAuthExpired={onAuthExpired} />} />
          <Route path="/applications" element={<ApplicationsListPage api={api} onAuthExpired={onAuthExpired} />} />
          <Route path="/applications/:id" element={<ApplicationPage api={api} isDemo={isDemo} onAuthExpired={onAuthExpired} />} />
          <Route path="*" element={<main className="page"><h1>Страница не найдена</h1><Link to="/">К форме заявки</Link></main>} />
        </Routes>}
      <footer className="site-footer"><span>АльфаКредит · прототип для хакатона</span><span>{isDemo ? 'Данные и условия — демонстрационные' : 'Подключение к локальному API'}</span></footer>
      <StorageNotice />
    </div>
  )
}
