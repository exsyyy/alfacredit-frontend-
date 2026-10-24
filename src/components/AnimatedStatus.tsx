import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

export default function AnimatedStatus({ statusKey, panelRef, children }: { statusKey: string; panelRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const element = content.current
    if (!element) return
    const measure = () => {
      const nextHeight = element.getBoundingClientRect().height
      if (nextHeight > 0) setHeight(nextHeight)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [statusKey])
  return <section ref={panelRef} className="next-step-panel" aria-label="Текущий статус">
    <div className="status-content-frame" style={{ height }}><div key={statusKey} ref={content} className="status-content" aria-live="polite" aria-atomic="true">{children}</div></div>
  </section>
}
