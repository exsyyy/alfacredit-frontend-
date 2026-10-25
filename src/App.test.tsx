import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { createMockCreditApi } from './api/mockCreditApi'
import type { AuthApi } from './api/httpAuthApi'
import type { CreditApi } from './api/creditApi'

function fillForm() {
  fireEvent.change(screen.getByLabelText('Компания'), {
    target: { value: '01a15975-ea5f-7a4f-863b-9035b3b8b2ca' },
  })
  fireEvent.change(screen.getByLabelText('Кредитный продукт'), { target: { value: 'working-capital' } })
  fireEvent.change(screen.getByLabelText('Сумма кредита'), { target: { value: '1500000' } })
  fireEvent.change(screen.getByLabelText('Срок, месяцев'), { target: { value: '12' } })
  fireEvent.change(screen.getByLabelText('Цель финансирования'), { target: { value: 'WorkingCapital' } })
}

describe('application flow', () => {
  beforeEach(() => localStorage.clear())

  it('opens navigation from the menu button and closes it after navigation or Escape', async () => {
    render(<MemoryRouter initialEntries={['/catalog']}><App api={createMockCreditApi({ storage: localStorage, delayMs: 0 })} /></MemoryRouter>)
    await screen.findByLabelText('Компания')
    const menu = screen.getByRole('button', { name: 'Открыть меню' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menu)
    expect(screen.getByRole('button', { name: 'Закрыть меню' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('link', { name: 'Мои заявки' }))
    await screen.findByRole('heading', { name: 'Мои заявки' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menu)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps letters out of numeric inputs including pasted text', async () => {
    render(<MemoryRouter initialEntries={['/catalog']}><App api={createMockCreditApi({ storage: localStorage, delayMs: 0 })} /></MemoryRouter>)
    const amount = await screen.findByLabelText('Сумма кредита')
    const term = screen.getByLabelText('Срок, месяцев')
    fireEvent.change(amount, { target: { value: '500 000dgf' } })
    fireEvent.change(term, { target: { value: '36dsfdsf' } })
    expect(amount).toHaveValue('500 000')
    expect(term).toHaveValue('36')
    fireEvent.change(term, { target: { value: '1.2e3' } })
    expect(term).toHaveValue('36')
    fireEvent.change(amount, { target: { value: '-1500000' } })
    expect(amount).toHaveValue('500 000')
  })

  it('remembers the cookie notice choice after reopening the app', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const view = render(<MemoryRouter initialEntries={['/catalog']}><App api={api} /></MemoryRouter>)
    expect(screen.getByRole('region', { name: 'Cookie и хранение данных' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Понятно' }))
    view.unmount()
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} /></MemoryRouter>)
    expect(screen.queryByRole('region', { name: 'Cookie и хранение данных' })).not.toBeInTheDocument()
  })

  it('shows required field errors before sending', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Отправить заявку' }))
    expect(screen.getByText('Выберите компанию.')).toBeInTheDocument()
    expect(screen.getByText('Укажите сумму кредита.')).toBeInTheDocument()
    expect(screen.getByText('Укажите срок кредита.')).toBeInTheDocument()
  })

  it('moves from a completed form to the saved application', async () => {
    const api = createMockCreditApi({
      storage: localStorage, delayMs: 0,
      idFactory: () => 'application-1', now: () => '2026-10-20T13:17:20.000Z',
    })
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} /></MemoryRouter>)
    await screen.findByLabelText('Компания')
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }))
    await screen.findByRole('heading', { name: 'Заявка AC-000001' })
    expect(screen.getByRole('heading', { name: 'Отправлена' })).toBeInTheDocument()
    expect(screen.getByText('После подключения API банк начнёт проверку. Сейчас это демонстрационный шаг.')).toBeInTheDocument()
    expect(screen.getByText('1 500 000 ₽')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('link', { name: 'Мои заявки' }))
    expect(await screen.findByRole('heading', { name: 'Мои заявки' })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('link', { name: 'Заявка AC-000001' }))
    expect(await screen.findByRole('heading', { name: 'Заявка AC-000001' })).toBeInTheDocument()
  })

  it('keeps entered values and offers a retry after a save error', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0, failCreate: true })
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} /></MemoryRouter>)
    await screen.findByLabelText('Компания')
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Демо-сервис временно недоступен.'))
    expect(screen.getByLabelText('Сумма кредита')).toHaveValue('1 500 000')
    expect(screen.getByRole('button', { name: 'Попробовать снова' })).toBeEnabled()
  })

  it('shows the API login before the application form', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const auth: AuthApi = {
      current: () => null,
      login: async () => ({
        accessToken: 'token-1', expiresAt: '2099-01-01T00:00:00Z',
        user: { id: 'user-1', login: 'client_good', fullName: 'Мария Иванова', role: 'Client' },
      }),
      logout: () => undefined,
    }
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} auth={auth} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Вход в кабинет' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Компания')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'client_good' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'Demo123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await screen.findByLabelText('Компания')
    expect(screen.queryByText(/Локальный API:/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Cookie и данные' })).toBeInTheDocument()
    expect(screen.queryByText(/данные сохраняются только в этом браузере/)).not.toBeInTheDocument()
  })

  it('returns to login when the API rejects an expired session', async () => {
    const logout = vi.fn()
    const auth: AuthApi = {
      current: () => ({ accessToken: 'expired', expiresAt: '2099-01-01T00:00:00Z', user: { id: 'user-1', login: 'client_good', fullName: 'Мария Иванова', role: 'Client' } }),
      login: vi.fn(), logout,
    }
    const api = {
      getProducts: () => Promise.resolve([]),
      getCompanies: () => Promise.reject({ status: 401, title: 'Unauthorized' }),
    } as unknown as CreditApi
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} auth={auth} /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Вход в кабинет' })
    expect(logout).toHaveBeenCalledOnce()
  })
})
