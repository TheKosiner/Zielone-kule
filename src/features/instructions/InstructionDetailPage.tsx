import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowLeft, ArrowUp, Clock, Pencil, Plus, Printer, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { db } from '@/db/db'
import { deleteEntity, updateEntity } from '@/db/repo'
import type { Instruction } from '@/db/types'
import { originalInstruction } from '@/db/seedInstructions'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Form'
import { Callout, EmptyState, PageHeader, ProgressBar } from '@/components/ui/Misc'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { INSTRUCTION_CATEGORY_META } from '@/domain/constants'
import { useSettings } from '@/hooks/useSettings'
import { newId } from '@/lib/id'
import { Markdown } from '@/lib/markdown'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/cn'

export default function InstructionDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const ins = useLiveQuery(() => db.instructions.get(id), [id])
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (params.get('edycja')) {
      setEditing(true)
      setParams({}, { replace: true })
    }
    if (params.get('druk') && ins) {
      setParams({}, { replace: true })
      setTimeout(() => window.print(), 400)
    }
  }, [params, setParams, ins])

  if (ins === undefined) return null
  if (!ins) {
    return (
      <Card>
        <EmptyState title="Nie ma takiej instrukcji" action={<Link to="/instrukcje" className="font-medium text-moss-800 underline">Wróć do instrukcji</Link>} />
      </Card>
    )
  }

  return editing ? <InstructionEditor ins={ins} onDone={() => setEditing(false)} /> : <InstructionView ins={ins} onEdit={() => setEditing(true)} />
}

