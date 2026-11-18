import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Layers, TriangleAlert } from 'lucide-react'
import type { Ball, BallStatus, Batch } from '@/db/types'
import { db } from '@/db/db'
import { updateEntity } from '@/db/repo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea, Toggle } from '@/components/ui/Form'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { StarRating } from '@/components/ui/StarRating'
import { useToast } from '@/components/ui/Feedback'
import { StatusBadge } from '@/components/production/StatusPipeline'
import { PhotoGallery } from '@/components/Photos'
import { ACTIVE_STATUSES, BALL_STATUSES, STATUS_META } from '@/domain/constants'
import { ballCode, setBatchStatus, statusCounts } from '@/domain/production'
import { useSettings } from '@/hooks/useSettings'
import { formatDate, todayISO } from '@/lib/dates'
import { formatNumber, kul } from '@/lib/format'
import { cn } from '@/lib/cn'

export function BallsTab({ batch, balls }: { batch: Batch; balls: Ball[] }) {
  const [openBall, setOpenBall] = useState<Ball | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const active = balls.filter((b) => ACTIVE_STATUSES.includes(b.status)).length

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0 flex-1 text-sm text-ink-600">
          <span className="font-semibold text-ink-900">{kul(active)} w produkcji.</span> Zmiana statusu całej partii zapisze faktyczną datę etapu i przeliczy harmonogram. Pojedynczą kulę (np. pękniętą) zmienisz po kliknięciu.
        </div>
        <Button variant="primary" icon={<Layers className="h-4.5 w-4.5" />} onClick={() => setBulkOpen(true)} disabled={!active}>
          Zmień status partii
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {balls.map((b) => (
          <button key={b.id} onClick={() => setOpenBall(b)} className="group overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-ink-150 transition hover:ring-moss-300 active:scale-[0.98]">
            <div className="h-1.5" style={{ background: ACTIVE_STATUSES.includes(b.status) ? STATUS_META[b.status].color : b.status === 'sold' ? '#c58b1c' : '#c0624d' }} />
            <div className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold text-ink-900 tabular">{ballCode(batch.number, b.index)}</span>
                {b.hasCracks && <TriangleAlert className="h-4 w-4 text-clay-500" aria-label="Pęknięcia" />}
              </div>
              <StatusBadge status={b.status} className="mt-2" />
              <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-ink-500">
                {b.mossRating ? <StarRating value={b.mossRating} size="sm" /> : <span>—</span>}
                {b.lastPh !== null && b.lastPh !== undefined && (
                  <span className="inline-flex items-center gap-0.5 tabular">
                    <Droplets className="h-3 w-3" />
                    pH {formatNumber(b.lastPh, 1, true)}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <BallSheet ball={openBall} batch={batch} onClose={() => setOpenBall(null)} />
      <BulkStatusSheet open={bulkOpen} onClose={() => setBulkOpen(false)} batch={batch} balls={balls} />
    </div>
  )
}

function BallSheet({ ball, batch, onClose }: { ball: Ball | null; batch: Batch; onClose: () => void }) {
  const toast = useToast()
  const [draft, setDraft] = useState<Partial<Ball>>({})

  useEffect(() => {
    if (ball) setDraft({ status: ball.status, mossRating: ball.mossRating ?? null, hasCracks: !!ball.hasCracks, cracksNote: ball.cracksNote ?? '', notes: ball.notes ?? '' })
  }, [ball])

  if (!ball) return null
  const save = async () => {
    const statusChanged = draft.status !== ball.status
    await updateEntity<Ball>(db.balls, ball.id, { ...draft, statusChangedAt: statusChanged ? todayISO() : ball.statusChangedAt })
    toast.show('Zapisano kulę')
    onClose()
  }

  return (
    <Sheet
      open={!!ball}
      onClose={onClose}
      onSubmit={save}
      title={`Kula ${ballCode(batch.number, ball.index)}`}
      subtitle={`Status od ${formatDate(ball.statusChangedAt)}`}
      footer={
        <SheetFooter>
          <Button onClick={onClose} className="hidden sm:inline-flex">
            Anuluj
          </Button>
          <Button type="submit" variant="primary">
            Zapisz
          </Button>
        </SheetFooter>
      }
    >
      <div className="space-y-5">
        <Field label="Status">
          <div className="grid grid-cols-2 gap-2">
            {BALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDraft({ ...draft, status: s })}
                disabled={s === 'sold' && ball.status !== 'sold'}
                title={s === 'sold' ? 'Sprzedaż dodajesz w module Sprzedaż' : undefined}
                className={cn(
                  'flex h-12 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium ring-1 transition ring-inset disabled:opacity-40',
                  draft.status === s ? 'bg-moss-900 text-white ring-moss-900' : 'bg-white text-ink-800 ring-ink-200 hover:ring-ink-300',
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ACTIVE_STATUSES.includes(s) ? STATUS_META[s].color : s === 'sold' ? '#c58b1c' : '#c0624d' }} />
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </Field>
        {ball.saleId && (
          <p className="text-sm text-ink-600">
            Sprzedana –{' '}
            <Link to="/sprzedaz" className="font-medium text-moss-800 underline underline-offset-2">
              zobacz sprzedaż
            </Link>
          </p>
        )}
        <Field label="Ocena przyjęcia mchu">
          <StarRating value={draft.mossRating} onChange={(v) => setDraft({ ...draft, mossRating: v })} />
        </Field>
        <div>
          <Toggle checked={!!draft.hasCracks} onChange={(v) => setDraft({ ...draft, hasCracks: v })} label="Ma pęknięcia" description="Pęknięcia przy cienkich wgłębieniach to typowy problem." />
          {draft.hasCracks && <Input className="mt-2" value={draft.cracksNote ?? ''} onChange={(e) => setDraft({ ...draft, cracksNote: e.target.value })} placeholder="gdzie i jak duże" />}
        </div>
        <Field label="Notatki" optional>
          <Textarea value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </Field>
        <Field label="Zdjęcia">
          <PhotoGallery ownerType="ball" ownerId={ball.id} sample={ball.sample} />
        </Field>
      </div>
    </Sheet>
  )
}

function BulkStatusSheet({ open, onClose, batch, balls }: { open: boolean; onClose: () => void; batch: Batch; balls: Ball[] }) {
  const settings = useSettings()
  const toast = useToast()
  const [status, setStatus] = useState<BallStatus>('curing')
  const [date, setDate] = useState(todayISO())
  const counts = statusCounts(balls)
  const active = ACTIVE_STATUSES.reduce((a, s) => a + counts[s], 0)

  useEffect(() => {
    if (open) setDate(todayISO())
  }, [open])

  const apply = async () => {
    const n = await setBatchStatus(batch, status, date, settings)
    toast.show(`${kul(n)} → ${STATUS_META[status].label}`)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSubmit={apply}
      title={`Status partii #${batch.number}`}
      subtitle={`Zmieni się ${kul(active)} w produkcji. Sprzedane i odpady zostaną.`}
      size="sm"
      footer={
        <SheetFooter>
          <Button type="submit" variant="primary" block>
            Ustaw „{STATUS_META[status].label}”
          </Button>
        </SheetFooter>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2">
          {ACTIVE_STATUSES.concat('waste').map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'flex h-13 items-center gap-3 rounded-xl px-4 text-left text-[15px] font-medium ring-1 transition ring-inset',
                status === s ? 'bg-moss-900 text-white ring-moss-900' : 'bg-white text-ink-800 ring-ink-200 hover:ring-ink-300',
              )}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s === 'waste' ? '#c0624d' : STATUS_META[s].color }} />
              <span className="flex-1">{STATUS_META[s].label}</span>
              {counts[s] > 0 && <span className={cn('text-sm tabular', status === s ? 'text-moss-200' : 'text-ink-400')}>teraz {counts[s]}</span>}
            </button>
          ))}
        </div>
        <Field label="Od kiedy">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>
      </div>
    </Sheet>
  )
}
