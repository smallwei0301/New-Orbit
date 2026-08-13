/**
 * Minimal data-fetching hooks (no react-query dependency).
 *
 *   const { data, loading, error, reload } = useApi(() => itemService.list({ orgId }), [orgId])
 *   const { run, saving } = useMutation(payload => itemService.update(id, payload))
 *
 * `fallback` keeps pages usable when the backend isn't running — the UI shows
 * seed/mock data instead of an empty screen, which is handy for design work.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export function useApi(fetcher, deps = [], { fallback = null, enabled = true } = {}) {
  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fetcher)
  fnRef.current = fetcher

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.resolve()
      .then(() => fnRef.current())
      .then((res) => { if (!cancelled) { setData(res); setLoading(false) } })
      .catch((e) => {
        if (cancelled) return
        setError(e)
        setLoading(false)
        // keep the fallback visible so the page still renders offline
        setData((cur) => (cur == null ? fallback : cur))
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload, setData }
}

export function useMutation(fn) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const run = useCallback(
    async (...args) => {
      setSaving(true)
      setError(null)
      try {
        return await fn(...args)
      } catch (e) {
        setError(e)
        throw e
      } finally {
        setSaving(false)
      }
    },
    [fn]
  )
  return { run, saving, error }
}

/** Human-readable message from an axios error, matching production copy. */
export function errorMessage(e) {
  if (!e) return ''
  if (!e.response) return '無法連線到伺服器，請檢查網路連線'
  return e.response.data?.message || '發生未知錯誤，請稍後再試'
}
