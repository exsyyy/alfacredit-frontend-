import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { createMockCreditApi } from '../../api/mockCreditApi'
import { mockFinancingPreview } from '../../api/mockFinancingData'
import type { FinancingPreview, FinancingPreviewRequest } from '../../types/financing'
import type { AuthApi } from '../../api/httpAuthApi'

const futureDate = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
function show(api = createMockCreditApi({ storage: localStorage, delayMs: 0 })) {
  render(<MemoryRouter initialEntries={['/financing/need']}><App api={api} /></MemoryRouter>)
  return api
}
async function enterNeed() {
  await screen.findByLabelText('Сумма кредита')
  fireEvent.change(screen.getByLabelText('Сумма кредита'), { target: { value: '1500000' } })
  fireEvent.change(screen.getByLabelText('Цель финансирования'), { target: { value: 'WorkingCapital' } })
  fireEvent.change(screen.getByLabelText('К какой дате нужны деньги'), { target: { value: futureDate() } })
  fireEvent.click(screen.getByRole('button', { name: 'Подобрать финансирование' }))
}
async function goToReview() {
  const button = screen.getByRole('button', { name: 'Проверить данные' })
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(button)
}

describe('financing journey', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('auto-selects the company, previews without saving and creates exactly one application on final confirmation', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    let creates = 0
    const create = api.createApplication
    api.createApplication = async (body) => { creates++; expect(body).toMatchObject({ amount: 1500000, needByDate: futureDate(), termMonths: 12 }); return create(body) }
    show(api)
    await enterNeed()
    expect(await screen.findByRole('heading', { name: 'Выберите подходящий вариант' })).toBeInTheDocument()
    await screen.findByRole('radio', { name: 'Выбрать Оборотный кредит' })
    expect(within(await screen.findByRole('region', { name: 'Стоимость выбранного варианта' })).getByText('1 663 116,74 ₽')).toBeInTheDocument()
    expect(creates).toBe(0)
    await goToReview()
    expect(await screen.findByRole('heading', { name: 'Проверьте данные перед отправкой' })).toBeInTheDocument()
    expect(creates).toBe(0)
    const submit = screen.getByRole('button', { name: 'Отправить заявку' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(await screen.findByRole('heading', { name: /Заявка AC-/ })).toBeInTheDocument()
    expect(creates).toBe(1)
    expect(sessionStorage.getItem('alfacredit.financing.v2.demo')).toBeNull()
  })

  it('preserves needs when returning and keeps the draft after a failed save', async () => {
    const api = show(createMockCreditApi({ storage: localStorage, delayMs: 0, failCreate: true }))
    await enterNeed()
    await screen.findByRole('radio', { name: 'Выбрать Оборотный кредит' })
    fireEvent.click(screen.getByRole('button', { name: 'Изменить потребность' }))
    expect(screen.getByLabelText('Сумма кредита')).toHaveValue('1 500 000')
    expect(screen.getByLabelText('К какой дате нужны деньги')).toHaveValue(futureDate())
    fireEvent.click(screen.getByRole('button', { name: 'Подобрать финансирование' }))
    await screen.findByRole('radio', { name: 'Выбрать Оборотный кредит' })
    await goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Демо-сервис временно недоступен.')
    expect(sessionStorage.getItem('alfacredit.financing.v2.demo')).toContain('1500000')
    expect((await api.listApplications()).totalCount).toBe(0)
  })

  it('recalculates a manual term and restores automatic selection without creating an application', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const requests: FinancingPreviewRequest[] = []
    api.previewFinancing = async body => {
      requests.push(body)
      const result = structuredClone(mockFinancingPreview)
      result.options[0].termMonths = body.termMonths ?? 8
      result.options[0].cost.totalPayment = body.termMonths ? 1800000 : 1600000
      return result
    }
    show(api)
    await enterNeed()
    const cost = await screen.findByRole('region', { name: 'Стоимость выбранного варианта' })
    const input = within(cost).getByLabelText('Срок возврата, месяцев')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Проверить данные' })).toBeEnabled())
    fireEvent.change(input, { target: { value: '18' } })
    await waitFor(() => expect(requests.at(-1)?.termMonths).toBe(18))
    await waitFor(() => expect(within(cost).getByText('1 800 000 ₽')).toBeInTheDocument())
    fireEvent.click(within(cost).getByRole('button', { name: 'Подобрать автоматически' }))
    await waitFor(() => expect(requests).toHaveLength(3))
    expect(requests[2]).not.toHaveProperty('termMonths')
    await waitFor(() => expect(within(cost).getByText('1 600 000 ₽')).toBeInTheDocument())
    expect(input).toHaveValue('')
    fireEvent.click(within(cost).getByRole('button', { name: 'Подобрать автоматически' }))
    await waitFor(() => expect(requests).toHaveLength(4))
    expect((await api.listApplications()).totalCount).toBe(0)
  })

  it('ignores an older preview response after the repayment term changes', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const requests: Array<{ body: FinancingPreviewRequest; finish: (value: FinancingPreview) => void }> = []
    api.previewFinancing = (body) => new Promise((finish) => requests.push({ body, finish }))
    show(api)
    await enterNeed()
    await waitFor(() => expect(requests).toHaveLength(1))
    fireEvent.change(screen.getByLabelText('Срок возврата, месяцев'), { target: { value: '12' } })
    await waitFor(() => expect(requests).toHaveLength(2))
    const latest = structuredClone(mockFinancingPreview)
    latest.options[0].cost.monthlyPayment = 111111.11
    await act(async () => requests[1].finish(latest))
    expect(await within(screen.getByRole('complementary', { name: 'Выбранные условия' })).findByText('111 111,11 ₽')).toBeInTheDocument()
    await act(async () => requests[0].finish(mockFinancingPreview))
    expect(within(screen.getByRole('complementary', { name: 'Выбранные условия' })).getByText('111 111,11 ₽')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Проверить данные' })).toBeEnabled()
  })

  it('keeps a pending preview alive when a leading zero does not change the repayment term', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const requests: Array<{ signal?: AbortSignal; finish: (value: FinancingPreview) => void }> = []
    api.previewFinancing = (_body, signal) => new Promise((finish) => requests.push({ signal, finish }))
    show(api)
    await enterNeed()
    await waitFor(() => expect(requests).toHaveLength(1))
    fireEvent.change(screen.getByLabelText('Срок возврата, месяцев'), { target: { value: '12' } })
    await waitFor(() => expect(requests).toHaveLength(2))
    fireEvent.change(screen.getByLabelText('Срок возврата, месяцев'), { target: { value: '012' } })
    await act(async () => requests[1].finish(mockFinancingPreview))
    expect(await screen.findByRole('radio', { name: 'Выбрать Оборотный кредит' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Проверить данные' })).toBeEnabled())
    expect(screen.getByLabelText('Срок возврата, месяцев')).toHaveValue('12')
  })

  it('shows insufficient financial data without a fabricated load and keeps limit products outside comparison', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const result = structuredClone(mockFinancingPreview)
    result.options[0].affordability = { monthlyProfit: null, currentDebtPayments: 0, debtLoad: null, level: 'InsufficientData', profitBasis: null, explanation: 'Нагрузку оценить нельзя: нет прибыли и расходов.' }
    api.previewFinancing = async () => result
    show(api)
    await enterNeed()
    expect(await screen.findByText('Нагрузку оценить нельзя: нет прибыли и расходов.')).toBeInTheDocument()
    expect(screen.queryByText(/NaN|0 % прибыли/)).not.toBeInTheDocument()
    const limits = screen.getByRole('region', { name: 'Продукты вне сравнения' })
    fireEvent.click(within(limits).getByRole('link', { name: 'Оформить Овердрафт' }))
    expect(await screen.findByLabelText('Кредитный продукт')).toHaveValue('overdraft')
  })

  it('explains why there are no options and cannot proceed to submit', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    api.previewFinancing = async () => ({ ...structuredClone(mockFinancingPreview), options: [], summary: 'Подходящих продуктов нет.', unsuitable: [{ productCode: 'working-capital', productName: 'Оборотный кредит', reasons: [{ code: 'business_too_young', text: 'Компания работает менее года.' }], suggestedAmount: null }] })
    show(api)
    await enterNeed()
    expect(await screen.findByText('Компания работает менее года.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Проверить данные' })).toBeDisabled()
  })

  it('lets the user return to an invalid repayment term and correct it after visiting the need step', async () => {
    show()
    await enterNeed()
    await screen.findByRole('radio', { name: 'Выбрать Оборотный кредит' })
    fireEvent.change(screen.getByLabelText('Срок возврата, месяцев'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Изменить потребность' }))
    fireEvent.click(screen.getByRole('button', { name: 'Подобрать финансирование' }))
    expect(await screen.findByLabelText('Срок возврата, месяцев')).toHaveValue('0')
    fireEvent.change(screen.getByLabelText('Срок возврата, месяцев'), { target: { value: '12' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Проверить данные' })).toBeEnabled())
  })

  it('requests a new preview when the user chooses a smaller suggested amount', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const amounts: number[] = []
    api.previewFinancing = async (body) => {
      amounts.push(body.amount)
      const result = structuredClone(mockFinancingPreview)
      result.options[0].suggestedAmount = body.amount === 1500000 ? { amount: 1200000, basis: 'RevenueShare', text: 'Банк предлагает рассчитать меньшую сумму.' } : null
      return result
    }
    show(api)
    await enterNeed()
    const smaller = await screen.findByRole('button', { name: 'Пересчитать на 1 200 000 ₽' })
    await waitFor(() => expect(smaller).toBeEnabled())
    fireEvent.click(smaller)
    await waitFor(() => expect(amounts).toEqual([1500000, 1200000]))
    expect((await api.listApplications()).totalCount).toBe(0)
  })

  it('restores the same user draft after preview authorization expires', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const preview = api.previewFinancing
    let calls = 0
    api.previewFinancing = async (body, signal) => { if (++calls === 1) throw { status: 401, title: 'Сессия истекла' }; return preview(body, signal) }
    const session = { accessToken: 'test', expiresAt: '2099-01-01T00:00:00Z', user: { id: 'user-1', login: 'client_good', fullName: 'Демо-клиент', role: 'Client' as const } }
    const auth: AuthApi = { current: () => session, logout: () => undefined, login: async () => session }
    render(<MemoryRouter initialEntries={['/financing/need']}><App api={api} auth={auth} /></MemoryRouter>)
    await enterNeed()
    await screen.findByRole('heading', { name: 'Вход в кабинет' })
    expect(sessionStorage.getItem('alfacredit.financing.v2.user-1')).toContain('1500000')
    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'client_good' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'Demo123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByRole('radio', { name: 'Выбрать Оборотный кредит' })).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})
