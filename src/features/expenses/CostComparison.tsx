import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { ballCostSummary, withLossReserve } from '@/domain/costs'
import { useSettings } from '@/hooks/useSettings'
import { formatPLN } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Tabela „plan vs rzeczywistość” dla kosztu jednej kuli */
export function CostComparison({ compact }: { compact?: boolean }) {
  const settings = useSettings()
  const expenses = useLiveQuery(() => db.expenses.toArray(), [])
  if (!expenses) return null
  const s = ballCostSummary(settings, expenses)
  const diff = s.actualMaterials - s.plannedMaterials

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className="text-xs text-ink-500">Plan</div>
          <div className="text-xl font-semibold text-ink-700 tabular">{formatPLN(s.plannedMaterials)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-500">Rzeczywiście</div>
          <div className="text-xl font-semibold text-ink-900 tabular">{formatPLN(s.actualMaterials)}</div>
        </div>
        <div className={cn('rounded-full px-2.5 py-1 text-sm font-medium tabular', diff > 0.005 ? 'bg-clay-50 text-clay-700' : 'bg-moss-100 text-moss-800')}>
          {diff > 0.005 ? '+' : diff < -0.005 ? '−' : '±'}
          {formatPLN(Math.abs(diff))} na kulę
        </div>
      </div>
      <p className="mb-3 text-xs text-ink-500">
        Rzeczywiste dane dla {s.itemsWithData} z {s.materialItems} pozycji, reszta według planu. Z zapasem {settings.lossReservePct}% na straty: {formatPLN(withLossReserve(s.actualMaterials, settings.lossReservePct))}.
      </p>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-ink-150 text-left text-xs text-ink-500">
              <th className="py-2 pr-2 pl-4 font-medium sm:pl-0">Pozycja</th>
              <th className="px-2 py-2 text-right font-medium">Plan</th>
              <th className="px-2 py-2 text-right font-medium">Rzecz.</th>
              {!compact && <th className="py-2 pr-4 pl-2 text-right font-medium sm:pr-0">Z zakupów</th>}
            </tr>
          </thead>
          <tbody>
            {s.items.map((i) => {
              const over = i.actual !== null && i.actual > i.planned + 0.005
              return (
                <tr key={i.item.key} className="border-b border-ink-100 last:border-0">
                  <td className="py-2.5 pr-2 pl-4 text-ink-800 sm:pl-0">
                    {i.item.name}
                    {i.item.kind === 'packaging' && <span className="ml-1 text-xs text-ink-400">(na wysyłkę)</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right text-ink-500 tabular">{formatPLN(i.planned)}</td>
                  <td className={cn('px-2 py-2.5 text-right font-medium tabular', i.actual === null ? 'text-ink-300' : over ? 'text-clay-600' : 'text-moss-700')}>
                    {i.actual === null ? '—' : formatPLN(i.actual)}
                  </td>
                  {!compact && (
                    <td className="py-2.5 pr-4 pl-2 text-right text-xs text-ink-500 tabular sm:pr-0">
                      {i.purchases ? `${formatPLN(i.spent)} / ${i.covered} ${i.item.kind === 'packaging' ? 'wys.' : 'kul'}` : 'brak'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
