import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Printer } from 'lucide-react'
import { db } from '@/db/db'
import { useSettings } from '@/hooks/useSettings'
import { useBusiness } from '@/hooks/useBusiness'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Misc'
import { CostComparison } from '@/features/expenses/CostComparison'
import { breakEvenBalls, priceResult } from '@/domain/pricing'
import { limitForYear, yearSettingsFor } from '@/domain/limits'
import { lineTotal, sumExpenses } from '@/domain/costs'
import { STAGE_ORDER } from '@/domain/constants'
import { diffDays, formatDate, formatDateShort, todayISO } from '@/lib/dates'
import { formatHours, formatMinutes, formatNumber, formatPLN, kul } from '@/lib/format'
import { cn } from '@/lib/cn'
import { CHANNEL_NOTES, FORMALITIES, MARKET_PRICES, RISKS, SOURCES } from './content'
import { PriceCalculator } from './PriceCalculator'

const STAGE_TIME: Partial<Record<string, string>> = {
  casting: '1–2 dni w formie',
  curing: '3–4 tygodnie',
  rinsing: '1–2 tygodnie',
  establishing: '6–8 tygodni',
}

export default function BusinessPlanPage() {
  const settings = useSettings()
  const business = useBusiness()
  const planned = useLiveQuery(() => db.planned.toArray(), [])
  if (!business || !planned) return null

  const today = todayISO()
  const planMinutes = settings.stages.reduce((a, s) => a + s.activeMinutesPerBall, 0)
  // jak w biznesplanie: 80 min ≈ 1,3 h
  const planHours = Math.round((planMinutes / 60) * 10) / 10
  const measuredHours = business.labor.measuredMinutesPerBall !== null ? business.labor.measuredMinutesPerBall / 60 : null
  const allegro = settings.channels.find((c) => c.key === 'allegro')
  const loss = settings.lossReservePct / 100
  const planMaterialsWithLoss = business.plannedMaterialPerBall
  const rec = priceResult({ price: settings.recommendedPrice, commissionPct: allegro?.commissionPct ?? 12, hours: planHours, materials: planMaterialsWithLoss, packaging: allegro?.packagingCost ?? 6, hourlyRate: settings.targetHourlyRate })
  const breakEven = breakEvenBalls(settings.startupBudget, settings.recommendedPrice, allegro?.commissionPct ?? 12, allegro?.packagingCost ?? 6)
  const year = Number(today.slice(0, 4))
  const limit = limitForYear(settings, year)
  const minHourly = yearSettingsFor(settings, year).data.minHourly
  const startupSpent = sumExpenses(business.input.expenses.filter((e) => e.startup))
  const startupPlanned = planned.filter((p) => p.startup).sort((a, b) => lineTotal(b) - lineTotal(a))

  // minuty na kulę per etap z pomiarów
  const stageMeasured = new Map<string, number>()
  {
    const byStage = new Map<string, { minutes: number; batches: Set<string> }>()
    for (const s of business.input.sessions) {
      if (!s.batchId || !s.stage || s.stage === 'other') continue
      const e = byStage.get(s.stage) ?? { minutes: 0, batches: new Set<string>() }
      e.minutes += s.minutes
      e.batches.add(s.batchId)
      byStage.set(s.stage, e)
    }
    for (const [stage, e] of byStage) {
      const balls = [...e.batches].reduce((a, id) => a + (business.input.batches.find((b) => b.id === id)?.count ?? 0), 0)
      if (balls) stageMeasured.set(stage, e.minutes / balls)
    }
  }

  const variants = settings.priceVariants.map((v) => {
    const ch = settings.channels.find((c) => c.key === v.channel)
    const r = priceResult({ price: v.price, commissionPct: ch?.commissionPct ?? 0, hours: planHours, materials: planMaterialsWithLoss, packaging: ch?.shipped ? ch.packagingCost : 0, hourlyRate: settings.targetHourlyRate })
    return { ...v, ...r }
  })

  return (
    <div className="space-y-10 print:space-y-6">
      {/* Okładka */}
      <section className="relative -mx-4 overflow-hidden bg-moss-900 px-6 py-10 text-white sm:mx-0 sm:rounded-3xl sm:px-10 sm:py-12 print:rounded-none">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-ink-400/60 sm:h-80 sm:w-80" />
        <div className="pointer-events-none absolute top-10 right-24 h-12 w-12 rounded-full bg-moss-500/80 sm:right-32" />
        <div className="pointer-events-none absolute top-36 right-6 h-16 w-16 rounded-full bg-moss-600/80 sm:right-12" />
        <div className="pointer-events-none absolute top-48 right-36 h-6 w-6 rounded-full bg-moss-500/80" />
        <div className="relative max-w-2xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-moss-300 uppercase">Biznesplan · projekt rękodzielniczy</div>
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Kule z hipertufy z żywym mchem</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-moss-100 sm:text-base">Kula Ø 18 cm z rdzeniem styropianowym 12 cm, wgłębienia zaszczepione mchem. Odlewana w formie z druku 3D.</p>
          <p className="mt-6 text-xs text-moss-300">Plan z 17 listopada 2026 · ceny detaliczne z VAT · liczby to szacunki · rzeczywiste dane na żywo z aplikacji</p>
          <Button variant="secondary" className="no-print mt-6" icon={<Printer className="h-4.5 w-4.5" />} onClick={() => window.print()}>
            Drukuj / zapisz PDF
          </Button>
        </div>
      </section>

      <div className="rounded-2xl border-l-4 border-moss-600 bg-moss-100/70 px-5 py-4 text-[15px] leading-relaxed text-ink-800">
        <strong className="text-moss-900">Werdykt: tak, to się opłaca jako dorabianie.</strong> Przy cenie ok. {formatPLN(settings.recommendedPrice, { decimals: 0 })} zarabiasz ok. {formatPLN(rec.perHour, { decimals: 0 })} za godzinę pracy, a start kosztuje ok. {formatPLN(settings.startupBudget, { decimals: 0 })}. Głównym ograniczeniem jest czas: 3–4 miesiące od odlewu do sprzedaży.
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi value={`~${formatNumber(business.cost.plannedMaterials, 0)} zł`} label="materiały na jedną kulę" actual={`rzeczywiście ${formatPLN(business.cost.actualMaterials)}`} worse={business.cost.actualMaterials > business.cost.plannedMaterials + 0.005} />
        <Kpi value={formatHours(planHours)} label="pracy na kulę przy partiach po ok. 10 szt." actual={measuredHours !== null ? `z pomiarów ${formatHours(measuredHours)}` : 'brak pomiarów'} worse={measuredHours !== null && measuredHours > planHours} />
        <Kpi value={formatPLN(settings.recommendedPrice, { decimals: 0 })} label="rekomendowana cena na Allegro" actual={business.avgPrice !== null ? `średnio ${formatPLN(business.avgPrice, { decimals: 0 })}` : 'brak sprzedaży'} worse={business.avgPrice !== null && business.avgPrice < settings.recommendedPrice} />
        <Kpi value={`~${formatNumber(rec.perHour, 0)} zł/h`} label={`zarobek za godzinę przy ${formatPLN(settings.recommendedPrice, { decimals: 0 })}`} actual={business.perHour !== null ? `rzeczywiście ${formatPLN(business.perHour, { decimals: 0 })}/h` : 'brak sprzedaży'} worse={business.perHour !== null && business.perHour < rec.perHour} />
        <Kpi value={kul(breakEven)} label={`tyle trzeba sprzedać, żeby zwróciło się ok. ${formatPLN(settings.startupBudget, { decimals: 0 })}`} actual={`sprzedane: ${business.soldQuantity} z ${breakEven}`} worse={false} />
      </div>

      <Section n={1} title="Produkt i harmonogram" lead="Jedna kula przechodzi od odlewu do sprzedaży w ok. 3–4 miesiące, ale aktywnej pracy wymaga tylko przez ok. 1,3 h.">
        <p className="mb-4 text-[15px] text-ink-700">Kula z hipertufy (cement, perlit, torf, włókno PP) o średnicy 18 cm i ściance ok. 3 cm waży po wyschnięciu ok. 2–2,8 kg. Przeznaczenie: dekoracja ogrodowa do cienia.</p>
        <PlanTable
          head={['Etap', 'Czas kalendarzowy', 'Praca na kulę', 'Z pomiarów']}
          align={['left', 'left', 'right', 'right']}
          rows={STAGE_ORDER.filter((k) => k !== 'setting').map((k) => {
            const s = settings.stages.find((x) => x.key === k)!
            const m = stageMeasured.get(k) ?? (k === 'casting' ? stageMeasured.get('setting') : undefined)
            return [s.name, STAGE_TIME[k] ?? '—', `${s.activeMinutesPerBall} min`, m !== undefined ? formatMinutes(m) : '—']
          })}
          foot={['Razem', 'ok. 3–4 miesiące', `ok. ${planMinutes} min`, business.labor.measuredMinutesPerBall !== null ? formatMinutes(business.labor.measuredMinutesPerBall) : '—']}
        />
        <p className="mt-2 text-xs text-ink-500">Czasy pracy to szacunki dla partii ok. 10 sztuk. Pojedyncza kula zabiera raczej ok. 2 h. „Z pomiarów” liczy się ze stopera w partiach.</p>
      </Section>

      <Section n={2} title="Koszt materiałów na jedną kulę" lead="Materiały kosztują ok. 16 zł na kulę. Najdroższy jest styropianowy rdzeń, a nie cement.">
        <p className="mb-4 text-[15px] text-ink-700">Płaszcz kuli to ok. 2,15 l masy (z zapasem ok. 2,5 l). Receptura objętościowa: 1 część cementu, 1,5 perlitu, 1,5 torfu.</p>
        <Card>
          <CardBody>
            <CostComparison />
          </CardBody>
        </Card>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Note>
            <strong>Wariant najtańszy: ok. 10 zł.</strong> Rdzenie kupione hurtowo i mech z własnej działki.
          </Note>
          <Note>
            <strong>Wariant najdroższy: ok. 22 zł.</strong> Rdzenie kupowane na sztuki i mech z zakupu. Opakowanie do wysyłki to dodatkowe 5–8 zł.
          </Note>
        </div>
      </Section>

      <Section n={3} title="Czas pracy i wycena roboczogodziny" lead={`Praca kosztuje ${formatNumber(settings.hourlyRates[0] * planHours, 0)}–${formatNumber((settings.hourlyRates.at(-1) ?? 50) * planHours, 0)} zł na kulę, czyli 3–4 razy więcej niż materiały.`}>
        <PlanTable
          head={['Stawka za godzinę', 'Uzasadnienie', `Koszt pracy (${formatHours(planHours)})`, measuredHours !== null ? `Z pomiarów (${formatHours(measuredHours)})` : 'Z pomiarów']}
          align={['left', 'left', 'right', 'right']}
          rows={settings.hourlyRates.map((rate, i) => [
            `${formatPLN(rate)}`,
            rate === minHourly ? `minimalna stawka godzinowa ${year}` : i === settings.hourlyRates.length - 1 ? 'poważne dorabianie' : 'rozsądna stawka za rękodzieło',
            `ok. ${formatPLN(rate * planHours, { decimals: 0 })}`,
            measuredHours !== null ? `ok. ${formatPLN(rate * measuredHours, { decimals: 0 })}` : '—',
          ])}
        />
        <p className="mt-3 text-[15px] text-ink-700">O opłacalności decyduje głównie praca partiami. Dwie–trzy formy i kilka odlewów jednego dnia dają dużo więcej niż szukanie tańszego cementu.</p>
      </Section>

      <Section n={4} title="Ceny rynkowe" lead="W Polsce nie ma bezpośredniej konkurencji. Podobne rękodzieło z betonu i mchu kosztuje ok. 75–230 zł.">
        <PlanTable head={['Produkt porównawczy', 'Cena', 'Źródło']} align={['left', 'right', 'left']} rows={MARKET_PRICES.map((m) => [m.product, formatPLN(m.price, { decimals: 0 }), m.source])} />
        <p className="mt-3 text-[15px] text-ink-700">Brak konkurencji pozwala samemu ustalić cenę, ale produkt trzeba klientowi wytłumaczyć. Dobre zdjęcia w ogrodzie i karta pielęgnacji są częścią oferty.</p>
      </Section>

      <Section n={5} title="Cena sprzedaży i marża" lead={`Przy cenie ${formatPLN(settings.recommendedPrice, { decimals: 0 })} na Allegro zostaje ok. ${formatNumber(rec.profit, 0)} zł na kulę, czyli ok. ${formatNumber(rec.perHour, 0)} zł za godzinę. Poniżej ok. ${formatPLN(settings.minAllegroPrice, { decimals: 0 })} zarabiasz mniej niż minimalna stawka godzinowa.`}>
        <PlanTable
          head={['Wariant', 'Cena', 'Koszty', 'Zostaje', 'Za godzinę']}
          align={['left', 'right', 'right', 'right', 'right']}
          highlight={variants.findIndex((v) => v.price === settings.recommendedPrice)}
          rows={variants.map((v) => [v.name, formatPLN(v.price, { decimals: 0 }), formatPLN(v.costs), formatPLN(v.profit), `ok. ${formatPLN(v.perHour, { decimals: 0 })}`])}
        />
        <p className="mt-2 text-xs text-ink-500">
          Koszty obejmują materiały ({formatPLN(business.cost.plannedMaterials)}), {settings.lossReservePct}% zapasu na straty ({formatPLN(business.cost.plannedMaterials * loss)}), opakowanie przy wysyłce i prowizję kanału. Wysyłkę płaci kupujący. Czas pracy: {formatHours(planHours)} na kulę.
        </p>
        <div className="mt-4 rounded-2xl bg-moss-100/70 px-5 py-4 text-[15px] leading-relaxed text-ink-800 ring-1 ring-moss-200 ring-inset">
          <strong className="text-moss-900">Rekomendacja:</strong> 99–129 zł online i 69–89 zł lokalnie. Nie schodź poniżej ok. {formatPLN(settings.minAllegroPrice, { decimals: 0 })} na Allegro, bo wtedy praca jest opłacona gorzej niż płaca minimalna. Warto też mieć zestawy 2–3 kul w różnych rozmiarach: wartość zamówienia rośnie, a koszt obsługi prawie się nie zmienia.
        </div>
        <div className="mt-6">
          <PriceCalculator planMaterials={planMaterialsWithLoss} actualMaterials={business.materialPerBall} planHours={planHours} actualHours={measuredHours} />
        </div>
      </Section>

      <Section n={6} title="Kanały sprzedaży i wysyłka" lead="Na start najlepiej połączyć Allegro z darmowymi kanałami lokalnymi.">
        <PlanTable
          head={['Kanał', 'Koszt', 'Plusy', 'Minusy', 'Twoja sprzedaż']}
          align={['left', 'left', 'left', 'left', 'right']}
          rows={settings.channels
            .filter((c) => c.enabled)
            .map((c) => {
              const stats = business.byChannel.find((x) => x.channel === c.key)
              const note = CHANNEL_NOTES[c.key]
              return [c.name, note?.cost ?? (c.commissionPct ? `${c.commissionPct}%` : '0 zł'), note?.pros ?? '', note?.cons ?? '', stats ? `${kul(stats.quantity)} · ${formatPLN(stats.revenue, { decimals: 0 })}` : '—']
            })}
        />
        <Note className="mt-4">
          <strong>Wysyłka:</strong> kula waży 2–2,8 kg i jest krucha we wgłębieniach. Potrzebny jest karton z 3–4 cm wypełniacza z każdej strony, a mech trzeba owinąć wilgotnym papierem w woreczku. Wysyłaj na początku tygodnia i dołącz kartę pielęgnacji: cień, zraszanie, tylko na zewnątrz.
        </Note>
      </Section>

      <Section
        n={7}
        title="Inwestycja startowa i próg rentowności"
        lead={`Start z materiałami na ok. ${settings.startupBalls} kul kosztuje ok. ${formatPLN(settings.startupBudget, { decimals: 0 })}. Zwraca się po sprzedaży ${kul(breakEven)} po ${formatPLN(settings.recommendedPrice, { decimals: 0 })}.`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <PlanTable
            head={['Pozycja z planu', 'Koszt', 'Starczy na']}
            align={['left', 'right', 'left']}
            rows={[
              ...startupPlanned.map((p) => [p.name, `ok. ${formatPLN(lineTotal(p), { decimals: 0 })}`, p.ballsCovered ? (p.costItemKey === 'packaging' ? `${p.ballsCovered} wysyłek` : `ok. ${kul(p.ballsCovered)}`) : '—']),
              ...business.input.expenses
                .filter((e) => e.startup)
                .map((e) => [
                  <span key={e.id} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-moss-600" />
                    {e.name}
                  </span>,
                  formatPLN(lineTotal(e), { decimals: 0 }),
                  'kupione',
                ]),
            ]}
            foot={['Razem', `ok. ${formatPLN(settings.startupBudget, { decimals: 0 })}`, '']}
          />
          <div className="space-y-3">
            <Card>
              <CardBody>
                <div className="text-sm text-ink-500">Wydano z inwestycji startowej</div>
                <div className="mt-1 text-2xl font-semibold text-ink-900 tabular">
                  {formatPLN(startupSpent, { decimals: 0 })} <span className="text-base font-normal text-ink-500">z {formatPLN(settings.startupBudget, { decimals: 0 })}</span>
                </div>
                <ProgressBar className="mt-3" value={startupSpent / settings.startupBudget} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-ink-500">Próg rentowności</div>
                <div className="mt-1 text-2xl font-semibold text-ink-900 tabular">
                  {business.soldQuantity} <span className="text-base font-normal text-ink-500">z {kul(breakEven)} sprzedanych</span>
                </div>
                <ProgressBar className="mt-3" value={business.soldQuantity / breakEven} tone="water" />
              </CardBody>
            </Card>
            <Note>
              <strong>Przykład miesiąca w sezonie:</strong> 15 kul po {formatPLN(settings.recommendedPrice, { decimals: 0 })} daje ok. {formatPLN(Math.round((15 * rec.profit) / 10) * 10, { decimals: 0 })} po kosztach i prowizji, za ok. {formatNumber(15 * planHours, 0)} h pracy.
            </Note>
            <Note>
              <strong>Limit działalności nierejestrowanej:</strong> {formatPLN(limit.limit)} przychodu na kwartał, czyli ok. {kul(Math.floor(limit.limit / settings.recommendedPrice))} po {formatPLN(settings.recommendedPrice, { decimals: 0 })}.
            </Note>
          </div>
        </div>
      </Section>

      <Section n={8} title="Ryzyka i formalności" lead="Największe ryzyka to sezonowość, długi czas produkcji i reklamacje, że mech zbrązowiał.">
        <ul className="space-y-2 text-[15px] text-ink-700">
          {RISKS.map((r) => (
            <li key={r.title} className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-600" />
              <span>
                <strong className="text-ink-900">{r.title}.</strong> {r.text}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-4 rounded-2xl bg-ink-50 p-5 ring-1 ring-ink-150 ring-inset">
          {FORMALITIES.map((f) => (
            <p key={f.title} className="text-[15px] leading-relaxed text-ink-700">
              <strong className="text-ink-900">{f.title}:</strong> {f.text}
              {f.title.startsWith('Działalność') && ` W ${year} r. limit to ${formatPLN(limit.limit)}.`}
            </p>
          ))}
        </div>
      </Section>

      <Section n={9} title="Plan działania" lead="Start produkcji teraz daje gotowy towar na początek sezonu w marcu–kwietniu 2027.">
        <ol className="relative space-y-1 border-l-2 border-moss-200 pl-6">
          {settings.planPhases.map((p) => {
            const state = p.to < today ? 'done' : p.from <= today ? 'now' : 'next'
            return (
              <li key={p.id} className="relative pb-4">
                <span
                  className={cn(
                    'absolute top-1 -left-[33px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-moss-50',
                    state === 'done' ? 'bg-moss-600' : state === 'now' ? 'bg-moss-900' : 'bg-ink-200',
                  )}
                >
                  {state === 'done' && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[15px] font-semibold text-moss-900">
                    {formatDateShort(p.from)}–{formatDate(p.to)} · {p.title}
                  </span>
                  {state === 'now' && <span className="rounded-full bg-moss-900 px-2 py-0.5 text-[11px] font-semibold text-white">teraz · zostało {diffDays(today, p.to)} dni</span>}
                  {state === 'done' && <span className="text-xs text-ink-400">zakończone</span>}
                </div>
                <p className="mt-0.5 text-[15px] text-ink-700">{p.text}</p>
              </li>
            )
          })}
        </ol>
      </Section>

      <section className="border-t border-ink-150 pt-6">
        <h2 className="text-lg font-semibold text-moss-900">Źródła</h2>
        <p className="mt-2 text-sm leading-relaxed text-moss-700">{SOURCES}</p>
        <p className="mt-4 text-xs text-ink-400">Biznesplan przygotowany 17.11.2026. Liczby to szacunki z cen detalicznych. Po pierwszej partii zastąp je własnymi pomiarami – aplikacja robi to na bieżąco.</p>
      </section>
    </div>
  )
}

function Section({ n, title, lead, children }: { n: number; title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="print-keep-next mb-3 flex items-center gap-3 border-b border-moss-200 pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-600 text-sm font-semibold text-white">{n}</span>
        <h2 className="text-xl font-semibold tracking-tight text-moss-900">{title}</h2>
      </div>
      <p className="print-keep-next mb-4 text-[15px] font-semibold text-moss-900">{lead}</p>
      {children}
    </section>
  )
}

function Kpi({ value, label, actual, worse }: { value: string; label: string; actual: string; worse: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-150">
      <div className="text-2xl font-semibold tracking-tight text-moss-900 tabular">{value}</div>
      <div className="mt-1 text-xs leading-snug text-ink-500">{label}</div>
      <div className={cn('mt-3 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', worse ? 'bg-clay-50 text-clay-700' : 'bg-moss-100 text-moss-800')}>{actual}</div>
    </div>
  )
}

function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl bg-white px-5 py-4 text-[15px] leading-relaxed text-ink-700 ring-1 ring-ink-150', className)}>{children}</div>
}

function PlanTable({ head, rows, foot, align, highlight }: { head: string[]; rows: ReactNode[][]; foot?: ReactNode[]; align: ('left' | 'right')[]; highlight?: number }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[520px] overflow-hidden text-sm sm:rounded-xl">
        <thead>
          <tr className="bg-moss-900 text-left text-xs text-white">
            {head.map((h, i) => (
              <th key={h} className={cn('px-4 py-3 font-semibold', align[i] === 'right' && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={cn('print-avoid border-b border-ink-100', ri === highlight ? 'bg-cream-100 font-semibold' : ri % 2 ? 'bg-white' : 'bg-ink-50/70')}>
              {r.map((c, ci) => (
                <td key={ci} className={cn('px-4 py-2.5 text-ink-800', align[ci] === 'right' && 'text-right tabular')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="bg-moss-100 font-semibold text-moss-900">
              {foot.map((c, ci) => (
                <td key={ci} className={cn('px-4 py-3', align[ci] === 'right' && 'text-right tabular')}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
