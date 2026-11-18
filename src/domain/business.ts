// Wspólne liczby biznesowe dla sprzedaży, pulpitu i biznesplanu (czysta funkcja).
import type { Ball, Batch, ChannelKey, Expense, Sale, Settings, WorkSession } from '@/db/types'
import { monthKey } from '@/lib/dates'
import { round2 } from '@/lib/format'
import { ballCostSummary, sumExpenses, withLossReserve, type BallCostSummary } from './costs'
import { laborStats, refundOf, saleBreakdown, saleHours, saleRevenue, type LaborStats, type SaleBreakdown } from './sales'

export interface BusinessInput {
  sales: Sale[]
  balls: Ball[]
  batches: Batch[]
  sessions: WorkSession[]
  expenses: Expense[]
}

export interface SaleStats extends SaleBreakdown {
  sale: Sale
  hours: number
  perHour: number | null
}

export interface ChannelStats {
  channel: ChannelKey
  sales: number
  quantity: number
  revenue: number
  profit: number
}

export interface BusinessStats {
  cost: BallCostSummary
  materialPerBall: number
  plannedMaterialPerBall: number
  labor: LaborStats
  sales: SaleStats[]
  /** przychód do ewidencji po korektach */
  revenue: number
  profit: number
  hours: number
  perHour: number | null
  soldQuantity: number
  avgPrice: number | null
  avgProfitPerBall: number | null
  totalExpenses: number
  /** wynik gotówkowy: wpływy − prowizje − wysyłki − zwroty − wszystkie wydatki */
  cashResult: number
  byChannel: ChannelStats[]
  revenueByMonth: { month: string; total: number }[]
}

export function computeBusiness(input: BusinessInput, settings: Settings): BusinessStats {
  const cost = ballCostSummary(settings, input.expenses)
  const materialPerBall = withLossReserve(cost.actualMaterials, settings.lossReservePct)
  const plannedMaterialPerBall = withLossReserve(cost.plannedMaterials, settings.lossReservePct)
  const labor = laborStats(input.sessions, input.batches, settings)

  const sales: SaleStats[] = input.sales.map((sale) => {
    const b = saleBreakdown(sale, { materialPerBall })
    const hours = saleHours(sale, input.balls, labor)
    return { ...b, sale, hours, perHour: hours > 0 ? round2(b.profit / hours) : null }
  })

  const revenue = round2(input.sales.reduce((a, s) => a + saleRevenue(s, settings) - refundOf(s), 0))
  const profit = round2(sales.reduce((a, s) => a + s.profit, 0))
  const hours = sales.reduce((a, s) => a + s.hours, 0)
  const kept = input.sales.filter((s) => s.status !== 'returned')
  const soldQuantity = kept.reduce((a, s) => a + s.quantity, 0)
  const totalExpenses = sumExpenses(input.expenses)
  const cashIn = sales.reduce((a, s) => a + s.income - s.refund - s.commission - s.shipping, 0)

  const channels = new Map<ChannelKey, ChannelStats>()
  for (const s of sales) {
    const c = channels.get(s.sale.channel) ?? { channel: s.sale.channel, sales: 0, quantity: 0, revenue: 0, profit: 0 }
    c.sales++
    c.quantity += s.sale.status === 'returned' ? 0 : s.sale.quantity
    c.revenue = round2(c.revenue + saleRevenue(s.sale, settings) - s.refund)
    c.profit = round2(c.profit + s.profit)
    channels.set(s.sale.channel, c)
  }

  const months = new Map<string, number>()
  for (const s of input.sales) months.set(monthKey(s.date), round2((months.get(monthKey(s.date)) ?? 0) + saleRevenue(s, settings) - refundOf(s)))

  return {
    cost,
    materialPerBall,
    plannedMaterialPerBall,
    labor,
    sales,
    revenue,
    profit,
    hours,
    perHour: hours > 0 ? round2(profit / hours) : null,
    soldQuantity,
    avgPrice: soldQuantity ? round2(kept.reduce((a, s) => a + s.price, 0) / soldQuantity) : null,
    avgProfitPerBall: soldQuantity ? round2(profit / soldQuantity) : null,
    totalExpenses,
    cashResult: round2(cashIn - totalExpenses),
    byChannel: [...channels.values()].sort((a, b) => b.revenue - a.revenue),
    revenueByMonth: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total })),
  }
}
