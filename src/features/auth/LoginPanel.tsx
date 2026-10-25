import { useState, type FormEvent } from 'react'
import type { AuthApi } from '../../api/httpAuthApi'
import type { AuthSession, ApiProblem } from '../../types/api'

export default function LoginPanel({ auth, onLogin }: { auth: AuthApi; onLogin: (session: AuthSession) => void }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      onLogin(await auth.login(login, password))
    } catch (problem) {
      setError((problem as ApiProblem)?.title || 'Не удалось связаться с API. Проверьте, что бэкенд запущен.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="page login-page">
    <section className="login-card" aria-labelledby="login-heading">
    <div className="page-intro"><div><p className="section-kicker">Кредитование бизнеса</p><h1 id="login-heading">Вход в кабинет</h1><p className="intro-copy">Войдите, чтобы подобрать финансирование и следить за заявками.</p></div></div>
    <form className="form-panel login-panel" onSubmit={submit}>
      <div className="field"><label htmlFor="login">Логин</label><input id="login" autoComplete="username" value={login} onChange={(event) => setLogin(event.target.value)} required /></div>
      <div className="field"><label htmlFor="password">Пароль</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
      {error && <div className="submit-error" role="alert">{error}</div>}
      <div className="form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Входим…' : 'Войти'}</button><p>Демо-логин: client_good. Пароль указан в README бэкенда.</p></div>
    </form>
    </section>
  </main>
}
