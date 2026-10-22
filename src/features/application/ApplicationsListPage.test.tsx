import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CreditApi } from '../../api/creditApi'
import type { ApplicationSummary } from '../../types/api'
import ApplicationsListPage from './ApplicationsListPage'

const item: ApplicationSummary = {
  id: 'app-1', number: 'AC-000001', status: {
    code: 'Approved', title: 'Одобрено', description: '', clientNextAction: '', bankNextAction: '',
    isTerminal: false, progressStep: 5, totalSteps: 6,
  },
  company: { id: 'company-1', name: 'ООО «Ромашка»', inn: '7700000000' },
  product: { code: 'working-capital', name: 'Оборотный кредит' },
  amount: 1500000, termMonths: 12, purpose: 'WorkingCapital', purposeTitle: 'Оборотные средства',
  createdAt: '2026-10-22T12:00:00Z', updatedAt: '2026-10-22T12:01:00Z',
}

const page = (items: ApplicationSummary[], current = 1, totalPages = 1) => ({
  items, page: current, pageSize: 20, totalCount: items.length, totalPages,
})

function show(api: CreditApi) {
  return render(<MemoryRouter><ApplicationsListPage api={api} /></MemoryRouter>)
}

describe('my applications', () => {
  it('loads a saved application and links to its card', async () => {
    const listApplications = vi.fn().mockResolvedValue(page([item]))
    show({ listApplications } as unknown as CreditApi)
    expect(screen.getByRole('status')).toHaveTextContent('Загружаем заявки')
    expect(await screen.findByText('AC-000001')).toBeInTheDocument()
    expect(screen.getByText('ООО «Ромашка»')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /AC-000001/ })).toHaveAttribute('href', '/applications/app-1')
  })

  it('shows an empty state with a link to the form', async () => {
    show({ listApplications: () => Promise.resolve(page([])) } as unknown as CreditApi)
    expect(await screen.findByText('У вас пока нет заявок')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Создать заявку' })).toHaveAttribute('href', '/')
  })

  it('retries a failed request and loads the next page', async () => {
    const listApplications = vi.fn()
      .mockRejectedValueOnce({ status: 503, title: 'Сервис недоступен' })
      .mockResolvedValueOnce(page([item], 1, 2))
      .mockResolvedValueOnce(page([{ ...item, id: 'app-2', number: 'AC-000002' }], 2, 2))
    show({ listApplications } as unknown as CreditApi)
    expect(await screen.findByRole('alert')).toHaveTextContent('Сервис недоступен')
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('AC-000001')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }))
    expect(await screen.findByText('AC-000002')).toBeInTheDocument()
    expect(screen.getByText('AC-000001')).toBeInTheDocument()
    await waitFor(() => expect(listApplications).toHaveBeenNthCalledWith(3, 2))
  })
})
