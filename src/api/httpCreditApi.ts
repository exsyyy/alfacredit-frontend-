import type { CreditApi } from './creditApi'
import type { ApiProblem, Application, ApplicationSummary, Company, Contract, CreateApplicationResponse, PagedResponse, Product, SignCodeResponse } from '../types/api'

interface HttpOptions {
  baseUrl: string
  getToken: () => string | null
  fetchImpl?: typeof fetch
}

export function createHttpCreditApi(options: HttpOptions): CreditApi {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const fetcher = options.fetchImpl ?? fetch

  async function request<T>(path: string, init?: RequestInit, authorized = true, asDocument = false): Promise<T> {
    const token = options.getToken()
    if (authorized && !token) throw { title: 'Для отправки заявки нужен вход в систему.', status: 401 } satisfies ApiProblem
    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(authorized ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
    if (response.ok && asDocument) return await response.blob() as T
    const body = await response.json().catch(() => null) as T | ApiProblem | null
    if (!response.ok) {
      throw body && typeof body === 'object' && 'title' in body
        ? body
        : { title: `Ошибка запроса (${response.status}).`, status: response.status } satisfies ApiProblem
    }
    return body as T
  }

  return {
    getProducts: () => request<Product[]>('/api/products', undefined, false),
    getCompanies: () => request<Company[]>('/api/companies'),
    createApplication: (body) => request<CreateApplicationResponse>('/api/applications', {
      method: 'POST', body: JSON.stringify(body),
    }),
    getApplication: (id) => request<Application>(`/api/applications/${encodeURIComponent(id)}`),
    listApplications: (page = 1) => request<PagedResponse<ApplicationSummary>>(`/api/applications?page=${page}&pageSize=20`),
    acceptOffer: (id) => request<Application>(`/api/applications/${encodeURIComponent(id)}/offer/accept`, { method: 'POST' }),
    declineOffer: (id) => request<Application>(`/api/applications/${encodeURIComponent(id)}/offer/decline`, { method: 'POST' }),
    cancelApplication: (id) => request<Application>(`/api/applications/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
    getContract: (id) => request<Contract>(`/api/applications/${encodeURIComponent(id)}/contract`),
    getContractDocument: (id) => request<Blob>(`/api/applications/${encodeURIComponent(id)}/contract/document`, undefined, true, true),
    requestSigningCode: (id) => request<SignCodeResponse>(`/api/applications/${encodeURIComponent(id)}/contract/sign/request-code`, { method: 'POST' }),
    signContract: (id, code) => request<Application>(`/api/applications/${encodeURIComponent(id)}/contract/sign`, { method: 'POST', body: JSON.stringify({ code }) }),
  }
}
