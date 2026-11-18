import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { db } from '@/db/db'
import type { Batch, CalendarEvent, Measurement } from '@/db/types'
import { MILESTONE_EFFECTS, type ScheduleKey } from '@/domain/schedule'
import { addMeasurement, completeEvent, STATUS_RANK, uncompleteEvent } from '@/domain/production'
import { ACTIVE_STATUSES, STATUS_META } from '@/domain/constants'
import { useSettings } from '@/hooks/useSettings'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { Callout } from '@/components/ui/Misc'
import { StarRating } from '@/components/ui/StarRating'
import { useToast } from '@/components/ui/Feedback'
import { formatDate, todayISO } from '@/lib/dates'
import { formatNumber, kul } from '@/lib/format'

interface Pending {
  event: CalendarEvent
  batch: Batch
  count: number
  lastPh: Measurement | null
}

const Ctx = createContext<((e: CalendarEvent) => Promise<void>) | null>(null)

/** Zwraca funkcję odhaczania zadań. Kamienie milowe pytają o zmianę statusu kul. */
export function useToggleTask() {
  const fn = useContext(Ctx)
  if (!fn) throw new Error('useToggleTask poza TaskCompletionProvider')
  return fn
}

export function TaskCompletionProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const toast = useToast()
  const [pending, setPending] = useState<Pending | null>(null)
  const [date, setDate] = useState(todayISO())
  const [rating, setRating] = useState<number | null>(null)

  const toggle = useCallback(
    async (event: CalendarEvent) => {
      if (event.done) {
        await uncompleteEvent(event)
        return
      }
      const effect = event.scheduleKey ? MILESTONE_EFFECTS[event.scheduleKey as ScheduleKey] : undefined
      if (event.kind === 'milestone' && effect && event.batchId) {
        const batch = await db.batches.get(event.batchId)
        if (batch) {
          const balls = await db.balls.where('batchId').equals(batch.id).toArray()
          const count = balls.filter((b) => ACTIVE_STATUSES.includes(b.status) && STATUS_RANK[b.status] < STATUS_RANK[effect.to]).length
          const ph = (await db.measurements.where('batchId').equals(batch.id).filter((m) => m.type === 'ph').sortBy('date')).at(-1) ?? null
          setPending({ event, batch, count, lastPh: ph })
          setDate(todayISO())
          setRating(null)
          return
        }
      }
      await completeEvent(event, { applyEffect: false }, settings)
      toast.show(<>Zrobione: {event.title}</>, { action: { label: 'Cofnij', onClick: () => uncompleteEvent(event) } })
    },
    [settings, toast],
  )

  const finish = async (applyEffect: boolean) => {
    if (!pending) return
    const { event, batch } = pending
    const { moved } = await completeEvent(event, { applyEffect, date }, settings)
    if (rating) await addMeasurement({ batchId: batch.id, ballId: null, date, type: 'moss', value: rating, sample: batch.sample })
    setPending(null)
    toast.show(applyEffect && moved ? `Partia #${batch.number}: ${kul(moved)} → ${STATUS_META[MILESTONE_EFFECTS[event.scheduleKey as ScheduleKey]!.to].label}. Harmonogram przeliczony.` : 'Zrobione')
  }

  const effect = pending?.event.scheduleKey ? MILESTONE_EFFECTS[pending.event.scheduleKey as ScheduleKey] : undefined
  const askRating = pending?.event.scheduleKey === 'moss_check' || pending?.event.scheduleKey === 'ready'
  const phTooHigh = pending?.event.scheduleKey === 'inoculate' && (!pending.lastPh || (pending.lastPh.value ?? 99) >= settings.schedule.phTarget)

  return (
    <Ctx.Provider value={toggle}>
      {children}
      <Sheet
        open={!!pending && !!effect}
        onClose={() => setPending(null)}
        title={effect?.question}
        subtitle={pending ? `Partia #${pending.batch.number}${pending.batch.name ? ` · ${pending.batch.name}` : ''}` : undefined}
        size="sm"
        footer={
          <SheetFooter>
            <Button onClick={() => finish(false)}>Tylko odhacz</Button>
            <Button variant="primary" onClick={() => finish(true)} disabled={!pending?.count}>
              {effect?.confirm}
            </Button>
          </SheetFooter>
        }
      >
        {pending && effect && (
          <div className="space-y-4 text-[15px] leading-relaxed text-ink-700">
            <p>
              {pending.count ? (
                <>
                  {kul(pending.count)} zmieni status na <strong className="text-ink-900">„{STATUS_META[effect.to].label}”</strong>
                  {effect.actual ? ', a dalszy harmonogram przeliczy się od tej daty.' : '.'}
                </>
              ) : (
                <>Wszystkie kule mają już ten status albo dalszy.</>
              )}
            </p>
            {pending.event.scheduleKey === 'inoculate' &&
              (phTooHigh ? (
                <Callout tone="clay" icon={<TriangleAlert className="h-4.5 w-4.5" />}>
                  {pending.lastPh
                    ? `Ostatnie pH: ${formatNumber(pending.lastPh.value ?? 0, 1, true)} (${formatDate(pending.lastPh.date)}). To za dużo dla mchu – szczep przy pH poniżej ${settings.schedule.phTarget}.`
                    : 'Brak pomiaru pH. Zrób test papierkiem przed szczepieniem – mech ginie przy wysokim pH.'}
                </Callout>
              ) : (
                <Callout tone="moss">
                  Ostatnie pH: {formatNumber(pending.lastPh?.value ?? 0, 1, true)} ({formatDate(pending.lastPh!.date)}). Można szczepić.
                </Callout>
              ))}
            {askRating && (
              <Field label="Ocena przyjęcia mchu (cała partia)" optional>
                <StarRating value={rating} onChange={setRating} />
              </Field>
            )}
            <Field label="Kiedy">
              <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
            </Field>
          </div>
        )}
      </Sheet>
    </Ctx.Provider>
  )
}
