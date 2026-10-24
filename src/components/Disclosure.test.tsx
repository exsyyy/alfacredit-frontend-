import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Disclosure from './Disclosure'

describe('animated disclosure', () => {
  afterEach(() => vi.useRealTimers())

  it('closes accessibly and cancels the delayed close when reopened quickly', () => {
    vi.useFakeTimers()
    render(<Disclosure summary="Условия"><button type="button">Скачать договор</button></Disclosure>)
    const summary = screen.getByText('Условия')
    expect(summary).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(summary)
    expect(screen.getByRole('button', { name: 'Скачать договор' })).toBeInTheDocument()
    fireEvent.click(summary)
    expect(screen.queryByRole('button', { name: 'Скачать договор' })).not.toBeInTheDocument()
    fireEvent.click(summary)
    act(() => vi.advanceTimersByTime(400))
    expect(summary).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Скачать договор' })).toBeInTheDocument()
  })
})
