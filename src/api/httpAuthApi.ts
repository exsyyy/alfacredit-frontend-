import type { ApiProblem, AuthSession } from '../types/api'

export interface AuthApi {
  current(): AuthSession | null
  login(login: string, password: string): Promise<AuthSession>
  logout(): void
}

interface AuthOptions {
  baseUrl: string
  storage: Storage
  fetchImpl?: typeof fetch
}

const sessionKey = 'alfacredit.session'

export function createHttpAuthApi({ baseUrl, storage, fetchImpl = fetch }: AuthOptions): AuthApi {
  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/login`

  return {
    current() {
      const raw = storage.getItem(sessionKey)
      if (!raw) return null
      try {
        const session = JSON.parse(raw) as AuthSession
        if (typeof session.accessToken === 'string' && session.user?.login && Date.parse(session.expiresAt) > Date.now()) return session
      } catch { /* Discard a damaged session. */ }
      storage.removeItem(sessionKey)
      return null
    },
    async login(login, password) {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password }),
      })
      const body = await response.json().catch(() => null) as AuthSession | ApiProblem | null
      if (!response.ok) {
        throw body && typeof body === 'object' && 'title' in body
          ? body
          : { title: `Ошибка входа (${response.status}).`, status: response.status } satisfies ApiProblem
      }
      if (!body || !('accessToken' in body)) throw new Error('API вернул неполный ответ на вход.')
      storage.setItem(sessionKey, JSON.stringify(body))
      return body
    },
    logout() { storage.removeItem(sessionKey) },
  }
}
