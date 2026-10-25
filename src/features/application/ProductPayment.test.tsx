import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { createMockCreditApi } from '../../api/mockCreditApi'
import { mockProducts } from '../../api/mockData'
import type { Product } from '../../types/api'

function paymentProducts(amount: number, monthlyPayment: number): Product[] {
  return mockProducts.map(product => ({ ...product, preliminaryPayment: { amount, termMonths: 12, interestRate: product.baseRate, available: product.code !== 'overdraft', monthlyPayment: product.code === 'overdraft' ? null : monthlyPayment, totalPayment: null, totalInterest: null, notes: product.code === 'overdraft' ? [{ code: 'limit_product', text: 'Платёж заранее не определён.' }] : [] } }))
}

describe('catalog preliminary payment', () => {
  it('keeps the application form usable after a calculation failure and retries the payment', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    let calculations = 0
    api.getProducts = async query => {
      if (!query) return mockProducts
      if (++calculations === 1) throw { title: 'Сервис расчёта недоступен.' }
      return paymentProducts(query.amount, 141114.48)
    }
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} /></MemoryRouter>)
    await screen.findByLabelText('Кредитный продукт')
    fireEvent.change(screen.getByLabelText('Кредитный продукт'), { target: { value: 'express' } })
    fireEvent.change(screen.getByLabelText('Сумма кредита'), { target: { value: '1500000' } })
    fireEvent.change(screen.getByLabelText('Срок, месяцев'), { target: { value: '12' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Сервис расчёта недоступен.')
    expect(screen.getByLabelText('Сумма кредита')).toHaveValue('1 500 000')
    fireEvent.click(screen.getByRole('button', { name: 'Повторить расчёт платежа' }))
    expect(await screen.findByText('141 114,48 ₽')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Сумма кредита'), { target: { value: '' } })
    expect(screen.queryByText('141 114,48 ₽')).not.toBeInTheDocument()
    expect(calculations).toBe(2)
  })
  it('uses server figures, hides stale results and explains unavailable limit-product payments', async () => {
    const api = createMockCreditApi({ storage: localStorage, delayMs: 0 })
    const requests: Array<{ amount: number; finish: (products: Product[]) => void }> = []
    api.getProducts = query => query ? new Promise(finish => requests.push({ amount: query.amount, finish })) : Promise.resolve(mockProducts)
    render(<MemoryRouter initialEntries={['/catalog']}><App api={api} /></MemoryRouter>)
    await screen.findByLabelText('Кредитный продукт')
    fireEvent.change(screen.getByLabelText('Кредитный продукт'), { target: { value: 'express' } })
    fireEvent.change(screen.getByLabelText('Сумма кредита'), { target: { value: '1500000' } })
    fireEvent.change(screen.getByLabelText('Срок, месяцев'), { target: { value: '12' } })
    await waitFor(() => expect(requests).toHaveLength(1))
    fireEvent.change(screen.getByLabelText('Сумма кредита'), { target: { value: '1200000' } })
    await waitFor(() => expect(requests).toHaveLength(2))
    await act(async () => requests[1].finish(paymentProducts(1200000, 112891.58)))
    const payment = screen.getByRole('region', { name: 'Предварительный ежемесячный платёж' })
    expect(within(payment).getByText('112 891,58 ₽')).toBeInTheDocument()
    await act(async () => requests[0].finish(paymentProducts(1500000, 141114.48)))
    expect(within(payment).queryByText('141 114,48 ₽')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Кредитный продукт'), { target: { value: 'overdraft' } })
    expect(within(payment).queryByText('112 891,58 ₽')).not.toBeInTheDocument()
    await waitFor(() => expect(requests).toHaveLength(3))
    await act(async () => requests[2].finish(paymentProducts(1200000, 112891.58)))
    expect(within(payment).getByText('Платёж заранее не определён.')).toBeInTheDocument()
  })
})
