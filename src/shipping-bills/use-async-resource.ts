import { useCallback, useEffect, useState } from 'react'

/** Ignore obsolete responses when navigation or retry replaces a request. */
export function useAsyncResource<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: true })
  useEffect(() => {
    let active = true
    setState({ loading: true })
    void load().then(
      (data) => {
        if (active) setState({ data, loading: false })
      },
      (error: unknown) => {
        if (active) setState({ loading: false, error: error instanceof Error ? error.message : 'Unable to load data.' })
      }
    )
    return () => {
      active = false
    }
  }, [load, attempt])
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { ...state, retry }
}
