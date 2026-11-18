import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { createEntity, setKV } from '@/db/repo'
import type { StageKey, WorkSession } from '@/db/types'
import { isoToLocalDate } from '@/lib/dates'

export interface ActiveTimer {
  startedAt: string
  batchId: string | null
  stage: StageKey | 'other'
  note?: string
}

const KEY = 'activeTimer'

export function useActiveTimer(): ActiveTimer | null {
  const row = useLiveQuery(() => db.kv.get(KEY), [])
  return (row?.value as ActiveTimer | null | undefined) ?? null
}

export async function startTimer(opts: { batchId: string | null; stage: StageKey | 'other'; note?: string }): Promise<void> {
  const timer: ActiveTimer = { ...opts, startedAt: new Date().toISOString() }
  await setKV(KEY, timer)
}

export async function cancelTimer(): Promise<void> {
  await db.kv.delete(KEY)
}

export function elapsedMs(timer: ActiveTimer, now = new Date()): number {
  return Math.max(0, now.getTime() - new Date(timer.startedAt).getTime())
}

/** Zatrzymuje stoper i zapisuje czas pracy (co najmniej 1 minuta) */
export async function stopTimer(): Promise<WorkSession | null> {
  const row = await db.kv.get(KEY)
  const timer = row?.value as ActiveTimer | undefined
  if (!timer) return null
  const end = new Date()
  const minutes = Math.max(1, Math.round(elapsedMs(timer, end) / 60000))
  const session = await createEntity<WorkSession>(db.workSessions, {
    batchId: timer.batchId,
    stage: timer.stage,
    date: isoToLocalDate(timer.startedAt),
    minutes,
    startedAt: timer.startedAt,
    endedAt: end.toISOString(),
    note: timer.note,
  })
  await db.kv.delete(KEY)
  return session
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
