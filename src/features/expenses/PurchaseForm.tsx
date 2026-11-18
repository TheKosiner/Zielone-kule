import { useEffect, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Input, NumberInput, Select, Textarea } from '@/components/ui/Form'
import { LinkCard } from '@/components/LinkCard'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { db } from '@/db/db'
import { createEntity, deleteEntity, updateEntity } from '@/db/repo'
import type { Expense, ExpenseCategory, PlannedPurchase } from '@/db/types'
import { CATEGORY_META, EXPENSE_CATEGORIES, UNITS } from '@/domain/constants'
import { useSettings } from '@/hooks/useSettings'
import { todayISO } from '@/lib/dates'
import { formatPLN, round2 } from '@/lib/format'
import { normalizeUrl } from '@/lib/links'

type Mode = 'expense' | 'planned'

interface Draft {
  name: string
  category: ExpenseCategory
  url: string
  unitPrice: number | null
  quantity: number | null
  unit: string
  date: string
  note: string
  costItemKey: string
  ballsCovered: number | null
  priority: PlannedPurchase['priority']
  neededBy: string
  startup: boolean
}

const SUGGESTED_ITEM: Partial<Record<ExpenseCategory, string>> = { moss: 'moss', molds: 'mold', packaging: 'packaging' }

function emptyDraft(): Draft {
  return {
    name: '',
    category: 'materials',
    url: '',
    unitPrice: null,
    quantity: 1,
    unit: 'szt.',
    date: todayISO(),
    note: '',
    costItemKey: '',
    ballsCovered: null,
    priority: 'normal',
    neededBy: '',
    startup: false,
  }
}

function fromEntity(e: Expense | PlannedPurchase): Draft {
  return {
    ...emptyDraft(),
    name: e.name,
    category: e.category,
    url: e.url ?? '',
    unitPrice: e.unitPrice,
    quantity: e.quantity,
    unit: e.unit,
    date: 'date' in e ? e.date : todayISO(),
    note: e.note ?? '',
    costItemKey: e.costItemKey ?? '',
    ballsCovered: e.ballsCovered ?? null,
    priority: 'priority' in e ? e.priority : 'normal',
    neededBy: 'neededBy' in e ? (e.neededBy ?? '') : '',
    startup: !!e.startup,
  }
}

interface PurchaseFormProps {
  mode: Mode
  open: boolean
  onClose: () => void
  /** edytowany rekord; brak = nowy */
  entity?: Expense | PlannedPurchase | null
}

