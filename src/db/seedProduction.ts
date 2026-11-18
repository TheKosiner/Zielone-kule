// Przykładowe partie na różnych etapach, z datami liczonymi od „dziś”, żeby zawsze było co oglądać.
import { db } from './db'
import { buildEntity } from './repo'
import type { BallStatus, CalendarEvent, JournalEntry, Measurement, Settings, StageKey, WorkSession } from './types'
import { addDays } from '@/lib/dates'
import { createBatch, regenerateSchedule } from '@/domain/production'
import { planSchedule, type ScheduleKey } from '@/domain/schedule'

interface DemoBatch {
  name: string
  cast: number
  count: number
  temp: number
  noFiber?: boolean
  method?: 'spacers' | 'two_stage'
  actuals: Partial<Record<StageKey, number>>
  statuses: BallStatus[]
  ratings?: (number | null)[]
  cracks?: Record<number, string>
  doneMilestones: [ScheduleKey, number][]
  keepOverdue?: ScheduleKey[]
  notes?: string
  ph?: [number, number][]
  work?: [StageKey | 'other', number, number, string?][]
}

const DEMO: DemoBatch[] = [
  {
    name: 'Test: receptura podstawowa',
    cast: -105,
    count: 4,
    temp: 19,
    actuals: { demolding: -104, rinsing: -76, inoculation: -63, selling: -6 },
    statuses: ['sold', 'sold', 'ready', 'waste'],
    ratings: [4, 5, 4, null],
    cracks: { 4: 'pęknięta przy wyjmowaniu – za cienkie wgłębienie' },
    doneMilestones: [['demold', -104], ['cure_end', -76], ['inoculate', -63], ['moss_check', -49], ['ready', -6]],
    notes: 'Pierwsze kule. Forma nr 1 smarowana wazeliną.',
    ph: [[-76, 12.5], [-70, 10.5], [-66, 8.5], [-64, 7.5]],
    work: [['casting', -105, 70, 'pierwszy odlew, powoli'], ['demolding', -104, 45], ['curing', -90, 20], ['rinsing', -70, 25], ['inoculation', -63, 95], ['establishing', -40, 30], ['selling', -5, 60, 'zdjęcia i aukcja']],
  },
  {
    name: 'Test: bez włókna',
    cast: -80,
    count: 4,
    temp: 17,
    noFiber: true,
    actuals: { demolding: -78, rinsing: -50, inoculation: -38 },
    statuses: ['establishing', 'establishing', 'establishing', 'waste'],
    ratings: [3, 4, 3, null],
    cracks: { 4: 'pęknięcia przy wgłębieniach – bez włókna masa słabsza' },
    doneMilestones: [['demold', -78], ['cure_end', -50], ['inoculate', -38], ['moss_check', -24]],
    keepOverdue: ['moss_mist'],
    ph: [[-50, 12], [-43, 9], [-40, 7.8]],
    work: [['casting', -80, 55], ['demolding', -78, 35], ['rinsing', -45, 20], ['inoculation', -38, 75], ['establishing', -20, 25]],
  },
  {
    name: 'Seria 1',
    cast: -33,
    count: 6,
    temp: 14,
    actuals: { demolding: -31, rinsing: -3 },
    statuses: ['rinsing', 'rinsing', 'rinsing', 'rinsing', 'rinsing', 'rinsing'],
    doneMilestones: [['demold', -31], ['cure_end', -3]],
    ph: [[-3, 12.5]],
    work: [['casting', -33, 80, '6 kul, dwie formy'], ['demolding', -31, 50], ['curing', -20, 25]],
  },
  {
    name: 'Seria 2',
    cast: -1,
    count: 6,
    temp: 9,
    method: 'two_stage',
    actuals: {},
    statuses: ['in_mold', 'in_mold', 'in_mold', 'in_mold', 'in_mold', 'in_mold'],
    doneMilestones: [],
    notes: 'Zimno w garażu, odlew w dwóch etapach.',
    work: [['casting', -1, 75]],
  },
]

