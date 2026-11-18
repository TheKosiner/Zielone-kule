// Koszty: sumy wydatków i rzeczywisty koszt kuli z pól „starczy na N kul”.
import type { CostItem, Expense, ExpenseCategory, PlannedPurchase, Settings } from '@/db/types'
import { monthKey } from '@/lib/dates'
import { round2 } from '@/lib/format'

export function lineTotal(e: Pick<Expense | PlannedPurchase, 'unitPrice' | 'quantity'>): number {
  return round2((e.unitPrice || 0) * (e.quantity || 0))
}

export function sumExpenses(expenses: Pick<Expense, 'unitPrice' | 'quantity'>[]): number {
  return round2(expenses.reduce((acc, e) => acc + lineTotal(e), 0))
}

export function totalsByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const out: Record<ExpenseCategory, number> = { materials: 0, molds: 0, packaging: 0, moss: 0, tools: 0, marketing: 0, other: 0 }
  for (const e of expenses) out[e.category] = round2(out[e.category] + lineTotal(e))
  return out
}

/** Sumy per miesiąc, z wypełnionymi pustymi miesiącami między pierwszym a ostatnim */
export function totalsByMonth(expenses: Expense[]): { month: string; total: number }[] {
  if (!expenses.length) return []
  const map = new Map<string, number>()
  for (const e of expenses) map.set(monthKey(e.date), round2((map.get(monthKey(e.date)) ?? 0) + lineTotal(e)))
  const keys = [...map.keys()].sort()
  const out: { month: string; total: number }[] = []
  let [y, m] = keys[0].split('-').map(Number)
  const [ly, lm] = keys[keys.length - 1].split('-').map(Number)
  while (y < ly || (y === ly && m <= lm)) {
    const k = `${y}-${String(m).padStart(2, '0')}`
    out.push({ month: k, total: map.get(k) ?? 0 })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}

export interface CostItemActual {
  item: CostItem
  planned: number
  /** koszt na kulę z wydatków albo null, gdy brak danych */
  actual: number | null
  spent: number
  covered: number
  purchases: number
}

export interface BallCostSummary {
  items: CostItemActual[]
  plannedMaterials: number
  /** suma: rzeczywiste tam, gdzie są dane, planowane tam, gdzie ich brak */
  actualMaterials: number
  itemsWithData: number
  materialItems: number
  plannedPackaging: number
  actualPackaging: number | null
}

export function ballCostSummary(settings: Pick<Settings, 'costItems'>, expenses: Expense[]): BallCostSummary {
  const items: CostItemActual[] = settings.costItems.map((item) => {
    const linked = expenses.filter((e) => e.costItemKey === item.key && (e.ballsCovered ?? 0) > 0)
    const spent = sumExpenses(linked)
    const covered = linked.reduce((acc, e) => acc + (e.ballsCovered ?? 0), 0)
    return { item, planned: item.plannedPerBall, actual: covered > 0 ? round2(spent / covered) : null, spent, covered, purchases: linked.length }
  })
  const materials = items.filter((i) => i.item.kind === 'material')
  const packaging = items.find((i) => i.item.kind === 'packaging')
  return {
    items,
    plannedMaterials: round2(materials.reduce((a, i) => a + i.planned, 0)),
    actualMaterials: round2(materials.reduce((a, i) => a + (i.actual ?? i.planned), 0)),
    itemsWithData: materials.filter((i) => i.actual !== null).length,
    materialItems: materials.length,
    plannedPackaging: packaging?.planned ?? 0,
    actualPackaging: packaging?.actual ?? null,
  }
}

/** Koszt materiałów na kulę z zapasem na straty (np. 15,60 zł + 10%) */
export function withLossReserve(materials: number, lossReservePct: number): number {
  return round2(materials * (1 + lossReservePct / 100))
}
