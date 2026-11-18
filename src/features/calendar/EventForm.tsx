import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { SkipForward, Trash2 } from 'lucide-react'
import { db } from '@/db/db'
import { createEntity, deleteEntity, updateEntity } from '@/db/repo'
import type { CalendarEvent } from '@/db/types'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Input, Select, Textarea } from '@/components/ui/Form'
import { Segmented } from '@/components/ui/Misc'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { formatDate, formatDateWithWeekday, todayISO } from '@/lib/dates'

interface EventFormProps {
  open: boolean
  onClose: () => void
  event?: CalendarEvent | null
  defaultDate?: string
  defaultBatchId?: string
}

export function EventForm({ open, onClose, event, defaultDate, defaultBatchId }: EventFormProps) {
  const toast = useToast()
  const confirm = useConfirm()
  const batches = useLiveQuery(() => db.batches.orderBy('number').reverse().toArray(), [])
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [kind, setKind] = useState<'task' | 'event'>('task')
  const [batchId, setBatchId] = useState('')
  const [notes, setNotes] = useState('')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? '')
    setDate(event?.date ?? defaultDate ?? todayISO())
    setTime(event?.time ?? '')
    setKind(event?.kind === 'event' ? 'event' : 'task')
    setBatchId(event?.batchId ?? defaultBatchId ?? '')
    setNotes(event?.notes ?? '')
    setTried(false)
  }, [open, event, defaultDate, defaultBatchId])

  const fromSchedule = event?.source === 'schedule'
  const batch = batches?.find((b) => b.id === (event?.batchId ?? batchId))

  const save = async () => {
    setTried(true)
    if (fromSchedule) return onClose()
    if (!title.trim()) return
    const data = { title: title.trim(), date, time: time || undefined, kind, batchId: batchId || null, notes: notes.trim() || undefined }
    if (event) await updateEntity<CalendarEvent>(db.events, event.id, data)
    else await createEntity<CalendarEvent>(db.events, { ...data, done: false, source: 'manual' })
    toast.show(event ? 'Zapisano' : kind === 'task' ? 'Dodano zadanie' : 'Dodano wydarzenie')
    onClose()
  }

  const remove = async () => {
    if (!event) return
    if (!(await confirm({ title: 'Usunąć wpis z kalendarza?', confirmLabel: 'Usuń', tone: 'danger' }))) return
    await deleteEntity(db.events, event.id)
    onClose()
  }

  const skip = async () => {
    if (!event) return
    await updateEntity<CalendarEvent>(db.events, event.id, { done: true, skipped: true, doneAt: todayISO() })
    toast.show('Zadanie pominięte')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSubmit={save}
      title={fromSchedule ? event!.title : event ? 'Edytuj wpis' : 'Nowy wpis w kalendarzu'}
      subtitle={fromSchedule ? `Z harmonogramu · ${formatDateWithWeekday(event!.date, true)}${event!.endDate ? ` – ${formatDate(event!.endDate)}` : ''}` : undefined}
      footer={
        <SheetFooter className="justify-between">
          <div>
            {event && !fromSchedule && (
              <Button variant="danger-soft" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Usuń
              </Button>
            )}
            {fromSchedule && !event!.done && event!.kind === 'task' && (
              <Button variant="ghost" icon={<SkipForward className="h-4 w-4" />} onClick={skip}>
                Pomiń
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!fromSchedule && (
              <Button onClick={onClose} className="hidden sm:inline-flex">
                Anuluj
              </Button>
            )}
            <Button type="submit" variant="primary">
              {fromSchedule ? 'Zamknij' : 'Zapisz'}
            </Button>
          </div>
        </SheetFooter>
      }
    >
      {fromSchedule ? (
        <div className="space-y-4">
          {event!.notes && <p className="rounded-xl bg-moss-50 p-3.5 text-[15px] leading-relaxed text-ink-700 ring-1 ring-moss-200 ring-inset">{event!.notes}</p>}
          {batch && (
            <p className="text-sm text-ink-600">
              Partia:{' '}
              <Link to={`/partie/${batch.id}`} className="font-medium text-moss-800 underline decoration-moss-300 underline-offset-2" onClick={onClose}>
                #{batch.number}
                {batch.name ? ` · ${batch.name}` : ''}
              </Link>
            </p>
          )}
          <p className="text-xs leading-relaxed text-ink-500">
            Termin wynika z harmonogramu partii. Żeby go przesunąć, zmień status kul albo datę odlewu w partii. Obserwacje zapisuj w dzienniku.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Segmented<'task' | 'event'>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'task', label: 'Zadanie do odhaczenia' },
              { value: 'event', label: 'Wydarzenie' },
            ]}
          />
          <Field label="Tytuł" error={tried && !title.trim() ? 'Wpisz tytuł.' : null}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'task' ? 'np. Wydrukuj nową formę' : 'np. Kiermasz w Domu Kultury'} />
          </Field>
          <FormGrid>
            <Field label="Data">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
            </Field>
            <Field label="Godzina" optional>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </FormGrid>
          <Field label="Partia" optional>
            <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">— bez partii —</option>
              {batches?.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.number}
                  {b.name ? ` · ${b.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notatki" optional>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
        </div>
      )}
    </Sheet>
  )
}
