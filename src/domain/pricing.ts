// Kalkulator ceny i warianty cenowe z biznesplanu (czyste funkcje).
import { round2 } from '@/lib/format'

export interface PriceInputs {
  price: number
  commissionPct: number
  /** godziny aktywnej pracy na kulę */
  hours: number
  /** materiały na kulę (z zapasem na straty) */
  materials: number
  packaging: number
  hourlyRate: number
}

export interface PriceResult {
  commission: number
  costs: number
  profit: number
  perHour: number
  /** cena, przy której praca jest opłacona stawką godzinową */
  minPrice: number
  /** zysk po opłaceniu pracy stawką godzinową */
  surplus: number
}

export function priceResult(i: PriceInputs): PriceResult {
  const commission = round2((i.price * i.commissionPct) / 100)
  const costs = round2(commission + i.materials + i.packaging)
  const profit = round2(i.price - costs)
  const perHour = i.hours > 0 ? round2(profit / i.hours) : 0
  const share = 1 - i.commissionPct / 100
  const minPrice = share > 0 ? round2((i.materials + i.packaging + i.hourlyRate * i.hours) / share) : Infinity
  return { commission, costs, profit, perHour, minPrice, surplus: round2(profit - i.hourlyRate * i.hours) }
}

/** Ile kul trzeba sprzedać, żeby zwróciła się inwestycja (materiały są już w inwestycji) */
export function breakEvenBalls(startup: number, price: number, commissionPct: number, packaging: number): number {
  const perBall = price - (price * commissionPct) / 100 - packaging
  return perBall > 0 ? Math.ceil(startup / perBall) : Infinity
}
