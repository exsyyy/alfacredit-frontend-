import { useLayoutEffect, useRef, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & { value: string; onChange: (digits: string) => void }
const format = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const digitsBefore = (text: string, position: number) => text.slice(0, position).replace(/\D/g, '').length
const caretAfter = (text: string, count: number) => {
  if (count === 0) return 0
  let digits = 0
  for (let i = 0; i < text.length; i++) if (/\d/.test(text[i]) && ++digits === count) return i + 1
  return text.length
}

export default function MoneyInput({ value, onChange, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (pendingCaret.current !== null && input.current) {
      input.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  })
  const update = (raw: string, count: number) => {
    const normalized = raw.replace(/^0+(?=\d)/, '')
    const nextCount = Math.max(0, count - (raw.length - normalized.length))
    pendingCaret.current = caretAfter(format(normalized), nextCount)
    onChange(normalized)
    if (normalized === value && input.current) {
      input.current.value = format(value)
      input.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  }
  return <input {...props} ref={input} type="text" inputMode="numeric" value={format(value)} onChange={(event) => {
    const text = event.target.value
    if (/[-+.,eE]/.test(text)) { event.target.value = format(value); return }
    update(text.replace(/\D/g, ''), digitsBefore(text, event.target.selectionStart ?? text.length))
  }} onKeyDown={(event) => {
    props.onKeyDown?.(event)
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
    const el = event.currentTarget
    const position = el.selectionStart ?? 0
    if (el.selectionEnd !== position) return
    const backspace = event.key === 'Backspace' && el.value[position - 1] === ' '
    const forward = event.key === 'Delete' && el.value[position] === ' '
    if (!backspace && !forward) return
    event.preventDefault()
    const index = digitsBefore(el.value, position) - (backspace ? 1 : 0)
    update(value.slice(0, index) + value.slice(index + 1), index)
  }} />
}
