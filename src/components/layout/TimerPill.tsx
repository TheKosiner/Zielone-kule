import { Square, Timer } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useNow } from '@/hooks/useNow'
import { elapsedMs, formatElapsed, stopTimer, useActiveTimer } from '@/hooks/useTimer'
import { useToast } from '@/components/ui/Feedback'
import { formatMinutes } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useSettings } from '@/hooks/useSettings'

export function TimerPill({ variant }: { variant: 'sidebar' | 'floating' }) {
  const timer = useActiveTimer()
  const now = useNow(1000, !!timer)
  const toast = useToast()
  const settings = useSettings()
  const batch = useLiveQuery(() => (timer?.batchId ? db.batches.get(timer.batchId) : undefined), [timer?.batchId])
  if (!timer) return null

  const stageName = timer.stage === 'other' ? 'Inna praca' : settings.stages.find((s) => s.key === timer.stage)?.name
  const label = [batch ? `Partia #${batch.number}` : null, stageName].filter(Boolean).join(' · ')

  const stop = async () => {
    const s = await stopTimer()
    if (s) toast.show(`Zapisano ${formatMinutes(s.minutes)} pracy`)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-moss-900 py-2 pr-2 pl-3.5 text-white shadow-pop',
        variant === 'floating' ? 'animate-pop-in w-full max-w-sm' : 'w-full',
      )}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-moss-400" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-lg leading-none font-semibold tabular">
          <Timer className="h-4 w-4 text-moss-300" />
          {formatElapsed(elapsedMs(timer, now))}
        </div>
        <div className="mt-1 truncate text-xs text-moss-200">{label || 'Stoper pracy'}</div>
      </div>
      <button onClick={stop} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/12 px-3 text-sm font-medium transition hover:bg-white/20 active:scale-95">
        <Square className="h-4 w-4 fill-current" /> Stop
      </button>
    </div>
  )
}
