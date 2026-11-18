import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play } from 'lucide-react'
import { db } from '@/db/db'
import { createEntity } from '@/db/repo'
import type { StageKey, WorkSession } from '@/db/types'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Input, NumberInput, Select } from '@/components/ui/Form'
import { Segmented } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Feedback'
import { useSettings } from '@/hooks/useSettings'
import { startTimer, useActiveTimer } from '@/hooks/useTimer'
import { todayISO } from '@/lib/dates'
import { formatMinutes } from '@/lib/format'
import { ACTIVE_STATUSES } from '@/domain/constants'

interface WorkTimeSheetProps {
  open: boolean
  onClose: () => void
  batchId?: string
  defaultMode?: 'timer' | 'manual'
}

/** Start stopera albo ręczny wpis czasu pracy */
export function WorkTimeSheet({ open, onClose, batchId: fixedBatch, defaultMode = 'timer' }: WorkTimeSheetProps) {
  const settings = useSettings()
  const toast = useToast()
  const timer = useActiveTimer()
  const batches = useLiveQuery(async () => {
    const all = await db.batches.orderBy('number').reverse().toArray()
    const balls = await db.balls.toArray()
    return all.filter((b) => b.id === fixedBatch || balls.some((x) => x.batchId === b.id && ACTIVE_STATUSES.includes(x.status)))
  }, [fixedBatch])
  const [mode, setMode] = useState(defaultMode)
  const [batchId, setBatchId] = useState('')
  const [stage, setStage] = useState<StageKey | 'other'>('casting')
  const [date, setDate] = useState(todayISO())
  const [minutes, setMinutes] = useState<number | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setMode(defaultMode)
    setBatchId(fixedBatch ?? '')
    setDate(todayISO())
    setMinutes(null)
    setNote('')
  }, [open, fixedBatch, defaultMode])

  const submit = async () => {
    if (mode === 'timer') {
      await startTimer({ batchId: batchId || null, stage, note: note.trim() || undefined })
      toast.show('Stoper wystartował – zatrzymasz go na pasku na dole')
      return onClose()
    }
    if (!minutes || minutes <= 0) return
    await createEntity<WorkSession>(db.workSessions, { batchId: batchId || null, stage, date, minutes, note: note.trim() || undefined })
    toast.show(`Zapisano ${formatMinutes(minutes)} pracy`)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title="Czas pracy"
      subtitle="Z pomiarów liczy się prawdziwy zarobek za godzinę"
      footer={
        <SheetFooter>
          <Button onClick={onClose} className="hidden sm:inline-flex">
            Anuluj
          </Button>
          {mode === 'timer' ? (
            <Button type="submit" variant="primary" size="lg" icon={<Play className="h-5 w-5 fill-current" />} disabled={!!timer} block className="sm:w-auto">
              {timer ? 'Stoper już działa' : 'Start'}
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={!minutes}>
              Zapisz
            </Button>
          )}
        </SheetFooter>
      }
    >
      <div className="space-y-4">
        <Segmented<'timer' | 'manual'>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'timer', label: 'Stoper' },
            { value: 'manual', label: 'Wpisz ręcznie' },
          ]}
        />
        <FormGrid>
          <Field label="Partia">
            <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!!fixedBatch}>
              <option value="">— praca ogólna —</option>
              {batches?.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.number}
                  {b.name ? ` · ${b.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etap">
            <Select value={stage} onChange={(e) => setStage(e.target.value as StageKey | 'other')}>
              {settings.stages
                .filter((s) => s.activeMinutesPerBall > 0)
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              <option value="other">Inna praca (zakupy, formy, marketing)</option>
            </Select>
          </Field>
        </FormGrid>
        {mode === 'manual' && (
          <FormGrid>
            <Field label="Data">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
            </Field>
            <Field label="Czas">
              <NumberInput value={minutes} onValueChange={setMinutes} integer suffix="min" placeholder="np. 45" />
            </Field>
          </FormGrid>
        )}
        <Field label="Notatka" optional>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. 6 kul, dwie formy" />
        </Field>
      </div>
    </Sheet>
  )
}