function InstructionView({ ins, onEdit }: { ins: Instruction; onEdit: () => void }) {
  const toast = useToast()
  const checked = new Set(ins.checkedStepIds)
  const done = ins.steps.filter((s) => checked.has(s.id)).length
  const isCare = ins.category === 'care'

  const toggle = async (stepId: string) => {
    const next = checked.has(stepId) ? ins.checkedStepIds.filter((x) => x !== stepId) : [...ins.checkedStepIds, stepId]
    await updateEntity<Instruction>(db.instructions, ins.id, { checkedStepIds: next })
    if (next.length === ins.steps.length && !checked.has(stepId)) toast.show('Wszystkie kroki zrobione')
  }

  return (
    <>
      <div className="no-print">
        <Link to="/instrukcje" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-4 w-4" /> Instrukcje
        </Link>
        <PageHeader
          eyebrow={INSTRUCTION_CATEGORY_META[ins.category].label}
          title={ins.title}
          subtitle={
            ins.duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {ins.duration}
              </span>
            )
          }
          actions={
            <>
              {isCare && (
                <Button variant="primary" icon={<Printer className="h-4.5 w-4.5" />} onClick={() => window.print()}>
                  Drukuj kartę
                </Button>
              )}
              <Button icon={<Pencil className="h-4.5 w-4.5" />} onClick={onEdit}>
                Edytuj
              </Button>
            </>
          }
        />
      </div>

      {isCare ? (
        <CareCard ins={ins} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            {ins.summary && (
              <Callout tone="moss" className="text-[15px]">
                {ins.summary}
              </Callout>
            )}
            {ins.steps.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader
                  title="Checklista"
                  subtitle={`${done} z ${ins.steps.length} kroków`}
                  actions={
                    done > 0 && (
                      <Button size="sm" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => updateEntity<Instruction>(db.instructions, ins.id, { checkedStepIds: [] })}>
                        Od nowa
                      </Button>
                    )
                  }
                />
                <div className="px-4 pt-3 sm:px-5">
                  <ProgressBar value={ins.steps.length ? done / ins.steps.length : 0} height="h-1.5" />
                </div>
                <ol className="mt-2 divide-y divide-ink-100">
                  {ins.steps.map((s, i) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition hover:bg-ink-50 sm:px-5">
                        <Checkbox size="lg" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                        <span className={cn('pt-0.5 text-[15px] leading-relaxed', checked.has(s.id) ? 'text-ink-400 line-through decoration-ink-300' : 'text-ink-800')}>
                          <span className="mr-1.5 font-semibold text-moss-700 tabular">{i + 1}.</span>
                          {s.text}
                        </span>
                      </label>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
            {ins.body && (
              <Card>
                <CardBody>
                  <Markdown text={ins.body} />
                </CardBody>
              </Card>
            )}
          </div>
          {ins.pitfalls.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-clay-700 uppercase">
                <TriangleAlert className="h-4 w-4" /> Typowe błędy
              </h2>
              {ins.pitfalls.map((p) => (
                <Card key={p.id} className="p-4 ring-clay-100">
                  <h3 className="text-[15px] font-semibold text-ink-900">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{p.text}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/** Karta pielęgnacji: podgląd na ekranie, przy druku dwie karty A5 na kartce A4 z linią cięcia */
function CareCard({ ins }: { ins: Instruction }) {
  const settings = useSettings()
  const card = (
    <div className="flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-ink-150 print:rounded-none print:p-[10mm] print:ring-0">
      <div className="mb-4 flex items-center gap-3 border-b border-moss-200 pb-4">
        <Logo className="h-11 w-11" />
        <div>
          <div className="text-lg leading-tight font-semibold text-moss-900">{settings.brandName}</div>
          <div className="text-xs tracking-wide text-moss-600 uppercase">Karta pielęgnacji</div>
        </div>
      </div>
      <Markdown text={ins.body ?? ''} className="space-y-3 text-[14px] text-ink-800 [&_strong]:text-moss-900" />
      <div className="mt-auto pt-4 text-xs text-ink-500">Dziękuję za zakup rękodzieła! Podziel się zdjęciem kuli w swoim ogrodzie.</div>
    </div>
  )
  return (
    <>
      <div className="no-print mx-auto max-w-xl">
        <div className="shadow-pop">{card}</div>
        <p className="mt-4 text-center text-sm text-ink-500">Na wydruku zmieszczą się dwie karty A5 na jednej kartce A4. Treść zmienisz przyciskiem „Edytuj”.</p>
      </div>
      <div className="print-only">
        <div className="flex h-[267mm] flex-col">
          <div className="h-1/2 border-b border-dashed border-ink-300">{card}</div>
          <div className="h-1/2">{card}</div>
        </div>
      </div>
    </>
  )
}

function InstructionEditor({ ins, onDone }: { ins: Instruction; onDone: () => void }) {
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [d, setD] = useState<Instruction>(() => structuredClone(ins))
  const original = ins.builtIn ? originalInstruction(ins.id) : null

  const move = <K extends 'steps' | 'pitfalls'>(key: K, index: number, dir: number) => {
    const arr = [...d[key]] as Instruction[K]
    const j = index + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[index], arr[j]] = [arr[j], arr[index]]
    setD({ ...d, [key]: arr })
  }

  const save = async () => {
    await updateEntity<Instruction>(db.instructions, ins.id, {
      title: d.title.trim() || 'Bez tytułu',
      summary: d.summary?.trim() || undefined,
      duration: d.duration?.trim() || undefined,
      steps: d.steps.filter((s) => s.text.trim()),
      pitfalls: d.pitfalls.filter((p) => p.title.trim() || p.text.trim()),
      body: d.body,
    })
    toast.show('Zapisano instrukcję')
    onDone()
  }

  const remove = async () => {
    if (!(await confirm({ title: 'Usunąć instrukcję?', confirmLabel: 'Usuń', tone: 'danger' }))) return
    await deleteEntity(db.instructions, ins.id)
    navigate('/instrukcje')
  }

  const restore = async () => {
    if (!original || !(await confirm({ title: 'Przywrócić oryginalną treść?', message: 'Twoje zmiany w tej instrukcji zostaną zastąpione treścią z biznesplanu.', confirmLabel: 'Przywróć' }))) return
    setD({ ...original, id: ins.id, createdAt: ins.createdAt })
  }

  return (
    <>
      <PageHeader
        title="Edycja instrukcji"
        subtitle={ins.title}
        actions={
          <>
            <Button onClick={onDone}>Anuluj</Button>
            <Button variant="primary" onClick={save}>
              Zapisz
            </Button>
          </>
        }
      />
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            <Field label="Tytuł">
              <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            </Field>
            {d.category !== 'care' && (
              <>
                <Field label="Czas" optional>
                  <Input value={d.duration ?? ''} onChange={(e) => setD({ ...d, duration: e.target.value })} placeholder="np. 1–2 tygodnie · ok. 5 min na kulę" />
                </Field>
                <Field label="Krótko" optional>
                  <Textarea value={d.summary ?? ''} onChange={(e) => setD({ ...d, summary: e.target.value })} rows={2} />
                </Field>
              </>
            )}
          </CardBody>
        </Card>

        {d.category !== 'care' && (
          <Card>
            <CardHeader title="Kroki (checklista)" />
            <CardBody className="space-y-2">
              {d.steps.map((s, i) => (
                <div key={s.id} className="flex items-start gap-1.5">
                  <span className="mt-3 w-6 shrink-0 text-right text-sm font-semibold text-moss-700 tabular">{i + 1}.</span>
                  <Textarea rows={1} value={s.text} onChange={(e) => setD({ ...d, steps: d.steps.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)) })} className="min-h-11" />
                  <div className="flex shrink-0">
                    <IconButton label="W górę" size="sm" onClick={() => move('steps', i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="W dół" size="sm" onClick={() => move('steps', i, 1)} disabled={i === d.steps.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Usuń krok" size="sm" onClick={() => setD({ ...d, steps: d.steps.filter((x) => x.id !== s.id) })}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setD({ ...d, steps: [...d.steps, { id: newId(), text: '' }] })}>
                Dodaj krok
              </Button>
            </CardBody>
          </Card>
        )}

        {d.category !== 'care' && (
          <Card>
            <CardHeader title="Typowe błędy" />
            <CardBody className="space-y-3">
              {d.pitfalls.map((p) => (
                <div key={p.id} className="space-y-2 rounded-xl bg-clay-50/60 p-3 ring-1 ring-clay-100 ring-inset">
                  <div className="flex gap-2">
                    <Input value={p.title} placeholder="Nazwa problemu" onChange={(e) => setD({ ...d, pitfalls: d.pitfalls.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)) })} />
                    <IconButton label="Usuń" onClick={() => setD({ ...d, pitfalls: d.pitfalls.filter((x) => x.id !== p.id) })}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <Textarea rows={2} value={p.text} placeholder="Jak go uniknąć" onChange={(e) => setD({ ...d, pitfalls: d.pitfalls.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)) })} />
                </div>
              ))}
              <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setD({ ...d, pitfalls: [...d.pitfalls, { id: newId(), title: '', text: '' }] })}>
                Dodaj błąd
              </Button>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title={d.category === 'care' ? 'Treść karty' : 'Dodatkowe notatki'} subtitle="Formatowanie: ## nagłówek, - lista, **pogrubienie**" />
          <CardBody>
            <Textarea rows={d.category === 'care' ? 14 : 6} value={d.body ?? ''} onChange={(e) => setD({ ...d, body: e.target.value })} className="font-mono text-sm" />
            {d.body && (
              <div className="mt-4 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-150 ring-inset">
                <div className="mb-2 text-xs font-semibold tracking-wide text-ink-400 uppercase">Podgląd</div>
                <Markdown text={d.body} />
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {original && (
              <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={restore}>
                Przywróć oryginał
              </Button>
            )}
            {!ins.builtIn && (
              <Button variant="danger-soft" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Usuń instrukcję
              </Button>
            )}
          </div>
          <Button variant="primary" onClick={save}>
            Zapisz
          </Button>
        </div>
      </div>
    </>
  )
}
