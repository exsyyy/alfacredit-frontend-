import { flushSync } from 'react-dom'
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'

let activeTransition: ViewTransition | undefined
export default function useMotionNavigate() {
  const navigate = useNavigate()
  return (to: To, options?: NavigateOptions) => {
    if (!document.startViewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      void navigate(to, options)
      return
    }
    activeTransition?.skipTransition()
    const transition = document.startViewTransition(() => { flushSync(() => { void navigate(to, options) }); window.scrollTo(0, 0) })
    activeTransition = transition
    void transition.ready.catch(() => undefined)
    void transition.finished.catch(() => undefined).finally(() => { if (activeTransition === transition) activeTransition = undefined })
  }
}
