// Operacje na partiach, kulach i zadaniach z harmonogramu (zapis do IndexedDB).
import { db } from '@/db/db'
import { buildEntity, createEntity, deleteEntities, updateEntity } from '@/db/repo'
import type { Ball, BallStatus, Batch, CalendarEvent, Measurement, Recipe, Settings, StageKey } from '@/db/types'
import { todayISO, type ISODate } from '@/lib/dates'
import { MILESTONE_EFFECTS, planSchedule, STATUS_ACTUAL, type ScheduleKey } from './schedule'
import { ACTIVE_STATUSES, BALL_STATUSES } from './constants'

export interface BatchInput {
  name?: string
  castDate: ISODate
  count: number
  variantId?: string
  recipe: Recipe
  temperatureC: number | null
  castMethod?: Batch['castMethod']
  notes?: string
}

type SettingsLike = Pick<Settings, 'stages' | 'schedule'>

export async function nextBatchNumber(): Promise<number> {
  const last = await db.batches.orderBy('number').last()
  return (last?.number ?? 0) + 1
}

export function ballCode(batchNumber: number, index: number): string {
  return `${batchNumber}-${String(index).padStart(2, '0')}`
}

function makeBalls(batch: Batch, from: number, to: number, status: BallStatus, date: ISODate): Ball[] {
  const balls: Ball[] = []
  for (let i = from; i <= to; i++) {
    balls.push(buildEntity<Ball>({ batchId: batch.id, index: i, status, statusChangedAt: date, sample: batch.sample }))
  }
  return balls
}

function scheduleEvents(batch: Batch, settings: SettingsLike, keep: CalendarEvent[]): CalendarEvent[] {
  const doneMilestones = new Set(keep.filter((e) => e.kind === 'milestone').map((e) => e.scheduleKey))
  const doneOnDate = new Set(keep.map((e) => `${e.scheduleKey}|${e.date}`))
  return planSchedule(batch, settings)
    .filter((p) => (p.kind === 'milestone' ? !doneMilestones.has(p.scheduleKey) : !doneOnDate.has(`${p.scheduleKey}|${p.date}`)))
    .map((p) =>
      buildEntity<CalendarEvent>({
        title: p.title,
        date: p.date,
        endDate: p.endDate,
        kind: p.kind,
        // odlew to wydarzenie z przeszłości – od razu „zrobione”
        done: p.scheduleKey === 'cast',
        doneAt: p.scheduleKey === 'cast' ? p.date : undefined,
        batchId: batch.id,
        source: 'schedule',
        stage: p.stage,
        scheduleKey: p.scheduleKey,
        notes: p.notes,
        sample: batch.sample,
      }),
    )
}

export async function createBatch(input: BatchInput, settings: SettingsLike): Promise<Batch> {
  const number = await nextBatchNumber()
  const batch = buildEntity<Batch>({ ...input, number, stageActuals: {} })
  const balls = makeBalls(batch, 1, input.count, 'in_mold', input.castDate)
  const events = scheduleEvents(batch, settings, [])
  await db.transaction('rw', db.batches, db.balls, db.events, async () => {
    await db.batches.add(batch)
    await db.balls.bulkAdd(balls)
    await db.events.bulkAdd(events)
  })
  return batch
}

/** Przelicza niezrobione zadania z harmonogramu. Zrobione zostają bez zmian. */
export async function regenerateSchedule(batchId: string, settings: SettingsLike): Promise<void> {
  await db.transaction('rw', db.batches, db.events, db.deletions, async () => {
    const batch = await db.batches.get(batchId)
    if (!batch) return
    const existing = await db.events.where('batchId').equals(batchId).toArray()
    const auto = existing.filter((e) => e.source === 'schedule')
    const keep = auto.filter((e) => e.done && e.scheduleKey !== 'cast')
    const remove = auto.filter((e) => !keep.includes(e)).map((e) => e.id)
    await deleteEntities(db.events, remove)
    await db.events.bulkAdd(scheduleEvents(batch, settings, keep))
  })
}

export async function updateBatch(batch: Batch, patch: Partial<BatchInput>, settings: SettingsLike): Promise<void> {
  const next = { ...batch, ...patch }
  await updateEntity<Batch>(db.batches, batch.id, patch)
  if (patch.count !== undefined && patch.count !== batch.count) {
    const balls = await db.balls.where('batchId').equals(batch.id).sortBy('index')
    if (patch.count > balls.length) {
      const status = dominantStatus(balls) ?? 'in_mold'
      await db.balls.bulkAdd(makeBalls(next, balls.length + 1, patch.count, status, todayISO()))
    } else if (patch.count < balls.length) {
      const removable = balls.filter((b) => b.status !== 'sold' && !b.saleId).slice(patch.count - balls.length)
      await deleteEntities(db.balls, removable.map((b) => b.id))
    }
  }
  if (('castDate' in patch && patch.castDate !== batch.castDate) || ('temperatureC' in patch && patch.temperatureC !== batch.temperatureC)) {
    await regenerateSchedule(batch.id, settings)
  }
}

export async function deleteBatch(batchId: string): Promise<void> {
  await db.transaction('rw', [db.batches, db.balls, db.events, db.measurements, db.workSessions, db.photos, db.journal, db.deletions], async () => {
    const balls = await db.balls.where('batchId').equals(batchId).primaryKeys()
    const events = await db.events.where('batchId').equals(batchId).primaryKeys()
    const meas = await db.measurements.where('batchId').equals(batchId).primaryKeys()
    const work = await db.workSessions.where('batchId').equals(batchId).primaryKeys()
    const photos = await db.photos.where('ownerId').anyOf([batchId, ...balls]).primaryKeys()
    await deleteEntities(db.balls, balls)
    await deleteEntities(db.events, events)
    await deleteEntities(db.measurements, meas)
    await deleteEntities(db.workSessions, work)
    await db.photos.bulkDelete(photos)
    await db.journal.where('batchId').equals(batchId).modify({ batchId: null })
    await db.batches.delete(batchId)
    await db.deletions.put({ table: 'batches', id: batchId, deletedAt: new Date().toISOString() })
  })
}

