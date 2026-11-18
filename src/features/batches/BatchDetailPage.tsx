import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, CalendarPlus, Clock, Droplets, Pencil, Play, RefreshCw, Thermometer, Trash2 } from 'lucide-react'
import { db } from '@/db/db'
import { deleteEntity } from '@/db/repo'
import type { CalendarEvent } from '@/db/types'
import { useSettings } from '@/hooks/useSettings'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState, PageHeader, Segmented } from '@/components/ui/Misc'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { StatusBadge, StatusPipeline } from '@/components/production/StatusPipeline'
import { PhotoGallery } from '@/components/Photos'
import { deleteBatch, dominantStatus, regenerateSchedule, statusCounts } from '@/domain/production'
import { recipeSummary } from '@/domain/recipe'
import { readyDate, settingWindow } from '@/domain/schedule'
import { formatDate, todayISO } from '@/lib/dates'
import { formatMinutes, formatNumber, kul } from '@/lib/format'
import { EventRow } from '@/features/calendar/EventRow'
import { EventForm } from '@/features/calendar/EventForm'
import { BatchTimeline } from './BatchTimeline'
import { BatchForm } from './BatchForm'
import { BallsTab } from './BallsTab'
import { MeasurementsTab } from './MeasurementsTab'
import { WorkTimeSheet } from './WorkTimeSheet'

type Tab = 'overview' | 'balls' | 'tasks' | 'measurements' | 'photos'

const CAST_METHOD = { spacers: 'rdzeń zablokowany dystansami', two_stage: 'odlew w dwóch etapach', other: 'inna metoda' }

