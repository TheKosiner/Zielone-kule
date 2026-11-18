import { describe, expect, it } from 'vitest'
import { toIcs } from './ics'

describe('ics', () => {
  it('tworzy całodniowe wydarzenie z oknem', () => {
    const ics = toIcs([{ uid: 'a1', title: 'Wyjmij partię #3 z formy', date: '2026-11-18', endDate: '2026-11-19', description: 'Test paznokcia; rysa, nie wgniecenie' }])
    expect(ics).toContain('DTSTART;VALUE=DATE:20261118')
    expect(ics).toContain('DTEND;VALUE=DATE:20261120')
    expect(ics).toContain('SUMMARY:Wyjmij partię #3 z formy')
    expect(ics).toContain('Test paznokcia\; rysa\\, nie wgniecenie')
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
})
