import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { db } from '@/db/db'
import type { ChannelKey, Sale, SaleStatus } from '@/db/types'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Input, NumberInput, Select, Textarea } from '@/components/ui/Form'
import { Chip, Segmented } from '@/components/ui/Misc'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { useSettings } from '@/hooks/useSettings'
import { useBusiness } from '@/hooks/useBusiness'
import { ballCode } from '@/domain/production'
import { defaultCommission, saleBreakdown } from '@/domain/sales'
import { deleteSale, saveSale } from '@/domain/salesService'
import { todayISO } from '@/lib/dates'
import { formatHours, formatPLN, round2 } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Draft {
  date: string
  channel: ChannelKey
  ballIds: string[]
  batchId: string
  quantity: number
  unitPrice: number | null
  commission: number | null
  shippingCharged: number | null
  shippingCost: number | null
  packagingCost: number | null
  customer: string
  description: string
  status: SaleStatus
  refundAmount: number | null
  refundDate: string
  statusNote: string
  notes: string
  manualCommission: boolean
}

export function SaleForm({ open, onClose, sale }: { open: boolean; onClose: () => void; sale?: Sale | null }) {
  const settings = useSettings()
  const toast = useToast()
  const confirm = useConfirm()
  const business = useBusiness()
  const [showAll, setShowAll] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)

  const available = useLiveQuery(async () => {
    const [balls, batches] = await Promise.all([db.balls.toArray(), db.batches.toArray()])
    const num = new Map(batches.map((b) => [b.id, b]))
    return balls
      .filter((b) => b.status === 'ready' || b.status === 'establishing' || b.saleId === sale?.id)
      .map((b) => ({ ...b, code: ballCode(num.get(b.batchId)?.number ?? 0, b.index), batchNumber: num.get(b.batchId)?.number ?? 0 }))
      .sort((a, b) => a.batchNumber - b.batchNumber || a.index - b.index)
  }, [sale?.id])
  const batches = useLiveQuery(() => db.batches.orderBy('number').reverse().toArray(), [])

  const channelOf = (key: ChannelKey) => settings.channels.find((c) => c.key === key)

  useEffect(() => {
    if (!open) return
    setShowAll(false)
    if (sale) {
      setDraft({
        date: sale.date,
        channel: sale.channel,
        ballIds: sale.ballIds,
        batchId: sale.batchId ?? '',
        quantity: sale.quantity,
        unitPrice: round2(sale.price / Math.max(1, sale.quantity)),
        commission: sale.commission,
        shippingCharged: sale.shippingCharged,
        shippingCost: sale.shippingCost,
        packagingCost: sale.packagingCost,
        customer: sale.customer ?? '',
        description: sale.description ?? '',
        status: sale.status,
        refundAmount: sale.refundAmount ?? null,
        refundDate: sale.refundDate ?? '',
        statusNote: sale.statusNote ?? '',
        notes: sale.notes ?? '',
        manualCommission: true,
      })
    } else {
      const ch = settings.channels.find((c) => c.enabled) ?? settings.channels[0]
      setDraft({
        date: todayISO(),
        channel: ch.key,
        ballIds: [],
        batchId: '',
        quantity: 1,
        unitPrice: ch.defaultPrice,
        commission: null,
        shippingCharged: null,
        shippingCost: null,
        packagingCost: ch.packagingCost,
        customer: '',
        description: '',
        status: 'ok',
        refundAmount: null,
        refundDate: '',
        statusNote: '',
        notes: '',
        manualCommission: false,
      })
    }
  }, [open, sale, settings.channels])

  const price = draft ? round2((draft.unitPrice ?? 0) * draft.quantity) : 0
  const channel = draft ? channelOf(draft.channel) : undefined
  const commission = draft ? (draft.manualCommission && draft.commission !== null ? draft.commission : defaultCommission(channel, price)) : 0
  const breakdown = useMemo(() => {
    if (!draft || !business) return null
    const b = saleBreakdown(
      { price, shippingCharged: draft.shippingCharged ?? 0, commission, shippingCost: draft.shippingCost ?? 0, packagingCost: draft.packagingCost ?? 0, quantity: draft.quantity, status: draft.status, refundAmount: draft.refundAmount ?? 0 },
      { materialPerBall: business.materialPerBall },
    )
    const hours = (business.labor.minutesPerBall * draft.quantity) / 60
    return { ...b, hours, perHour: hours ? b.profit / hours : 0 }
  }, [draft, business, price, commission])

  if (!draft) return null
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const setChannel = (key: ChannelKey) => {
    const ch = channelOf(key)
    setDraft((d) => (d ? { ...d, channel: key, unitPrice: ch?.defaultPrice ?? d.unitPrice, packagingCost: ch?.packagingCost ?? 0, manualCommission: false } : d))
  }

  const toggleBall = (id: string) => {
    setDraft((d) => {
      if (!d) return d
      const ballIds = d.ballIds.includes(id) ? d.ballIds.filter((x) => x !== id) : [...d.ballIds, id]
      return { ...d, ballIds, quantity: Math.max(1, ballIds.length || d.quantity) }
    })
  }

  const minPrice = draft.channel === 'allegro' && draft.unitPrice !== null && draft.unitPrice < settings.minAllegroPrice
  const visibleBalls = (available ?? []).filter((b) => showAll || b.status === 'ready' || draft.ballIds.includes(b.id))
  const description = draft.description.trim() || `Kula ogrodowa z mchem${draft.quantity > 1 ? ` × ${draft.quantity}` : ''}`

  const save = async () => {
    if (!draft.unitPrice || draft.quantity < 1) return
    const firstBall = available?.find((b) => draft.ballIds.includes(b.id))
    await saveSale(
      {
        date: draft.date,
        ballIds: draft.ballIds,
        batchId: firstBall?.batchId ?? (draft.batchId || null),
        quantity: draft.quantity,
        channel: draft.channel,
        price,
        commissionPct: channel?.commissionPct ?? 0,
        commission,
        shippingCharged: draft.shippingCharged ?? 0,
        shippingCost: draft.shippingCost ?? 0,
        packagingCost: draft.packagingCost ?? 0,
        customer: draft.customer.trim() || undefined,
        description,
        status: draft.status,
        refundAmount: draft.status === 'ok' ? undefined : (draft.refundAmount ?? undefined),
        refundDate: draft.status === 'ok' ? undefined : draft.refundDate || draft.date,
        statusNote: draft.statusNote.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        sample: sale?.sample,
      },
      sale,
    )
    toast.show(sale ? 'Zapisano sprzedaż' : `Sprzedaż dodana do ewidencji: ${formatPLN(price + (settings.includeShippingInRevenue ? (draft.shippingCharged ?? 0) : 0))}`)
    onClose()
  }

  const remove = async () => {
    if (!sale || !(await confirm({ title: 'Usunąć sprzedaż?', message: 'Zniknie z ewidencji, a przypisane kule wrócą do statusu „Gotowa”.', confirmLabel: 'Usuń', tone: 'danger' }))) return
    await deleteSale(sale)
    toast.show('Usunięto sprzedaż')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSubmit={save}
      size="lg"
      title={sale ? 'Edytuj sprzedaż' : 'Nowa sprzedaż'}
      footer={
        <SheetFooter className="justify-between">
          <div>
            {sale && (
              <Button variant="danger-soft" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Usuń
              </Button>
            )}
          </div>
          <Button type="submit" variant="primary" className="min-w-32" disabled={!draft.unitPrice}>
            Zapisz
          </Button>
        </SheetFooter>
      }
    >
      <div className="space-y-5">
        <FormGrid>
          <Field label="Data sprzedaży">
            <Input type="date" value={draft.date} onChange={(e) => set('date', e.target.value || todayISO())} />
          </Field>
          <Field label="Kanał">
            <Select value={draft.channel} onChange={(e) => setChannel(e.target.value as ChannelKey)}>
              {settings.channels
                .filter((c) => c.enabled || c.key === draft.channel)
                .map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                    {c.commissionPct ? ` (${c.commissionPct}%)` : ''}
                  </option>
                ))}
            </Select>
          </Field>
        </FormGrid>

        <Field label="Które kule" hint="Zaznaczone kule dostaną status „Sprzedana”. Możesz też podać samą liczbę sztuk.">
          {visibleBalls.length ? (
            <div className="flex flex-wrap gap-2">
              {visibleBalls.map((b) => (
                <Chip key={b.id} active={draft.ballIds.includes(b.id)} onClick={() => toggleBall(b.id)}>
                  {b.code}
                  {b.status !== 'ready' && b.saleId !== sale?.id && <span className="text-xs opacity-70">(mech rośnie)</span>}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-ink-50 px-3.5 py-3 text-sm text-ink-500">Brak kul ze statusem „Gotowa”.</p>
          )}
          {(available ?? []).some((b) => b.status !== 'ready') && (
            <button type="button" className="mt-2 text-sm font-medium text-moss-700 hover:underline" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Pokaż tylko gotowe' : 'Pokaż też kule, na których mech jeszcze rośnie'}
            </button>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Sztuk">
            <NumberInput value={draft.quantity} onValueChange={(v) => set('quantity', Math.max(1, v ?? 1))} integer disabled={draft.ballIds.length > 0} />
          </Field>
          <Field label="Cena za sztukę" error={minPrice ? `Poniżej minimum ${formatPLN(settings.minAllegroPrice, { decimals: 0 })}` : null}>
            <NumberInput value={draft.unitPrice} onValueChange={(v) => set('unitPrice', v)} suffix="zł" />
          </Field>
          <Field label="Razem">
            <div className="flex h-11 items-center px-1 text-lg font-semibold text-ink-900 tabular">{formatPLN(price)}</div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Prowizja" hint={draft.manualCommission ? 'wpisana ręcznie' : `${channel?.commissionPct ?? 0}% z kanału`}>
            <NumberInput value={commission} onValueChange={(v) => setDraft((d) => (d ? { ...d, commission: v, manualCommission: true } : d))} suffix="zł" />
          </Field>
          <Field label="Wysyłka od klienta">
            <NumberInput value={draft.shippingCharged} onValueChange={(v) => set('shippingCharged', v)} suffix="zł" placeholder="0" />
          </Field>
          <Field label="Mój koszt wysyłki">
            <NumberInput value={draft.shippingCost} onValueChange={(v) => set('shippingCost', v)} suffix="zł" placeholder="0" />
          </Field>
          <Field label="Opakowanie">
            <NumberInput value={draft.packagingCost} onValueChange={(v) => set('packagingCost', v)} suffix="zł" />
          </Field>
        </div>

        {breakdown && (
          <div className="rounded-2xl bg-moss-900 p-4 text-white sm:p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-moss-300">Wpływy</div>
                <div className="text-lg font-semibold tabular">{formatPLN(breakdown.income, { decimals: 0 })}</div>
              </div>
              <div>
                <div className="text-xs text-moss-300">Koszty</div>
                <div className="text-lg font-semibold tabular">{formatPLN(breakdown.costs, { decimals: 0 })}</div>
              </div>
              <div>
                <div className="text-xs text-moss-300">Zysk</div>
                <div className={cn('text-lg font-semibold tabular', breakdown.profit < 0 && 'text-clay-100')}>{formatPLN(breakdown.profit, { decimals: 0 })}</div>
              </div>
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-center text-xs leading-relaxed text-moss-200">
              prowizja {formatPLN(breakdown.commission)} · wysyłka {formatPLN(breakdown.shipping)} · opakowanie {formatPLN(breakdown.packaging)} · materiały {formatPLN(breakdown.materials)}
              {breakdown.refund > 0 && ` · zwrot ${formatPLN(breakdown.refund)}`}
              <br />
              ok. <strong className="text-white">{formatPLN(breakdown.perHour, { decimals: 0 })}/h</strong> przy {formatHours(breakdown.hours)} pracy
            </p>
          </div>
        )}

        <FormGrid>
          <Field label="Klient" optional>
            <Input value={draft.customer} onChange={(e) => set('customer', e.target.value)} placeholder="np. login z Allegro" />
          </Field>
          <Field label="Opis w ewidencji">
            <Input value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder={description} />
          </Field>
        </FormGrid>

        {!draft.ballIds.length && (
          <Field label="Z partii" optional>
            <Select value={draft.batchId} onChange={(e) => set('batchId', e.target.value)}>
              <option value="">— nie wiem / różne —</option>
              {batches?.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.number}
                  {b.name ? ` · ${b.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-150 ring-inset">
          <Segmented<SaleStatus>
            value={draft.status}
            onChange={(v) => set('status', v)}
            size="sm"
            options={[
              { value: 'ok', label: 'OK' },
              { value: 'returned', label: 'Zwrot' },
              { value: 'complaint', label: 'Reklamacja' },
            ]}
          />
          {draft.status !== 'ok' && (
            <div className="mt-4 space-y-4">
              <FormGrid>
                <Field label={draft.status === 'returned' ? 'Zwrócona kwota' : 'Zwrot / rekompensata'} hint="Trafi do ewidencji jako korekta ujemna.">
                  <NumberInput value={draft.refundAmount} onValueChange={(v) => set('refundAmount', v)} suffix="zł" />
                </Field>
                <Field label="Data zwrotu">
                  <Input type="date" value={draft.refundDate || draft.date} onChange={(e) => set('refundDate', e.target.value)} />
                </Field>
              </FormGrid>
              <Field label="Opis" optional>
                <Input value={draft.statusNote} onChange={(e) => set('statusNote', e.target.value)} placeholder="np. mech zbrązowiał po 2 tygodniach w słońcu" />
              </Field>
              {draft.status === 'returned' && <p className="text-xs text-ink-500">Jeśli kula wróciła, zmień jej status w partii. Przy zwrocie statusy kul nie zmieniają się same.</p>}
            </div>
          )}
        </div>

        <Field label="Notatki" optional>
          <Textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}
