import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Plus, Search, ShoppingCart, Wallet, X } from 'lucide-react'
import { db } from '@/db/db'
import { createEntity, deleteEntity, restoreEntity } from '@/db/repo'
import type { Expense, ExpenseCategory, PlannedPurchase } from '@/db/types'
import { CATEGORY_META, EXPENSE_CATEGORIES } from '@/domain/constants'
import { ballCostSummary, lineTotal, sumExpenses, totalsByCategory, totalsByMonth } from '@/domain/costs'
import { useSettings } from '@/hooks/useSettings'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, Chip, EmptyState, PageHeader, ProgressBar, Segmented, Stat } from '@/components/ui/Misc'
import { Input } from '@/components/ui/Form'
import { useToast } from '@/components/ui/Feedback'
import { LinkCard } from '@/components/LinkCard'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { RankedBars } from '@/components/charts/RankedBars'
import { formatDate, formatMonth, formatMonthShort, monthKey, todayISO } from '@/lib/dates'
import { formatNumber, formatPLN, kul } from '@/lib/format'
import { cn } from '@/lib/cn'
import { PurchaseForm } from './PurchaseForm'
import { CostComparison } from './CostComparison'

type Tab = 'list' | 'planned' | 'summary'

export default function ExpensesPage() {
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('zakupy') ? 'planned' : 'list')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | PlannedPurchase | null>(null)

  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [])
  const planned = useLiveQuery(() => db.planned.toArray(), [])

  // Szybkie dodawanie z menu „+”
  useEffect(() => {
    if (params.get('nowy')) {
      setTab(params.get('zakupy') ? 'planned' : 'list')
      setEditing(null)
      setFormOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  if (!expenses || !planned) return null

  const today = todayISO()
  const total = sumExpenses(expenses)
  const thisMonth = sumExpenses(expenses.filter((e) => monthKey(e.date) === monthKey(today)))
  const plannedTotal = sumExpenses(planned)
  const cost = ballCostSummary(settings, expenses)
  const formMode = tab === 'planned' ? 'planned' : 'expense'

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (e: Expense | PlannedPurchase) => {
    setEditing(e)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Wydatki"
        subtitle={`${expenses.length} ${expenses.length === 1 ? 'pozycja' : 'pozycji'} · łącznie ${formatPLN(total)}`}
        actions={
          <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={openNew}>
            {tab === 'planned' ? 'Dodaj do kupienia' : 'Dodaj wydatek'}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Wydane łącznie" value={formatPLN(total, { decimals: 0 })} icon={<Wallet className="h-4 w-4" />} sub={`w tym inwestycja startowa: ${formatPLN(sumExpenses(expenses.filter((e) => e.startup)), { decimals: 0 })}`} />
        <Stat label="W tym miesiącu" value={formatPLN(thisMonth, { decimals: 0 })} icon={<CalendarDays className="h-4 w-4" />} sub={formatMonth(today)} />
        <Stat
          label="Koszt kuli"
          tone="warm"
          value={formatPLN(cost.actualMaterials)}
          sub={`plan ${formatPLN(cost.plannedMaterials)} · dane z ${cost.itemsWithData}/${cost.materialItems} pozycji`}
        />
        <Stat label="Do kupienia" value={formatPLN(plannedTotal, { decimals: 0 })} icon={<ShoppingCart className="h-4 w-4" />} sub={`${planned.length} ${planned.length === 1 ? 'pozycja' : 'pozycji'} na liście`} />
      </div>

      <Segmented<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'list', label: 'Wydatki', count: expenses.length },
          { value: 'planned', label: 'Do kupienia', count: planned.length },
          { value: 'summary', label: 'Sumy' },
        ]}
      />

      {tab === 'list' && <ExpenseList expenses={expenses} onEdit={openEdit} onAdd={openNew} />}
      {tab === 'planned' && <PlannedList planned={planned} onEdit={openEdit} onAdd={openNew} />}
      {tab === 'summary' && <Summary expenses={expenses} />}

      <PurchaseForm mode={editing ? ('date' in editing ? 'expense' : 'planned') : formMode} open={formOpen} onClose={() => setFormOpen(false)} entity={editing} />
    </>
  )
}

// ───────── Lista wydatków ─────────

