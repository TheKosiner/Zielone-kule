import { useState } from 'react'
import { Calculator, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Form'
import { priceResult, type PriceInputs } from '@/domain/pricing'
import { yearSettingsFor } from '@/domain/limits'
import { useSettings } from '@/hooks/useSettings'
import { formatPLN } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Props {
  planMaterials: number
  actualMaterials: number
  planHours: number
  actualHours: number | null
}

/** Suwaki: cena, prowizja, czas pracy, materiały, stawka → zysk, zarobek za godzinę, cena minimalna */
export function PriceCalculator({ planMaterials, actualMaterials, planHours, actualHours }: Props) {
  const settings = useSettings()
  const allegro = settings.channels.find((c) => c.key === 'allegro')
  const planValues = (): PriceInputs => ({
    price: settings.recommendedPrice,
    commissionPct: allegro?.commissionPct ?? 12,
    hours: Math.round(planHours * 10) / 10,
    materials: planMaterials,
    packaging: allegro?.packagingCost ?? 6,
    hourlyRate: settings.targetHourlyRate,
  })
  const [v, setV] = useState<PriceInputs>(planValues)
  const [withPackaging, setWithPackaging] = useState(true)
  const set = (patch: Partial<PriceInputs>) => setV((x) => ({ ...x, ...patch }))
  const r = priceResult({ ...v, packaging: withPackaging ? v.packaging : 0 })
  const minWage = yearSettingsFor(settings, new Date().getFullYear()).data.minHourly
  const atMinWage = priceResult({ ...v, packaging: withPackaging ? v.packaging : 0, hourlyRate: minWage })

  return (
    <Card className="overflow-hidden print-avoid">
      <CardHeader
        title="Kalkulator ceny"
        icon={<Calculator className="h-5 w-5" />}
        subtitle="Przesuń suwaki i zobacz, ile zostaje z jednej kuli"
        actions={
          <div className="no-print flex gap-1">
            <Button size="sm" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setV(planValues())}>
              Plan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Sparkles className="h-4 w-4" />}
              onClick={() => set({ materials: actualMaterials, hours: actualHours ? Math.round(actualHours * 10) / 10 : v.hours })}
              title="Materiały z wydatków i czas z pomiarów"
            >
              Z danych
            </Button>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <Slider label="Cena sprzedaży" value={v.price} onChange={(price) => set({ price })} min={39} max={199} step={1} suffix="zł" hint={`rekomendowana ${formatPLN(settings.recommendedPrice, { decimals: 0 })}, minimum na Allegro ok. ${formatPLN(settings.minAllegroPrice, { decimals: 0 })}`} />
            <Slider label="Prowizja" value={v.commissionPct} onChange={(commissionPct) => set({ commissionPct })} min={0} max={30} step={0.5} suffix="%" hint="Allegro ok. 12%, sprzedaż lokalna 0%" />
            <Slider label="Czas pracy na kulę" value={v.hours} onChange={(hours) => set({ hours })} min={0.5} max={3} step={0.1} suffix="h" hint={`plan ${planHours.toFixed(1).replace('.', ',')} h${actualHours ? `, z pomiarów ${actualHours.toFixed(1).replace('.', ',')} h` : ''}`} />
            <Slider
              label="Materiały na kulę"
              value={v.materials}
              onChange={(materials) => set({ materials })}
              min={5}
              max={35}
              step={0.1}
              suffix="zł"
              hint={`z zapasem ${settings.lossReservePct}%: plan ${formatPLN(planMaterials)}, z wydatków ${formatPLN(actualMaterials)}`}
            />
            <Slider label="Stawka godzinowa" value={v.hourlyRate} onChange={(hourlyRate) => set({ hourlyRate })} min={20} max={80} step={1} suffix="zł/h" hint={`płaca minimalna ${formatPLN(minWage)}/h, rozsądnie za rękodzieło 40 zł/h`} />
            <Toggle checked={withPackaging} onChange={setWithPackaging} label={`Z opakowaniem do wysyłki (${formatPLN(v.packaging, { decimals: 0 })})`} description="Wyłącz dla sprzedaży lokalnej i targów" />
          </div>

          <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl bg-moss-900 p-5 text-white">
              <div className="text-sm text-moss-200">Zysk na kuli</div>
              <div className={cn('mt-1 text-4xl font-semibold tracking-tight tabular', r.profit < 0 && 'text-clay-100')}>{formatPLN(r.profit)}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <div>
                  <div className="text-xs text-moss-300">Za godzinę</div>
                  <div className="text-xl font-semibold tabular">{formatPLN(r.perHour, { decimals: 0 })}</div>
                </div>
                <div>
                  <div className="text-xs text-moss-300">Koszty</div>
                  <div className="text-xl font-semibold tabular">{formatPLN(r.costs, { decimals: 0 })}</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-cream-100 p-4 ring-1 ring-cream-200 ring-inset">
              <div className="text-sm text-cream-800">Cena minimalna przy {formatPLN(v.hourlyRate, { decimals: 0 })}/h</div>
              <div className="mt-0.5 text-2xl font-semibold text-ink-900 tabular">{Number.isFinite(r.minPrice) ? formatPLN(Math.ceil(r.minPrice), { decimals: 0 }) : '—'}</div>
              <div className="mt-1 text-xs text-cream-800">przy płacy minimalnej: {Number.isFinite(atMinWage.minPrice) ? formatPLN(Math.ceil(atMinWage.minPrice), { decimals: 0 }) : '—'}</div>
            </div>
            <p className={cn('px-1 text-sm', r.surplus >= 0 ? 'text-moss-800' : 'text-clay-700')}>
              {r.surplus >= 0
                ? `Po opłaceniu pracy stawką ${formatPLN(v.hourlyRate, { decimals: 0 })}/h zostaje jeszcze ${formatPLN(r.surplus)} na kuli.`
                : `Przy tej cenie praca jest opłacona słabiej niż ${formatPLN(v.hourlyRate, { decimals: 0 })}/h (brakuje ${formatPLN(-r.surplus)} na kuli).`}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
