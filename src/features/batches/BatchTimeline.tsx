import { Check } from 'lucide-react'
import type { BallStatus, Batch, StageKey } from '@/db/types'
import { stageWindows } from '@/domain/schedule'
import { useSettings } from '@/hooks/useSettings'
import { formatDateShort } from '@/lib/dates'
import { cn } from '@/lib/cn'

const STEPS: { key: StageKey; label: string }[] = [
  { key: 'casting', label: 'Odlew' },
  { key: 'demolding', label: 'Wyjęcie' },
  { key: 'curing', label: 'Dojrzewanie' },
  { key: 'rinsing', label: 'Płukanie' },
  { key: 'inoculation', label: 'Szczepienie' },
  { key: 'establishing', label: 'Mech rośnie' },
  { key: 'selling', label: 'Gotowa' },
]

const CURRENT_STEP: Record<BallStatus, number> = { in_mold: 1, curing: 2, rinsing: 3, inoculated: 5, establishing: 5, ready: 6, sold: 7, waste: 7 }

/** Oś etapów partii z datami: faktycznymi albo planowanymi („plan”). Bieżący etap wynika ze statusu kul. */
export function BatchTimeline({ batch, status }: { batch: Batch; status: BallStatus | null }) {
  const settings = useSettings()
  const w = Object.fromEntries(stageWindows(batch, settings).map((x) => [x.key, x]))
  const currentIdx = status ? CURRENT_STEP[status] : 7

  return (
    <ol className="relative grid grid-cols-1 gap-0 sm:grid-cols-7 sm:gap-1">
      {STEPS.map((s, i) => {
        const win = w[s.key]
        const isCurrent = i === currentIdx
        const isDone = i < currentIdx
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0 sm:flex-col sm:items-center sm:gap-2 sm:pb-0 sm:text-center">
            {i < STEPS.length - 1 && (
              <span className={cn('absolute top-8 bottom-0 left-[15px] w-0.5 sm:top-[15px] sm:right-[-50%] sm:bottom-auto sm:left-1/2 sm:h-0.5 sm:w-full', isDone ? 'bg-moss-600' : 'bg-ink-200')} />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-white',
                isDone ? 'bg-moss-600 text-white' : isCurrent ? 'bg-moss-900 text-white' : 'bg-ink-100 text-ink-500',
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className="min-w-0 pt-1 sm:pt-0">
              <span className={cn('block text-sm font-medium', isCurrent ? 'text-moss-900' : isDone ? 'text-ink-700' : 'text-ink-500')}>
                {s.label}
                {isCurrent && <span className="ml-2 rounded-full bg-moss-100 px-2 py-0.5 text-[11px] font-semibold text-moss-800 sm:hidden">teraz</span>}
              </span>
              <span className="block text-xs text-ink-500 tabular">
                {win.actual || isDone ? '' : 'plan '}
                {formatDateShort(win.start)}
                {['curing', 'rinsing', 'establishing'].includes(s.key) && ` – ${formatDateShort(win.end)}`}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
