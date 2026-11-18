import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, CalendarCheck, Database, Eraser, Flag, HandCoins, Layers, PiggyBank, Sprout, Wallet } from 'lucide-react'
import { db } from '@/db/db'
import type { CalendarEvent } from '@/db/types'
import { useSettings } from '@/hooks/useSettings'
import { useBusiness } from '@/hooks/useBusiness'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Callout, Stat } from '@/components/ui/Misc'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { StatusPipeline } from '@/components/production/StatusPipeline'
import { EventRow } from '@/features/calendar/EventRow'
import { QuarterLimitCard } from '@/features/sales/QuarterLimitCard'
import { statusCounts } from '@/domain/production'
import { quarterStatus } from '@/domain/sales'
import { ACTIVE_STATUSES } from '@/domain/constants'
import { clearSampleData, countSampleData } from '@/db/seed'
import { addDays, diffDays, formatDateShort, formatDateWithWeekday, relativeDay, todayISO } from '@/lib/dates'
import { formatPLN, kul } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useNow } from '@/hooks/useNow'

export default function DashboardPage() {
  const settings = useSettings()
  const business = useBusiness()
  const now = useNow(60_000)
  const today = todayISO(now)
  const toast = useToast()
  const confirm = useConfirm()

  const tasks = useLiveQuery(async () => {
    const [events, batches] = await Promise.all([db.events.where('date').belowOrEqual(addDays(today, 14)).toArray(), db.batches.toArray()])
    return { events: events.filter((e) => !e.done), numbers: new Map(batches.map((b) => [b.id, b.number])) }
  }, [today])
  const sampleCount = useLiveQuery(() => countSampleData(), [])
  const lastBackup = useLiveQuery(async () => (await db.kv.get('lastBackupAt'))?.value as string | undefined, [])

  if (!business || !tasks) return null

  const isDue = (e: CalendarEvent) => e.kind !== 'event' && e.date <= today
  const due = tasks.events.filter(isDue).sort((a, b) => a.date.localeCompare(b.date))
  const overdue = due.filter((e) => (e.endDate ?? e.date) < today)
  const todays = due.filter((e) => !overdue.includes(e))
  const tomorrow = tasks.events.filter((e) => e.kind !== 'event' && e.date === addDays(today, 1))
  const milestones = tasks.events.filter((e) => e.kind === 'milestone' && e.date > today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
  const events = tasks.events.filter((e) => e.kind === 'event' && e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2)

  const counts = statusCounts(business.input.balls)
  const inProduction = ACTIVE_STATUSES.reduce((a, s) => a + counts[s], 0)
  const q = quarterStatus(business.input.sales, settings, today)
  const phases = settings.planPhases.filter((p) => p.from <= today && p.to >= today)
  const nextPhase = settings.planPhases.filter((p) => p.from > today).sort((a, b) => a.from.localeCompare(b.from))[0]
  const cost = business.cost
  const costDiff = cost.actualMaterials - cost.plannedMaterials
  const hour = Number(new Intl.DateTimeFormat('pl-PL', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Warsaw' }).format(now))
  const greeting = hour < 5 || hour >= 19 ? 'Dobry wieczór' : 'Dzień dobry'
  const backupAge = lastBackup ? diffDays(lastBackup.slice(0, 10), today) : null
  const needsBackup = !sampleCount && (backupAge === null || backupAge > 14) && business.input.batches.length > 0

  const clearSamples = async () => {
    const ok = await confirm({ title: 'Wyczyścić dane przykładowe?', message: 'Znikną przykładowe partie, wydatki, sprzedaże i wpisy. Ustawienia, instrukcje i lista zakupów z biznesplanu zostaną.', confirmLabel: 'Wyczyść', tone: 'danger' })
    if (!ok) return
    const n = await clearSampleData()
    toast.show(`Usunięto ${n} przykładowych rekordów. Powodzenia z pierwszą partią!`)
  }

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <p className="text-sm font-medium text-moss-600 first-letter:uppercase">{formatDateWithWeekday(today, true)}</p>
        <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight text-ink-900 sm:text-3xl">{greeting}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {phases.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-sm text-cream-800 ring-1 ring-cream-200 ring-inset" title={p.text}>
              <Flag className="h-3.5 w-3.5" />
              <strong className="font-semibold">{p.title}</strong>
              <span className="tabular">do {formatDateShort(p.to)}</span>
            </span>
          ))}
          {nextPhase && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm text-ink-600 ring-1 ring-ink-200 ring-inset">
              dalej: {nextPhase.title} od {formatDateShort(nextPhase.from)}
            </span>
          )}
        </div>
      </header>

      {!!sampleCount && (
        <Callout tone="warm" className="mb-5 items-center" icon={<Sprout className="h-5 w-5" />}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="min-w-0 flex-[1_1_16rem]">
              <strong>Oglądasz dane przykładowe.</strong> Gdy zaczniesz własną produkcję, wyczyść je jednym kliknięciem. Ustawienia z biznesplanu zostaną.
            </span>
            <Button size="sm" variant="secondary" icon={<Eraser className="h-4 w-4" />} onClick={clearSamples}>
              Wyczyść dane przykładowe
            </Button>
          </div>
        </Callout>
      )}
      {needsBackup && (
        <Callout tone="water" className="mb-5" icon={<Database className="h-5 w-5" />}>
          {backupAge === null ? 'Nie masz jeszcze kopii zapasowej.' : `Ostatnia kopia zapasowa ${backupAge} dni temu.`}{' '}
          <Link to="/ustawienia" className="font-semibold underline underline-offset-2">
            Zrób kopię
          </Link>{' '}
          – dane są tylko na tym urządzeniu.
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Dziś do zrobienia */}
        <Card className="overflow-hidden lg:col-span-2 lg:row-span-2">
          <CardHeader
            title="Dziś do zrobienia"
            icon={<CalendarCheck className="h-5 w-5" />}
            subtitle={due.length ? `${due.length} ${due.length === 1 ? 'zadanie' : due.length < 5 ? 'zadania' : 'zadań'}${overdue.length ? `, w tym ${overdue.length} zaległe` : ''}` : 'Wszystko na dziś zrobione'}
            actions={
              <ButtonLink to="/kalendarz" variant="ghost" size="sm">
                Kalendarz <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />
          <div className="mt-3 border-t border-ink-100">
            {overdue.length > 0 && (
              <>
                <div className="bg-clay-50/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-clay-700 uppercase sm:px-5">Zaległe</div>
                <div className="divide-y divide-ink-100">
                  {overdue.map((e) => (
                    <EventRow key={e.id} event={e} showDate batchNumber={e.batchId ? tasks.numbers.get(e.batchId) : undefined} className="sm:px-5" />
                  ))}
                </div>
              </>
            )}
            {todays.length > 0 && (
              <>
                {overdue.length > 0 && <div className="bg-ink-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase sm:px-5">Dziś</div>}
                <div className="divide-y divide-ink-100">
                  {todays.map((e) => (
                    <EventRow key={e.id} event={e} batchNumber={e.batchId ? tasks.numbers.get(e.batchId) : undefined} className="sm:px-5" />
                  ))}
                </div>
              </>
            )}
            {!due.length && (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                  <Sprout className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm text-ink-600">Na dziś nie ma zadań. Mech rośnie sam.</p>
              </div>
            )}
            {(tomorrow.length > 0 || events.length > 0) && (
              <div className="border-t border-ink-100 bg-ink-50/60 px-4 py-3 text-sm text-ink-600 sm:px-5">
                {tomorrow.length > 0 && (
                  <p>
                    <strong className="text-ink-800">Jutro:</strong> {tomorrow.map((e) => e.title).slice(0, 3).join(' · ')}
                    {tomorrow.length > 3 && ` i ${tomorrow.length - 3} więcej`}
                  </p>
                )}
                {events.map((e) => (
                  <p key={e.id} className="mt-1">
                    <strong className="text-ink-800 first-letter:uppercase">{relativeDay(e.date, today)}:</strong> {e.title}
                    {e.time && `, ${e.time}`}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>

        <QuarterLimitCard status={q} compact />

        <Card>
          <CardBody>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-ink-500">Rzeczywisty koszt materiałów na kulę</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-ink-900 tabular">{formatPLN(cost.actualMaterials)}</span>
                  <span className="text-sm text-ink-500 tabular">plan {formatPLN(cost.plannedMaterials)}</span>
                </div>
              </div>
              <span className={cn('rounded-full px-2.5 py-1 text-sm font-semibold tabular', costDiff > 0.005 ? 'bg-clay-50 text-clay-700' : 'bg-moss-100 text-moss-800')}>
                {costDiff > 0.005 ? '+' : costDiff < -0.005 ? '−' : '±'}
                {formatPLN(Math.abs(costDiff))}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-500">
              Z wydatków dla {cost.itemsWithData} z {cost.materialItems} pozycji.{' '}
              <Link to="/wydatki" className="font-medium text-moss-700 hover:underline">
                Szczegóły
              </Link>
            </p>
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
          <Stat label="Kule w produkcji" value={inProduction} icon={<Layers className="h-4 w-4" />} sub={`gotowe: ${counts.ready} · sprzedane: ${counts.sold}`} />
          <Stat label="Wydatki łącznie" value={formatPLN(business.totalExpenses, { decimals: 0 })} icon={<Wallet className="h-4 w-4" />} sub={`inwestycja startowa: ok. ${formatPLN(settings.startupBudget, { decimals: 0 })}`} />
          <Stat label="Przychód" value={formatPLN(business.revenue, { decimals: 0 })} icon={<HandCoins className="h-4 w-4" />} sub={`${kul(business.soldQuantity)} sprzedanych`} />
          <Stat
            label="Wynik na dziś"
            tone={business.cashResult >= 0 ? 'dark' : 'default'}
            value={formatPLN(business.cashResult, { decimals: 0 })}
            icon={<PiggyBank className="h-4 w-4" />}
            sub={business.cashResult < 0 ? 'inwestycja jeszcze się nie zwróciła' : 'na plusie po wszystkich wydatkach'}
          />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Kule według etapu"
            subtitle={`${kul(inProduction)} w produkcji · sprzedane ${counts.sold} · odpad ${counts.waste}`}
            actions={
              <ButtonLink to="/partie" variant="ghost" size="sm">
                Partie <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />
          <CardBody>
            <StatusPipeline counts={counts} />
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Najbliższe kamienie milowe" subtitle="następne 2 tygodnie" />
          <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
            {milestones.map((e) => (
              <li key={e.id}>
                <Link to={e.batchId ? `/partie/${e.batchId}` : '/kalendarz'} className="flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50">
                  <span className="w-12 shrink-0 text-center">
                    <span className="block text-lg leading-none font-semibold text-ink-900 tabular">{e.date.slice(8)}</span>
                    <span className="block text-[11px] text-ink-500">{formatDateShort(e.date).slice(3)}</span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink-800">{e.title}</span>
                  <span className="shrink-0 text-xs text-ink-400">{relativeDay(e.date, today)}</span>
                </Link>
              </li>
            ))}
            {!milestones.length && <li className="px-5 py-6 text-sm text-ink-500">Brak w najbliższych 2 tygodniach.</li>}
          </ul>
        </Card>
      </div>
    </>
  )
}
