import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MoneyInput from './MoneyInput'

function Example() {
  const [value, setValue] = useState('')
  return <><MoneyInput aria-label="Сумма" value={value} onChange={setValue} /><output>{value}</output></>
}

describe('money input', () => {
  it('groups typed and pasted digits while preserving the raw value', () => {
    render(<Example />)
    const input = screen.getByLabelText('Сумма')
    fireEvent.change(input, { target: { value: '1500000' } })
    expect(input).toHaveValue('1 500 000')
    expect(screen.getByRole('status')).toHaveTextContent('1500000')
    fireEvent.change(input, { target: { value: '2\u202f500\u00a0000abc' } })
    expect(input).toHaveValue('2 500 000')
    fireEvent.change(input, { target: { value: '-5000' } })
    expect(input).toHaveValue('2 500 000')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
  })

  it('keeps the caret near the edited digit and deletes across separators', () => {
    render(<Example />)
    const input = screen.getByLabelText('Сумма') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1500000' } })
    fireEvent.change(input, { target: { value: '1 5200 000', selectionStart: 4, selectionEnd: 4 } })
    expect(input).toHaveValue('15 200 000')
    expect(input.selectionStart).toBe(4)
    input.setSelectionRange(3, 3)
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(input).toHaveValue('1 200 000')
    expect(input.selectionStart).toBe(1)
    input.setSelectionRange(1, 1)
    fireEvent.keyDown(input, { key: 'Delete' })
    expect(input).toHaveValue('100 000')
  })
})
