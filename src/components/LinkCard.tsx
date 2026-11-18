import { ExternalLink } from 'lucide-react'
import { normalizeUrl, shopInfo } from '@/lib/links'
import { cn } from '@/lib/cn'

interface LinkCardProps {
  url?: string | null
  size?: 'sm' | 'md'
  className?: string
}

/** Klikalna karta linku: logo sklepu z inicjału, nazwa i domena. Bez pobierania strony. */
export function LinkCard({ url, size = 'md', className }: LinkCardProps) {
  const info = shopInfo(url)
  const href = url ? normalizeUrl(url) : null
  if (!info || !href) return null

  if (size === 'sm') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn('inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-ink-50 pr-2.5 pl-1 text-xs font-medium text-ink-700 ring-1 ring-ink-150 transition ring-inset hover:bg-white hover:ring-ink-300', className)}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: info.color }}>
          {info.initial}
        </span>
        <span className="truncate">{info.name}</span>
        <ExternalLink className="h-3 w-3 shrink-0 text-ink-400" />
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn('group flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-ink-200 transition ring-inset hover:ring-moss-400', className)}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white" style={{ background: info.color }}>
        {info.initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900">{info.name}</span>
        <span className="block truncate text-xs text-ink-500">{href.replace(/^https?:\/\/(www\.)?/, '')}</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-ink-400 transition group-hover:text-moss-700" />
    </a>
  )
}
