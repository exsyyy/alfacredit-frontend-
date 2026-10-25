import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RecommendationStep from './RecommendationStep'
import { mockFinancingPreview } from '../../api/mockFinancingData'

describe('desktop recommendation', () => {
  function show(fresh = true) {
    const onSelect = vi.fn()
    render(<MemoryRouter><RecommendationStep data={mockFinancingPreview} fresh={fresh} busy={!fresh} selectedCode={mockFinancingPreview.options[0].productCode} term="12" onTerm={vi.fn()} onAutoTerm={vi.fn()} onSelect={onSelect} onAmount={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} /></MemoryRouter>)
    return onSelect
  }

  it('compares API minima and preserves the complete selected cost range', () => {
    const onSelect = show()
    const table = screen.getByRole('table', { name: 'Сравнение предварительных условий' })
    expect(within(table).getByRole('columnheader', { name: 'Платёж в месяц от' })).toBeInTheDocument()
    expect(within(table).getByText('1 663 116,74 ₽')).toBeInTheDocument()
    const cost = screen.getByRole('region', { name: 'Стоимость выбранного варианта' })
    expect(within(cost).getByText('163 116,74 ₽ — 189 033,3 ₽')).toBeInTheDocument()
    fireEvent.click(within(table).getByRole('radio', { name: `Выбрать ${mockFinancingPreview.options[1].productName}` }))
    expect(onSelect).toHaveBeenCalledWith(mockFinancingPreview.options[1].productCode)
  })

  it('locks selection and continuation while a newer preview is loading', () => {
    show(false)
    expect(screen.getByRole('button', { name: 'Проверить данные' })).toBeDisabled()
    screen.getAllByRole('radio').forEach(radio => expect(radio).toBeDisabled())
  })
})
