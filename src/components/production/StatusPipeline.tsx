import type { BallStatus } from '@/db/types'
import { ACTIVE_STATUSES, STATUS_META } from '@/domain/constants'
import { cn } from '@/lib/cn'

/** Pasek etapów: kule w produkcji od „w formie” (jasna zieleń) do „gotowa” (ciemna), z legendą i liczbami */
export function StatusPipeline({ counts, className, showLegend = true }: { counts: Record<BallStatus, number>; className?: string; showLegend?: boolean }) {
  const total = ACTIVE_STATUSES.reduce((a, s) => a + counts[s], 0)
  return (
    <div className={className}>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={ACTIVE_STATUSES.map((s) => `${STATUS_META[s].label}: ${counts[s]}`).join(', ')}>
        {total > 0 &&
          ACTIVE_STATUSES.filter((s) => counts[s] > 0).map((s) => (
            <div key={s} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(counts[s] / total) * 100}%`, background: STATUS_META[s].color }} title={`${STATUS_META[s].label}: ${counts[s]}`} />
          ))}
      </div>
      {showLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {ACTIVE_STATUSES.map((s) => (
            <li key={s} className={cn('flex items-center gap-1.5 text-sm', counts[s] ? 'text-ink-700' : 'text-ink-400')}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[s].color, opacity: counts[s] ? 1 : 0.35 }} />
              <span>{STATUS_META[s].label}</span>
              <span className={cn('font-semibold tabular', counts[s] ? 'text-ink-900' : 'text-ink-400')}>{counts[s]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StatusBadge({ status, className }: { status: BallStatus; className?: string }) {
  const m = STATUS_META[status]
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', m.badge, className)}>{m.label}</span>
}
