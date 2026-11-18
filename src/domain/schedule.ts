// Automatyczny harmonogram partii. Czysta logika: dane wejściowe → lista terminów.
// Czasy biorą się z ustawień; faktyczne daty etapów (stageActuals) przesuwają resztę planu.
import type { BallStatus, Batch, ScheduleSettings, Settings, StageKey } from '@/db/types'
import { addDays, formatDate, type ISODate } from '@/lib/dates'

export type ScheduleKey =
  | 'cast'
  | 'demold'
  | 'mist'
  | 'cure_end'
  | 'rinse_water'
  | 'ph_test'
  | 'inoculate'
  | 'moss_mist'
  | 'moss_check'
  | 'ready'

export interface PlannedEvent {
  scheduleKey: ScheduleKey
  stage: StageKey
  title: string
  date: ISODate
  endDate?: ISODate
  kind: 'task' | 'milestone' | 'event'
  notes?: string
}

export interface StageWindow {
  key: StageKey
  start: ISODate
  end: ISODate
  /** początek ustalony faktyczną datą, a nie planem */
  actual: boolean
}

export interface SettingWindow {
  minDays: number
  maxDays: number
  warning: 'cold' | 'freezing' | null
}

/** Czas wiązania w formie zależnie od temperatury */
export function settingWindow(temperatureC: number | null | undefined, sch: ScheduleSettings): SettingWindow {
  if (temperatureC === null || temperatureC === undefined || temperatureC >= sch.warmThresholdC) {
    return { minDays: Math.max(1, Math.ceil(sch.warmMinHours / 24)), maxDays: Math.max(1, Math.ceil(sch.warmMaxHours / 24)), warning: null }
  }
  if (temperatureC >= sch.freezingThresholdC) {
    return { minDays: sch.coldMinDays, maxDays: sch.coldMaxDays, warning: 'cold' }
  }
  return { minDays: sch.coldMinDays + sch.freezingExtraDays, maxDays: sch.coldMaxDays + sch.freezingExtraDays, warning: 'freezing' }
}

type BatchLike = Pick<Batch, 'number' | 'castDate' | 'temperatureC' | 'stageActuals'>
type SettingsLike = Pick<Settings, 'stages' | 'schedule'>

function stageDays(settings: SettingsLike, key: StageKey): { min: number; planned: number } {
  const s = settings.stages.find((x) => x.key === key)
  return { min: s?.minDays ?? 0, planned: s?.plannedDays ?? 0 }
}

/** Okna czasowe etapów: od odlewu do gotowości */
export function stageWindows(batch: BatchLike, settings: SettingsLike): StageWindow[] {
  const a = batch.stageActuals ?? {}
  const set = settingWindow(batch.temperatureC, settings.schedule)
  const cast = batch.castDate
  const demold = a.demolding ?? addDays(cast, set.maxDays)
  const curing = stageDays(settings, 'curing')
  const curingEnd = addDays(demold, curing.planned)
  const rinseStart = a.rinsing ?? curingEnd
  const rinsing = stageDays(settings, 'rinsing')
  const rinseEnd = addDays(rinseStart, rinsing.planned)
  const inoc = a.inoculation ?? rinseEnd
  const inocDays = Math.max(1, stageDays(settings, 'inoculation').planned)
  const estStart = addDays(inoc, inocDays)
  const est = stageDays(settings, 'establishing')
  const estEnd = addDays(estStart, est.planned)
  const ready = a.selling ?? estEnd

  return [
    { key: 'casting', start: cast, end: cast, actual: true },
    { key: 'setting', start: cast, end: demold, actual: !!a.demolding },
    { key: 'demolding', start: demold, end: demold, actual: !!a.demolding },
    { key: 'curing', start: demold, end: a.rinsing ?? curingEnd, actual: !!a.demolding },
    { key: 'rinsing', start: rinseStart, end: a.inoculation ?? rinseEnd, actual: !!a.rinsing },
    { key: 'inoculation', start: inoc, end: inoc, actual: !!a.inoculation },
    { key: 'establishing', start: estStart, end: a.selling ?? estEnd, actual: !!a.inoculation },
    { key: 'selling', start: ready, end: ready, actual: !!a.selling },
  ]
}

