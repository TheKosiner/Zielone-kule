import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Download, Flag } from 'lucide-react'
import { db } from '@/db/db'
import type { CalendarEvent } from '@/db/types'
import { useSettings } from '@/hooks/useSettings'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Form'
import { EmptyState, PageHeader, Segmented } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Feedback'
import {
  addDays,
  addMonths,
  formatDate,
  formatDateShort,
  formatDateWithWeekday,
  formatMonth,
  monthGrid,
  monthKey,
  startOfWeek,
  todayISO,
  WEEKDAYS_SHORT,
} from '@/lib/dates'
import { toIcs } from '@/lib/ics'
import { downloadText } from '@/lib/download'
import { cn } from '@/lib/cn'
import { lsGet, lsSet } from '@/lib/storage'
import { EventRow } from './EventRow'
import { EventForm } from './EventForm'

type View = 'month' | 'week' | 'list'

function useBatchNumbers() {
  const batches = useLiveQuery(() => db.batches.toArray(), [])
  return useMemo(() => new Map((batches ?? []).map((b) => [b.id, b.number])), [batches])
}

export default function CalendarPage() {
  const settings = useSettings()
  const toast = useToast()
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>(() => (lsGet('calendarView') as View) || 'month')
  const [cursor, setCursor] = useState(today)
  const [selected, setSelected] = useState(today)
  const [showDone, setShowDone] = useState(true)
  const [form, setForm] = useState<{ open: boolean; event: CalendarEvent | null; date?: string }>({ open: false, event: null })
  const batchNumbers = useBatchNumbers()

  useEffect(() => lsSet('calendarView', view), [view])

  useEffect(() => {
    if (params.get('nowe')) {
      setForm({ open: true, event: null, date: selected })
      setParams({}, { replace: true })
    }
  }, [params, setParams, selected])

  const range = useMemo(() => {
    if (view === 'month') {
      const g = monthGrid(cursor)
      return { from: g[0], to: g[41] }
    }
    if (view === 'week') {
      const s = startOfWeek(cursor)
      return { from: s, to: addDays(s, 6) }
    }
    return { from: '0000-01-01', to: '9999-12-31' }
  }, [view, cursor])

  const events = useLiveQuery(() => db.events.where('date').between(range.from, range.to, true, true).sortBy('date'), [range.from, range.to])
  if (!events) return null

  const visible = events.filter((e) => showDone || !e.done || e.kind === 'event')
  const byDay = new Map<string, CalendarEvent[]>()
  for (const e of visible) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e])

  const phases = settings.planPhases.filter((p) => p.from <= (view === 'list' ? today : range.to) && p.to >= (view === 'list' ? today : range.from))

  const exportIcs = async () => {
    const upcoming = await db.events.where('date').aboveOrEqual(addDays(today, -7)).toArray()
    const items = upcoming
      .filter((e) => !e.done || e.kind === 'event')
      .map((e) => ({
        uid: e.id,
        title: e.batchId && batchNumbers.has(e.batchId) && !e.title.includes('#') ? `${e.title} (#${batchNumbers.get(e.batchId)})` : e.title,
        date: e.date,
        endDate: e.endDate,
        time: e.time,
        description: e.notes,
      }))
    downloadText(toIcs(items, settings.brandName), `zielone-kule-kalendarz-${today}.ics`, 'text/calendar;charset=utf-8')
    toast.show(`Wyeksportowano ${items.length} wpisów do pliku .ics`)
  }

  const step = (dir: number) => {
    if (view === 'month') setCursor(addMonths(cursor, dir))
    else setCursor(addDays(cursor, dir * 7))
  }

  const title = view === 'month' ? formatMonth(cursor) : view === 'week' ? `${formatDateShort(startOfWeek(cursor))} – ${formatDate(addDays(startOfWeek(cursor), 6))}` : 'Wszystkie zadania'

  return (
    <>
      <PageHeader
        title="Kalendarz"
        subtitle="Zadania z harmonogramów partii i Twoje własne wpisy"
        actions={
          <>
            <Button icon={<Download className="h-4.5 w-4.5" />} onClick={exportIcs} title="Plik do zaimportowania w kalendarzu telefonu">
              <span className="hidden sm:inline">Eksport .ics</span>
            </Button>
            <Button variant="primary" icon={<CalendarPlus className="h-5 w-5" />} onClick={() => setForm({ open: true, event: null, date: selected })}>
              Dodaj
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'month', label: 'Miesiąc' },
            { value: 'week', label: 'Tydzień' },
            { value: 'list', label: 'Lista' },
          ]}
        />
        {view !== 'list' && (
          <div className="flex items-center gap-1">
            <IconButton label="Wstecz" onClick={() => step(-1)} variant="secondary">
              <ChevronLeft className="h-5 w-5" />
            </IconButton>
            <IconButton label="Dalej" onClick={() => step(1)} variant="secondary">
              <ChevronRight className="h-5 w-5" />
            </IconButton>
            <Button
              variant="ghost"
              onClick={() => {
                setCursor(today)
                setSelected(today)
              }}
            >
              Dziś
            </Button>
          </div>
        )}
        <Checkbox className="ml-auto" checked={showDone} onChange={setShowDone} label={<span className="text-sm">Pokaż zrobione</span>} />
      </div>

      <h2 className="mb-3 text-xl font-semibold text-ink-900 first-letter:uppercase">{title}</h2>

      {phases.length > 0 && (
        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {phases.map((p) => (
            <div key={p.id} className="flex shrink-0 items-center gap-2 rounded-full bg-cream-100 px-3.5 py-1.5 text-sm text-cream-800 ring-1 ring-cream-200 ring-inset" title={p.text}>
              <Flag className="h-3.5 w-3.5" />
              <span className="font-semibold">Plan: {p.title}</span>
              <span className="tabular">
                {formatDateShort(p.from)}–{formatDateShort(p.to)}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'month' && (
        <MonthView
          cursor={cursor}
          byDay={byDay}
          selected={selected}
          onSelect={setSelected}
          batchNumbers={batchNumbers}
          onOpen={(e) => setForm({ open: true, event: e })}
          onAdd={(d) => setForm({ open: true, event: null, date: d })}
        />
      )}
      {view === 'week' && <WeekView cursor={cursor} byDay={byDay} batchNumbers={batchNumbers} onOpen={(e) => setForm({ open: true, event: e })} />}
      {view === 'list' && <ListView events={visible} batchNumbers={batchNumbers} onOpen={(e) => setForm({ open: true, event: e })} />}

      <EventForm open={form.open} event={form.event} defaultDate={form.date} onClose={() => setForm({ open: false, event: null })} />
    </>
  )
}

interface ViewProps {
  byDay: Map<string, CalendarEvent[]>
  batchNumbers: Map<string, number>
  onOpen: (e: CalendarEvent) => void
}

function MonthView({ cursor, byDay, selected, onSelect, batchNumbers, onOpen, onAdd }: ViewProps & { cursor: string; selected: string; onSelect: (d: string) => void; onAdd: (d: string) => void }) {
  const today = todayISO()
  const days = monthGrid(cursor)
  const month = monthKey(cursor)
  const dayEvents = byDay.get(selected) ?? []

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_20rem]">
      <Card className="overflow-hidden p-1.5 sm:p-2">
        <div className="grid grid-cols-7 pb-1 text-center text-xs font-medium text-ink-500">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const items = byDay.get(d) ?? []
            const inMonth = monthKey(d) === month
            const open = items.filter((e) => !e.done && e.kind !== 'event')
            const overdue = open.some((e) => (e.endDate ?? e.date) < today)
            return (
              <button
                key={d}
                onClick={() => onSelect(d)}
                className={cn(
                  'flex min-h-14 flex-col items-stretch rounded-xl p-1 text-left transition sm:min-h-24 sm:p-1.5',
                  d === selected ? 'bg-moss-100 ring-2 ring-moss-600' : 'hover:bg-ink-50',
                  !inMonth && 'opacity-40',
                )}
              >
                <span
                  className={cn(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm tabular sm:mx-0',
                    d === today ? 'bg-moss-900 font-semibold text-white' : 'text-ink-700',
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {/* telefon: kropki */}
                <span className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {items.slice(0, 4).map((e) => (
                    <span key={e.id} className={cn('h-1.5 w-1.5 rounded-full', e.done ? 'bg-ink-300' : e.kind === 'milestone' ? 'bg-moss-900' : overdue ? 'bg-clay-500' : 'bg-moss-500')} />
                  ))}
                </span>
                {/* komputer: tytuły */}
                <span className="mt-1 hidden space-y-0.5 sm:block">
                  {items.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        'block truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight',
                        e.done ? 'text-ink-400 line-through' : e.kind === 'milestone' ? 'bg-moss-900 font-medium text-white' : e.kind === 'event' ? 'bg-cream-100 text-cream-800' : 'bg-moss-100 text-moss-900',
                      )}
                    >
                      {shortTitle(e, batchNumbers)}
                    </span>
                  ))}
                  {items.length > 3 && <span className="block px-1.5 text-[11px] text-ink-500">+{items.length - 3} więcej</span>}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="self-start overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
          <h3 className="flex-1 text-[15px] font-semibold text-ink-900 first-letter:uppercase">{formatDateWithWeekday(selected)}</h3>
          <IconButton label="Dodaj w tym dniu" size="sm" onClick={() => onAdd(selected)}>
            <CalendarPlus className="h-4.5 w-4.5" />
          </IconButton>
        </div>
        {dayEvents.length ? (
          <div className="divide-y divide-ink-100">
            {dayEvents.map((e) => (
              <EventRow key={e.id} event={e} batchNumber={e.batchId ? batchNumbers.get(e.batchId) : undefined} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-ink-500">Nic zaplanowanego.</p>
        )}
      </Card>
    </div>
  )
}

/** Krótki tytuł do małej komórki: „#3 Test pH” zamiast „Test pH partii #3 (cel: poniżej 8)” */
function shortTitle(e: CalendarEvent, batchNumbers: Map<string, number>): string {
  const n = e.batchId ? batchNumbers.get(e.batchId) : undefined
  if (n === undefined) return e.title
  const t = e.title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*[–-]?\s*(z\s+)?parti[aięi]{1,2}\s+#\d+/gi, '')
    .replace(/^\s*[–-]\s*/, '')
    .trim()
  return `#${n} ${t.charAt(0).toUpperCase()}${t.slice(1)}`
}

function WeekView({ cursor, byDay, batchNumbers, onOpen }: ViewProps & { cursor: string }) {
  const today = todayISO()
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-7 lg:gap-2">
      {days.map((d) => {
        const items = byDay.get(d) ?? []
        return (
          <Card key={d} className={cn('overflow-hidden lg:min-h-64', d === today && 'ring-2 ring-moss-600')}>
            <div className={cn('flex items-baseline gap-2 border-b border-ink-100 px-4 py-2.5 lg:block lg:px-3', d === today && 'bg-moss-100')}>
              <span className="text-sm font-semibold text-ink-900 first-letter:uppercase">{WEEKDAYS_SHORT[days.indexOf(d)]}</span>
              <span className="text-sm text-ink-500 tabular lg:ml-1">{formatDateShort(d)}</span>
            </div>
            {items.length ? (
              <div className="divide-y divide-ink-100">
                {items.map((e) => (
                  <EventRow key={e.id} event={e} batchNumber={e.batchId ? batchNumbers.get(e.batchId) : undefined} onOpen={onOpen} className="lg:px-2.5" />
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-ink-400 lg:px-3">—</p>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function ListView({ events, batchNumbers, onOpen }: { events: CalendarEvent[]; batchNumbers: Map<string, number>; onOpen: (e: CalendarEvent) => void }) {
  const today = todayISO()
  const overdue = events.filter((e) => !e.done && e.kind !== 'event' && (e.endDate ?? e.date) < today)
  const upcoming = events.filter((e) => e.date >= today || (e.endDate && e.endDate >= today && e.date < today))
  const groups = new Map<string, CalendarEvent[]>()
  for (const e of upcoming.filter((x) => !overdue.includes(x))) {
    const key = e.date < today ? today : e.date
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 45)

  if (!overdue.length && !entries.length) {
    return (
      <Card>
        <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="Brak nadchodzących zadań" text="Zadania pojawią się, gdy dodasz partię albo własny wpis." />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {overdue.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-sm font-semibold text-clay-700">Zaległe ({overdue.length})</h3>
          <Card className="divide-y divide-ink-100 overflow-hidden ring-clay-100">
            {overdue.map((e) => (
              <EventRow key={e.id} event={e} showDate batchNumber={e.batchId ? batchNumbers.get(e.batchId) : undefined} onOpen={onOpen} />
            ))}
          </Card>
        </section>
      )}
      {entries.map(([day, items]) => (
        <section key={day}>
          <h3 className="mb-2 px-1 text-sm font-semibold text-ink-700 first-letter:uppercase">
            {day === today ? 'Dziś' : day === addDays(today, 1) ? 'Jutro' : formatDateWithWeekday(day)}
            {day === today || day === addDays(today, 1) ? <span className="ml-2 font-normal text-ink-500">{formatDateWithWeekday(day)}</span> : null}
          </h3>
          <Card className="divide-y divide-ink-100 overflow-hidden">
            {items.map((e) => (
              <EventRow key={e.id} event={e} batchNumber={e.batchId ? batchNumbers.get(e.batchId) : undefined} onOpen={onOpen} />
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}
