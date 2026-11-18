import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@/db/defaults'
import { planSchedule, readyDate, settingWindow, stageWindows } from './schedule'

const settings = createDefaultSettings()
const batch = (p: Partial<{ castDate: string; temperatureC: number | null; stageActuals: Record<string, string> }> = {}) => ({
  number: 3,
  castDate: '2026-11-17',
  temperatureC: 20,
  stageActuals: {},
  ...p,
})

describe('wiązanie a temperatura', () => {
  it('w cieple 24–48 h', () => expect(settingWindow(20, settings.schedule)).toEqual({ minDays: 1, maxDays: 2, warning: null }))
  it('bez temperatury jak w cieple', () => expect(settingWindow(null, settings.schedule).warning).toBeNull())
  it('5–12°C: 3–4 dni', () => expect(settingWindow(8, settings.schedule)).toEqual({ minDays: 3, maxDays: 4, warning: 'cold' }))
  it('poniżej 5°C dłużej i z ostrzeżeniem', () => expect(settingWindow(3, settings.schedule)).toEqual({ minDays: 5, maxDays: 6, warning: 'freezing' }))
})

describe('harmonogram partii', () => {
  it('planuje wyjęcie z formy z oknem od–do', () => {
    const demold = planSchedule(batch(), settings).find((e) => e.scheduleKey === 'demold')!
    expect(demold.date).toBe('2026-11-18')
    expect(demold.endDate).toBe('2026-11-19')
    expect(demold.title).toBe('Wyjmij partię #3 z formy')
  })

  it('niska temperatura wydłuża wiązanie i przesuwa resztę planu', () => {
    const cold = planSchedule(batch({ temperatureC: 8 }), settings).find((e) => e.scheduleKey === 'demold')!
    expect(cold.date).toBe('2026-11-20')
    expect(cold.endDate).toBe('2026-11-21')
    expect(readyDate(batch({ temperatureC: 8 }), settings) > readyDate(batch(), settings)).toBe(true)
  })

  it('cały cykl trwa ok. 3–4 miesięcy', () => {
    // 2 dni + 28 + 14 + 1 + 56 = 101 dni
    expect(readyDate(batch(), settings)).toBe('2027-02-26')
  })

  it('zraszanie co 3 dni w czasie dojrzewania', () => {
    const mist = planSchedule(batch(), settings).filter((e) => e.scheduleKey === 'mist')
    expect(mist[0].date).toBe('2026-11-22')
    expect(mist.length).toBe(9) // 28 dni / 3
    expect(mist.every((e) => e.date < '2026-12-17')).toBe(true)
  })

  it('testy pH od 7. dnia płukania', () => {
    const ph = planSchedule(batch(), settings).filter((e) => e.scheduleKey === 'ph_test')
    expect(ph.map((e) => e.date)).toEqual(['2026-12-24', '2026-12-27', '2026-12-30'])
  })

  it('faktyczna data płukania przelicza resztę i pomija minione etapy', () => {
    const b = batch({ stageActuals: { demolding: '2026-11-18', rinsing: '2026-12-10' } })
    const events = planSchedule(b, settings)
    expect(events.some((e) => e.scheduleKey === 'mist' || e.scheduleKey === 'demold' || e.scheduleKey === 'cure_end')).toBe(false)
    expect(events.find((e) => e.scheduleKey === 'inoculate')!.date).toBe('2026-12-24')
    const w = stageWindows(b, settings)
    expect(w.find((x) => x.key === 'curing')!.end).toBe('2026-12-10')
  })

  it('po szczepieniu: ocena mchu po 14 dniach i zraszanie mchu', () => {
    const b = batch({ stageActuals: { demolding: '2026-11-18', rinsing: '2026-12-10', inoculation: '2026-12-20' } })
    const events = planSchedule(b, settings)
    expect(events.some((e) => e.scheduleKey === 'inoculate')).toBe(false)
    expect(events.find((e) => e.scheduleKey === 'moss_check')!.date).toBe('2027-01-03')
    expect(events.filter((e) => e.scheduleKey === 'moss_mist')[0].date).toBe('2026-12-21')
    expect(events.find((e) => e.scheduleKey === 'ready')!.date).toBe('2027-02-15')
  })

  it('wyłączone zadanie powtarzalne (0) nie powstaje', () => {
    const s = { ...settings, schedule: { ...settings.schedule, curingMistEveryDays: 0 } }
    expect(planSchedule(batch(), s).some((e) => e.scheduleKey === 'mist')).toBe(false)
  })
})
