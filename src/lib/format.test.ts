import { describe, expect, it } from 'vitest'
import { formatNumber, formatPLN, kul, parseDecimal, plural } from './format'

const nb = (s: string) => s.replace(/ /g, ' ')

describe('format', () => {
  it('grupuje tysiące spacją także dla liczb czterocyfrowych', () => {
    expect(nb(formatPLN(1220.5))).toBe('1 220,50 zł')
    expect(nb(formatPLN(10813.5))).toBe('10 813,50 zł')
    expect(nb(formatNumber(999.999, 2))).toBe('1 000,00')
  })
  it('formatuje liczby ujemne i zero', () => {
    expect(nb(formatPLN(-37.5))).toBe('−37,50 zł')
    expect(nb(formatPLN(-0.001))).toBe('0,00 zł')
  })
  it('parsuje przecinek, spacje i kropkę', () => {
    expect(parseDecimal('12,50')).toBe(12.5)
    expect(parseDecimal('1 220,5')).toBe(1220.5)
    expect(parseDecimal('12.5 zł')).toBe(12.5)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
  })
  it('odmienia „kula”', () => {
    expect(nb(kul(1))).toBe('1 kula')
    expect(nb(kul(3))).toBe('3 kule')
    expect(nb(kul(5))).toBe('5 kul')
    expect(nb(kul(12))).toBe('12 kul')
    expect(nb(kul(22))).toBe('22 kule')
    expect(plural(114, 'a', 'b', 'c')).toBe('c')
  })
})
