import { describe, expect, it } from 'vitest'
import { createHttpAuthApi } from './httpAuthApi'

const response = {
  accessToken: 'token-1',
  expiresAt: '2099-01-01T00:00:00Z',
  user: { id: 'user-1', login: 'client_good', fullName: 'Мария Иванова', role: 'Client' },
}

describe('HTTP authentication', () => {
  it('logs in and keeps only the returned session in sessionStorage', async () => {
    const storage = new Map<string, string>()
    const sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
    } as Storage
    let request: { url: string; init?: RequestInit } | undefined
    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      request = { url: String(url), init }
      return new Response(JSON.stringify(response), { status: 200 })
    }
    const auth = createHttpAuthApi({ baseUrl: 'http://localhost:8080/', storage: sessionStorage, fetchImpl })
    expect(auth.current()).toBeNull()
    await auth.login('client_good', 'Demo123!')
    expect(request?.url).toBe('http://localhost:8080/api/auth/login')
    expect(JSON.parse(String(request?.init?.body))).toEqual({ login: 'client_good', password: 'Demo123!' })
    expect(storage.get('alfacredit.session')).not.toContain('Demo123!')
    expect(auth.current()?.accessToken).toBe('token-1')
    auth.logout()
    expect(auth.current()).toBeNull()
  })

  it('discards an expired token', () => {
    const storage = { getItem: () => JSON.stringify({ ...response, expiresAt: '2020-01-01T00:00:00Z' }), removeItem: () => undefined } as unknown as Storage
    const auth = createHttpAuthApi({ baseUrl: '', storage })
    expect(auth.current()).toBeNull()
  })
})