export default function BatchDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const toast = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState<Tab>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [work, setWork] = useState<{ open: boolean; mode: 'timer' | 'manual' }>({ open: false, mode: 'timer' })
  const [eventForm, setEventForm] = useState<{ open: boolean; event: CalendarEvent | null }>({ open: false, event: null })

  const data = useLiveQuery(async () => {
    const batch = await db.batches.get(id)
    if (!batch) return { batch: null }
    const [balls, events, measurements, sessions, photoCount] = await Promise.all([
      db.balls.where('batchId').equals(id).sortBy('index'),
      db.events.where('batchId').equals(id).sortBy('date'),
      db.measurements.where('batchId').equals(id).toArray(),
      db.workSessions.where('batchId').equals(id).sortBy('date'),
      db.photos.where('ownerId').equals(id).count(),
    ])
    return { batch, balls, events, measurements, sessions, photoCount }
  }, [id])

  if (!data) return null
  if (!data.batch) {
    return (
      <Card>
        <EmptyState title="Nie ma takiej partii" text="Mogła zostać usunięta." action={<Link to="/partie" className="font-medium text-moss-800 underline">Wróć do listy partii</Link>} />
      </Card>
    )
  }

  const { batch, balls, events, measurements, sessions, photoCount } = data
  const today = todayISO()
  const counts = statusCounts(balls)
  const status = dominantStatus(balls)
  const upcoming = events.filter((e) => !e.done && e.kind !== 'event')
  const doneEvents = events.filter((e) => e.done).reverse()
  // w przeglądzie: kamienie milowe i tylko najbliższe wystąpienie zadań powtarzalnych
  const seenKeys = new Set<string>()
  const nextTasks = upcoming.filter((e) => {
    if (e.kind !== 'task' || !e.scheduleKey) return true
    if (seenKeys.has(e.scheduleKey)) return false
    seenKeys.add(e.scheduleKey)
    return true
  })
  const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0)
  const plannedPerBall = settings.stages.reduce((a, s) => a + s.activeMinutesPerBall, 0)
  const lastPh = measurements.filter((m) => m.type === 'ph' && !m.ballId).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  const sw = settingWindow(batch.temperatureC, settings.schedule)
  const variant = settings.productVariants.find((v) => v.id === batch.variantId)

  const remove = async () => {
    const ok = await confirm({
      title: `Usunąć partię #${batch.number}?`,
      message: `Znikną kule (${balls.length}), zadania, pomiary, czasy pracy i zdjęcia tej partii. Sprzedaże zostaną w ewidencji.`,
      confirmLabel: 'Usuń partię',
      tone: 'danger',
    })
    if (!ok) return
    await deleteBatch(batch.id)
    toast.show(`Usunięto partię #${batch.number}`)
    navigate('/partie')
  }

  const regenerate = async () => {
    await regenerateSchedule(batch.id, settings)
    toast.show('Harmonogram przeliczony z aktualnych ustawień')
  }

  return (
    <>
      <Link to="/partie" className="no-print mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Partie
      </Link>
      <PageHeader
        eyebrow={`Partia #${batch.number}`}
        title={batch.name || `Odlew ${formatDate(batch.castDate)}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {status && <StatusBadge status={status} />}
            <span>{kul(batch.count)}</span>
            <span className="text-ink-300">·</span>
            <span>gotowa ok. {formatDate(readyDate(batch, settings))}</span>
          </span>
        }
        actions={
          <>
            <Button icon={<Play className="h-4.5 w-4.5" />} onClick={() => setWork({ open: true, mode: 'timer' })}>
              Stoper
            </Button>
            <Button icon={<Pencil className="h-4.5 w-4.5" />} onClick={() => setEditOpen(true)}>
              Edytuj
            </Button>
          </>
        }
      />

      <Segmented<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Przegląd' },
          { value: 'balls', label: 'Kule', count: balls.length },
          { value: 'tasks', label: 'Zadania', count: upcoming.length },
          { value: 'measurements', label: 'Pomiary', count: measurements.length },
          { value: 'photos', label: 'Zdjęcia', count: photoCount },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-3">
            <CardBody>
              <BatchTimeline batch={batch} status={status} />
            </CardBody>
          </Card>

          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader
              title="Najbliższe zadania"
              subtitle={upcoming.length ? `${upcoming.length} do zrobienia` : 'Wszystko zrobione'}
              actions={
                <Button size="sm" variant="ghost" onClick={() => setTab('tasks')}>
                  Wszystkie
                </Button>
              }
            />
            <div className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
              {nextTasks.slice(0, 5).map((e) => (
                <EventRow key={e.id} event={e} showDate onOpen={(ev) => setEventForm({ open: true, event: ev })} />
              ))}
              {!upcoming.length && <p className="px-5 py-6 text-sm text-ink-500">Brak zaplanowanych zadań.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Kule" subtitle={`sprzedane ${counts.sold} · odpad ${counts.waste}`} />
            <CardBody>
              <StatusPipeline counts={counts} showLegend={false} />
              <ul className="mt-4 space-y-1.5 text-sm">
                {Object.entries(counts)
                  .filter(([, n]) => n > 0)
                  .map(([s, n]) => (
                    <li key={s} className="flex items-center justify-between">
                      <StatusBadge status={s as keyof typeof counts} />
                      <span className="font-semibold tabular">{n}</span>
                    </li>
                  ))}
              </ul>
              <Button className="mt-4" block variant="soft" onClick={() => setTab('balls')}>
                Zarządzaj kulami
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parametry" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Row label="Data odlewu" value={formatDate(batch.castDate)} />
                <Row
                  label="Temperatura"
                  value={
                    batch.temperatureC !== null && batch.temperatureC !== undefined ? (
                      <span className="inline-flex items-center gap-1">
                        <Thermometer className="h-3.5 w-3.5 text-ink-400" />
                        {formatNumber(batch.temperatureC, 1, true)}°C
                        {sw.warning && <span className="text-xs text-water-700">({sw.warning === 'freezing' ? 'za zimno' : 'chłodno'})</span>}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <Row label="Receptura" value={recipeSummary(batch.recipe)} />
                <Row label="Rdzeń" value={batch.castMethod ? CAST_METHOD[batch.castMethod] : '—'} />
                {variant && <Row label="Wariant" value={variant.name} />}
                <Row
                  label="Ostatnie pH"
                  value={
                    lastPh ? (
                      <span className="inline-flex items-center gap-1">
                        <Droplets className="h-3.5 w-3.5 text-water-500" />
                        {formatNumber(lastPh.value ?? 0, 1, true)} <span className="text-xs text-ink-400">({formatDate(lastPh.date)})</span>
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
              </dl>
              {batch.notes && <p className="mt-4 rounded-xl bg-cream-50 p-3 text-sm leading-relaxed whitespace-pre-line text-ink-700 ring-1 ring-cream-200 ring-inset">{batch.notes}</p>}
            </CardBody>
          </Card>

          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader
              title="Czas pracy"
              icon={<Clock className="h-5 w-5" />}
              subtitle={
                totalMinutes
                  ? `${formatMinutes(totalMinutes)} razem · ${formatMinutes(totalMinutes / Math.max(1, batch.count))} na kulę (plan ${formatMinutes(plannedPerBall)})`
                  : `Brak pomiarów. Plan: ${formatMinutes(plannedPerBall)} na kulę.`
              }
              actions={
                <Button size="sm" variant="ghost" onClick={() => setWork({ open: true, mode: 'manual' })}>
                  Wpisz
                </Button>
              }
            />
            {sessions.length > 0 && (
              <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100 text-sm">
                {[...sessions].reverse().slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-20 shrink-0 text-ink-500 tabular">{formatDate(s.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-700">
                      {s.stage === 'other' ? 'Inna praca' : (settings.stages.find((x) => x.key === s.stage)?.name ?? '—')}
                      {s.note && <span className="text-ink-400"> · {s.note}</span>}
                    </span>
                    <span className="font-medium tabular">{formatMinutes(s.minutes)}</span>
                    <IconButton label="Usuń wpis" size="sm" onClick={() => deleteEntity(db.workSessions, s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
            <div className="h-4" />
          </Card>

          <Card className="lg:col-span-3">
            <CardBody className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-sm text-ink-500">Usunięcie partii kasuje jej kule, zadania, pomiary i zdjęcia.</p>
              <Button variant="danger-soft" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Usuń partię
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'balls' && <BallsTab batch={batch} balls={balls} />}

      {tab === 'tasks' && (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <Button icon={<RefreshCw className="h-4.5 w-4.5" />} onClick={regenerate} title="Po zmianie czasów w Ustawieniach">
              Przelicz harmonogram
            </Button>
            <Button variant="primary" icon={<CalendarPlus className="h-4.5 w-4.5" />} onClick={() => setEventForm({ open: true, event: null })}>
              Dodaj zadanie
            </Button>
          </div>
          <section>
            <h3 className="mb-2 px-1 text-sm font-semibold text-ink-700">Do zrobienia ({upcoming.length})</h3>
            <Card className="divide-y divide-ink-100 overflow-hidden">
              {upcoming.map((e) => (
                <EventRow key={e.id} event={e} showDate onOpen={(ev) => setEventForm({ open: true, event: ev })} />
              ))}
              {!upcoming.length && <p className="px-4 py-6 text-sm text-ink-500">Brak zadań.</p>}
            </Card>
          </section>
          {doneEvents.length > 0 && (
            <details className="group">
              <summary className="mb-2 cursor-pointer px-1 text-sm font-semibold text-ink-500 hover:text-ink-800">Zrobione ({doneEvents.length})</summary>
              <Card className="divide-y divide-ink-100 overflow-hidden">
                {doneEvents.map((e) => (
                  <EventRow key={e.id} event={e} showDate onOpen={(ev) => setEventForm({ open: true, event: ev })} />
                ))}
              </Card>
            </details>
          )}
          <p className="px-1 text-xs text-ink-400">Dziś: {formatDate(today)}. Kamienie milowe (flaga) zmieniają status kul i przeliczają dalsze terminy.</p>
        </div>
      )}

      {tab === 'measurements' && <MeasurementsTab batch={batch} balls={balls} measurements={measurements} />}

      {tab === 'photos' && (
        <Card>
          <CardBody>
            <PhotoGallery ownerType="batch" ownerId={batch.id} sample={batch.sample} />
          </CardBody>
        </Card>
      )}

      <BatchForm open={editOpen} onClose={() => setEditOpen(false)} batch={batch} />
      <WorkTimeSheet open={work.open} defaultMode={work.mode} batchId={batch.id} onClose={() => setWork({ ...work, open: false })} />
      <EventForm open={eventForm.open} event={eventForm.event} defaultBatchId={batch.id} onClose={() => setEventForm({ open: false, event: null })} />
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-800">{value}</dd>
    </div>
  )
}
