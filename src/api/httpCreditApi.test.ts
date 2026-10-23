import { describe, expect, it } from 'vitest'
import { createHttpCreditApi } from './httpCreditApi'

describe('HTTP credit API adapter', () => {
  it('loads a protected printable contract as HTML with JWT', async () => {
    let call: { url: string; init?: RequestInit } | undefined
    const api = createHttpCreditApi({ baseUrl: 'http://localhost:8080', getToken: () => 'jwt', fetchImpl: async (url, init) => {
      call = { url: String(url), init }
      return new Response('<html><body>Договор KD-1</body></html>', { headers: { 'Content-Type': 'text/html' } })
    } })
    const document = await api.getContractDocument('app/1')
    expect(await document.text()).toContain('Договор KD-1')
    expect(call?.url).toBe('http://localhost:8080/api/applications/app%2F1/contract/document')
    expect(call?.init?.headers).toMatchObject({ Authorization: 'Bearer jwt' })
  })

  it('requests and submits a signing code using the new protected endpoints', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const api = createHttpCreditApi({ baseUrl: '', getToken: () => 'jwt', fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify(String(url).endsWith('request-code') ? { demoCode: '654321', attemptsLeft: 5 } : { id: 'app-1', status: { code: 'Signed' } }))
    } })
    expect(await api.requestSigningCode('app-1')).toMatchObject({ demoCode: '654321' })
    expect(await api.signContract('app-1', '654321')).toMatchObject({ status: { code: 'Signed' } })
    expect(calls.map(({ url }) => url)).toEqual(['/api/applications/app-1/contract/sign/request-code', '/api/applications/app-1/contract/sign'])
    expect(calls[1].init?.body).toBe('{"code":"654321"}')
    for (const call of calls) expect(call.init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer jwt' } })
  })
  it('posts the agreed JSON body with a bearer token', async () => {
    let call: { url: string; init?: RequestInit } | undefined
    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      call = { url: String(url), init }
      return new Response(JSON.stringify({ id: 'app-1', number: 'AC-000001', status: 'Submitted' }), {
        status: 201, headers: { 'Content-Type': 'application/json' },
      })
    }
    const api = createHttpCreditApi({ baseUrl: 'http://localhost:8080/', getToken: () => 'token-1', fetchImpl })
    const result = await api.createApplication({
      companyId: 'company-1', productCode: 'working-capital', amount: 1500000,
      termMonths: 12, purpose: 'WorkingCapital',
    })
    expect(result.id).toBe('app-1')
    expect(call?.url).toBe('http://localhost:8080/api/applications')
    expect(call?.init?.method).toBe('POST')
    expect(call?.init?.headers).toMatchObject({ Authorization: 'Bearer token-1', 'Content-Type': 'application/json' })
    expect(JSON.parse(String(call?.init?.body))).toMatchObject({ amount: 1500000, termMonths: 12 })
  })

  it('preserves field errors from a validation ProblemDetails response', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      title: 'Ошибка валидации', status: 400, errors: { amount: ['Сумма слишком мала.'] },
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const api = createHttpCreditApi({ baseUrl: '', getToken: () => 'token-1', fetchImpl })
    await expect(api.createApplication({
      companyId: 'company-1', productCode: 'working-capital', amount: 1,
      termMonths: 12, purpose: 'WorkingCapital',
    })).rejects.toMatchObject({ status: 400, errors: { amount: ['Сумма слишком мала.'] } })
  })

  it('loads an application by ID with the current token', async () => {
    let call: { url: string; headers?: HeadersInit } | undefined
    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      call = { url: String(url), headers: init?.headers }
      return new Response(JSON.stringify({ id: 'app-1', number: 'AC-000001' }), { status: 200 })
    }
    const api = createHttpCreditApi({ baseUrl: 'http://localhost:8080', getToken: () => 'token-1', fetchImpl })
    const application = await api.getApplication('app-1')
    expect(application.number).toBe('AC-000001')
    expect(call?.url).toBe('http://localhost:8080/api/applications/app-1')
    expect(call?.headers).toMatchObject({ Authorization: 'Bearer token-1' })
  })

  it('loads the client application list with pagination and authorization', async () => {
    let call: { url: string; init?: RequestInit } | undefined
    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      call = { url: String(url), init }
      return new Response(JSON.stringify({ items: [], page: 2, pageSize: 20, totalCount: 21, totalPages: 2 }))
    }
    const api = createHttpCreditApi({ baseUrl: 'http://localhost:8080', getToken: () => 'token-1', fetchImpl })
    expect(await api.listApplications(2)).toMatchObject({ items: [], page: 2, totalPages: 2 })
    expect(call?.url).toBe('http://localhost:8080/api/applications?page=2&pageSize=20')
    expect(call?.init?.headers).toMatchObject({ Authorization: 'Bearer token-1' })
  })

  it.each([
    ['acceptOffer', '/offer/accept'],
    ['declineOffer', '/offer/decline'],
    ['cancelApplication', '/cancel'],
  ] as const)('posts %s to the backend and returns the updated card', async (method, suffix) => {
    let call: { url: string; init?: RequestInit } | undefined
    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      call = { url: String(url), init }
      return new Response(JSON.stringify({ id: 'app/1', status: { code: 'OfferAccepted' } }))
    }
    const api = createHttpCreditApi({ baseUrl: 'http://localhost:8080', getToken: () => 'token-1', fetchImpl })
    const application = await api[method]('app/1')
    expect(application.id).toBe('app/1')
    expect(call?.url).toBe(`http://localhost:8080/api/applications/app%2F1${suffix}`)
    expect(call?.init?.method).toBe('POST')
    expect(call?.init?.headers).toMatchObject({ Authorization: 'Bearer token-1' })
  })

  it('preserves an offer conflict for the card to recover from', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ title: 'Предложение истекло', status: 409 }), { status: 409 })
    const api = createHttpCreditApi({ baseUrl: '', getToken: () => 'token-1', fetchImpl })
    await expect(api.acceptOffer('app-1')).rejects.toMatchObject({ title: 'Предложение истекло', status: 409 })
  })
})
