import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@/db/defaults'
import type { Expense } from '@/db/types'
import { ballCostSummary, sumExpenses, totalsByMonth, withLossReserve } from './costs'
import { limitForYear, quarterlyLimit } from './limits'

const exp = (p: Partial<Expense>): Expense => ({
  id: Math.random().toString(),
  createdAt: '',
  updatedAt: '',
  name: 'x',
  category: 'materials',
  unitPrice: 0,
  quantity: 1,
  unit: 'szt.',
  date: '2026-11-01',
  ...p,
})

describe('koszty', () => {
  const settings = createDefaultSettings()

  it('plan z biznesplanu daje 15,60 zł materiałów na kulę', () => {
    const s = ballCostSummary(settings, [])
    expect(s.plannedMaterials).toBe(15.6)
    expect(s.actualMaterials).toBe(15.6)
    expect(s.itemsWithData).toBe(0)
    expect(s.plannedPackaging).toBe(6)
  })

  it('liczy rzeczywisty koszt pozycji z „starczy na”', () => {
    const s = ballCostSummary(settings, [
      exp({ costItemKey: 'core', unitPrice: 12.6, quantity: 5, ballsCovered: 5 }),
      exp({ costItemKey: 'core', unitPrice: 6.2, quantity: 10, ballsCovered: 10 }),
      exp({ costItemKey: 'cement', unitPrice: 21, ballsCovered: 20 }),
    ])
    const core = s.items.find((i) => i.item.key === 'core')!
    expect(core.actual).toBe(8.33) // 125 zł / 15 kul
    expect(s.itemsWithData).toBe(2)
    // 15,60 − 6 − 1 + 8,33 + 1,05
    expect(s.actualMaterials).toBe(17.98)
  })

  it('pomija zakupy bez „starczy na”', () => {
    const s = ballCostSummary(settings, [exp({ costItemKey: 'cement', unitPrice: 21 })])
    expect(s.items.find((i) => i.item.key === 'cement')!.actual).toBeNull()
  })

  it('zapas na straty i sumy', () => {
    expect(withLossReserve(15.6, 10)).toBe(17.16)
    expect(sumExpenses([exp({ unitPrice: 0.1, quantity: 3 }), exp({ unitPrice: 0.2, quantity: 1 })])).toBe(0.5)
  })

  it('uzupełnia puste miesiące', () => {
    const m = totalsByMonth([exp({ date: '2026-08-10', unitPrice: 10 }), exp({ date: '2026-11-02', unitPrice: 5 })])
    expect(m.map((x) => x.month)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11'])
    expect(m[1].total).toBe(0)
  })
})

describe('limit kwartalny', () => {
  const settings = createDefaultSettings()
  it('225% płacy minimalnej 2026 = 10 813,50 zł', () => {
    expect(quarterlyLimit(4806, 225)).toBe(10813.5)
    expect(limitForYear(settings, 2026)).toEqual({ limit: 10813.5, exact: true, sourceYear: 2026 })
  })
  it('bez danych na 2027 bierze 2026 i to zaznacza', () => {
    expect(limitForYear(settings, 2027)).toEqual({ limit: 10813.5, exact: false, sourceYear: 2026 })
  })
})
