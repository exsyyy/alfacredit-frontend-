import { useCallback, useEffect, useRef, useState } from 'react'
import type { CreditApi } from '../../api/creditApi'
import type { ApiProblem } from '../../types/api'
import type { FinancingPreview, FinancingPreviewRequest } from '../../types/financing'

export function useFinancingPreview(api: CreditApi, onAuthExpired?: () => void) {
  const [data, setData] = useState<FinancingPreview | null>(null)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiProblem | null>(null)
  const generation = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const cancel = useCallback(() => { generation.current++; controller.current?.abort(); setBusy(false); setError(null) }, [])
  useEffect(() => () => { generation.current++; controller.current?.abort() }, [])
  const run = useCallback(async (body: FinancingPreviewRequest) => {
    const current = ++generation.current
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    setError(null)
    try {
      const result = await api.previewFinancing(body, request.signal)
      if (current !== generation.current || request.signal.aborted) return
      setData(result)
      setKey(JSON.stringify(body))
    } catch (problem) {
      if (current !== generation.current || request.signal.aborted) return
      const issue = problem as ApiProblem
      if (issue?.status === 401) onAuthExpired?.()
      else setError(issue?.title ? issue : { status: 0, title: 'Не удалось рассчитать условия. Проверьте соединение и повторите запрос.' })
    } finally { if (current === generation.current) setBusy(false) }
  }, [api, onAuthExpired])
  return { data, key, busy, error, run, cancel }
}