function ExpenseList({ expenses, onEdit, onAdd }: { expenses: Expense[]; onEdit: (e: Expense) => void; onAdd: () => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return expenses.filter((e) => (!category || e.category === category) && (!q || e.name.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q)))
  }, [expenses, query, category])

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of filtered) {
      const k = monthKey(e.date)
      map.set(k, [...(map.get(k) ?? []), e])
    }
    return [...map.entries()]
  }, [filtered])

  if (!expenses.length) {
    return (
      <Card>
        <EmptyState
          icon={<Wallet className="h-7 w-7" />}
          title="Brak wydatków"
          text="Dodaj pierwszy zakup z linkiem do oferty. Dla materiałów wpisz, na ile kul starczy – aplikacja policzy rzeczywisty koszt kuli."
          action={
            <Button variant="primary" onClick={onAdd} icon={<Plus className="h-5 w-5" />}>
              Dodaj wydatek
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj wydatku…" className="pl-10" />
          {query && (
            <IconButton label="Wyczyść" size="sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setQuery('')}>
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!category} onClick={() => setCategory(null)}>
            Wszystkie
          </Chip>
          {EXPENSE_CATEGORIES.filter((c) => expenses.some((e) => e.category === c)).map((c) => {
            const Icon = CATEGORY_META[c].icon
            return (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                <Icon className="h-4 w-4" />
                {CATEGORY_META[c].label}
              </Chip>
            )
          })}
        </div>
      </div>

      {!filtered.length && <p className="py-10 text-center text-sm text-ink-500">Nic nie pasuje do filtrów.</p>}

      <div className="space-y-6">
        {groups.map(([month, rows]) => (
          <section key={month}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-sm font-semibold text-ink-700 capitalize">{formatMonth(`${month}-01`)}</h3>
              <span className="text-sm font-medium text-ink-500 tabular">{formatPLN(sumExpenses(rows))}</span>
            </div>
            <Card className="divide-y divide-ink-100 overflow-hidden">
              {rows.map((e) => (
                <ExpenseRow key={e.id} expense={e} onClick={() => onEdit(e)} />
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  )
}

function CategoryIcon({ category, className }: { category: ExpenseCategory; className?: string }) {
  const Icon = CATEGORY_META[category].icon
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-800', className)} title={CATEGORY_META[category].label}>
      <Icon className="h-5 w-5" />
    </span>
  )
}

function ExpenseRow({ expense: e, onClick }: { expense: Expense; onClick: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(ev) => ev.key === 'Enter' && onClick()} className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition hover:bg-ink-50 sm:items-center">
      <CategoryIcon category={e.category} className="mt-0.5 sm:mt-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 text-[15px] leading-snug font-medium text-ink-900">{e.name}</div>
          <div className="shrink-0 text-[15px] font-semibold text-ink-900 tabular">{formatPLN(lineTotal(e))}</div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-ink-500">
          <span className="tabular">{formatDate(e.date)}</span>
          <span className="text-ink-300">·</span>
          <span className="tabular">
            {formatNumber(e.quantity, 2, true)} {e.unit}
            {e.quantity !== 1 && ` × ${formatPLN(e.unitPrice)}`}
          </span>
          {e.ballsCovered ? (
            <>
              <span className="text-ink-300">·</span>
              <span>starczy na {e.costItemKey === 'packaging' ? `${e.ballsCovered} wysyłek` : kul(e.ballsCovered)}</span>
            </>
          ) : null}
          {e.startup && <Badge className="bg-cream-100 text-cream-800 ring-cream-200">start</Badge>}
          {e.sample && <Badge>przykład</Badge>}
          {e.url && <LinkCard url={e.url} size="sm" />}
        </div>
      </div>
    </div>
  )
}

// ───────── Lista zakupów ─────────

const PRIORITY_META = {
  high: { label: 'Pilne', className: 'bg-clay-50 text-clay-700 ring-clay-100' },
  normal: { label: 'Normalny', className: 'bg-ink-100 text-ink-600 ring-ink-200' },
  low: { label: 'Kiedyś', className: 'bg-white text-ink-500 ring-ink-200' },
}

function PlannedList({ planned, onEdit, onAdd }: { planned: PlannedPurchase[]; onEdit: (p: PlannedPurchase) => void; onAdd: () => void }) {
  const toast = useToast()
  const settings = useSettings()
  const order = { high: 0, normal: 1, low: 2 }
  const sorted = [...planned].sort((a, b) => order[a.priority] - order[b.priority] || a.name.localeCompare(b.name, 'pl'))
  const startupSpent = useLiveQuery(() => db.expenses.filter((e) => !!e.startup).toArray(), [])

  const buy = async (p: PlannedPurchase) => {
    const expense = await createEntity<Expense>(db.expenses, {
      name: p.name,
      category: p.category,
      url: p.url,
      unitPrice: p.unitPrice,
      quantity: p.quantity,
      unit: p.unit,
      date: todayISO(),
      note: p.note,
      costItemKey: p.costItemKey,
      ballsCovered: p.ballsCovered,
      startup: p.startup,
      sample: p.sample,
    })
    await deleteEntity(db.planned, p.id)
    toast.show(
      <>
        Kupione: <strong>{p.name}</strong> ({formatPLN(lineTotal(p))}) jest w wydatkach.
      </>,
      {
        action: {
          label: 'Cofnij',
          onClick: async () => {
            await deleteEntity(db.expenses, expense.id)
            await restoreEntity(db.planned, p)
          },
        },
      },
    )
  }

  const spent = startupSpent ? sumExpenses(startupSpent) : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-900">Inwestycja startowa z biznesplanu</div>
            <div className="mt-0.5 text-sm text-ink-500">
              Wydano <span className="font-medium text-ink-800 tabular">{formatPLN(spent, { decimals: 0 })}</span> z ok. {formatPLN(settings.startupBudget, { decimals: 0 })} (materiały na ok. {kul(settings.startupBalls)}).
            </div>
          </div>
          <div className="w-full sm:w-56">
            <ProgressBar value={spent / settings.startupBudget} tone={spent > settings.startupBudget ? 'clay' : 'moss'} />
          </div>
        </CardBody>
      </Card>

      {!sorted.length ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title="Lista zakupów jest pusta"
            text="Dopisz rzeczy, które trzeba kupić. Po zakupie jednym kliknięciem przeniesiesz je do wydatków."
            action={
              <Button variant="primary" onClick={onAdd} icon={<Plus className="h-5 w-5" />}>
                Dodaj do kupienia
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-ink-100 overflow-hidden">
          {sorted.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <button className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => onEdit(p)}>
                <CategoryIcon category={p.category} className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-snug font-medium text-ink-900">{p.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-ink-500">
                    <Badge className={PRIORITY_META[p.priority].className}>{PRIORITY_META[p.priority].label}</Badge>
                    <span className="font-medium text-ink-800 tabular">ok. {formatPLN(lineTotal(p))}</span>
                    {p.quantity !== 1 && (
                      <span className="tabular">
                        ({formatNumber(p.quantity, 2, true)} {p.unit} × {formatPLN(p.unitPrice)})
                      </span>
                    )}
                    {p.neededBy && <span>do {formatDate(p.neededBy)}</span>}
                    {p.url && <LinkCard url={p.url} size="sm" />}
                  </span>
                  {p.note && <span className="mt-1 block text-xs text-ink-500">{p.note}</span>}
                </span>
              </button>
              <Button variant="soft" size="md" onClick={() => buy(p)} icon={<Check className="h-4.5 w-4.5" />} className="px-3 sm:px-4" aria-label={`Kupione: ${p.name}`}>
                <span className="hidden sm:inline">Kupione</span>
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between bg-ink-50 px-4 py-3 text-sm">
            <span className="text-ink-600">Razem do wydania</span>
            <span className="font-semibold text-ink-900 tabular">{formatPLN(sumExpenses(planned))}</span>
          </div>
        </Card>
      )}
    </div>
  )
}

// ───────── Podsumowanie ─────────

function Summary({ expenses }: { expenses: Expense[] }) {
  const today = todayISO()
  const byCategory = totalsByCategory(expenses)
  const total = sumExpenses(expenses)
  const months = totalsByMonth(expenses).slice(-12)
  const ranked = EXPENSE_CATEGORIES.map((c) => ({ c, v: byCategory[c] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)

  if (!expenses.length) return <p className="py-10 text-center text-sm text-ink-500">Podsumowanie pojawi się po dodaniu wydatków.</p>

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader title="Wydatki w miesiącach" subtitle={`ostatnie ${months.length} mies. · bieżący wyróżniony`} />
        <CardBody>
          <ColumnChart
            ariaLabel="Wydatki w kolejnych miesiącach"
            data={months.map((m) => ({ key: m.month, label: formatMonthShort(m.month), value: m.total, tooltipLabel: formatMonth(`${m.month}-01`) }))}
            format={(v) => formatPLN(v)}
            highlightKey={monthKey(today)}
          />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-500 hover:text-ink-800">Pokaż jako tabelę</summary>
            <table className="mt-2 w-full">
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-b border-ink-100 last:border-0">
                    <td className="py-1.5 text-ink-700 capitalize">{formatMonth(`${m.month}-01`)}</td>
                    <td className="py-1.5 text-right font-medium tabular">{formatPLN(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Według kategorii" subtitle={`łącznie ${formatPLN(total)}`} />
        <CardBody>
          <RankedBars
            format={(v) => formatPLN(v, { decimals: 0 })}
            total={total}
            data={ranked.map(({ c, v }) => {
              const Icon = CATEGORY_META[c].icon
              return { key: c, label: CATEGORY_META[c].label, value: v, icon: <Icon className="h-4 w-4 text-moss-700" /> }
            })}
          />
        </CardBody>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader title="Koszt jednej kuli: plan i rzeczywistość" subtitle="Liczone z wydatków przypisanych do pozycji kosztowych i pola „starczy na”" />
        <CardBody>
          <CostComparison />
        </CardBody>
      </Card>
    </div>
  )
}
