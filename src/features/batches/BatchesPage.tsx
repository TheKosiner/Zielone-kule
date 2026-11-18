import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Layers, Plus, Thermometer, Timer } from 'lucide-react'
import { db } from '@/db/db'
import type { Ball, Batch, CalendarEvent } from '@/db/types'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState, PageHeader, ProgressBar, Segmented } from '@/components/ui/Misc'
import { StatusBadge, StatusPipeline } from '@/components/production/StatusPipeline'
import { dominantStatus, statusCounts } from '@/domain/production'
import { readyDate } from '@/domain/schedule'
import { recipeSummary } from '@/domain/recipe'
import { ACTIVE_STATUSES } from '@/domain/constants'
import { diffDays, formatDate, formatDateShort, relativeDay, todayISO } from '@/lib/dates'
import { formatNumber, kul } from '@/lib/format'
import { cn } from '@/lib/cn'
import { BatchForm } from './BatchForm'
import { WorkTimeSheet } from './WorkTimeSheet'

type Filter = 'active' | 'done' | 'all'

export default function BatchesPage() {
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('active')

  const data = useLiveQuery(async () => {
    const [batches, balls, events] = await Promise.all([db.batches.orderBy('number').reverse().toArray(), db.balls.toArray(), db.events.where('source').equals('schedule').toArray()])
    return { batches, balls, events: events.filter((e) => !e.done) }
  }, [])

  useEffect(() => {
    if (params.get('nowa')) {
      setFormOpen(true)
      setParams({}, { replace: true })
    } else if (params.get('stoper')) {
      setTimerOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const grouped = useMemo(() => {
    if (!data) return []
    return data.batches.map((b) => {
      const balls = data.balls.filter((x) => x.batchId === b.id)
      const events = data.events.filter((e) => e.batchId === b.id).sort((x, y) => x.date.localeCompare(y.date))
      const active = balls.some((x) => ACTIVE_STATUSES.includes(x.status))
      return { batch: b, balls, next: events.find((e) => e.kind !== 'event'), active }
    })
  }, [data])

  if (!data) return null

  const allCounts = statusCounts(data.balls)
  const inProduction = ACTIVE_STATUSES.reduce((a, s) => a + allCounts[s], 0)
  const list = grouped.filter((g) => (filter === 'all' ? true : filter === 'active' ? g.active : !g.active))

  return (
    <>
      <PageHeader
        title="Partie i kule"
        subtitle={`${data.batches.length} ${data.batches.length === 1 ? 'partia' : 'partii'} · ${kul(inProduction)} w produkcji`}
        actions={
          <>
            <Button icon={<Timer className="h-4.5 w-4.5" />} onClick={() => setTimerOpen(true)}>
              <span className="hidden sm:inline">Czas pracy</span>
            </Button>
            <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={() => setFormOpen(true)}>
              Nowa partia
            </Button>
          </>
        }
      />

      {data.balls.length > 0 && (
        <Card className="mb-6">
          <CardBody>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-ink-900">Wszystkie kule według etapu</h2>
              <span className="text-sm text-ink-500">
                sprzedane: <strong className="text-ink-800 tabular">{allCounts.sold}</strong> · odpad: <strong className="text-ink-800 tabular">{allCounts.waste}</strong>
              </span>
            </div>
            <StatusPipeline counts={allCounts} />
          </CardBody>
        </Card>
      )}

      <Segmented<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'W produkcji', count: grouped.filter((g) => g.active).length },
          { value: 'done', label: 'Zakończone', count: grouped.filter((g) => !g.active).length },
          { value: 'all', label: 'Wszystkie' },
        ]}
      />

      {!list.length ? (
        <Card>
          <EmptyState
            icon={<Layers className="h-7 w-7" />}
            title={filter === 'done' ? 'Brak zakończonych partii' : 'Brak partii w produkcji'}
            text="Partia to kule odlane jednego dnia. Po jej dodaniu aplikacja sama rozpisze harmonogram: wyjęcie z formy, zraszanie, płukanie, szczepienie mchu."
            action={
              <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={() => setFormOpen(true)}>
                Nowa partia
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((g) => (
            <BatchCard key={g.batch.id} batch={g.batch} balls={g.balls} next={g.next} ready={readyDate(g.batch, settings)} />
          ))}
        </div>
      )}

      <BatchForm open={formOpen} onClose={() => setFormOpen(false)} />
      <WorkTimeSheet open={timerOpen} onClose={() => setTimerOpen(false)} />
    </>
  )
}

function BatchCard({ batch, balls, next, ready }: { batch: Batch; balls: Ball[]; next?: CalendarEvent; ready: string }) {
  const today = todayISO()
  const counts = statusCounts(balls)
  const status = dominantStatus(balls)
  const total = Math.max(1, diffDays(batch.castDate, ready))
  const elapsed = Math.min(total, Math.max(0, diffDays(batch.castDate, today)))
  const finished = !balls.some((b) => ACTIVE_STATUSES.includes(b.status))
  const overdue = next && (next.endDate ?? next.date) < today

  return (
    <Link to={`/partie/${batch.id}`} className="group block">
      <Card className="h-full transition group-hover:shadow-pop group-hover:ring-moss-300">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-moss-900 text-white">
              <span className="text-[10px] leading-none text-moss-300">partia</span>
              <span className="text-lg leading-tight font-semibold tabular">#{batch.number}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-ink-900">{batch.name || `Odlew ${formatDate(batch.castDate)}`}</h3>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-moss-600" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
                <span className="tabular">{formatDate(batch.castDate)}</span>
                <span className="text-ink-300">·</span>
                <span>{kul(batch.count)}</span>
                {batch.temperatureC !== null && batch.temperatureC !== undefined && (
                  <>
                    <span className="text-ink-300">·</span>
                    <span className="inline-flex items-center gap-0.5 tabular">
                      <Thermometer className="h-3.5 w-3.5" />
                      {formatNumber(batch.temperatureC, 1, true)}°C
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {status && <StatusBadge status={status} />}
            <span className="truncate text-xs text-ink-500">{recipeSummary(batch.recipe)}</span>
          </div>

          <div className="mt-4">
            <StatusPipeline counts={counts} showLegend={false} />
          </div>

          {!finished && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-ink-500">
                <span>dzień {elapsed} z ok. {total}</span>
                <span>gotowa ok. {formatDate(ready)}</span>
              </div>
              <ProgressBar value={elapsed / total} height="h-1.5" />
            </div>
          )}
        </div>
        {next && !finished && (
          <div className={cn('flex items-center gap-2 border-t px-4 py-3 text-sm sm:px-5', overdue ? 'border-clay-100 bg-clay-50/60' : 'border-ink-100 bg-ink-50/60')}>
            <span className={cn('shrink-0 font-semibold tabular', overdue ? 'text-clay-700' : 'text-moss-800')}>{overdue ? 'Zaległe' : relativeDay(next.date, today).replace(/^./, (c) => c.toUpperCase())}</span>
            <span className="min-w-0 truncate text-ink-700">{next.title}</span>
            <span className="ml-auto shrink-0 text-xs text-ink-400 tabular">{formatDateShort(next.date)}</span>
          </div>
        )}
      </Card>
    </Link>
  )
}