export async function seedDemoProduction(settings: Settings, today: string): Promise<void> {
  const d = (n: number) => addDays(today, n)
  const created: { id: string; number: number; spec: DemoBatch }[] = []

  for (const spec of DEMO) {
    const recipe = structuredClone(settings.recipe)
    if (spec.noFiber) recipe.components = recipe.components.map((c) => (c.id === 'fiber' ? { ...c, enabled: false } : c))
    const batch = await createBatch(
      { name: spec.name, castDate: d(spec.cast), count: spec.count, variantId: settings.productVariants[0]?.id, recipe, temperatureC: spec.temp, castMethod: spec.method ?? 'spacers', notes: spec.notes },
      settings,
    )
    const stageActuals = Object.fromEntries(Object.entries(spec.actuals).map(([k, v]) => [k, d(v as number)]))
    await db.batches.update(batch.id, { sample: true, stageActuals })
    await db.balls
      .where('batchId')
      .equals(batch.id)
      .modify((ball) => {
        const i = ball.index - 1
        ball.sample = true
        ball.status = spec.statuses[i]
        ball.statusChangedAt = d(Math.max(spec.cast, ...Object.values(spec.actuals).map(Number)))
        ball.mossRating = spec.ratings?.[i] ?? null
        if (spec.cracks?.[ball.index]) {
          ball.hasCracks = true
          ball.cracksNote = spec.cracks[ball.index]
        }
      })

    // historia: odhaczone kamienie milowe z tytułami z harmonogramu
    const titles = new Map(planSchedule({ number: batch.number, castDate: batch.castDate, temperatureC: spec.temp, stageActuals: {} }, settings).map((e) => [e.scheduleKey, e]))
    const history = spec.doneMilestones.map(([key, day]) => {
      const p = titles.get(key)!
      return buildEntity<CalendarEvent>({ title: p.title, date: d(day), kind: 'milestone', done: true, doneAt: d(day), batchId: batch.id, source: 'schedule', stage: p.stage, scheduleKey: key, notes: p.notes, sample: true })
    })
    await db.events.bulkAdd(history)
    await regenerateSchedule(batch.id, settings)

    // zadania z przeszłości jako zrobione (poza jednym zaległym do pokazania)
    const keepOverdue = new Set(spec.keepOverdue ?? [])
    const past = (await db.events.where('batchId').equals(batch.id).toArray()).filter((e) => !e.done && e.date < today).sort((a, b) => b.date.localeCompare(a.date))
    const overdueKept = new Set<string>()
    for (const e of past) {
      if (e.scheduleKey && keepOverdue.has(e.scheduleKey as ScheduleKey) && !overdueKept.has(e.scheduleKey)) {
        overdueKept.add(e.scheduleKey)
        continue
      }
      await db.events.update(e.id, { done: true, doneAt: e.date })
    }

    await db.measurements.bulkAdd(
      (spec.ph ?? []).map(([day, value]) => buildEntity<Measurement>({ batchId: batch.id, ballId: null, date: d(day), type: 'ph', value, sample: true })),
    )
    await db.workSessions.bulkAdd(
      (spec.work ?? []).map(([stage, day, minutes, note]) => buildEntity<WorkSession>({ batchId: batch.id, stage, date: d(day), minutes, note, sample: true })),
    )
    created.push({ id: batch.id, number: batch.number, spec })
  }

  const [b1, b2, , b4] = created
  const firstBall = (await db.balls.where('batchId').equals(b1.id).sortBy('index'))[0]
  if (firstBall) await db.measurements.add(buildEntity<Measurement>({ batchId: b1.id, ballId: firstBall.id, date: d(-60), type: 'weight', value: 2.4, sample: true }))

  const journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { date: d(-105), batchId: b1.id, title: 'Pierwszy odlew', text: 'Styropian wypłynął przy pierwszej kuli. Pomogły dwa dystanse z patyczków do szaszłyków. Masa jak mokry twaróg, ok. 2,5 l na kulę.', tags: ['test receptury', 'formy'] },
    { date: d(-78), batchId: b2.id, title: 'Bez włókna pęka', text: 'Kula #2-04 pękła przy wyjmowaniu w miejscu cienkiego wgłębienia. Bez włókna PP masa jest wyraźnie słabsza – wracam do włókna.', tags: ['problem', 'test receptury'] },
    { date: d(-63), batchId: b1.id, title: 'Szczepienie mchu', text: 'pH 7,5 po 13 dniach płukania. Mech z hodowli wciśnięty we wgłębienia, koktajl nałożony pędzlem. Kule stoją w cieniu pod świerkiem.', tags: ['mech'] },
    { date: d(-24), batchId: b2.id, title: 'Mech się trzyma', text: 'Po 2 tygodniach mech jest zielony na 3 kulach. Najlepiej trzyma się tam, gdzie wgłębienia są głębsze.', tags: ['mech'] },
    { date: d(-6), batchId: b1.id, title: 'Zdjęcia do aukcji', text: 'Najlepiej wyglądają w ogrodzie na kamieniach, rano w cieniu.\nPomysł: zestaw 3 kul w różnych rozmiarach.', tags: ['sprzedaż', 'pomysł'] },
    { date: d(-2), batchId: b4.id, title: 'Druga forma gotowa', text: 'Druga forma z PETG wydrukowana, ok. 38 zł filamentu. Warstwy 0,2 mm – mniej szczotkowania po wyjęciu.', tags: ['formy'] },
  ]
  await db.journal.bulkAdd(journal.map((j) => buildEntity<JournalEntry>({ ...j, sample: true })))

  await db.events.bulkAdd([
    buildEntity<CalendarEvent>({ title: 'Wydrukuj trzecią formę', date: d(3), kind: 'task', done: false, source: 'manual', sample: true }),
    buildEntity<CalendarEvent>({ title: 'Kiermasz świąteczny w Domu Kultury', date: d(24), time: '10:00', kind: 'event', done: false, source: 'manual', notes: 'Zabrać 4 gotowe kule, karty pielęgnacji, terminal.', sample: true }),
  ])
}
