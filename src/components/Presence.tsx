import { useEffect, useState, type ReactNode } from 'react'

export default function Presence({ show, children }: { show: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(show)
  useEffect(() => {
    if (show) { setMounted(true); return }
    const timer = setTimeout(() => setMounted(false), 180)
    return () => clearTimeout(timer)
  }, [show])
  if (!mounted && !show) return null
  return <div className={`presence${show ? '' : ' leaving'}`} aria-hidden={!show} inert={!show}>{children}</div>
}
