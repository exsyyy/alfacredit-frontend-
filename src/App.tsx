import { useCallback, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import type { CreditApi } from './api/creditApi'
import type { AuthApi } from './api/httpAuthApi'
import ApplicationFormPage from './features/application/ApplicationFormPage'
import ApplicationPage from './features/application/ApplicationPage'
import ApplicationsListPage from './features/application/ApplicationsListPage'
import LoginPanel from './features/auth/LoginPanel'
import StorageNotice from './features/privacy/StorageNotice'
import FinancingFlowPage from './features/financing/FinancingFlowPage'
import { draftKey } from './features/financing/financingDraft'
import CabinetSidebar from './components/CabinetSidebar'

export default function App({ api, auth }: { api: CreditApi; auth?: AuthApi }) {
  const [session, setSession] = useState(() => auth?.current() ?? null)
  const isDemo = !auth
  const onAuthExpired = useCallback(() => { auth?.logout(); setSession(null) }, [auth])

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="АльфаКредит — новая заявка">
            <span className="brand-mark">А</span><span>Альфа<span className="brand-light">Кредит</span></span>
          </Link>
          <span className="header-service">Кабинет бизнеса</span>
          {session ? <div className="account-controls"><span>{session.user.fullName}</span><button type="button" onClick={() => { try { sessionStorage.removeItem(draftKey(session.user.id)) } catch { /* Storage may be unavailable. */ } auth?.logout(); setSession(null) }}>Выйти</button></div> : <span className="header-caption">Кабинет предпринимателя</span>}
        </div>
      </header>
      <div className={`workspace${auth && !session ? ' workspace-login' : ''}`}>
      {(!auth || session) && <CabinetSidebar />}
      <div className="workspace-content">
      {isDemo && <div className="demo-ribbon" role="note"><span className="demo-dot" /> Демо-режим: данные сохраняются только в этом браузере. Банк не получает заявку.</div>}
      {auth && !session ? <LoginPanel auth={auth} onLogin={setSession} /> :
        <Routes>
          <Route path="/" element={<Navigate to="/financing/need" replace />} />
          <Route path="/financing/*" element={<FinancingFlowPage key={session?.user.id ?? 'demo'} owner={session?.user.id ?? 'demo'} api={api} isDemo={isDemo} onAuthExpired={onAuthExpired} />} />
          <Route path="/catalog" element={<ApplicationFormPage api={api} isDemo={isDemo} onAuthExpired={onAuthExpired} />} />
          <Route path="/applications" element={<ApplicationsListPage api={api} onAuthExpired={onAuthExpired} />} />
          <Route path="/applications/:id" element={<ApplicationPage api={api} isDemo={isDemo} onAuthExpired={onAuthExpired} />} />
          <Route path="*" element={<main className="page"><h1>Страница не найдена</h1><Link to="/">К форме заявки</Link></main>} />
        </Routes>}
      <footer className="site-footer"><div className="footer-inner"><span>АльфаКредит · прототип для хакатона</span><div className="footer-actions"><span>{isDemo ? 'Данные и условия — демонстрационные' : 'Подключение к локальному API'}</span><StorageNotice /></div></div></footer>
      </div></div>
    </div>
  )
}
