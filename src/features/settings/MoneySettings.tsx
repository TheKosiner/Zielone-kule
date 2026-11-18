import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Field, Input, NumberInput, Select, Toggle } from '@/components/ui/Form'
import { Badge } from '@/components/ui/Misc'
import { createDefaultSettings, DEFAULT_CHANNELS, DEFAULT_COST_ITEMS } from '@/db/defaults'
import type { ChannelSetting, CostItem, PriceVariant, YearSettings } from '@/db/types'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { useDraft } from '@/hooks/useDraft'
import { newId } from '@/lib/id'
import { formatPLN, round2 } from '@/lib/format'
import { quarterlyLimit } from '@/domain/limits'
import { SettingsSection } from './SettingsSection'

export function CostSettings() {
  const s = useSettings()
  const { draft, setDraft, dirty, reset } = useDraft<{ costItems: CostItem[]; lossReservePct: number }>({ costItems: s.costItems, lossReservePct: s.lossReservePct })
  const setItem = (key: string, patch: Partial<CostItem>) => setDraft({ ...draft, costItems: draft.costItems.map((c) => (c.key === key ? { ...c, ...patch } : c)) })
  const materials = round2(draft.costItems.filter((c) => c.kind === 'material').reduce((a, c) => a + (c.plannedPerBall || 0), 0))

  return (
    <SettingsSection
      id="koszty"
      title="Koszty materiałów (plan)"
      description={
        <>
          Założenia z biznesplanu na jedną kulę. Razem materiały: <strong className="text-ink-700">{formatPLN(materials)}</strong>. Rzeczywiste koszty liczą się z wydatków.
        </>
      }
      dirty={dirty}
      onCancel={reset}
      onSave={() => saveSettings(draft)}
      onRestoreDefaults={() => setDraft({ costItems: structuredClone(DEFAULT_COST_ITEMS), lossReservePct: 10 })}
    >
      <div className="space-y-2">
        {draft.costItems.map((c) => (
          <div key={c.key} className="grid grid-cols-[1fr_8rem] gap-2 rounded-xl bg-ink-50 p-2.5 sm:grid-cols-[1.4fr_8rem_1.2fr] sm:items-center sm:bg-transparent sm:p-0">
            <div className="min-w-0">
              <Input value={c.name} onChange={(e) => setItem(c.key, { name: e.target.value })} aria-label="Pozycja" />
            </div>
            <NumberInput value={c.plannedPerBall} onValueChange={(v) => setItem(c.key, { plannedPerBall: v ?? 0 })} suffix="zł" aria-label="Koszt na kulę" />
            <Input className="col-span-2 sm:col-span-1" value={c.coverageHint} onChange={(e) => setItem(c.key, { coverageHint: e.target.value })} aria-label="Podpowiedź" placeholder="np. worek 20 l ≈ 20 kul" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:max-w-md">
        <Field label="Zapas na straty" hint="pęknięte kule, odpady">
          <NumberInput value={draft.lossReservePct} onValueChange={(v) => setDraft({ ...draft, lossReservePct: v ?? 0 })} suffix="%" />
        </Field>
      </div>
    </SettingsSection>
  )
}

export function ChannelSettings() {
  const s = useSettings()
  const { draft, setDraft, dirty, reset } = useDraft<{ channels: ChannelSetting[]; priceVariants: PriceVariant[]; recommendedPrice: number; minAllegroPrice: number }>({
    channels: s.channels,
    priceVariants: s.priceVariants,
    recommendedPrice: s.recommendedPrice,
    minAllegroPrice: s.minAllegroPrice,
  })
  const setCh = (key: string, patch: Partial<ChannelSetting>) => setDraft({ ...draft, channels: draft.channels.map((c) => (c.key === key ? { ...c, ...patch } : c)) })
  const setVar = (id: string, patch: Partial<PriceVariant>) => setDraft({ ...draft, priceVariants: draft.priceVariants.map((v) => (v.id === id ? { ...v, ...patch } : v)) })

  return (
    <SettingsSection
      id="kanaly"
      title="Ceny i kanały sprzedaży"
      description="Prowizja, cena i koszt opakowania podstawiają się same przy nowej sprzedaży. Allegro: kategoria „Dom i ogród” ma 4,5–11% netto, do tego VAT od opłat, stąd ok. 12%."
      dirty={dirty}
      onCancel={reset}
      onSave={() => saveSettings(draft)}
      onRestoreDefaults={() => {
        const d = createDefaultSettings()
        setDraft({ channels: structuredClone(DEFAULT_CHANNELS), priceVariants: d.priceVariants, recommendedPrice: d.recommendedPrice, minAllegroPrice: d.minAllegroPrice })
      }}
    >
      <div className="space-y-3">
        {draft.channels.map((c) => (
          <div key={c.key} className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-150 ring-inset">
            <div className="mb-3 flex items-center gap-3">
              <Input value={c.name} onChange={(e) => setCh(c.key, { name: e.target.value })} className="h-10 font-medium" aria-label="Nazwa kanału" />
              <Toggle checked={c.enabled} onChange={(v) => setCh(c.key, { enabled: v })} label={<span className="text-sm">Aktywny</span>} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Prowizja">
                <NumberInput value={c.commissionPct} onValueChange={(v) => setCh(c.key, { commissionPct: v ?? 0 })} suffix="%" />
              </Field>
              <Field label="Opłata stała">
                <NumberInput value={c.fixedFee} onValueChange={(v) => setCh(c.key, { fixedFee: v ?? 0 })} suffix="zł" />
              </Field>
              <Field label="Cena domyślna">
                <NumberInput value={c.defaultPrice} onValueChange={(v) => setCh(c.key, { defaultPrice: v ?? 0 })} suffix="zł" />
              </Field>
              <Field label="Opakowanie">
                <NumberInput value={c.packagingCost} onValueChange={(v) => setCh(c.key, { packagingCost: v ?? 0 })} suffix="zł" />
              </Field>
            </div>
            <Toggle className="mt-2" checked={c.shipped} onChange={(v) => setCh(c.key, { shipped: v })} label={<span className="text-sm">Zwykle z wysyłką</span>} />
          </div>
        ))}
      </div>

      <h3 className="mt-7 mb-3 text-sm font-semibold text-ink-800">Warianty cenowe z biznesplanu</h3>
      <div className="space-y-2">
        {draft.priceVariants.map((v) => (
          <div key={v.id} className="grid grid-cols-[1fr_7rem_auto] gap-2 sm:grid-cols-[1.6fr_10rem_7rem_auto] sm:items-center">
            <Input className="col-span-3 sm:col-span-1" value={v.name} onChange={(e) => setVar(v.id, { name: e.target.value })} aria-label="Nazwa wariantu" />
            <Select value={v.channel} onChange={(e) => setVar(v.id, { channel: e.target.value as PriceVariant['channel'] })} aria-label="Kanał">
              {draft.channels.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </Select>
            <NumberInput value={v.price} onValueChange={(p) => setVar(v.id, { price: p ?? 0 })} suffix="zł" aria-label="Cena" />
            <IconButton label="Usuń wariant" onClick={() => setDraft({ ...draft, priceVariants: draft.priceVariants.filter((x) => x.id !== v.id) })}>
              <Trash2 className="h-4.5 w-4.5" />
            </IconButton>
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, priceVariants: [...draft.priceVariants, { id: newId(), name: 'Nowy wariant', price: 99, channel: 'allegro' }] })}>
          Dodaj wariant
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <Field label="Cena rekomendowana">
          <NumberInput value={draft.recommendedPrice} onValueChange={(v) => setDraft({ ...draft, recommendedPrice: v ?? 0 })} suffix="zł" />
        </Field>
        <Field label="Minimum na Allegro" hint="poniżej zarabiasz mniej niż płaca minimalna">
          <NumberInput value={draft.minAllegroPrice} onValueChange={(v) => setDraft({ ...draft, minAllegroPrice: v ?? 0 })} suffix="zł" />
        </Field>
      </div>
    </SettingsSection>
  )
}

export function LimitSettings() {
  const s = useSettings()
  const { draft, setDraft, dirty, reset } = useDraft<{ years: YearSettings[]; limitPctOfMinWage: number; includeShippingInRevenue: boolean; hourlyRates: number[]; targetHourlyRate: number; startupBudget: number; startupBalls: number }>({
    years: s.years,
    limitPctOfMinWage: s.limitPctOfMinWage,
    includeShippingInRevenue: s.includeShippingInRevenue,
    hourlyRates: s.hourlyRates,
    targetHourlyRate: s.targetHourlyRate,
    startupBudget: s.startupBudget,
    startupBalls: s.startupBalls,
  })
  const setYear = (year: number, patch: Partial<YearSettings>) => setDraft({ ...draft, years: draft.years.map((y) => (y.year === year ? { ...y, ...patch } : y)) })
  const sorted = [...draft.years].sort((a, b) => a.year - b.year)
  const nextYear = (sorted.at(-1)?.year ?? new Date().getFullYear()) + 1

  return (
    <SettingsSection
      id="limity"
      title="Limity, stawki i inwestycja"
      description="Działalność nierejestrowana: limit przychodu na kwartał to 225% płacy minimalnej. Na każdy rok wpisz aktualną płacę minimalną."
      dirty={dirty}
      onCancel={reset}
      onSave={() => saveSettings(draft)}
    >
      <div className="space-y-2">
        <div className="hidden grid-cols-[5rem_1fr_1fr_1fr_auto] gap-2 px-1 text-xs font-medium text-ink-500 sm:grid">
          <span>Rok</span>
          <span>Płaca minimalna</span>
          <span>Minimalna stawka godz.</span>
          <span>Limit kwartalny</span>
          <span />
        </div>
        {sorted.map((y) => (
          <div key={y.year} className="grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-2.5 sm:grid-cols-[5rem_1fr_1fr_1fr_auto] sm:items-center sm:bg-transparent sm:p-0">
            <div className="flex h-11 items-center text-[15px] font-semibold text-ink-800 tabular">{y.year}</div>
            <div className="flex justify-end sm:hidden">
              <IconButton label="Usuń rok" onClick={() => setDraft({ ...draft, years: draft.years.filter((x) => x.year !== y.year) })} disabled={draft.years.length < 2}>
                <X className="h-4.5 w-4.5" />
              </IconButton>
            </div>
            <NumberInput value={y.minWage} onValueChange={(v) => setYear(y.year, { minWage: v ?? 0 })} suffix="zł" aria-label="Płaca minimalna" />
            <NumberInput value={y.minHourly} onValueChange={(v) => setYear(y.year, { minHourly: v ?? 0 })} suffix="zł/h" aria-label="Minimalna stawka godzinowa" />
            <div className="col-span-2 flex h-11 items-center px-1 text-[15px] font-medium text-moss-800 tabular sm:col-span-1">{formatPLN(quarterlyLimit(y.minWage, draft.limitPctOfMinWage))}</div>
            <div className="hidden sm:block">
              <IconButton label="Usuń rok" onClick={() => setDraft({ ...draft, years: draft.years.filter((x) => x.year !== y.year) })} disabled={draft.years.length < 2}>
                <X className="h-4.5 w-4.5" />
              </IconButton>
            </div>
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            const last = sorted.at(-1)
            setDraft({ ...draft, years: [...draft.years, { year: nextYear, minWage: last?.minWage ?? 0, minHourly: last?.minHourly ?? 0 }] })
          }}
        >
          Dodaj rok {nextYear}
        </Button>
        {!draft.years.some((y) => y.year === 2027) && (
          <p className="text-xs text-cream-800">
            <Badge className="mr-1.5 bg-cream-100 text-cream-800 ring-cream-200">ważne</Badge>
            Sprzedaż ruszy w 2027 r. Dodaj rok 2027 z nową płacą minimalną, gdy będzie znana. Do tego czasu aplikacja używa wartości z 2026.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Limit (% płacy min.)">
          <NumberInput value={draft.limitPctOfMinWage} onValueChange={(v) => setDraft({ ...draft, limitPctOfMinWage: v ?? 225 })} suffix="%" />
        </Field>
        <Field label="Docelowa stawka" hint="do kalkulatora ceny">
          <NumberInput value={draft.targetHourlyRate} onValueChange={(v) => setDraft({ ...draft, targetHourlyRate: v ?? 0 })} suffix="zł/h" />
        </Field>
        <Field label="Stawki do porównań" hint="oddziel średnikiem">
          <RatesInput value={draft.hourlyRates} onChange={(hourlyRates) => setDraft({ ...draft, hourlyRates })} />
        </Field>
        <Field label="Inwestycja startowa">
          <NumberInput value={draft.startupBudget} onValueChange={(v) => setDraft({ ...draft, startupBudget: v ?? 0 })} suffix="zł" />
        </Field>
        <Field label="Starczy na">
          <NumberInput value={draft.startupBalls} onValueChange={(v) => setDraft({ ...draft, startupBalls: v ?? 0 })} integer suffix="kul" />
        </Field>
      </div>
      <Toggle
        className="mt-4"
        checked={draft.includeShippingInRevenue}
        onChange={(v) => setDraft({ ...draft, includeShippingInRevenue: v })}
        label="Wliczaj opłatę za wysyłkę od klienta do przychodu w ewidencji"
        description="Pieniądze otrzymane od klienta za wysyłkę to też przychód. Jeśli nie masz pewności, zapytaj księgowego."
      />
    </SettingsSection>
  )
}

function RatesInput({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [text, setText] = useState(() => value.map((v) => String(v).replace('.', ',')).join('; '))
  return (
    <Input
      value={text}
      inputMode="decimal"
      onChange={(e) => {
        setText(e.target.value)
        const nums = e.target.value
          .split(';')
          .map((x) => Number(x.trim().replace(',', '.')))
          .filter((n) => Number.isFinite(n) && n > 0)
        onChange(nums)
      }}
    />
  )
}

export function JournalTagSettings() {
  const s = useSettings()
  const { draft, setDraft, dirty, reset } = useDraft<string[]>(s.journalTags)
  const [newTag, setNewTag] = useState('')
  const add = () => {
    const t = newTag.trim().toLowerCase()
    if (t && !draft.includes(t)) setDraft([...draft, t])
    setNewTag('')
  }
  return (
    <SettingsSection id="tagi" title="Tagi w dzienniku" description="Podpowiedzi przy dodawaniu wpisu. Możesz też wpisać dowolny nowy tag." dirty={dirty} onCancel={reset} onSave={() => saveSettings({ journalTags: draft })}>
      <div className="flex flex-wrap gap-2">
        {draft.map((t) => (
          <span key={t} className="inline-flex h-9 items-center gap-1 rounded-full bg-moss-100 pr-1 pl-3.5 text-sm font-medium text-moss-900">
            #{t}
            <button className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-moss-200" aria-label={`Usuń tag ${t}`} onClick={() => setDraft(draft.filter((x) => x !== t))}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-2 sm:max-w-sm">
        <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="nowy tag" />
        <Button onClick={add} icon={<Plus className="h-4 w-4" />}>
          Dodaj
        </Button>
      </div>
    </SettingsSection>
  )
}
