import { useEffect, useState } from 'react'

/** Bieżący czas odświeżany co `intervalMs` (stoper, „dziś”) */
export function useNow(intervalMs = 1000, enabled = true): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs, enabled])
  return now
}