export function PurchaseForm({ mode, open, onClose, entity }: PurchaseFormProps) {
  const settings = useSettings()
  const toast = useToast()
  const confirm = useConfirm()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [totalText, setTotalText] = useState<number | null>(null)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    const d = entity ? fromEntity(entity) : emptyDraft()
    setDraft(d)
    setTotalText(d.unitPrice !== null && d.quantity ? round2(d.unitPrice * d.quantity) : null)
    setTried(false)
  }, [open, entity])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const costRelevant = CATEGORY_META[draft.category].costRelevant
  const costItems = settings.costItems.filter((c) => (draft.category === 'packaging' ? c.kind === 'packaging' : c.kind === 'material'))
  const selectedItem = settings.costItems.find((c) => c.key === draft.costItemKey)
  const urlValid = !draft.url.trim() || !!normalizeUrl(draft.url)
  const nameError = tried && !draft.name.trim() ? 'Wpisz nazwę.' : null
  const priceError = tried && (draft.unitPrice === null || draft.unitPrice < 0) ? 'Wpisz cenę.' : null
  const qtyError = tried && (!draft.quantity || draft.quantity <= 0) ? 'Ilość musi być większa od zera.' : null

  const setCategory = (category: ExpenseCategory) => {
    setDraft((d) => {
      const suggested = SUGGESTED_ITEM[category]
      const keepItem = settings.costItems.find((c) => c.key === d.costItemKey && (category === 'packaging' ? c.kind === 'packaging' : c.kind === 'material'))
      return { ...d, category, costItemKey: keepItem ? d.costItemKey : (suggested ?? (CATEGORY_META[category].costRelevant ? d.costItemKey : '')) }
    })
  }

  const setUnitPrice = (v: number | null) => {
    set('unitPrice', v)
    setTotalText(v !== null && draft.quantity ? round2(v * draft.quantity) : null)
  }
  const setQuantity = (v: number | null) => {
    set('quantity', v)
    setTotalText(draft.unitPrice !== null && v ? round2(draft.unitPrice * v) : null)
  }
  const setTotal = (v: number | null) => {
    setTotalText(v)
    if (v !== null && draft.quantity) set('unitPrice', round2(v / draft.quantity))
  }

  const buildPayload = () => {
    const url = draft.url.trim() ? (normalizeUrl(draft.url) ?? undefined) : undefined
    const common = {
      name: draft.name.trim(),
      category: draft.category,
      url,
      unitPrice: draft.unitPrice ?? 0,
      quantity: draft.quantity ?? 1,
      unit: draft.unit.trim() || 'szt.',
      note: draft.note.trim() || undefined,
      costItemKey: costRelevant && draft.costItemKey ? draft.costItemKey : null,
      ballsCovered: costRelevant && draft.costItemKey ? draft.ballsCovered : null,
      startup: draft.startup || undefined,
    }
    return common
  }

  const save = async () => {
    setTried(true)
    if (!draft.name.trim() || draft.unitPrice === null || draft.unitPrice < 0 || !draft.quantity || draft.quantity <= 0 || !urlValid) return
    const payload = buildPayload()
    if (mode === 'expense') {
      const data = { ...payload, date: draft.date || todayISO() }
      if (entity) await updateEntity<Expense>(db.expenses, entity.id, data)
      else await createEntity<Expense>(db.expenses, data)
    } else {
      const data = { ...payload, priority: draft.priority, neededBy: draft.neededBy || undefined }
      if (entity) await updateEntity<PlannedPurchase>(db.planned, entity.id, data)
      else await createEntity<PlannedPurchase>(db.planned, data)
    }
    toast.show(entity ? 'Zapisano zmiany' : mode === 'expense' ? 'Dodano wydatek' : 'Dodano do listy zakupów')
    onClose()
  }

  const remove = async () => {
    if (!entity) return
    const ok = await confirm({ title: 'Usunąć pozycję?', message: `„${entity.name}” zniknie z ${mode === 'expense' ? 'wydatków' : 'listy zakupów'}.`, confirmLabel: 'Usuń', tone: 'danger' })
    if (!ok) return
    if (mode === 'expense') await deleteEntity(db.expenses, entity.id)
    else await deleteEntity(db.planned, entity.id)
    toast.show('Usunięto')
    onClose()
  }

  const buyAgain = async () => {
    if (!entity || mode !== 'expense') return
    await createEntity<Expense>(db.expenses, { ...buildPayload(), date: todayISO() })
    toast.show('Dodano ten sam zakup z dzisiejszą datą')
    onClose()
  }

  const title = entity ? (mode === 'expense' ? 'Edytuj wydatek' : 'Edytuj zakup planowany') : mode === 'expense' ? 'Nowy wydatek' : 'Nowy zakup planowany'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      onSubmit={save}
      footer={
        <SheetFooter className="justify-between">
          <div className="flex gap-1">
            {entity && (
              <Button variant="danger-soft" onClick={remove} icon={<Trash2 className="h-4 w-4" />}>
                <span className="hidden sm:inline">Usuń</span>
              </Button>
            )}
            {entity && mode === 'expense' && (
              <Button variant="ghost" onClick={buyAgain} icon={<Copy className="h-4 w-4" />}>
                Kup ponownie
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} className="hidden sm:inline-flex">
              Anuluj
            </Button>
            <Button type="submit" variant="primary" className="min-w-28">
              Zapisz
            </Button>
          </div>
        </SheetFooter>
      }
    >
      <div className="space-y-4">
        <Field label="Nazwa" error={nameError}>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="np. Cement portlandzki 25 kg" autoComplete="off" />
        </Field>

        <FormGrid>
          <Field label="Kategoria">
            <Select value={draft.category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </Select>
          </Field>
          {mode === 'expense' ? (
            <Field label="Data zakupu">
              <Input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
          ) : (
            <Field label="Priorytet">
              <Select value={draft.priority} onChange={(e) => set('priority', e.target.value as Draft['priority'])}>
                <option value="high">Pilne</option>
                <option value="normal">Normalny</option>
                <option value="low">Kiedyś</option>
              </Select>
            </Field>
          )}
        </FormGrid>

        <Field
          label="Link do oferty"
          optional
          error={!urlValid ? 'To nie wygląda na adres strony.' : null}
          hint="Allegro albo inny sklep. Cenę wpisujesz ręcznie – aplikacja nie pobiera danych ze sklepów."
        >
          <Input type="url" inputMode="url" value={draft.url} onChange={(e) => set('url', e.target.value)} placeholder="https://allegro.pl/oferta/…" autoComplete="off" />
        </Field>
        {urlValid && draft.url.trim() && <LinkCard url={draft.url} />}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Ilość" error={qtyError}>
            <NumberInput value={draft.quantity} onValueChange={setQuantity} />
          </Field>
          <Field label="Jednostka">
            <Input value={draft.unit} onChange={(e) => set('unit', e.target.value)} list="units" />
            <datalist id="units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>
          <Field label={`Cena za ${draft.unit || 'szt.'}`} error={priceError}>
            <NumberInput value={draft.unitPrice} onValueChange={setUnitPrice} suffix="zł" />
          </Field>
          <Field label="Razem">
            <NumberInput value={totalText} onValueChange={setTotal} suffix="zł" />
          </Field>
        </div>

        {costRelevant && (
          <div className="rounded-2xl bg-moss-50 p-4 ring-1 ring-moss-200 ring-inset">
            <p className="mb-3 text-sm text-moss-900">
              <span className="font-semibold">Koszt kuli.</span> Przypisz zakup do pozycji z biznesplanu i wpisz, na ile kul starczy. Z tego liczy się rzeczywisty koszt jednej kuli.
            </p>
            <FormGrid>
              <Field label="Pozycja kosztowa">
                <Select value={draft.costItemKey} onChange={(e) => set('costItemKey', e.target.value)}>
                  <option value="">— nie wliczaj —</option>
                  {costItems.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={selectedItem?.kind === 'packaging' ? 'Starczy na (wysyłek)' : 'Starczy na (kul)'}
                hint={selectedItem ? `Podpowiedź: ${selectedItem.coverageHint}. W planie ${formatPLN(selectedItem.plannedPerBall)} na ${selectedItem.kind === 'packaging' ? 'wysyłkę' : 'kulę'}.` : undefined}
              >
                <NumberInput value={draft.ballsCovered} onValueChange={(v) => set('ballsCovered', v)} integer disabled={!draft.costItemKey} placeholder={draft.costItemKey ? 'np. 20' : ''} />
              </Field>
            </FormGrid>
            {selectedItem && draft.ballsCovered && totalText ? (
              <p className="mt-3 text-sm text-moss-900">
                Wychodzi <strong className="tabular">{formatPLN(totalText / draft.ballsCovered)}</strong> na {selectedItem.kind === 'packaging' ? 'wysyłkę' : 'kulę'} (plan: {formatPLN(selectedItem.plannedPerBall)}).
              </p>
            ) : null}
          </div>
        )}

        {mode === 'planned' && (
          <Field label="Potrzebne do" optional>
            <Input type="date" value={draft.neededBy} onChange={(e) => set('neededBy', e.target.value)} />
          </Field>
        )}

        <Field label="Notatka" optional>
          <Textarea value={draft.note} onChange={(e) => set('note', e.target.value)} rows={2} placeholder="np. kod rabatowy, sprzedawca, termin dostawy" />
        </Field>
      </div>
    </Sheet>
  )
}
