import { Link } from 'react-router-dom'
import { ShieldAlert, TriangleAlert } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Misc'
import type { QuarterStatus } from '@/domain/sales'
import { useSettings } from '@/hooks/useSettings'
import { formatPLN, formatPercent, kul } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Przychód w kwartale na tle limitu działalności nierejestrowanej (ostrzeżenie od 80%) */
export function QuarterLimitCard({ status: q, compact }: { status: QuarterStatus; compact?: boolean }) {
  const settings = useSettings()
  const tone = q.level === 'over' ? 'clay' : q.level === 'warning' ? 'amber' : 'moss'
  return (
    <Card className={cn(q.level === 'over' && 'ring-clay-100', q.level === 'warning' && 'ring-cream-300')}>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-ink-500">
              Limit działalności nierejestrowanej · {q.quarter}. kwartał {q.year}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-semibold tracking-tight text-ink-900 tabular">{formatPLN(q.revenue)}</span>
              <span className="text-sm text-ink-500 tabular">z {formatPLN(q.limit)}</span>
            </div>
          </div>
          <span className={cn('rounded-full px-2.5 py-1 text-sm font-semibold tabular', q.level === 'over' ? 'bg-clay-50 text-clay-700' : q.level === 'warning' ? 'bg-cream-100 text-cream-800' : 'bg-moss-100 text-moss-800')}>
            {formatPercent(q.ratio * 100)}
          </span>
        </div>
        <div className="relative mt-4">
          <ProgressBar value={q.ratio} tone={tone} height="h-3" />
          <span className="absolute top-[-3px] h-[18px] w-0.5 rounded bg-ink-400" style={{ left: '80%' }} title="80% – próg ostrzeżenia" />
        </div>
        <div className="relative mt-1.5 flex justify-between text-xs text-ink-400">
          <span>0</span>
          <span className="absolute -translate-x-1/2" style={{ left: '80%' }}>
            80%
          </span>
          <span>100%</span>
        </div>
        {q.level === 'over' ? (
          <p className="mt-3 flex gap-2 text-sm text-clay-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Limit przekroczony. Na wpis do CEIDG masz 7 dni od dnia przekroczenia.
          </p>
        ) : q.level === 'warning' ? (
          <p className="mt-3 flex gap-2 text-sm text-cream-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Ponad 80% limitu. Zostało {formatPLN(q.remaining, { decimals: 0 })}, czyli ok. {kul(Math.floor(q.remaining / settings.recommendedPrice))} po {formatPLN(settings.recommendedPrice, { decimals: 0 })}.
          </p>
        ) : (
          !compact && (
            <p className="mt-3 text-sm text-ink-500">
              Zostało {formatPLN(q.remaining, { decimals: 0 })}, czyli ok. {kul(Math.floor(q.remaining / settings.recommendedPrice))} po {formatPLN(settings.recommendedPrice, { decimals: 0 })}.
            </p>
          )
        )}
        {!q.limitExact && (
          <p className="mt-2 text-xs text-cream-800">
            Brak płacy minimalnej na {q.year} – liczę z {q.limitSourceYear}.{' '}
            <Link to="/ustawienia" className="font-medium underline underline-offset-2">
              Uzupełnij w ustawieniach
            </Link>
          </p>
        )}
      </CardBody>
    </Card>
  )
}
