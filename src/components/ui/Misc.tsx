import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Badge({ children, className, dot }: { children: ReactNode; className?: string; dot?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', className ?? 'bg-ink-100 text-ink-700 ring-ink-200')}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  )
}

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}

export function PageHeader({ title, subtitle, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3 sm:mb-7">
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        {eyebrow && <div className="mb-1 text-xs font-semibold tracking-[0.12em] text-moss-600 uppercase">{eyebrow}</div>}
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; count?: number }[]
  className?: string
  size?: 'sm' | 'md'
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={cn('scrollbar-none inline-flex max-w-full overflow-x-auto rounded-xl bg-ink-100 p-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition',
              size === 'sm' ? 'h-8 px-3 text-sm' : 'h-9 px-3.5 text-[15px]',
              active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-xs tabular', active ? 'bg-moss-100 text-moss-800' : 'bg-ink-200/70 text-ink-600')}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface ChipProps {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  color?: string
  className?: string
}

export function Chip({ active, onClick, children, color, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap ring-1 transition ring-inset',
        active ? 'bg-moss-900 text-white ring-moss-900' : 'bg-white text-ink-700 ring-ink-200 hover:ring-ink-300',
        className,
      )}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

export function EmptyState({ icon, title, text, action, className }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

interface ProgressProps {
  value: number
  tone?: 'moss' | 'amber' | 'clay' | 'water'
  className?: string
  height?: string
}

const TONES = { moss: 'bg-moss-600', amber: 'bg-amber-ok', clay: 'bg-clay-500', water: 'bg-water-500' }

export function ProgressBar({ value, tone = 'moss', className, height = 'h-2.5' }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink-100', height, className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', TONES[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

interface StatProps {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'warm' | 'dark'
  className?: string
}

export function Stat({ label, value, sub, icon, tone = 'default', className }: StatProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 ring-1 sm:p-5',
        tone === 'dark' && 'bg-moss-900 text-white ring-moss-900',
        tone === 'warm' && 'bg-cream-100 ring-cream-200',
        tone === 'default' && 'bg-white shadow-card ring-ink-150',
        className,
      )}
    >
      <div className={cn('flex items-center gap-2 text-sm', tone === 'dark' ? 'text-moss-200' : 'text-ink-500')}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-1.5 text-2xl font-semibold tracking-tight tabular sm:text-[26px]', tone === 'dark' ? 'text-white' : 'text-ink-900')}>{value}</div>
      {sub && <div className={cn('mt-1 text-xs leading-snug', tone === 'dark' ? 'text-moss-200' : 'text-ink-500')}>{sub}</div>}
    </div>
  )
}

export function SectionTitle({ children, actions, className }: { children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center gap-3', className)}>
      <h2 className="flex-1 text-sm font-semibold tracking-wide text-ink-500 uppercase">{children}</h2>
      {actions}
    </div>
  )
}

export function Callout({ children, tone = 'moss', icon, className }: { children: ReactNode; tone?: 'moss' | 'warm' | 'clay' | 'water'; icon?: ReactNode; className?: string }) {
  const tones = {
    moss: 'bg-moss-100/70 text-moss-900 ring-moss-200',
    warm: 'bg-cream-100 text-cream-800 ring-cream-200',
    clay: 'bg-clay-50 text-clay-700 ring-clay-100',
    water: 'bg-water-50 text-water-700 ring-water-100',
  }
  return (
    <div className={cn('flex gap-3 rounded-2xl px-4 py-3 text-sm leading-relaxed ring-1 ring-inset', tones[tone], className)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
