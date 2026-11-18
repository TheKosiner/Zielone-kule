// Sprzedaż: przychód do ewidencji, zysk na sprzedaży, ewidencja z sumami narastającymi, czas pracy.
import type { Ball, Batch, ChannelSetting, Sale, Settings, WorkSession } from '@/db/types'
import { monthKey, quarterOf, quarterRange, type ISODate } from '@/lib/dates'
import { round2 } from '@/lib/format'
import { limitForYear } from './limits'

type RevenueSettings = Pick<Settings, 'includeShippingInRevenue'>

/** Przychód ze sprzedaży do ewidencji (bez korekt zwrotów) */
export function saleRevenue(sale: Pick<Sale, 'price' | 'shippingCharged'>, settings: RevenueSettings): number {
  return round2(sale.price + (settings.includeShippingInRevenue ? sale.shippingCharged || 0 : 0))
}

export function refundOf(sale: Pick<Sale, 'status' | 'refundAmount'>): number {
  return sale.status === 'returned' || sale.status === 'complaint' ? round2(sale.refundAmount ?? 0) : 0
}

export function defaultCommission(channel: Pick<ChannelSetting, 'commissionPct' | 'fixedFee'> | undefined, price: number): number {
  if (!channel) return 0
  return round2((price * channel.commissionPct) / 100 + (price > 0 ? channel.fixedFee : 0))
}

export interface ProfitContext {
  /** koszt materiałów na kulę (z zapasem na straty) */
  materialPerBall: number
}

export interface SaleBreakdown {
  income: number
  commission: number
  shipping: number
  packaging: number
  materials: number
  refund: number
  costs: number
  profit: number
}

/** Zysk na sprzedaży: wpływy − prowizja − wysyłka − opakowanie − materiały − zwrot */
export function saleBreakdown(sale: Pick<Sale, 'price' | 'shippingCharged' | 'commission' | 'shippingCost' | 'packagingCost' | 'quantity' | 'status' | 'refundAmount'>, ctx: ProfitContext): SaleBreakdown {
  const income = round2(sale.price + (sale.shippingCharged || 0))
  const materials = round2(ctx.materialPerBall * sale.quantity)
  const refund = refundOf(sale)
  const costs = round2(sale.commission + sale.shippingCost + sale.packagingCost + materials + refund)
  return { income, commission: sale.commission, shipping: sale.shippingCost, packaging: sale.packagingCost, materials, refund, costs, profit: round2(income - costs) }
}

// ───────── Ewidencja ─────────

export interface LedgerRow {
  lp: number
  date: ISODate
  saleId: string
  description: string
  amount: number
  cumMonth: number
  cumQuarter: number
  correction: boolean
}

/** Ewidencja sprzedaży za kwartał. Zwroty to korekty ujemne w dniu zwrotu. */
export function buildLedger(sales: Sale[], settings: RevenueSettings, year: number, quarter: number): LedgerRow[] {
  const { from, to } = quarterRange(year, quarter)
  type Entry = Omit<LedgerRow, 'lp' | 'cumMonth' | 'cumQuarter'> & { order: string }
  const entries: Entry[] = []
  for (const s of sales) {
    if (s.date >= from && s.date <= to) {
      entries.push({ date: s.date, saleId: s.id, description: s.description || 'Sprzedaż', amount: saleRevenue(s, settings), correction: false, order: s.createdAt })
    }
    const refund = refundOf(s)
    const refundDate = s.refundDate ?? s.date
    if (refund > 0 && refundDate >= from && refundDate <= to) {
      entries.push({ date: refundDate, saleId: s.id, description: `Korekta: zwrot – ${s.description || 'sprzedaż'} z ${s.date.split('-').reverse().join('.')}`, amount: -refund, correction: true, order: `${s.createdAt}~` })
    }
  }
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order))
  let cumQuarter = 0
  let cumMonth = 0
  let month = ''
  return entries.map((e, i) => {
    if (monthKey(e.date) !== month) {
      month = monthKey(e.date)
      cumMonth = 0
    }
    cumMonth = round2(cumMonth + e.amount)
    cumQuarter = round2(cumQuarter + e.amount)
    const { order: _order, ...rest } = e
    return { ...rest, lp: i + 1, cumMonth, cumQuarter }
  })
}

export interface QuarterStatus {
  year: number
  quarter: number
  revenue: number
  limit: number
  limitExact: boolean
  limitSourceYear: number
  ratio: number
  level: 'ok' | 'warning' | 'over'
  remaining: number
}

export function quarterStatus(sales: Sale[], settings: Pick<Settings, 'includeShippingInRevenue' | 'years' | 'limitPctOfMinWage'>, date: ISODate): QuarterStatus {
  const { year, quarter } = quarterOf(date)
  const ledger = buildLedger(sales, settings, year, quarter)
  const revenue = ledger.at(-1)?.cumQuarter ?? 0
  const { limit, exact, sourceYear } = limitForYear(settings, year)
  const ratio = limit > 0 ? revenue / limit : 0
  return { year, quarter, revenue, limit, limitExact: exact, limitSourceYear: sourceYear, ratio, level: ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok', remaining: round2(Math.max(0, limit - revenue)) }
}

// ───────── Czas pracy ─────────

export interface LaborStats {
  /** minuty na kulę dla partii z pomiarami */
  perBatch: Map<string, number>
  /** średnio z pomiarów albo null */
  measuredMinutesPerBall: number | null
  plannedMinutesPerBall: number
  /** do obliczeń: pomiar, a bez pomiarów plan */
  minutesPerBall: number
}

/**
 * Minuty pracy na kulę. Średnia „z pomiarów” bierze tylko partie, które doszły do sprzedaży,
 * bo partie w trakcie mają jeszcze niepełne czasy.
 */
export function laborStats(sessions: WorkSession[], batches: Pick<Batch, 'id' | 'count' | 'stageActuals'>[], settings: Pick<Settings, 'stages'>): LaborStats {
  const planned = settings.stages.reduce((a, s) => a + s.activeMinutesPerBall, 0)
  const byBatch = new Map<string, number>()
  for (const s of sessions) if (s.batchId) byBatch.set(s.batchId, (byBatch.get(s.batchId) ?? 0) + s.minutes)
  const perBatch = new Map<string, number>()
  let minutes = 0
  let balls = 0
  for (const b of batches) {
    const m = byBatch.get(b.id)
    if (m && b.count > 0) {
      perBatch.set(b.id, m / b.count)
      if (b.stageActuals?.selling) {
        minutes += m
        balls += b.count
      }
    }
  }
  const measured = balls > 0 ? minutes / balls : null
  return { perBatch, measuredMinutesPerBall: measured, plannedMinutesPerBall: planned, minutesPerBall: measured ?? planned }
}

/** Godziny pracy przypadające na sprzedaż */
export function saleHours(sale: Pick<Sale, 'ballIds' | 'batchId' | 'quantity'>, balls: Pick<Ball, 'id' | 'batchId'>[], labor: LaborStats): number {
  if (sale.ballIds.length) {
    const minutes = sale.ballIds.reduce((acc, id) => {
      const ball = balls.find((b) => b.id === id)
      return acc + ((ball && labor.perBatch.get(ball.batchId)) ?? labor.minutesPerBall)
    }, 0)
    return minutes / 60
  }
  const per = (sale.batchId && labor.perBatch.get(sale.batchId)) || labor.minutesPerBall
  return (per * sale.quantity) / 60
}
