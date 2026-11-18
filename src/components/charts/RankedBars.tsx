import type { ReactNode } from 'react'

export interface RankedDatum {
  key: string
  label: ReactNode
  value: number
  icon?: ReactNode
  sub?: ReactNode
}

/** Poziome słupki w HTML: etykieta, pasek i wartość w jednym wierszu (czytelne też jako tabela). */
export function RankedBars({ data, format, total }: { data: RankedDatum[]; format: (v: number) => string; total?: number }) {
  const max = Math.max(...data.map((d) => d.value), 0)
  const sum = total ?? data.reduce((a, d) => a + d.value, 0)
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.key}>
          <div className="mb-1.5 flex items-center gap-2 text-sm">
            {d.icon}
            <span className="min-w-0 flex-1 truncate font-medium text-ink-800">{d.label}</span>
            <span className="text-xs text-ink-500 tabular">{sum > 0 ? `${Math.round((d.value / sum) * 100)}%` : ''}</span>
            <span className="w-24 text-right font-semibold text-ink-900 tabular">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-moss-600" style={{ width: max > 0 ? `${(d.value / max) * 100}%` : 0 }} />
          </div>
          {d.sub && <div className="mt-1 text-xs text-ink-500">{d.sub}</div>}
        </li>
      ))}
    </ul>
  )
}
