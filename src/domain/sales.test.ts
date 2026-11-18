import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@/db/defaults'
import type { Sale } from '@/db/types'
import { buildLedger, defaultCommission, laborStats, quarterStatus, saleBreakdown, saleHours } from './sales'

const settings = createDefaultSettings()
let n = 0
const sale = (p: Partial<Sale>): Sale => ({
  id: `s${++n}`,
  createdAt: `2026-01-01T00:00:0${n % 10}Z`,
  updatedAt: '',
  date: '2026-11-10',
  ballIds: [],
  quantity: 1,
  channel: 'allegro',
  price: 119,
  commissionPct: 12,
  commission: 14.28,
  shippingCharged: 0,
  shippingCost: 0,
  packagingCost: 6,
  status: 'ok',
  ...p,
})

describe('zysk na sprzedaży', () => {
  it('odtwarza wariant z biznesplanu: 119 zł na Allegro → ok. 81,50 zł', () => {
    const b = saleBreakdown(sale({}), { materialPerBall: 17.16 })
    // 119 − 14,28 − 6 − 17,16
    expect(b.profit).toBe(81.56)
  })
  it('wysyłka płacona przez klienta się znosi, zwrot obniża zysk', () => {
    const b = saleBreakdown(sale({ shippingCharged: 16.99, shippingCost: 16.99, status: 'returned', refundAmount: 119 }), { materialPerBall: 17.16 })
    expect(b.income).toBe(135.99)
    expect(b.profit).toBe(81.56 - 119)
  })
  it('domyślna prowizja z kanału', () => {
    expect(defaultCommission(settings.channels[0], 119)).toBe(14.28)
    expect(defaultCommission(undefined, 119)).toBe(0)
  })
})

describe('ewidencja', () => {
  const sales = [
    sale({ date: '2026-10-05', price: 79, description: 'Kula lokalnie' }),
    sale({ date: '2026-11-10', price: 119, shippingCharged: 16.99 }),
    sale({ date: '2026-11-12', price: 119, status: 'returned', refundAmount: 119, refundDate: '2026-12-01' }),
    sale({ date: '2027-01-02', price: 149 }),
  ]

  it('liczy sumy narastające w miesiącu i kwartale, zwrot jako korekta', () => {
    const rows = buildLedger(sales, settings, 2026, 4)
    expect(rows.map((r) => r.amount)).toEqual([79, 135.99, 119, -119])
    expect(rows.map((r) => r.cumMonth)).toEqual([79, 135.99, 254.99, -119])
    expect(rows.map((r) => r.cumQuarter)).toEqual([79, 214.99, 333.99, 214.99])
    expect(rows[3].correction).toBe(true)
    expect(rows.map((r) => r.lp)).toEqual([1, 2, 3, 4])
  })

  it('bez wysyłki w przychodzie, gdy wyłączone', () => {
    const rows = buildLedger(sales, { includeShippingInRevenue: false }, 2026, 4)
    expect(rows[1].amount).toBe(119)
  })

  it('stan limitu kwartalnego z ostrzeżeniem od 80%', () => {
    const many = Array.from({ length: 73 }, () => sale({ date: '2026-11-15', price: 119 }))
    const st = quarterStatus(many, settings, '2026-11-20')
    expect(st.revenue).toBe(8687)
    expect(st.level).toBe('warning')
    expect(quarterStatus([], settings, '2026-11-20').level).toBe('ok')
    expect(quarterStatus(Array.from({ length: 91 }, () => sale({ date: '2026-11-15', price: 119 })), settings, '2026-11-20').level).toBe('over')
  })
})

describe('czas pracy', () => {
  it('bez pomiarów używa planu 80 min na kulę', () => {
    const l = laborStats([], [], settings)
    expect(l.minutesPerBall).toBe(80)
    expect(saleHours(sale({ quantity: 3 }), [], l)).toBe(4)
  })
  it('z pomiarów liczy minuty na kulę partii', () => {
    const l = laborStats(
      [
        { id: 'w1', createdAt: '', updatedAt: '', batchId: 'b1', date: '2026-11-01', minutes: 300 },
        { id: 'w2', createdAt: '', updatedAt: '', batchId: null, date: '2026-11-01', minutes: 999 },
      ],
      [{ id: 'b1', count: 4, stageActuals: { selling: '2026-11-01' } }, { id: 'b2', count: 6, stageActuals: {} }],
      settings,
    )
    expect(l.perBatch.get('b1')).toBe(75)
    expect(l.measuredMinutesPerBall).toBe(75)
    expect(saleHours(sale({ ballIds: ['k1'] }), [{ id: 'k1', batchId: 'b1' }], l)).toBe(1.25)
  })
})
