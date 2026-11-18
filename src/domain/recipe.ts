import type { Recipe } from '@/db/types'
import { formatNumber } from '@/lib/format'

/** „1 : 1,5 : 1,5 + włókno” – skrót receptury do list i nagłówków */
export function recipeSummary(recipe: Recipe): string {
  const enabled = recipe.components.filter((c) => c.enabled)
  const ratio = enabled.filter((c) => c.parts !== null).map((c) => formatNumber(c.parts ?? 0, 2, true))
  const extras = enabled.filter((c) => c.parts === null).map((c) => c.name.split(' ')[0].toLowerCase())
  const disabled = recipe.components.filter((c) => !c.enabled).map((c) => `bez: ${c.name.split(' ')[0].toLowerCase()}`)
  return [ratio.join(' : '), ...extras.map((e) => `+ ${e}`), ...disabled].filter(Boolean).join(' ')
}
