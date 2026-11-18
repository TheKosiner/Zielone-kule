import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Snowflake, Thermometer, TriangleAlert } from 'lucide-react'
import type { Batch, Recipe } from '@/db/types'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Input, NumberInput, Select, Textarea, Toggle } from '@/components/ui/Form'
import { Callout } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Feedback'
import { useSettings } from '@/hooks/useSettings'
import { createBatch, updateBatch, type BatchInput } from '@/domain/production'
import { settingWindow, stageWindows } from '@/domain/schedule'
import { recipeSummary } from '@/domain/recipe'
import { addDays, formatDate, formatDateShort, todayISO } from '@/lib/dates'
import { kul } from '@/lib/format'

interface BatchFormProps {
  open: boolean
  onClose: () => void
  batch?: Batch | null
}

export function BatchForm({ open, onClose, batch }: BatchFormProps) {
  const settings = useSettings()
  const toast = useToast()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<BatchInput>(() => blank())
  const [tried, setTried] = useState(false)

  function blank(): BatchInput {
    return { name: '', castDate: todayISO(), count: 4, variantId: settings.productVariants[0]?.id, recipe: structuredClone(settings.recipe), temperatureC: 18, castMethod: 'spacers', notes: '' }
  }

  useEffect(() => {
    if (!open) return
    setTried(false)
    setDraft(
      batch
        ? { name: batch.name ?? '', castDate: batch.castDate, count: batch.count, variantId: batch.variantId, recipe: structuredClone(batch.recipe), temperatureC: batch.temperatureC ?? null, castMethod: batch.castMethod, notes: batch.notes ?? '' }
        : blank(),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, batch])

  const set = <K extends keyof BatchInput>(k: K, v: BatchInput[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setComponent = (id: string, patch: Partial<Recipe['components'][number]>) =>
    setDraft((d) => ({ ...d, recipe: { ...d.recipe, components: d.recipe.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) } }))

  const preview = useMemo(() => {
    const w = stageWindows({ number: 0, castDate: draft.castDate, temperatureC: draft.temperatureC, stageActuals: batch?.stageActuals ?? {} }, settings)
    const get = (k: string) => w.find((x) => x.key === k)!
    return { set: settingWindow(draft.temperatureC, settings.schedule), demold: get('demolding').start, rinse: get('rinsing').start, inoc: get('inoculation').start, ready: get('selling').start }
  }, [draft.castDate, draft.temperatureC, settings, batch?.stageActuals])

  const save = async () => {
    setTried(true)
    if (!draft.count || draft.count < 1 || !draft.castDate) return
    const input = { ...draft, name: draft.name?.trim() || undefined, notes: draft.notes?.trim() || undefined }
    if (batch) {
      await updateBatch(batch, input, settings)
      toast.show('Zapisano partię')
      onClose()
    } else {
      const created = await createBatch(input, settings)
      toast.show(`Partia #${created.number}: ${kul(created.count)}, harmonogram gotowy`)
      onClose()
      navigate(`/partie/${created.id}`)
    }
  }

  const s = preview.set
  return (
    <Sheet
      open={open}
      onClose={onClose}
      onSubmit={save}
      size="lg"
      title={batch ? `Edytuj partię #${batch.number}` : 'Nowa partia'}
      subtitle={batch ? undefined : 'Po zapisaniu powstanie harmonogram zadań do kalendarza'}
      footer={
        <SheetFooter>
          <Button onClick={onClose} className="hidden sm:inline-flex">
            Anuluj
          </Button>
          <Button type="submit" variant="primary" className="min-w-36">
            {batch ? 'Zapisz' : 'Utwórz partię'}
          </Button>
        </SheetFooter>
      }
    >
      <div className="space-y-5">
        <FormGrid>
          <Field label="Data odlewu">
            <Input type="date" value={draft.castDate} onChange={(e) => set('castDate', e.target.value || todayISO())} />
          </Field>
          <Field label="Liczba kul" error={tried && (!draft.count || draft.count < 1) ? 'Co najmniej 1 kula.' : null} hint={batch ? 'Zmniejszenie usuwa kule z końca (oprócz sprzedanych).' : 'Przy partiach po ok. 10 szt. praca to ok. 1,3 h na kulę.'}>
            <NumberInput value={draft.count} onValueChange={(v) => set('count', v ?? 0)} integer suffix="szt." />
          </Field>
          <Field label="Nazwa" optional>
            <Input value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="np. Test bez włókna" />
          </Field>
          <Field label="Wariant">
            <Select value={draft.variantId ?? ''} onChange={(e) => set('variantId', e.target.value || undefined)}>
              {settings.productVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>

        <div>
          <FormGrid>
            <Field label="Temperatura podczas wiązania" hint="Niska temperatura wydłuża wiązanie w formie.">
              <NumberInput value={draft.temperatureC} onValueChange={(v) => set('temperatureC', v)} suffix="°C" placeholder="np. 18" />
            </Field>
            <Field label="Rdzeń styropianowy">
              <Select value={draft.castMethod ?? 'spacers'} onChange={(e) => set('castMethod', e.target.value as Batch['castMethod'])}>
                <option value="spacers">Zablokowany dystansami</option>
                <option value="two_stage">Odlew w dwóch etapach</option>
                <option value="other">Inaczej</option>
              </Select>
            </Field>
          </FormGrid>
          <div className="mt-3">
            {s.warning === 'freezing' ? (
              <Callout tone="clay" icon={<TriangleAlert className="h-4.5 w-4.5" />}>
                <strong>Nie odlewaj poniżej {settings.schedule.freezingThresholdC}°C.</strong> Cement słabo wiąże i kula może pękać. Jeśli już odlane: wyjęcie najwcześniej {formatDateShort(addDays(draft.castDate, s.minDays))}, planowo {formatDate(preview.demold)}.
              </Callout>
            ) : s.warning === 'cold' ? (
              <Callout tone="water" icon={<Snowflake className="h-4.5 w-4.5" />}>
                W chłodzie wiązanie trwa {s.minDays}–{s.maxDays} dni. Wyjęcie z formy: {formatDateShort(addDays(draft.castDate, s.minDays))}–{formatDate(preview.demold)}.
              </Callout>
            ) : (
              <Callout tone="moss" icon={<Thermometer className="h-4.5 w-4.5" />}>
                Wiązanie {settings.schedule.warmMinHours}–{settings.schedule.warmMaxHours} h. Wyjęcie z formy: {formatDateShort(addDays(draft.castDate, s.minDays))}–{formatDate(preview.demold)}.
              </Callout>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-150 ring-inset">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-800">Receptura</h3>
            <span className="text-sm text-ink-500">{recipeSummary(draft.recipe)}</span>
          </div>
          <div className="space-y-2">
            {draft.recipe.components.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <Toggle className="min-w-0 flex-1" checked={c.enabled} onChange={(v) => setComponent(c.id, { enabled: v })} label={<span className={c.enabled ? '' : 'text-ink-400 line-through'}>{c.name}</span>} />
                {c.parts !== null ? (
                  <div className="w-28 shrink-0">
                    <NumberInput value={c.parts} onValueChange={(v) => setComponent(c.id, { parts: v })} suffix="cz." disabled={!c.enabled} className="h-10" />
                  </div>
                ) : (
                  <span className="w-28 shrink-0 text-right text-sm text-ink-500">{c.note}</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-500">Woda: {draft.recipe.water}. Zmiany dotyczą tylko tej partii.</p>
        </div>

        <div className="rounded-2xl bg-moss-50 p-4 ring-1 ring-moss-200 ring-inset">
          <h3 className="mb-3 text-sm font-semibold text-moss-900">Harmonogram (podgląd)</h3>
          <ol className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            {[
              ['Wyjęcie z formy', preview.demold],
              ['Płukanie od', preview.rinse],
              ['Szczepienie mchu', preview.inoc],
              ['Gotowa do sprzedaży', preview.ready],
            ].map(([label, date]) => (
              <li key={label}>
                <div className="text-xs text-moss-800/80">{label}</div>
                <div className="font-semibold text-moss-950 tabular">{formatDate(date)}</div>
              </li>
            ))}
          </ol>
        </div>

        <Field label="Notatki" optional>
          <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="np. forma nr 2 posmarowana wazeliną, masa trochę za rzadka" />
        </Field>
      </div>
    </Sheet>
  )
}

