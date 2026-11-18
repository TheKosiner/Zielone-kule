import { describe, expect, it } from 'vitest'
import { addDays, addMonths, diffDays, formatDate, monthGrid, quarterOf, quarterRange, relativeDay, startOfWeek, todayISO } from './dates'

describe('dates', () => {
  it('liczy „dziś” w strefie Europe/Warsaw', () => {
    // 23:30 UTC 31 grudnia to już 1 stycznia w Warszawie
    expect(todayISO(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
    // w lecie +2 h
    expect(todayISO(new Date('2026-06-30T22:10:00Z'))).toBe('2026-07-01')
  })
  it('dodaje dni przez zmianę czasu bez przesunięć', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(diffDays('2026-11-17', '2027-03-01')).toBe(104)
  })
  it('dodaje miesiące z obcięciem do końca miesiąca', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('formatuje po polsku', () => {
    expect(formatDate('2026-11-17')).toBe('17.11.2026')
    expect(relativeDay('2026-11-18', '2026-11-17')).toBe('jutro')
    expect(relativeDay('2026-11-14', '2026-11-17')).toBe('3 dni temu')
  })
  it('tydzień zaczyna się w poniedziałek, siatka ma 42 dni', () => {
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16')
    const grid = monthGrid('2026-11-17')
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe('2026-10-26')
  })
  it('kwartały', () => {
    expect(quarterOf('2027-03-31')).toEqual({ year: 2027, quarter: 1 })
    expect(quarterOf('2026-11-17')).toEqual({ year: 2026, quarter: 4 })
    expect(quarterRange(2026, 4)).toEqual({ from: '2026-10-01', to: '2026-12-31' })
  })
})