/** Etap, w którym partia jest „teraz” według faktycznych dat (do pomijania zadań z minionych etapów) */
export function reachedStage(batch: Pick<Batch, 'stageActuals'>): StageKey {
  const a = batch.stageActuals ?? {}
  if (a.selling) return 'selling'
  if (a.inoculation) return 'inoculation'
  if (a.rinsing) return 'rinsing'
  if (a.demolding) return 'curing'
  return 'setting'
}

const STAGE_RANK: Record<StageKey, number> = { casting: 0, setting: 1, demolding: 2, curing: 3, rinsing: 4, inoculation: 5, establishing: 6, selling: 7 }

function every(start: ISODate, endExclusive: ISODate, step: number, from = step): ISODate[] {
  if (!step || step <= 0) return []
  const out: ISODate[] = []
  for (let d = addDays(start, from); d < endExclusive; d = addDays(d, step)) out.push(d)
  return out
}

/** Pełna lista zadań partii. Zadania z etapów, które partia już minęła, są pomijane. */
export function planSchedule(batch: BatchLike, settings: SettingsLike): PlannedEvent[] {
  const sch = settings.schedule
  const n = batch.number
  const w = Object.fromEntries(stageWindows(batch, settings).map((x) => [x.key, x])) as Record<StageKey, StageWindow>
  const set = settingWindow(batch.temperatureC, sch)
  const reached = STAGE_RANK[reachedStage(batch)]
  const events: PlannedEvent[] = []
  const add = (e: PlannedEvent) => {
    if (e.scheduleKey === 'cast') return void events.push(e)
    if (STAGE_RANK[e.stage] < reached) return
    // kamień milowy już osiągnięty (faktyczna data etapu jest wpisana)
    const effect = MILESTONE_EFFECTS[e.scheduleKey]
    if (e.kind === 'milestone' && effect?.actual && batch.stageActuals?.[effect.actual]) return
    events.push(e)
  }

  add({ scheduleKey: 'cast', stage: 'casting', kind: 'event', title: `Odlew partii #${n}`, date: batch.castDate })

  const demoldFrom = addDays(batch.castDate, set.minDays)
  const demoldTo = addDays(batch.castDate, set.maxDays)
  add({
    scheduleKey: 'demold',
    stage: 'setting',
    kind: 'milestone',
    title: `Wyjmij partię #${n} z formy`,
    date: demoldFrom,
    endDate: demoldTo !== demoldFrom ? demoldTo : undefined,
    notes:
      'Test paznokcia: zostaje rysa, ale nie wgniecenie. Kula jest jeszcze krucha – wyjmuj ostrożnie i od razu zetrzyj szczotką drucianą ślady warstw z druku.' +
      (set.warning === 'freezing' ? ' Odlew poniżej 5°C: wiązanie może być słabe, sprawdź dokładnie.' : set.warning === 'cold' ? ' W chłodzie wiązanie trwa dłużej.' : ''),
  })

  const curing = stageDays(settings, 'curing')
  for (const d of every(w.curing.start, w.curing.end, sch.curingMistEveryDays)) {
    add({ scheduleKey: 'mist', stage: 'curing', kind: 'task', title: `Zrosz kule z partii #${n}`, date: d, notes: 'Wilgotne dojrzewanie w worku. Zraszaj, żeby cement nie wysychał.' })
  }
  add({
    scheduleKey: 'cure_end',
    stage: 'curing',
    kind: 'milestone',
    title: `Koniec dojrzewania partii #${n} – zacznij płukanie`,
    date: w.curing.end,
    notes: `Najwcześniej ${curing.min} dni po wyjęciu z formy (${formatDate(addDays(w.curing.start, curing.min))}). Pełna wytrzymałość po ok. 4 tygodniach.`,
  })

  const rinsing = stageDays(settings, 'rinsing')
  for (const d of every(w.rinsing.start, w.rinsing.end, sch.rinseWaterEveryDays)) {
    add({ scheduleKey: 'rinse_water', stage: 'rinsing', kind: 'task', title: `Wymień wodę – płukanie partii #${n}`, date: d, notes: 'Świeży cement ma pH 12–13. Moczenie i płukanie obniża pH.' })
  }
  if (sch.phTestEveryDays > 0) {
    for (let d = addDays(w.rinsing.start, rinsing.min); d < w.rinsing.end; d = addDays(d, sch.phTestEveryDays)) {
      add({ scheduleKey: 'ph_test', stage: 'rinsing', kind: 'task', title: `Test pH partii #${n} (cel: poniżej ${sch.phTarget})`, date: d, notes: 'Papierek pH na mokrej powierzchni. Wpisz wynik jako pomiar.' })
    }
  }
  add({
    scheduleKey: 'inoculate',
    stage: 'inoculation',
    kind: 'milestone',
    title: `Zaszczep mech – partia #${n}`,
    date: w.inoculation.start,
    notes: `Tylko przy pH poniżej ok. ${sch.phTarget}. Kawałki mchu wciśnij we wgłębienia, koktajl nałóż pędzlem. Koktajlu nie dodawaj do masy.`,
  })

  for (const d of every(w.establishing.start, w.establishing.end, sch.mossMistEveryDays, 0)) {
    add({ scheduleKey: 'moss_mist', stage: 'establishing', kind: 'task', title: `Zrosz mech – partia #${n}`, date: d, notes: 'W cieniu, bez mrozu. Mech nie może wyschnąć.' })
  }
  if (sch.mossCheckAfterDays > 0) {
    add({
      scheduleKey: 'moss_check',
      stage: 'establishing',
      kind: 'milestone',
      title: `Ocena mchu – partia #${n}`,
      date: addDays(w.inoculation.start, sch.mossCheckAfterDays),
      notes: 'Czy mech się trzyma i zielenieje? Oceń kule w skali 1–5.',
    })
  }
  add({
    scheduleKey: 'ready',
    stage: 'selling',
    kind: 'milestone',
    title: `Partia #${n} gotowa do sprzedaży`,
    date: w.selling.start,
    notes: 'Zdjęcia w ogrodzie, opis aukcji, karta pielęgnacji, pakowanie.',
  })

  return events.sort((x, y) => x.date.localeCompare(y.date))
}

