import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

export function StarRating({ value, onChange, size = 'md' }: { value: number | null | undefined; onChange?: (v: number | null) => void; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-7 w-7'
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label="Ocena mchu">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (value ?? 0) >= n
        const icon = <Star className={cn(s, filled ? 'fill-cream-300 text-cream-700' : 'text-ink-300')} />
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} na 5`} onClick={() => onChange(value === n ? null : n)} className="flex h-11 w-10 items-center justify-center rounded-lg hover:bg-cream-100">
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        )
      })}
    </div>
  )
}
