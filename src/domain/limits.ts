// Limit przychodu działalności nierejestrowanej: % płacy minimalnej danego roku, liczony na kwartał.
import type { Settings, YearSettings } from '@/db/types'
import { round2 } from '@/lib/format'

export function quarterlyLimit(minWage: number, pctOfMinWage: number): number {
  return round2((minWage * pctOfMinWage) / 100)
}

/** Ustawienia roku; gdy brak, bierzemy najbliższy wcześniejszy (albo najstarszy) i zaznaczamy to. */
export function yearSettingsFor(settings: Pick<Settings, 'years'>, year: number): { data: YearSettings; exact: boolean } {
  const sorted = [...settings.years].sort((a, b) => a.year - b.year)
  const exact = sorted.find((y) => y.year === year)
  if (exact) return { data: exact, exact: true }
  const earlier = sorted.filter((y) => y.year < year).at(-1)
  return { data: earlier ?? sorted[0] ?? { year, minWage: 0, minHourly: 0 }, exact: false }
}

export function limitForYear(settings: Pick<Settings, 'years' | 'limitPctOfMinWage'>, year: number): { limit: number; exact: boolean; sourceYear: number } {
  const { data, exact } = yearSettingsFor(settings, year)
  return { limit: quarterlyLimit(data.minWage, settings.limitPctOfMinWage), exact, sourceYear: data.year }
}