/** Co robi odhaczenie kamienia milowego: zmiana statusu kul i faktyczna data etapu */
export const MILESTONE_EFFECTS: Partial<Record<ScheduleKey, { from: BallStatus; to: BallStatus; actual?: StageKey; question: string; confirm: string }>> = {
  demold: { from: 'in_mold', to: 'curing', actual: 'demolding', question: 'Kule wyjęte z formy?', confirm: 'Zmień status na „Dojrzewa”' },
  cure_end: { from: 'curing', to: 'rinsing', actual: 'rinsing', question: 'Zaczynasz płukanie?', confirm: 'Zmień status na „Płukanie”' },
  inoculate: { from: 'rinsing', to: 'inoculated', actual: 'inoculation', question: 'Mech zaszczepiony?', confirm: 'Zmień status na „Zaszczepiona”' },
  moss_check: { from: 'inoculated', to: 'establishing', question: 'Mech się trzyma?', confirm: 'Zmień status na „Mech się przyjmuje”' },
  ready: { from: 'establishing', to: 'ready', actual: 'selling', question: 'Partia gotowa do sprzedaży?', confirm: 'Zmień status na „Gotowa”' },
}

/** Faktyczny etap ustawiany przy ręcznej zmianie statusu całej partii */
export const STATUS_ACTUAL: Partial<Record<BallStatus, StageKey>> = {
  curing: 'demolding',
  rinsing: 'rinsing',
  inoculated: 'inoculation',
  ready: 'selling',
}

/** Planowana data gotowości do sprzedaży */
export function readyDate(batch: BatchLike, settings: SettingsLike): ISODate {
  return stageWindows(batch, settings).find((x) => x.key === 'selling')!.start
}
