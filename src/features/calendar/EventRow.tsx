import { Link } from 'react-router-dom'
import { Flag, Repeat } from 'lucide-react'
import type { CalendarEvent } from '@/db/types'
import { Checkbox } from '@/components/ui/Form'
import { formatDateShort, relativeDay, todayISO } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useToggleTask } from './TaskCompletion'

interface EventRowProps {
  event: CalendarEvent
  batchNumber?: number
  showDate?: boolean
  onOpen?: (e: CalendarEvent) => void
  className?: string
}

/** Wiersz zadania z dużym polem do odhaczania (wygodne brudnymi palcami) */
export function EventRow({ event: e, batchNumber, showDate, onOpen, className }: EventRowProps) {
  const toggle = useToggleTask()
  const today = todayISO()
  const overdue = !e.done && e.kind !== 'event' && (e.endDate ?? e.date) < today
  const checkable = e.kind !== 'event'

  return (
    <div className={cn('flex items-start gap-3 px-4 py-3', className)}>
      {checkable ? (
        <Checkbox size="lg" checked={e.done} onChange={() => toggle(e)} className="mt-0.5" />
      ) : (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
          <span className="h-2.5 w-2.5 rounded-full bg-moss-600" />
        </span>
      )}
      <button className="min-w-0 flex-1 text-left" onClick={() => onOpen?.(e)} disabled={!onOpen}>
        <span className={cn('flex items-start gap-1.5 text-[15px] leading-snug font-medium', e.done ? 'text-ink-400 line-through decoration-ink-300' : 'text-ink-900')}>
          {e.kind === 'milestone' && <Flag className={cn('mt-0.5 h-4 w-4 shrink-0', e.done ? 'text-ink-300' : 'text-moss-600')} />}
          <span>{e.title}</span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          {showDate && (
            <span className={cn('tabular', overdue && 'font-semibold text-clay-600')}>
              {e.endDate ? `${formatDateShort(e.date)}–${formatDateShort(e.endDate)}` : formatDateShort(e.date)} · {overdue ? `zaległe (${relativeDay(e.endDate ?? e.date, today)})` : relativeDay(e.date, today)}
            </span>
          )}
          {!showDate && e.endDate && <span className="tabular">okno do {formatDateShort(e.endDate)}</span>}
          {e.time && <span className="tabular">{e.time}</span>}
          {e.skipped && <span>pominięte</span>}
          {e.source === 'schedule' && e.kind === 'task' && <Repeat className="h-3 w-3 text-ink-400" aria-label="z harmonogramu" />}
        </span>
      </button>
      {batchNumber !== undefined && e.batchId && (
        <Link to={`/partie/${e.batchId}`} className="mt-0.5 shrink-0 rounded-full bg-moss-100 px-2.5 py-1 text-xs font-semibold text-moss-800 transition hover:bg-moss-200">
          #{batchNumber}
        </Link>
      )}
    </div>
  )
}
