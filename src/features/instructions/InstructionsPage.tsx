import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, ChevronRight, Clock, HeartHandshake, Plus, Printer, TriangleAlert } from 'lucide-react'
import { db } from '@/db/db'
import { createEntity } from '@/db/repo'
import type { Instruction } from '@/db/types'
import { CARE_CARD_ID } from '@/db/seedInstructions'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { PageHeader, ProgressBar, SectionTitle } from '@/components/ui/Misc'
import { Markdown } from '@/lib/markdown'
import { plural } from '@/lib/format'

export default function InstructionsPage() {
  const navigate = useNavigate()
  const all = useLiveQuery(() => db.instructions.orderBy('order').toArray(), [])
  if (!all) return null

  const process = all.filter((i) => i.category === 'process')
  const custom = all.filter((i) => i.category === 'custom' || i.category === 'tips')
  const care = all.find((i) => i.category === 'care')
  const pitfalls = process.flatMap((i) => i.pitfalls.map((p) => ({ ...p, from: i })))

  const addNew = async () => {
    const created = await createEntity<Instruction>(db.instructions, { title: 'Nowa instrukcja', category: 'custom', order: 100 + all.length, steps: [], pitfalls: [], body: '', checkedStepIds: [] })
    navigate(`/instrukcje/${created.id}?edycja=1`)
  }

  return (
    <>
      <PageHeader
        title="Instrukcje"
        subtitle="Cały proces krok po kroku, typowe błędy i karta pielęgnacji dla klienta"
        actions={
          <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={addNew}>
            Nowa instrukcja
          </Button>
        }
      />

      <SectionTitle>Proces produkcji</SectionTitle>
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        {process.map((ins, i) => (
          <InstructionCard key={ins.id} ins={ins} index={i + 1} />
        ))}
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        {care && (
          <section>
            <SectionTitle
              actions={
                <ButtonLink to={`/instrukcje/${CARE_CARD_ID}?druk=1`} size="sm" variant="ghost" icon={<Printer className="h-4 w-4" />}>
                  Drukuj
                </ButtonLink>
              }
            >
              Karta pielęgnacji dla klienta
            </SectionTitle>
            <Link to={`/instrukcje/${care.id}`} className="block">
              <Card className="relative overflow-hidden transition hover:ring-moss-300">
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-moss-100" />
                <CardBody className="relative">
                  <div className="mb-3 flex items-center gap-2 text-moss-700">
                    <HeartHandshake className="h-5 w-5" />
                    <span className="text-sm font-semibold">Dołącz do każdej kuli</span>
                  </div>
                  <Markdown text={care.body ?? ''} className="line-clamp-[12] space-y-2 text-sm text-ink-700" />
                </CardBody>
              </Card>
            </Link>
          </section>
        )}

        <section>
          <SectionTitle>Typowe błędy</SectionTitle>
          <Card className="divide-y divide-ink-100 overflow-hidden">
            {pitfalls.map((p) => (
              <details key={p.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-ink-50">
                  <TriangleAlert className="h-4.5 w-4.5 shrink-0 text-clay-500" />
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-ink-900">{p.title}</span>
                  <span className="hidden text-xs text-ink-400 sm:inline">{p.from.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 transition group-open:rotate-90" />
                </summary>
                <p className="px-4 pb-4 pl-11 text-sm leading-relaxed text-ink-600">
                  {p.text}{' '}
                  <Link to={`/instrukcje/${p.from.id}`} className="font-medium text-moss-700 hover:underline">
                    {p.from.title} →
                  </Link>
                </p>
              </details>
            ))}
          </Card>
        </section>
      </div>

      <SectionTitle>Moje instrukcje</SectionTitle>
      {custom.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {custom.map((ins) => (
            <InstructionCard key={ins.id} ins={ins} />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <BookOpen className="h-5 w-5 text-moss-600" />
            <p className="min-w-0 flex-1 text-sm text-ink-600">Dopisz własne instrukcje: drukowanie form, przygotowanie koktajlu z mchu, pakowanie zestawów…</p>
            <Button size="sm" onClick={addNew} icon={<Plus className="h-4 w-4" />}>
              Dodaj
            </Button>
          </CardBody>
        </Card>
      )}
    </>
  )
}

function InstructionCard({ ins, index }: { ins: Instruction; index?: number }) {
  const done = ins.checkedStepIds.filter((id) => ins.steps.some((s) => s.id === id)).length
  return (
    <Link to={`/instrukcje/${ins.id}`} className="group block">
      <Card className="h-full p-4 transition group-hover:ring-moss-300 sm:p-5">
        <div className="flex items-start gap-3">
          {index !== undefined ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moss-900 text-base font-semibold text-white">{index}</span>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moss-100 text-moss-800">
              <BookOpen className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 flex-1 text-base font-semibold text-ink-900">{ins.title}</h3>
              <ChevronRight className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-moss-600" />
            </div>
            {ins.duration && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                <Clock className="h-3.5 w-3.5" />
                {ins.duration}
              </p>
            )}
            {ins.summary && <p className="mt-2 line-clamp-2 text-sm text-ink-600">{ins.summary}</p>}
            {ins.steps.length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={done / ins.steps.length} height="h-1.5" />
                <span className="shrink-0 text-xs text-ink-500 tabular">
                  {done}/{ins.steps.length}
                </span>
              </div>
            )}
            {ins.pitfalls.length > 0 && <p className="mt-2 text-xs text-clay-600">{ins.pitfalls.length} {plural(ins.pitfalls.length, 'typowy błąd', 'typowe błędy', 'typowych błędów')}</p>}
          </div>
        </div>
      </Card>
    </Link>
  )
}
