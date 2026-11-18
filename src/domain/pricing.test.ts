import { describe, expect, it } from 'vitest'
import { breakEvenBalls, priceResult } from './pricing'

describe('kalkulator ceny (liczby z biznesplanu)', () => {
  const base = { commissionPct: 12, hours: 1.3, materials: 17.2, packaging: 6, hourlyRate: 31.4 }
  it('119 zł na Allegro: zostaje ok. 81,50 zł, ok. 63 zł/h', () => {
    const r = priceResult({ ...base, price: 119 })
    expect(r.costs).toBe(37.48)
    expect(r.profit).toBe(81.52)
    expect(Math.round(r.perHour)).toBe(63)
  })
  it('sprzedaż lokalna 69 zł: ok. 40 zł/h', () => {
    const r = priceResult({ ...base, price: 69, commissionPct: 0, packaging: 0 })
    expect(r.profit).toBe(51.8)
    expect(Math.round(r.perHour)).toBe(40)
  })
  it('cena minimalna przy płacy minimalnej na Allegro to ok. 75 zł', () => {
    expect(Math.round(priceResult({ ...base, price: 119 }).minPrice)).toBe(73)
  })
  it('zwrot inwestycji 435 zł: 5 kul po 119 zł', () => {
    expect(breakEvenBalls(435, 119, 12, 6)).toBe(5)
  })
})
