import { Plus, Trash2 } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Field, FormGrid, Input, NumberInput, Textarea, Toggle } from '@/components/ui/Form'
import { createDefaultSettings, DEFAULT_RECIPE, DEFAULT_STAGES } from '@/db/defaults'
import type { Recipe, ScheduleSettings, StageSetting } from '@/db/types'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { useDraft } from '@/hooks/useDraft'
import { newId } from '@/lib/id'
import { formatMinutes, formatNumber } from '@/lib/format'
import { SettingsSection } from './SettingsSection'
import { recipeSummary } from '@/domain/recipe'

export function GeneralSettings() {
  const s = useSettings()
  const { draft, setDraft, dirty, reset } = useDraft({ brandName: s.brandName, ownerName: s.ownerName, ownerAddress: s.ownerAddress })
  return (
    <SettingsSection id="ogolne" title="Ogólne" description="Nazwa marki pojawia się na karcie pielęgnacji. Dane osobowe trafiają tylko do wydruku ewidencji." dirty={dirty} onCancel={reset} onSave={() => saveSettings(draft)}>
      <div className="space-y-4">
        <Field label="Nazwa marki">
          <Input value={draft.brandName} onChange={(e) => setDraft({ ...draft, brandName: e.target.value })} />
        </Field>
        <FormGrid>
          <Field label="Imię i nazwisko" optional hint="Do nagłówka ewidencji sprzedaży.">
            <Input value={draft.ownerName} onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })} autoComplete="name" />
          </Field>
          <Field label="Adres" optional>
            <Input value={draft.ownerAddress} onChange={(e) => setDraft({ ...draft, ownerAddress: e.target.value })} autoComplete="street-address" />
          </Field>
        </FormGrid>
      </div>
    </SettingsSection>
  )
}

export function RecipeSettings() {
  const s = useSettings()
  const { draft, setDraft, dirty, reset } = useDraft<Recipe>(s.recipe)
  const update = (id: string, patch: Partial<Recipe['components'][number]>) =>
    setDraft({ ...draft, components: draft.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  return (
    <SettingsSection
      id="receptura"
      title="Receptura domyślna"
      description={<>Proporcje objętościowe. Każda nowa partia dostaje kopię tej receptury, którą możesz zmienić (np. „bez włókna”). Teraz: <strong className="text-ink-700">{recipeSummary(draft)}</strong></>}
      dirty={dirty}
      onCancel={reset}
      onSave={() => saveSettings({ recipe: draft })}
      onRestoreDefaults={() => setDraft(structuredClone(DEFAULT_RECIPE))}
    >
      <div className="space-y-4">
        <Field label="Nazwa receptury">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_7rem_8rem_auto_auto] gap-2 px-1 text-xs font-medium text-ink-500 sm:grid">
            <span>Składnik</span>
            <span>Części</span>
            <span>Opis ilości</span>
            <span>W użyciu</span>
            <span />
          </div>
          {draft.components.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-ink-50 p-2.5 sm:grid-cols-[1fr_7rem_8rem_auto_auto] sm:items-center sm:bg-transparent sm:p-0">
              <Input value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} aria-label="Składnik" className="col-span-1" />
              <IconButton label="Usuń składnik" className="sm:order-last" onClick={() => setDraft({ ...draft, components: draft.components.filter((x) => x.id !== c.id) })}>
                <Trash2 className="h-4.5 w-4.5" />
              </IconButton>
              <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:contents">
                <NumberInput value={c.parts} onValueChange={(v) => update(c.id, { parts: v })} suffix="cz." aria-label="Części" placeholder="—" />
                <Input value={c.note ?? ''} onChange={(e) => update(c.id, { note: e.target.value })} placeholder="np. garść" aria-label="Opis ilości" />
              </div>
              <Toggle className="col-span-2 sm:col-span-1" checked={c.enabled} onChange={(v) => update(c.id, { enabled: v })} label={<span className="sm:sr-only">Składnik w użyciu</span>} />
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, components: [...draft.components, { id: newId(), name: '', parts: null, enabled: true }] })}>
            Dodaj składnik
          </Button>
        </div>
        <Field label="Woda">
          <Input value={draft.water} onChange={(e) => setDraft({ ...draft, water: e.target.value })} />
        </Field>
        <Field label="Uwagi do receptury" optional>
          <Textarea value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </Field>
      </div>
    </SettingsSection>
  )
}

