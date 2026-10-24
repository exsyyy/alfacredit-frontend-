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

async function signingExample() {
  const base = await exampleApplication()
  const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
  base.availableActions = ['acceptOffer', 'declineOffer']
  base.offer = { id: 'offer-1', amount: 1500000, termMonths: 12, interestRate: 16, monthlyPayment: 140000, expiresAt: '2099-01-01T00:00:00Z', response: 'Pending', respondedAt: null }
  localStorage.setItem('alfacredit.demo.applications.v1', JSON.stringify([base]))
  const application = await api.acceptOffer('app-1')
  return { api, application }
}

describe('live application card', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear() })

  it('reloads the final schedule when payout completes on a later date', async () => {
    const { api, application } = await signingExample()
    const contract = await api.getContract('app-1')
    const signed: Application = { ...application, availableActions: [], contract: { ...application.contract!, status: 'Signed', signedAt: '2099-01-01T00:00:00Z' }, status: { ...application.status, code: 'Signed' } }
    const disbursed: Application = { ...signed, status: { ...signed.status, code: 'Disbursed', isTerminal: true }, disbursement: { id: 'payment-1', amount: 1500000, account: '40702810000000000001', paymentOrderNumber: 'PP-1', status: 'Completed', requestedAt: '2099-01-01T00:00:00Z', completedAt: '2099-01-03T00:00:00Z', error: null } }
    const provisional = { ...contract, schedule: [{ ...contract.schedule[0], dueDate: '2099-02-01' }] }
    const final = { ...contract, schedule: [{ ...contract.schedule[0], dueDate: '2099-02-03' }] }
    const getContract = vi.fn().mockResolvedValueOnce(provisional).mockResolvedValue(final)
    vi.useFakeTimers()
    show({ ...api, getContract, getApplication: vi.fn().mockResolvedValueOnce(signed).mockResolvedValue(disbursed) })
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('table', { name: 'График платежей' })).toHaveTextContent('01.02.2099')
    await act(async () => { await vi.advanceTimersByTimeAsync(2500) })
    expect(screen.getByRole('table', { name: 'График платежей' })).toHaveTextContent('03.02.2099')
    expect(screen.queryByText('До выдачи средств даты платежей ориентировочные.')).not.toBeInTheDocument()
  })

  it('discards an unsigned print response that arrives after signing', async () => {
    const { api } = await signingExample()
    await api.requestSigningCode('app-1')
    const blob = await new Response('<h1>Неподписанный договор</h1>').blob()
    let completeDocument!: (blob: Blob) => void
    api.getContractDocument = () => new Promise<Blob>((resolve) => { completeDocument = resolve })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:unsigned', revokeObjectURL: () => undefined })
    show(api)
    await screen.findByRole('table', { name: 'График платежей' })
    fireEvent.click(screen.getByRole('button', { name: 'Открыть печатную форму' }))
    fireEvent.change(screen.getByLabelText('Код подтверждения'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Подписать договор' }))
    await screen.findByRole('heading', { name: 'Ожидаем выдачи средств' })
    await act(async () => completeDocument(blob))
    expect(screen.queryByTitle('Печатная форма договора')).not.toBeInTheDocument()
  })

  it('restores the contract, shows its schedule and signs after correcting a wrong code', async () => {
    const { api } = await signingExample()
    show(api)
    expect(await screen.findByRole('heading', { name: 'Договор KD-000001' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'График платежей' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Получить код' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
    expect(await screen.findByText(/Имитация SMS. Демо-код: 123456/)).toBeInTheDocument()
    const input = screen.getByLabelText('Код подтверждения')
    fireEvent.change(input, { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Подписать договор' }))
    expect(await screen.findByText('Неверный код подтверждения.')).toBeInTheDocument()
    expect(await screen.findByText('Осталось попыток: 4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Вставить демо-код' }))
    expect(input).toHaveValue('123456')
    fireEvent.click(screen.getByRole('button', { name: 'Подписать договор' }))
    expect(await screen.findByRole('heading', { name: 'Ожидаем выдачи средств' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Подписать договор' })).not.toBeInTheDocument()
  })

  it('restores requested code state after reload without exposing a saved demo code', async () => {
    const { api } = await signingExample()
    await api.requestSigningCode('app-1')
    show(api)
    expect(await screen.findByLabelText('Код подтверждения')).toBeInTheDocument()
    await screen.findByRole('table', { name: 'График платежей' })
    expect(screen.queryByText(/Демо-код:/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Получить новый код' })).toBeEnabled()
  })

  it('shows expired code recovery and prevents submission until a new code is requested', async () => {
    const { api, application } = await signingExample()
    application.contract!.signing = { codeRequestedAt: '2000-01-01T00:00:00Z', codeExpiresAt: '2000-01-01T00:10:00Z', attemptsLeft: 5, canRequestCode: true }
    localStorage.setItem('alfacredit.demo.applications.v1', JSON.stringify([application]))
    show(api)
    expect(await screen.findByText('Срок действия кода истёк. Запросите новый код.')).toBeInTheDocument()
    await screen.findByRole('table', { name: 'График платежей' })
    fireEvent.change(screen.getByLabelText('Код подтверждения'), { target: { value: '123456' } })
    expect(screen.getByRole('button', { name: 'Подписать договор' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Получить новый код' }))
    expect(await screen.findByText(/Демо-код: 123456/)).toBeInTheDocument()
    expect(screen.getByLabelText('Код подтверждения')).toHaveValue('')
  })

  it('continues from signed to disbursed and stops refreshing the completed transfer', async () => {
    const base = await exampleApplication()
    const signed = { ...base, status: { ...base.status, code: 'Signed' }, availableActions: [] }
    const disbursed: Application = { ...signed, status: { ...signed.status, code: 'Disbursed', title: 'Средства выданы', isTerminal: true }, disbursement: { id: 'payment-1', amount: 1500000, account: '40702810000000000001', paymentOrderNumber: 'PP-000123', status: 'Completed', requestedAt: base.createdAt, completedAt: base.createdAt, error: null } }
    const getApplication = vi.fn().mockResolvedValueOnce(signed).mockResolvedValue(disbursed)
    vi.useFakeTimers()
    show({ getApplication } as unknown as CreditApi)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('heading', { name: 'Ожидаем выдачи средств' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(2500) })
    expect(screen.getByText('PP-000123')).toBeInTheDocument()
    expect(screen.getByText('40702810000000000001')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(getApplication).toHaveBeenCalledTimes(2)
  })

  it('keeps polling manual review and shows a simulated manager refusal', async () => {
    const base = await exampleApplication()
    const manual: Application = { ...base, status: { ...base.status, code: 'ManualReview', title: 'Рассмотрение менеджером' } }
    const rejected: Application = { ...manual, availableActions: [], status: { ...manual.status, code: 'Rejected', title: 'Отказ', isTerminal: true }, decision: { type: 'Rejected', isFinal: true, isSimulated: true, decidedBy: 'Manager', recommendedType: 'ManualReview', approvedAmount: null, approvedTermMonths: null, interestRate: null, monthlyPayment: null, conditions: null, reasons: [{ code: 'manual_review_rejected', title: 'Решение менеджера', explanation: 'Банк не готов предоставить финансирование.' }], decidedAt: base.createdAt } }
    const getApplication = vi.fn().mockResolvedValueOnce(manual).mockResolvedValue(rejected)
    vi.useFakeTimers()
    show({ getApplication } as unknown as CreditApi)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Обновляем статус автоматически')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(2500) })
    expect(screen.getByText('Банк не готов предоставить финансирование.')).toBeInTheDocument()
    expect(screen.getByText('Решение менеджера смоделировано. Настоящий сотрудник заявку не рассматривал.')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(getApplication).toHaveBeenCalledTimes(2)
  })

  it('blocks a duplicate signing request and cancellation until the signature completes', async () => {
    const { api } = await signingExample()
    await api.requestSigningCode('app-1')
    let release!: () => void
    let calls = 0
    const actualSign = api.signContract
    api.signContract = async (id, code) => { calls += 1; await new Promise<void>((resolve) => { release = resolve }); return actualSign(id, code) }
    show(api)
    await screen.findByRole('table', { name: 'График платежей' })
    fireEvent.change(screen.getByLabelText('Код подтверждения'), { target: { value: '123456' } })
    const sign = screen.getByRole('button', { name: 'Подписать договор' })
    fireEvent.click(sign)
    fireEvent.click(sign)
    expect(calls).toBe(1)
    expect(sign).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отменить заявку' })).toBeDisabled()
    await act(async () => release())
    expect(await screen.findByRole('heading', { name: 'Ожидаем выдачи средств' })).toBeInTheDocument()
  })

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
        type: 'ApprovedWithConditions', isFinal: true, isSimulated: false, decidedBy: 'Auto', recommendedType: null,
        approvedAmount: 1200000, approvedTermMonths: 18, interestRate: 17.5, monthlyPayment: 77000,
        conditions: 'Сумма снижена из-за долговой нагрузки.',
        reasons: [{ code: 'amount_reduced', title: 'Сумма изменена', explanation: 'Банк предложил меньшую сумму.' }],
        decidedAt: base.updatedAt,
      },
      offer: { id: 'offer-1', amount: 1200000, termMonths: 18, interestRate: 17.5, monthlyPayment: 77000, totalPayment: 1386000, totalInterest: 186000, expiresAt: '2099-01-01T00:00:00Z', response: 'Pending', respondedAt: null },
    }
    show({ getApplication: vi.fn().mockResolvedValue(application) } as unknown as CreditApi)
    expect(await screen.findByText('Сумма снижена из-за долговой нагрузки.')).toBeInTheDocument()
    expect(screen.getByText('Банк предложил меньшую сумму.')).toBeInTheDocument()
    expect(screen.getAllByText('1 200 000 ₽').length).toBeGreaterThan(0)
    expect(screen.getByText('1 386 000 ₽')).toBeInTheDocument()
    expect(screen.getByText('186 000 ₽')).toBeInTheDocument()
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
        type: 'Rejected', isFinal: true, isSimulated: false, decidedBy: 'Auto', recommendedType: null,
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
