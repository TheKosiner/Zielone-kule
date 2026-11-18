import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { NotebookPen, Plus, Search, Trash2, X } from 'lucide-react'
import { db } from '@/db/db'
import { createEntity, deleteEntity, updateEntity } from '@/db/repo'
import type { JournalEntry } from '@/db/types'
import { useSettings } from '@/hooks/useSettings'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, FormGrid, Input, Select, Textarea } from '@/components/ui/Form'
import { Chip, EmptyState, PageHeader } from '@/components/ui/Misc'
import { Sheet, SheetFooter } from '@/components/ui/Sheet'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { PhotoGallery } from '@/components/Photos'
import { formatDateWithWeekday, formatMonth, monthKey, todayISO } from '@/lib/dates'
import { newId } from '@/lib/id'

export default function JournalPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; entry: JournalEntry | null }>({ open: false, entry: null })

  const entries = useLiveQuery(() => db.journal.orderBy('date').reverse().toArray(), [])
  const batches = useLiveQuery(() => db.batches.toArray(), [])
  const batchById = useMemo(() => new Map((batches ?? []).map((b) => [b.id, b])), [batches])

  useEffect(() => {
    if (params.get('nowy')) {
      setForm({ open: true, entry: null })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  if (!entries) return null

  const allTags = [...new Set(entries.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b, 'pl'))
  const q = query.trim().toLowerCase()
  const filtered = entries.filter((e) => (!tag || e.tags.includes(tag)) && (!q || `${e.title ?? ''} ${e.text}`.toLowerCase().includes(q)))
  const groups = new Map<string, JournalEntry[]>()
  for (const e of filtered) groups.set(monthKey(e.date), [...(groups.get(monthKey(e.date)) ?? []), e])

  return (
    <>
      <PageHeader
        title="Dziennik"
        subtitle="Co robisz, co działa, a co nie. Notatki z datą, zdjęciami i tagami."
        actions={
          <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={() => setForm({ open: true, entry: null })}>
            Nowy wpis
          </Button>
        }
      />

      {entries.length > 0 && (
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj w dzienniku…" className="pl-10" />
            {query && (
              <IconButton label="Wyczyść" size="sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setQuery('')}>
                <X className="h-4 w-4" />
              </IconButton>
            )}
          </div>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={!tag} onClick={() => setTag(null)}>
              Wszystkie
            </Chip>
            {allTags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {!entries.length ? (
        <Card>
          <EmptyState
            icon={<NotebookPen className="h-7 w-7" />}
            title="Dziennik jest pusty"
            text="Zapisuj testy receptur, obserwacje mchu, pomysły i wnioski ze sprzedaży. Po kilku partiach to będzie Twoja najcenniejsza instrukcja."
            action={
              <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={() => setForm({ open: true, entry: null })}>
                Pierwszy wpis
              </Button>
            }
          />
        </Card>
      ) : !filtered.length ? (
        <p className="py-10 text-center text-sm text-ink-500">Nic nie pasuje do filtrów.</p>
      ) : (
        <div className="space-y-7">
          {[...groups.entries()].map(([month, rows]) => (
            <section key={month}>
              <h2 className="mb-3 px-1 text-sm font-semibold text-ink-500 first-letter:uppercase">{formatMonth(`${month}-01`)}</h2>
              <div className="relative space-y-3 border-l-2 border-moss-200 pl-5 sm:pl-6">
                {rows.map((e) => {
                  const batch = e.batchId ? batchById.get(e.batchId) : undefined
                  return (
                    <article key={e.id} className="relative">
                      <span className="absolute top-5 -left-[27px] h-3 w-3 rounded-full bg-moss-600 ring-4 ring-moss-50 sm:-left-[31px]" />
                      <Card className="cursor-pointer p-4 transition hover:ring-moss-300 sm:p-5" onClick={() => setForm({ open: true, entry: e })}>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-xs font-medium text-ink-500 first-letter:uppercase">{formatDateWithWeekday(e.date, true)}</span>
                          {batch && (
                            <Link to={`/partie/${batch.id}`} onClick={(ev) => ev.stopPropagation()} className="rounded-full bg-moss-100 px-2 py-0.5 text-xs font-semibold text-moss-800 hover:bg-moss-200">
                              Partia #{batch.number}
                            </Link>
                          )}
                        </div>
                        {e.title && <h3 className="mt-1.5 text-base font-semibold text-ink-900">{e.title}</h3>}
                        <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-ink-700">{e.text}</p>
                        <div onClick={(ev) => ev.stopPropagation()} className="mt-3 empty:hidden">
                          <PhotoGallery ownerType="journal" ownerId={e.id} compact editable={false} />
                        </div>
                        {e.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {e.tags.map((t) => (
                              <span key={t} className="rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-medium text-cream-800">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <JournalForm open={form.open} entry={form.entry} onClose={() => setForm({ open: false, entry: null })} />
    </>
  )
}

function JournalForm({ open, entry, onClose }: { open: boolean; entry: JournalEntry | null; onClose: () => void }) {
  const settings = useSettings()
  const toast = useToast()
  const confirm = useConfirm()
  const batches = useLiveQuery(() => db.batches.orderBy('number').reverse().toArray(), [])
  const [draft, setDraft] = useState({ date: todayISO(), title: '', text: '', tags: [] as string[], batchId: '' })
  const [newTag, setNewTag] = useState('')
  // nowy wpis dostaje id od razu, żeby można było dodać zdjęcia przed zapisem
  const [draftId, setDraftId] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setTried(false)
    setNewTag('')
    if (entry) {
      setDraft({ date: entry.date, title: entry.title ?? '', text: entry.text, tags: entry.tags, batchId: entry.batchId ?? '' })
      setDraftId(entry.id)
    } else {
      setDraft({ date: todayISO(), title: '', text: '', tags: [], batchId: '' })
      setDraftId(newId())
    }
  }, [open, entry])

  const tagOptions = [...new Set([...settings.journalTags, ...draft.tags])]
  const toggleTag = (t: string) => setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }))

  const close = async (saved: boolean) => {
    // porzucony nowy wpis: usuwamy dodane do niego zdjęcia
    if (!saved && !entry && draftId) await db.photos.where('ownerId').equals(draftId).delete()
    onClose()
  }

  const save = async () => {
    setTried(true)
    if (!draft.text.trim() || !draftId) return
    const data = { date: draft.date, title: draft.title.trim() || undefined, text: draft.text.trim(), tags: draft.tags, batchId: draft.batchId || null }
    if (entry) await updateEntity<JournalEntry>(db.journal, entry.id, data)
    else await createEntity<JournalEntry>(db.journal, { ...data, id: draftId })
    toast.show(entry ? 'Zapisano wpis' : 'Dodano wpis do dziennika')
    await close(true)
  }

  const remove = async () => {
    if (!entry || !(await confirm({ title: 'Usunąć wpis?', confirmLabel: 'Usuń', tone: 'danger' }))) return
    await deleteEntity(db.journal, entry.id)
    await db.photos.where('ownerId').equals(entry.id).delete()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={() => close(false)}
      onSubmit={save}
      size="lg"
      title={entry ? 'Wpis w dzienniku' : 'Nowy wpis'}
      footer={
        <SheetFooter className="justify-between">
          <div>
            {entry && (
              <Button variant="danger-soft" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Usuń
              </Button>
            )}
          </div>
          <Button type="submit" variant="primary" className="min-w-28">
            Zapisz
          </Button>
        </SheetFooter>
      }
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Data">
            <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value || todayISO() })} />
          </Field>
          <Field label="Partia" optional>
            <Select value={draft.batchId} onChange={(e) => setDraft({ ...draft, batchId: e.target.value })}>
              <option value="">— bez partii —</option>
              {batches?.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.number}
                  {b.name ? ` · ${b.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Tytuł" optional>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="np. Test: mniej perlitu" />
        </Field>
        <Field label="Treść" error={tried && !draft.text.trim() ? 'Wpisz treść.' : null}>
          <Textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} rows={6} placeholder="Co zrobione, co wyszło, co zmienić następnym razem…" />
        </Field>
        <Field label="Tagi">
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((t) => (
              <Chip key={t} active={draft.tags.includes(t)} onClick={() => toggleTag(t)}>
                #{t}
              </Chip>
            ))}
          </div>
          <div className="mt-2 flex gap-2 sm:max-w-xs">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="nowy tag"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const t = newTag.trim().toLowerCase()
                  if (t && !draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] })
                  setNewTag('')
                }
              }}
            />
          </div>
        </Field>
        {draftId && (
          <Field label="Zdjęcia">
            <PhotoGallery ownerType="journal" ownerId={draftId} />
          </Field>
        )}
      </div>
    </Sheet>
  )
}
