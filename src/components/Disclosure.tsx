import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export default function Disclosure({ summary, children, defaultOpen = false, className = '' }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const [mounted, setMounted] = useState(defaultOpen)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const id = useId()
  useEffect(() => {
    if (defaultOpen) { setMounted(true); setExpanded(true) }
  }, [defaultOpen])
  useEffect(() => () => clearTimeout(closeTimer.current), [])
  function toggle() {
    clearTimeout(closeTimer.current)
    if (expanded) {
      setExpanded(false)
      closeTimer.current = setTimeout(() => setMounted(false), 200)
    } else { setMounted(true); setExpanded(true) }
  }
  return <details open={mounted} className={`motion-details ${className}`} data-expanded={expanded}>
    <summary aria-expanded={expanded} aria-controls={id} onClick={(event) => { event.preventDefault(); toggle() }}>{summary}</summary>
    <div id={id} className="disclosure-content" aria-hidden={!expanded} inert={!expanded}><div className="disclosure-inner">{children}</div></div>
  </details>
}
