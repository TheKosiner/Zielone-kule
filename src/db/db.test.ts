import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { exportBackup, importBackup, parseBackup } from './backup'
import { clearSampleData, countSampleData, resetAll, seedAll } from './seed'
import { withDefaults } from './defaults'
import { completeEvent, createBatch, setBatchStatus } from '@/domain/production'
import { todayISO } from '@/lib/dates'

async function fresh(withDemo: boolean) {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
  await seedAll(withDemo)
}

describe('baza danych', () => {
  beforeEach(async () => fresh(true))

  it('wypełnia dane startowe i przykładowe', async () => {
    expect(await db.settings.count()).toBe(1)
    expect(await db.planned.count()).toBe(9)
    expect(await db.instructions.count()).toBe(9)
    expect(await db.batches.count()).toBe(4)
    expect(await db.balls.count()).toBe(20)
    expect(await db.sales.count()).toBe(2)
    expect(await countSampleData()).toBeGreaterThan(20)
  })

  it('kopia zapasowa: eksport → wyczyszczenie → import daje te same dane', async () => {
    const before = { batches: await db.batches.count(), events: await db.events.count(), expenses: await db.expenses.count(), sales: await db.sales.count() }
    const file = parseBackup(JSON.stringify(await exportBackup(false)))
    await resetAll(false)
    expect(await db.batches.count()).toBe(0)
    await importBackup(file)
    expect({ batches: await db.batches.count(), events: await db.events.count(), expenses: await db.expenses.count(), sales: await db.sales.count() }).toEqual(before)
  })

  it('odrzuca obcy plik', () => {
    expect(() => parseBackup('{"a":1}')).toThrow(/kopia zapasowa/)
    expect(() => parseBackup('nie json')).toThrow(/JSON/)
  })

  it('czyści tylko dane przykładowe', async () => {
    await clearSampleData()
    expect(await db.batches.count()).toBe(0)
    expect(await db.expenses.count()).toBe(0)
    expect(await db.planned.count()).toBe(9)
    expect(await db.instructions.count()).toBe(9)
    expect(await db.settings.count()).toBe(1)
  })
})

describe('przepływ produkcji', () => {
  beforeEach(async () => fresh(false))

  it('kamień milowy zmienia statusy i przelicza harmonogram', async () => {
    const settings = withDefaults(await db.settings.get('main'))
    const today = todayISO()
    const batch = await createBatch({ castDate: today, count: 5, recipe: settings.recipe, temperatureC: 20 }, settings)
    expect(batch.number).toBe(1)
    const demold = (await db.events.where('batchId').equals(batch.id).toArray()).find((e) => e.scheduleKey === 'demold')!
    const { moved } = await completeEvent(demold, { applyEffect: true, date: today }, settings)
    expect(moved).toBe(5)
    const balls = await db.balls.where('batchId').equals(batch.id).toArray()
    expect(balls.every((b) => b.status === 'curing')).toBe(true)
    expect((await db.batches.get(batch.id))!.stageActuals.demolding).toBe(today)
    const events = await db.events.where('batchId').equals(batch.id).toArray()
    expect(events.filter((e) => e.scheduleKey === 'demold')).toHaveLength(1)
    expect(events.find((e) => e.scheduleKey === 'mist' && !e.done)).toBeTruthy()
  })

  it('hurtowa zmiana statusu pomija sprzedane i odpady', async () => {
    const settings = withDefaults(await db.settings.get('main'))
    const batch = await createBatch({ castDate: todayISO(), count: 3, recipe: settings.recipe, temperatureC: 20 }, settings)
    const [first] = await db.balls.where('batchId').equals(batch.id).sortBy('index')
    await db.balls.update(first.id, { status: 'waste' })
    const n = await setBatchStatus((await db.batches.get(batch.id))!, 'rinsing', todayISO(), settings)
    expect(n).toBe(2)
    expect((await db.balls.get(first.id))!.status).toBe('waste')
    const b = (await db.batches.get(batch.id))!
    expect(b.stageActuals.demolding).toBeTruthy()
    expect(b.stageActuals.rinsing).toBeTruthy()
  })
})
