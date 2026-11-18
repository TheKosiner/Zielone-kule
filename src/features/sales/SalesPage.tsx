import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, FileSpreadsheet, HandCoins, Plus, Printer, Receipt, TrendingUp, Undo2 } from 'lucide-react'
import type { Sale } from '@/db/types'
import { useSettings } from '@/hooks/useSettings'
import { useBusiness } from '@/hooks/useBusiness'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, EmptyState, PageHeader, Segmented, Stat } from '@/components/ui/Misc'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { buildLedger, quarterStatus } from '@/domain/sales'
import { formatDate, formatMonth, formatMonthShort, quarterOf, quarterRange, todayISO } from '@/lib/dates'
import { formatHours, formatPLN, kul } from '@/lib/format'
import { toCsv } from '@/lib/csv'
import { downloadText } from '@/lib/download'
import { cn } from '@/lib/cn'
import { QuarterLimitCard } from './QuarterLimitCard'
import { SaleForm } from './SaleForm'

type Tab = 'list' | 'ledger' | 'analysis'

export default function SalesPage() {
  const settings = useSettings()
  const business = useBusiness()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('list')
  const [form, setForm] = useState<{ open: boolean; sale: Sale | null }>({ open: false, sale: null })

  useEffect(() => {
    if (params.get('nowa')) {
      setForm({ open: true, sale: null })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  if (!business) return null
  const sales = business.input.sales
  const q = quarterStatus(sales, settings, todayISO())

  return (
    <>
      <div className="no-print">
      <PageHeader
        title="Sprzedaż"
        subtitle={`${sales.length} ${sales.length === 1 ? 'sprzedaż' : 'sprzedaży'} · ${kul(business.soldQuantity)} · przychód ${formatPLN(business.revenue)}`}
        actions={
          <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={() => setForm({ open: true, sale: null })}>
            Dodaj sprzedaż
          </Button>
        }
      />
      </div>

      <div className="no-print mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <QuarterLimitCard status={q} />
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Zysk ze sprzedaży" value={formatPLN(business.profit, { decimals: 0 })} icon={<TrendingUp className="h-4 w-4" />} sub={business.avgProfitPerBall !== null ? `${formatPLN(business.avgProfitPerBall)} na kulę` : 'po odjęciu prowizji, wysyłki, materiałów'} />
          <Stat
            label="Zarobek za godzinę"
            tone="warm"
            value={business.perHour !== null ? formatPLN(business.perHour, { decimals: 0 }) : '—'}
            icon={<Clock className="h-4 w-4" />}
            sub={business.labor.measuredMinutesPerBall !== null ? `z pomiarów: ${formatHours(business.labor.measuredMinutesPerBall / 60)} na kulę` : 'bez pomiarów, z założenia 1,3 h'}
          />
        </div>
      </div>

      <Segmented<Tab>
        className="no-print mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'list', label: 'Sprzedaże', count: sales.length },
          { value: 'ledger', label: 'Ewidencja' },
          { value: 'analysis', label: 'Analiza' },
        ]}
      />

      {tab === 'list' && <SalesList business={business} onOpen={(sale) => setForm({ open: true, sale })} onAdd={() => setForm({ open: true, sale: null })} />}
      {tab === 'ledger' && <Ledger sales={sales} />}
      {tab === 'analysis' && <Analysis business={business} />}

      <SaleForm open={form.open} sale={form.sale} onClose={() => setForm({ open: false, sale: null })} />
    </>
  )
}

type Business = NonNullable<ReturnType<typeof useBusiness>>

function SalesList({ business, onOpen, onAdd }: { business: Business; onOpen: (s: Sale) => void; onAdd: () => void }) {
  const settings = useSettings()
  if (!business.sales.length) {
    return (
      <Card>
        <EmptyState
          icon={<HandCoins className="h-7 w-7" />}
          title="Jeszcze nic nie sprzedane"
          text="Każda sprzedaż trafia automatycznie do ewidencji i liczy się do limitu kwartalnego. Zaznaczone kule dostają status „Sprzedana”."
          action={
            <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={onAdd}>
              Dodaj sprzedaż
            </Button>
          }
        />
      </Card>
    )
  }
  return (
    <Card className="divide-y divide-ink-100 overflow-hidden">
      {business.sales.map(({ sale: s, profit, perHour }) => {
        const ch = settings.channels.find((c) => c.key === s.channel)
        return (
          <button key={s.id} onClick={() => onOpen(s)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-ink-50 sm:items-center">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-cream-800 sm:mt-0">
              {s.status === 'ok' ? <Receipt className="h-5 w-5" /> : <Undo2 className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start gap-2">
                <span className="min-w-0 flex-1 text-[15px] leading-snug font-medium text-ink-900">{s.description || 'Sprzedaż'}</span>
                <span className="shrink-0 text-[15px] font-semibold text-ink-900 tabular">{formatPLN(s.price)}</span>
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                <span className="tabular">{formatDate(s.date)}</span>
                <Badge>{ch?.name ?? s.channel}</Badge>
                <span>{kul(s.quantity)}</span>
                {s.customer && <span>· {s.customer}</span>}
                {s.status === 'returned' && <Badge className="bg-clay-50 text-clay-700 ring-clay-100">zwrot</Badge>}
                {s.status === 'complaint' && <Badge className="bg-cream-100 text-cream-800 ring-cream-200">reklamacja</Badge>}
                {s.sample && <Badge>przykład</Badge>}
                <span className={cn('ml-auto font-medium tabular', profit < 0 ? 'text-clay-600' : 'text-moss-700')}>
                  zysk {formatPLN(profit, { decimals: 0 })}
                  {perHour !== null && ` · ${formatPLN(perHour, { decimals: 0 })}/h`}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </Card>
  )
}

function Ledger({ sales }: { sales: Sale[] }) {
  const settings = useSettings()
  const now = quarterOf(todayISO())
  const [period, setPeriod] = useState(now)
  const rows = useMemo(() => buildLedger(sales, settings, period.year, period.quarter), [sales, settings, period])
  const { from, to } = quarterRange(period.year, period.quarter)
  const total = rows.at(-1)?.cumQuarter ?? 0

  const step = (dir: number) => {
    let quarter = period.quarter + dir
    let year = period.year
    if (quarter < 1) {
      quarter = 4
      year--
    }
    if (quarter > 4) {
      quarter = 1
      year++
    }
    setPeriod({ year, quarter })
  }

  const exportCsv = () => {
    const csv = toCsv(
      ['Lp.', 'Data sprzedaży', 'Opis', 'Kwota przychodu (zł)', 'Narastająco w miesiącu (zł)', 'Narastająco w kwartale (zł)'],
      rows.map((r) => [r.lp, formatDate(r.date), r.description, r.amount, r.cumMonth, r.cumQuarter]),
    )
    downloadText(csv, `ewidencja-sprzedazy-${period.year}-Q${period.quarter}.csv`, 'text/csv;charset=utf-8')
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <IconButton label="Poprzedni kwartał" variant="secondary" onClick={() => step(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <div className="min-w-36 text-center text-[15px] font-semibold text-ink-900">
          {period.quarter}. kwartał {period.year}
        </div>
        <IconButton label="Następny kwartał" variant="secondary" onClick={() => step(1)}>
          <ChevronRight className="h-5 w-5" />
        </IconButton>
        <div className="ml-auto flex gap-2">
          <Button icon={<FileSpreadsheet className="h-4.5 w-4.5" />} onClick={exportCsv} disabled={!rows.length}>
            CSV
          </Button>
          <Button icon={<Printer className="h-4.5 w-4.5" />} onClick={() => window.print()}>
            Drukuj / PDF
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden print:shadow-none print:ring-0">
        <div className="border-b border-ink-100 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-ink-900">Uproszczona ewidencja sprzedaży</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Działalność nierejestrowana · {formatDate(from)} – {formatDate(to)}
            {settings.ownerName && ` · ${settings.ownerName}`}
            {settings.ownerAddress && `, ${settings.ownerAddress}`}
          </p>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-ink-150 bg-ink-50 text-left text-xs text-ink-500">
                  <th className="px-4 py-2.5 font-medium sm:pl-6">Lp.</th>
                  <th className="px-2 py-2.5 font-medium">Data</th>
                  <th className="px-2 py-2.5 font-medium">Opis</th>
                  <th className="px-2 py-2.5 text-right font-medium">Kwota</th>
                  <th className="px-2 py-2.5 text-right font-medium">Narast. w miesiącu</th>
                  <th className="px-4 py-2.5 text-right font-medium sm:pr-6">Narast. w kwartale</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.saleId}-${r.lp}`} className={cn('border-b border-ink-100 last:border-0', r.correction && 'bg-clay-50/50')}>
                    <td className="px-4 py-2.5 text-ink-500 tabular sm:pl-6">{r.lp}</td>
                    <td className="px-2 py-2.5 tabular">{formatDate(r.date)}</td>
                    <td className="px-2 py-2.5 text-ink-700">{r.description}</td>
                    <td className={cn('px-2 py-2.5 text-right font-medium tabular', r.amount < 0 && 'text-clay-700')}>{formatPLN(r.amount)}</td>
                    <td className="px-2 py-2.5 text-right text-ink-600 tabular">{formatPLN(r.cumMonth)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular sm:pr-6">{formatPLN(r.cumQuarter)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-moss-50">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-ink-900 sm:pl-6">
                    Razem w kwartale
                  </td>
                  <td colSpan={3} className="px-4 py-3 text-right text-base font-semibold text-ink-900 tabular sm:pr-6">
                    {formatPLN(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-ink-500">Brak sprzedaży w tym kwartale.</p>
        )}
      </Card>
      <p className="no-print mt-3 px-1 text-xs leading-relaxed text-ink-500">
        Ewidencja powstaje automatycznie ze sprzedaży. Zwroty są korektami ujemnymi w dniu zwrotu. {settings.includeShippingInRevenue ? 'Opłaty za wysyłkę od klientów są wliczone do przychodu.' : 'Opłaty za wysyłkę nie są wliczane.'} Szczegóły potwierdź w przepisach albo u księgowego.
      </p>
    </div>
  )
}

function Analysis({ business }: { business: Business }) {
  const settings = useSettings()
  if (!business.sales.length) return <p className="py-10 text-center text-sm text-ink-500">Analiza pojawi się po pierwszej sprzedaży.</p>
  const today = todayISO()
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
        <Stat label="Przychód" value={formatPLN(business.revenue, { decimals: 0 })} sub="po korektach" />
        <Stat label="Średnia cena" value={business.avgPrice !== null ? formatPLN(business.avgPrice, { decimals: 0 }) : '—'} sub={`rekomendowana ${formatPLN(settings.recommendedPrice, { decimals: 0 })}`} />
        <Stat label="Materiały na kulę" value={formatPLN(business.materialPerBall)} sub={`z zapasem ${settings.lossReservePct}% (plan ${formatPLN(business.plannedMaterialPerBall)})`} />
        <Stat label="Godziny przy sprzedanych" value={formatHours(business.hours)} sub={`${kul(business.soldQuantity)}`} />
      </div>

      <Card>
        <CardHeader title="Przychód w miesiącach" />
        <CardBody>
          <ColumnChart
            ariaLabel="Przychód w kolejnych miesiącach"
            data={business.revenueByMonth.map((m) => ({ key: m.month, label: formatMonthShort(m.month), value: m.total, tooltipLabel: formatMonth(`${m.month}-01`) }))}
            format={(v) => formatPLN(v)}
            highlightKey={today.slice(0, 7)}
          />
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Kanały sprzedaży" subtitle="Który kanał daje najwięcej na czysto" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-y border-ink-150 bg-ink-50 text-left text-xs text-ink-500">
                <th className="px-5 py-2.5 font-medium">Kanał</th>
                <th className="px-2 py-2.5 text-right font-medium">Kul</th>
                <th className="px-2 py-2.5 text-right font-medium">Przychód</th>
                <th className="px-5 py-2.5 text-right font-medium">Zysk / kulę</th>
              </tr>
            </thead>
            <tbody>
              {business.byChannel.map((c) => (
                <tr key={c.channel} className="border-b border-ink-100 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-ink-800">{settings.channels.find((x) => x.key === c.channel)?.name ?? c.channel}</td>
                  <td className="px-2 py-2.5 text-right tabular">{c.quantity}</td>
                  <td className="px-2 py-2.5 text-right tabular">{formatPLN(c.revenue, { decimals: 0 })}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-moss-800 tabular">{c.quantity ? formatPLN(c.profit / c.quantity, { decimals: 0 }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
