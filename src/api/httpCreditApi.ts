import type { CreditApi } from './creditApi'
import type { ApiProblem, Application, ApplicationSummary, Company, CreateApplicationResponse, PagedResponse, Product } from '../types/api'

interface HttpOptions {
  baseUrl: string
  getToken: () => string | null
  fetchImpl?: typeof fetch
}

export function createHttpCreditApi(options: HttpOptions): CreditApi {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const fetcher = options.fetchImpl ?? fetch

  async function request<T>(path: string, init?: RequestInit, authorized = true): Promise<T> {
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
  }
}
