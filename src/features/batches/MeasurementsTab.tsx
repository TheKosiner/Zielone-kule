import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Droplets, Plus, Ruler, Scale, Star, StickyNote, Trash2, TriangleAlert } from 'lucide-react'
import type { Ball, Batch, Measurement, MeasurementType } from '@/db/types'
import { db } from '@/db/db'
import { deleteEntity } from '@/db/repo'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input, NumberInput, Select } from '@/components/ui/Form'
import { EmptyState, Segmented } from '@/components/ui/Misc'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { StarRating } from '@/components/ui/StarRating'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { MEASUREMENT_META } from '@/domain/constants'
import { addMeasurement, ballCode } from '@/domain/production'
import { useSettings } from '@/hooks/useSettings'
import { formatDate, formatDateShort, todayISO } from '@/lib/dates'
import { formatNumber } from '@/lib/format'

const ICONS: Record<MeasurementType, typeof Droplets> = { ph: Droplets, cracks: TriangleAlert, moss: Star, weight: Scale, note: StickyNote }

export function MeasurementsTab({ batch, balls, measurements }: { batch: Batch; balls: Ball[]; measurements: Measurement[] }) {
  const settings = useSettings()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const ph = measurements.filter((m) => m.type === 'ph' && m.value !== null && m.value !== undefined && !m.ballId).sort((a, b) => a.date.localeCompare(b.date))
  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const ballById = new Map(balls.map((b) => [b.id, b]))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={() => setOpen(true)}>
          Dodaj pomiar
        </Button>
      </div>

      {ph.length >= 2 && (
        <Card>
          <CardHeader title="pH w czasie" subtitle={`Szczep przy pH poniżej ${formatNumber(settings.schedule.phTarget, 1, true)} (linia przerywana)`} />
          <CardBody>
            <div style={{ height: 200 }} role="img" aria-label={`pH partii: ${ph.map((m) => `${formatDate(m.date)} ${m.value}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ph.map((m) => ({ date: formatDateShort(m.date), full: formatDate(m.date), value: m.value }))} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e3e8df" />
                  <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#d9dfd5' }} tick={{ fill: '#747f71', fontSize: 12 }} />
                  <YAxis domain={[6, 13]} ticks={[6, 8, 10, 12]} tickLine={false} axisLine={false} tick={{ fill: '#97a194', fontSize: 12 }} width={32} />
                  <ReferenceLine y={settings.schedule.phTarget} stroke="#5b8a4c" strokeDasharray="5 4" />
                  <Tooltip
                    cursor={{ stroke: '#bcc4b8' }}
                    content={(p) => {
                      const d = p.payload?.[0]?.payload as { full: string; value: number } | undefined
                      if (!p.active || !d) return null
                      return (
                        <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-pop ring-1 ring-ink-150">
                          <div className="text-xs text-ink-500">{d.full}</div>
                          <div className="font-semibold tabular">pH {formatNumber(d.value, 1, true)}</div>
                        </div>
                      )
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#2f4a2c" strokeWidth={2} dot={{ r: 4, fill: '#2f4a2c', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}

      {!sorted.length ? (
        <Card>
          <EmptyState icon={<Ruler className="h-7 w-7" />} title="Brak pomiarów" text="Zapisuj pH przy płukaniu, pęknięcia po wyjęciu z formy i ocenę mchu. Z tego wyciągniesz wnioski do kolejnych partii." />
        </Card>
      ) : (
        <Card className="divide-y divide-ink-100 overflow-hidden">
          {sorted.map((m) => {
            const Icon = ICONS[m.type]
            const ball = m.ballId ? ballById.get(m.ballId) : undefined
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-800">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium text-ink-900">
                    {MEASUREMENT_META[m.type].label}
                    {m.type === 'moss' && m.value ? <StarRating value={m.value} size="sm" /> : m.value !== null && m.value !== undefined && <span className="tabular">{formatNumber(m.value, 2, true)}{MEASUREMENT_META[m.type].unit && ` ${MEASUREMENT_META[m.type].unit}`}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {formatDate(m.date)} · {ball ? `kula ${ballCode(batch.number, ball.index)}` : 'cała partia'}
                    {m.text && ` · ${m.text}`}
                  </div>
                </div>
                <IconButton
                  label="Usuń pomiar"
                  size="sm"
                  onClick={async () => {
                    if (await confirm({ title: 'Usunąć pomiar?', confirmLabel: 'Usuń', tone: 'danger' })) await deleteEntity(db.measurements, m.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            )
          })}
        </Card>
      )}

      <MeasurementSheet open={open} onClose={() => setOpen(false)} batch={batch} balls={balls} />
    </div>
  )
}

function MeasurementSheet({ open, onClose, batch, balls }: { open: boolean; onClose: () => void; batch: Batch; balls: Ball[] }) {
  const toast = useToast()
  const [type, setType] = useState<MeasurementType>('ph')
  const [value, setValue] = useState<number | null>(null)
  const [ballId, setBallId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) {
      setValue(null)
      setText('')
      setDate(todayISO())
      setBallId('')
    }
  }, [open])

  const needsValue = type === 'ph' || type === 'moss' || type === 'weight'
  const needsBall = type === 'cracks'
  const save = async () => {
    if (needsValue && !value) return
    if (needsBall && !ballId) return
    await addMeasurement({ batchId: batch.id, ballId: ballId || null, date, type, value: needsValue ? value : null, text: text.trim() || undefined, sample: batch.sample })
    toast.show('Zapisano pomiar')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSubmit={save}
      title="Nowy pomiar"
      subtitle={`Partia #${batch.number}`}
      footer={
        <SheetFooter>
          <Button type="submit" variant="primary" disabled={(needsValue && !value) || (needsBall && !ballId)}>
            Zapisz
          </Button>
        </SheetFooter>
      }
    >
      <div className="space-y-4">
        <Segmented<MeasurementType>
          value={type}
          onChange={(t) => {
            setType(t)
            setValue(null)
          }}
          options={[
            { value: 'ph', label: 'pH' },
            { value: 'cracks', label: 'Pęknięcie' },
            { value: 'moss', label: 'Mech' },
            { value: 'weight', label: 'Waga' },
            { value: 'note', label: 'Notatka' },
          ]}
        />
        {type === 'ph' && (
          <Field label="pH" hint="Świeży cement 12–13. Mech szczepisz poniżej ok. 8.">
            <NumberInput value={value} onValueChange={setValue} placeholder="np. 8,5" />
          </Field>
        )}
        {type === 'weight' && (
          <Field label="Waga po wyschnięciu" hint="Docelowo ok. 2–2,8 kg.">
            <NumberInput value={value} onValueChange={setValue} suffix="kg" />
          </Field>
        )}
        {type === 'moss' && (
          <Field label="Ocena przyjęcia mchu">
            <StarRating value={value} onChange={setValue} />
          </Field>
        )}
        <FormGrid>
          <Field label={needsBall ? 'Kula' : 'Dotyczy'}>
            <Select value={ballId} onChange={(e) => setBallId(e.target.value)}>
              {!needsBall && <option value="">Cała partia</option>}
              {needsBall && <option value="">— wybierz kulę —</option>}
              {balls.map((b) => (
                <option key={b.id} value={b.id}>
                  Kula {ballCode(batch.number, b.index)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
          </Field>
        </FormGrid>
        <Field label={type === 'cracks' ? 'Opis pęknięcia' : 'Uwagi'} optional={type !== 'note'}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={type === 'cracks' ? 'np. rysa przy wgłębieniu, 2 cm' : ''} />
        </Field>
      </div>
    </Sheet>
  )
}
