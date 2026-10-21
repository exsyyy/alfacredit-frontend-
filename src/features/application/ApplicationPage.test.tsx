import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CreditApi } from '../../api/creditApi'
import { createMockCreditApi } from '../../api/mockCreditApi'
import type { Application } from '../../types/api'
import ApplicationPage from './ApplicationPage'

async function exampleApplication(): Promise<Application> {
  const mock = createMockCreditApi({ storage: localStorage, delayMs: 0, idFactory: () => 'app-1' })
  await mock.createApplication({ companyId: '01a15975-ea5f-7a4f-863b-9035b3b8b2ca', productCode: 'working-capital', amount: 1500000, termMonths: 12, purpose: 'WorkingCapital' })
  return mock.getApplication('app-1')
}

function show(api: CreditApi) {
  return render(<MemoryRouter initialEntries={['/applications/app-1']}><Routes><Route path="/applications/:id" element={<ApplicationPage api={api} isDemo={false} />} /></Routes></MemoryRouter>)
}

describe('live application card', () => {
  afterEach(() => { vi.useRealTimers(); localStorage.clear() })

  it('refreshes a processing application and stops after a final decision', async () => {
    const submitted = await exampleApplication()
    const rejected: Application = { ...submitted, status: { ...submitted.status, code: 'Rejected', title: 'Отказ', isTerminal: true, clientNextAction: 'Подайте новую заявку.' }, history: [...submitted.history, { fromStatus: 'Submitted', toStatus: 'Rejected', toStatusTitle: 'Отказ', actor: 'System', actorUserId: null, comment: 'Недостаточный срок работы бизнеса.', occurredAt: submitted.createdAt }] }
    const getApplication = vi.fn().mockResolvedValueOnce(submitted).mockResolvedValue(rejected)
    const api = { getApplication } as unknown as CreditApi
    vi.useFakeTimers()
    show(api)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Обновляем статус автоматически')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(2500) })
    expect(screen.getByRole('heading', { name: 'Отказ' })).toBeInTheDocument()
    expect(screen.getAllByText('Недостаточный срок работы бизнеса.')).toHaveLength(2)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(getApplication).toHaveBeenCalledTimes(2)
  })

  it('keeps the card visible and offers a retry after a refresh error', async () => {
    const submitted = await exampleApplication()
    const getApplication = vi.fn().mockResolvedValueOnce(submitted).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(submitted)
    const api = { getApplication } as unknown as CreditApi
    vi.useFakeTimers()
    show(api)
    await act(async () => { await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(2500) })
    expect(screen.getByRole('heading', { name: `Заявка ${submitted.number}` })).toBeInTheDocument()
    expect(screen.getByText('Не удалось обновить заявку.')).toBeInTheDocument()
    await act(async () => { screen.getByRole('button', { name: 'Повторить обновление' }).click(); await Promise.resolve() })
    expect(getApplication).toHaveBeenCalledTimes(3)
  })

  it('asks the app to return to login when authorization expires', async () => {
    const onAuthExpired = vi.fn()
    const api = { getApplication: () => Promise.reject({ status: 401, title: 'Unauthorized' }) } as unknown as CreditApi
    render(<MemoryRouter initialEntries={['/applications/app-1']}><Routes><Route path="/applications/:id" element={<ApplicationPage api={api} isDemo={false} onAuthExpired={onAuthExpired} />} /></Routes></MemoryRouter>)
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalledOnce())
  })
})