export function statusCounts(balls: Pick<Ball, 'status'>[]): Record<BallStatus, number> {
  const out = Object.fromEntries(BALL_STATUSES.map((s) => [s, 0])) as Record<BallStatus, number>
  for (const b of balls) out[b.status]++
  return out
}

/** Najczęstszy status wśród kul w produkcji (bez sprzedanych i odpadów) */
export function dominantStatus(balls: Pick<Ball, 'status'>[]): BallStatus | null {
  const counts = statusCounts(balls)
  let best: BallStatus | null = null
  for (const s of ACTIVE_STATUSES) if (counts[s] > 0 && (!best || counts[s] >= counts[best])) best = s
  if (best) return best
  if (counts.sold) return 'sold'
  if (counts.waste) return 'waste'
  return null
}

export const STATUS_RANK: Record<BallStatus, number> = { in_mold: 0, curing: 1, rinsing: 2, inoculated: 3, establishing: 4, ready: 5, sold: 6, waste: 6 }

/**
 * Zmienia status kul partii. Bez listy kul zmienia wszystkie w produkcji (sprzedane i odpady zostają).
 * Przejście do przodu zapisuje faktyczną datę etapu i przelicza harmonogram.
 */
export async function setBatchStatus(batch: Batch, status: BallStatus, date: ISODate, settings: SettingsLike, ballIds?: string[]): Promise<number> {
  const balls = await db.balls.where('batchId').equals(batch.id).toArray()
  const targets = ballIds ? balls.filter((b) => ballIds.includes(b.id)) : balls.filter((b) => ACTIVE_STATUSES.includes(b.status))
  const now = new Date().toISOString()
  await db.balls.bulkPut(targets.map((b) => ({ ...b, status, statusChangedAt: date, updatedAt: now })))

  const actualKey = STATUS_ACTUAL[status]
  const isForward = targets.some((b) => STATUS_RANK[status] > STATUS_RANK[b.status])
  if (!ballIds && actualKey && isForward) {
    const actuals = { ...batch.stageActuals }
    // przy przeskoku kilku etapów uzupełniamy też wcześniejsze daty
    const chain: StageKey[] = ['demolding', 'rinsing', 'inoculation', 'selling']
    for (const k of chain) {
      if (!actuals[k]) actuals[k] = date
      if (k === actualKey) break
    }
    await updateEntity<Batch>(db.batches, batch.id, { stageActuals: actuals })
    await regenerateSchedule(batch.id, settings)
  }
  return targets.length
}

export async function setBallStatus(ball: Ball, status: BallStatus): Promise<void> {
  await updateEntity<Ball>(db.balls, ball.id, { status, statusChangedAt: todayISO() })
}

/** Odhacza zadanie. Dla kamienia milowego może zmienić statusy kul i przeliczyć plan. */
export async function completeEvent(event: CalendarEvent, opts: { applyEffect: boolean; date?: ISODate }, settings: SettingsLike): Promise<{ moved: number }> {
  const date = opts.date ?? todayISO()
  await updateEntity<CalendarEvent>(db.events, event.id, { done: true, doneAt: date })
  const effect = event.scheduleKey ? MILESTONE_EFFECTS[event.scheduleKey as ScheduleKey] : undefined
  if (!opts.applyEffect || !effect || !event.batchId) return { moved: 0 }
  const batch = await db.batches.get(event.batchId)
  if (!batch) return { moved: 0 }

  const balls = await db.balls.where('batchId').equals(batch.id).toArray()
  const toMove = balls.filter((b) => ACTIVE_STATUSES.includes(b.status) && STATUS_RANK[b.status] < STATUS_RANK[effect.to])
  const now = new Date().toISOString()
  await db.balls.bulkPut(toMove.map((b) => ({ ...b, status: effect.to, statusChangedAt: date, updatedAt: now })))
  if (effect.actual) {
    await updateEntity<Batch>(db.batches, batch.id, { stageActuals: { ...batch.stageActuals, [effect.actual]: date } })
  }
  await regenerateSchedule(batch.id, settings)
  return { moved: toMove.length }
}

export async function uncompleteEvent(event: CalendarEvent): Promise<void> {
  await updateEntity<CalendarEvent>(db.events, event.id, { done: false, doneAt: undefined })
}

/** Zapisuje pomiar i aktualizuje pola kul (ostatnie pH, ocena mchu, pęknięcia) */
export async function addMeasurement(m: Omit<Measurement, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  await createEntity<Measurement>(db.measurements, m)
  const balls = m.ballId ? await db.balls.where('id').equals(m.ballId).toArray() : await db.balls.where('batchId').equals(m.batchId).toArray()
  const active = balls.filter((b) => ACTIVE_STATUSES.includes(b.status) || b.id === m.ballId)
  const now = new Date().toISOString()
  if (m.type === 'ph' && m.value !== null && m.value !== undefined) {
    await db.balls.bulkPut(active.map((b) => ({ ...b, lastPh: m.value, updatedAt: now })))
  }
  if (m.type === 'moss' && m.value) {
    await db.balls.bulkPut(active.map((b) => ({ ...b, mossRating: m.value, updatedAt: now })))
  }
  if (m.type === 'cracks' && m.ballId) {
    await db.balls.bulkPut(active.map((b) => ({ ...b, hasCracks: true, cracksNote: m.text || b.cracksNote, updatedAt: now })))
  }
}
