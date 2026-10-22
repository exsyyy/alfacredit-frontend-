import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('shows approved offer terms, changed conditions and only available actions', async () => {
    const base = await exampleApplication()
    const application: Application = {
      ...base,
      status: { ...base.status, code: 'ApprovedWithConditions', title: 'Одобрено с условиями' },
      availableActions: ['acceptOffer', 'declineOffer'],
      decision: {
        type: 'ApprovedWithConditions', isFinal: true, decidedBy: 'Auto', recommendedType: null,
        approvedAmount: 1200000, approvedTermMonths: 18, interestRate: 17.5, monthlyPayment: 77000,
        conditions: 'Сумма снижена из-за долговой нагрузки.',
        reasons: [{ code: 'amount_reduced', title: 'Сумма изменена', explanation: 'Банк предложил меньшую сумму.' }],
        decidedAt: base.updatedAt,
      },
      offer: { id: 'offer-1', amount: 1200000, termMonths: 18, interestRate: 17.5, monthlyPayment: 77000, expiresAt: '2099-01-01T00:00:00Z', response: 'Pending', respondedAt: null },
    }
    show({ getApplication: vi.fn().mockResolvedValue(application) } as unknown as CreditApi)
    expect(await screen.findByText('Сумма снижена из-за долговой нагрузки.')).toBeInTheDocument()
    expect(screen.getByText('Банк предложил меньшую сумму.')).toBeInTheDocument()
    expect(screen.getByText('1 200 000 ₽')).toBeInTheDocument()
    expect(screen.getByText('17,5 %')).toBeInTheDocument()
    expect(screen.getByText('77 000 ₽')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Принять предложение' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отклонить предложение' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Отменить заявку' })).not.toBeInTheDocument()
  })

  it('shows structured refusal reasons without an offer', async () => {
    const base = await exampleApplication()
    const rejected: Application = {
      ...base,
      status: { ...base.status, code: 'Rejected', title: 'Отказ', isTerminal: true },
      availableActions: [],
      decision: {
        type: 'Rejected', isFinal: true, decidedBy: 'Auto', recommendedType: null,
        approvedAmount: null, approvedTermMonths: null, interestRate: null, monthlyPayment: null,
        conditions: null, reasons: [{ code: 'stop_factor', title: 'Недостаточный срок бизнеса', explanation: 'Компания работает менее года.' }],
        decidedAt: base.updatedAt,
      },
    }
    show({ getApplication: vi.fn().mockResolvedValue(rejected) } as unknown as CreditApi)
    expect(await screen.findByText('Компания работает менее года.')).toBeInTheDocument()
    expect(screen.getByText('Недостаточный срок бизнеса')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Предложение банка' })).not.toBeInTheDocument()
  })

  it('blocks a repeat action while pending and refreshes after success', async () => {
    const base = await exampleApplication()
    const application = { ...base, availableActions: ['cancel'] }
    let finish!: (value: Application) => void
    const cancelApplication = vi.fn().mockImplementation(() => new Promise<Application>((resolve) => { finish = resolve }))
    const getApplication = vi.fn().mockResolvedValueOnce(application).mockResolvedValue({ ...application, availableActions: [], status: { ...base.status, code: 'Canceled', title: 'Отменена' } })
    show({ getApplication, cancelApplication } as unknown as CreditApi)
    const button = await screen.findByRole('button', { name: 'Отменить заявку' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(cancelApplication).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    await act(async () => finish({ ...application, availableActions: [], status: { ...base.status, code: 'Canceled', title: 'Отменена' } }))
    await screen.findByRole('heading', { name: 'Отменена' })
    await waitFor(() => expect(getApplication).toHaveBeenCalledTimes(2))
  })

  it('shows an action conflict and reloads the latest card', async () => {
    const base = await exampleApplication()
    const application = { ...base, availableActions: ['cancel'] }
    const getApplication = vi.fn().mockResolvedValueOnce(application).mockResolvedValue({ ...application, availableActions: [] })
    const cancelApplication = vi.fn().mockRejectedValue({ status: 409, title: 'Заявка уже обработана' })
    show({ getApplication, cancelApplication } as unknown as CreditApi)
    fireEvent.click(await screen.findByRole('button', { name: 'Отменить заявку' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Заявка уже обработана')
    await waitFor(() => expect(getApplication).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: 'Отменить заявку' })).not.toBeInTheDocument()
  })

  it('continues polling while an approved offer is pending', async () => {
    const base = await exampleApplication()
    const pending: Application = { ...base, status: { ...base.status, code: 'Approved', title: 'Одобрено' }, offer: { id: 'offer-1', amount: 1500000, termMonths: 12, interestRate: 16, monthlyPayment: 140000, expiresAt: '2099-01-01T00:00:00Z', response: 'Pending', respondedAt: null } }
    const expired: Application = { ...pending, offer: { ...pending.offer!, response: 'Expired' } }
    const getApplication = vi.fn().mockResolvedValueOnce(pending).mockResolvedValue(expired)
    vi.useFakeTimers()
    show({ getApplication } as unknown as CreditApi)
    await act(async () => { await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(2500) })
    expect(getApplication).toHaveBeenCalledTimes(2)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(getApplication).toHaveBeenCalledTimes(2)
  })
})