export function StagesSettings() {
  const s = useSettings()
  const { draft, setDraft, dirty, reset } = useDraft<{ stages: StageSetting[]; schedule: ScheduleSettings }>({ stages: s.stages, schedule: s.schedule })
  const setStage = (key: string, patch: Partial<StageSetting>) => setDraft({ ...draft, stages: draft.stages.map((x) => (x.key === key ? { ...x, ...patch } : x)) })
  const setSch = (patch: Partial<ScheduleSettings>) => setDraft({ ...draft, schedule: { ...draft.schedule, ...patch } })
  const totalMinutes = draft.stages.reduce((a, x) => a + (x.activeMinutesPerBall || 0), 0)
  const plannedDays = draft.stages.reduce((a, x) => a + (x.plannedDays || 0), 0)
  const sch = draft.schedule

  return (
    <SettingsSection
      id="etapy"
      title="Etapy produkcji i harmonogram"
      description={
        <>
          Z tych czasów powstaje automatyczny harmonogram każdej partii. Razem: ok. <strong className="text-ink-700">{plannedDays} dni</strong> od odlewu do sprzedaży i{' '}
          <strong className="text-ink-700">{formatMinutes(totalMinutes)}</strong> aktywnej pracy na kulę ({formatNumber(totalMinutes / 60, 2, true)} h).
        </>
      }
      dirty={dirty}
      onCancel={reset}
      onSave={() => saveSettings(draft)}
      onRestoreDefaults={() => setDraft({ stages: structuredClone(DEFAULT_STAGES), schedule: createDefaultSettings().schedule })}
    >
      <div className="space-y-2">
        <div className="hidden grid-cols-[1.6fr_6rem_6rem_7rem] gap-2 px-1 text-xs font-medium text-ink-500 md:grid">
          <span>Etap</span>
          <span>Min. dni</span>
          <span>Plan dni</span>
          <span>Praca / kulę</span>
        </div>
        {draft.stages.map((st, i) => (
          <div key={st.key} className="grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-2.5 md:grid-cols-[1.6fr_6rem_6rem_7rem] md:items-center md:bg-transparent md:p-0">
            <div className="col-span-3 flex items-center gap-2 md:col-span-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss-100 text-xs font-semibold text-moss-800">{i + 1}</span>
              <Input value={st.name} onChange={(e) => setStage(st.key, { name: e.target.value })} aria-label="Nazwa etapu" />
            </div>
            <Field label={<span className="md:sr-only">Min. dni</span>}>
              <NumberInput value={st.minDays} onValueChange={(v) => setStage(st.key, { minDays: v ?? 0 })} integer disabled={st.key === 'setting'} />
            </Field>
            <Field label={<span className="md:sr-only">Plan dni</span>}>
              <NumberInput value={st.plannedDays} onValueChange={(v) => setStage(st.key, { plannedDays: v ?? 0 })} integer disabled={st.key === 'setting'} />
            </Field>
            <Field label={<span className="md:sr-only">Praca</span>}>
              <NumberInput value={st.activeMinutesPerBall} onValueChange={(v) => setStage(st.key, { activeMinutesPerBall: v ?? 0 })} integer suffix="min" />
            </Field>
          </div>
        ))}
        <p className="px-1 pt-1 text-xs text-ink-500">Czas wiązania w formie zależy od temperatury i ustawia się niżej. „Plan dni” to termin w harmonogramie, „min. dni” to najwcześniejszy sensowny termin.</p>
      </div>

      <h3 className="mt-7 mb-3 text-sm font-semibold text-ink-800">Wiązanie w formie a temperatura</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Ciepło od" hint="temperatura pokojowa">
          <NumberInput value={sch.warmThresholdC} onValueChange={(v) => setSch({ warmThresholdC: v ?? 12 })} suffix="°C" />
        </Field>
        <Field label="W cieple: od">
          <NumberInput value={sch.warmMinHours} onValueChange={(v) => setSch({ warmMinHours: v ?? 24 })} integer suffix="h" />
        </Field>
        <Field label="W cieple: do">
          <NumberInput value={sch.warmMaxHours} onValueChange={(v) => setSch({ warmMaxHours: v ?? 48 })} integer suffix="h" />
        </Field>
        <Field label="Za zimno poniżej" hint="ostrzeżenie: nie odlewaj">
          <NumberInput value={sch.freezingThresholdC} onValueChange={(v) => setSch({ freezingThresholdC: v ?? 5 })} suffix="°C" />
        </Field>
        <Field label="W chłodzie: od">
          <NumberInput value={sch.coldMinDays} onValueChange={(v) => setSch({ coldMinDays: v ?? 3 })} integer suffix="dni" />
        </Field>
        <Field label="W chłodzie: do">
          <NumberInput value={sch.coldMaxDays} onValueChange={(v) => setSch({ coldMaxDays: v ?? 4 })} integer suffix="dni" />
        </Field>
        <Field label="Poniżej progu: dodatkowo" hint="doliczane do czasu w chłodzie">
          <NumberInput value={sch.freezingExtraDays} onValueChange={(v) => setSch({ freezingExtraDays: v ?? 0 })} integer suffix="dni" />
        </Field>
      </div>

      <h3 className="mt-7 mb-3 text-sm font-semibold text-ink-800">Zadania powtarzalne</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Zraszanie przy dojrzewaniu co">
          <NumberInput value={sch.curingMistEveryDays} onValueChange={(v) => setSch({ curingMistEveryDays: v ?? 0 })} integer suffix="dni" />
        </Field>
        <Field label="Wymiana wody przy płukaniu co">
          <NumberInput value={sch.rinseWaterEveryDays} onValueChange={(v) => setSch({ rinseWaterEveryDays: v ?? 0 })} integer suffix="dni" />
        </Field>
        <Field label="Test pH co" hint="od minimalnego czasu płukania">
          <NumberInput value={sch.phTestEveryDays} onValueChange={(v) => setSch({ phTestEveryDays: v ?? 0 })} integer suffix="dni" />
        </Field>
        <Field label="Szczepienie przy pH poniżej">
          <NumberInput value={sch.phTarget} onValueChange={(v) => setSch({ phTarget: v ?? 8 })} />
        </Field>
        <Field label="Ocena mchu po">
          <NumberInput value={sch.mossCheckAfterDays} onValueChange={(v) => setSch({ mossCheckAfterDays: v ?? 14 })} integer suffix="dni" />
        </Field>
        <Field label="Zraszanie mchu co">
          <NumberInput value={sch.mossMistEveryDays} onValueChange={(v) => setSch({ mossMistEveryDays: v ?? 0 })} integer suffix="dni" />
        </Field>
      </div>
      <p className="mt-3 text-xs text-ink-500">Wpisz 0, żeby wyłączyć dane zadanie powtarzalne. Zmiany dotyczą nowych partii i przeliczonych harmonogramów.</p>
    </SettingsSection>
  )
}
