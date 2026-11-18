import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Eraser, HardDrive, Share2, ShieldCheck, Sprout, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Form'
import { Callout } from '@/components/ui/Misc'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { db } from '@/db/db'
import { backupFileName, exportBackup, importBackup, parseBackup, summarizeBackup } from '@/db/backup'
import { clearSampleData, countSampleData, loadSampleData, resetAll } from '@/db/seed'
import { setKV } from '@/db/repo'
import { downloadBlob } from '@/lib/download'
import { formatTimestamp } from '@/lib/dates'
import { formatNumber } from '@/lib/format'
import { SettingsSection } from './SettingsSection'

const TABLE_LABELS: Record<string, string> = {
  batches: 'partie',
  balls: 'kule',
  events: 'zadania',
  journal: 'wpisy dziennika',
  expenses: 'wydatki',
  planned: 'zakupy planowane',
  sales: 'sprzedaże',
  instructions: 'instrukcje',
  photos: 'zdjęcia',
  workSessions: 'czasy pracy',
  measurements: 'pomiary',
}

export function DataSettings() {
  const toast = useToast()
  const confirm = useConfirm()
  const [withPhotos, setWithPhotos] = useState(true)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastBackup = useLiveQuery(async () => (await db.kv.get('lastBackupAt'))?.value as string | undefined, [])
  const sampleCount = useLiveQuery(() => countSampleData(), [])
  const photoCount = useLiveQuery(() => db.photos.count(), [])
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<number | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
    navigator.storage?.estimate?.().then((e) => setUsage(e.usage ?? null)).catch(() => undefined)
  }, [])

  const makeFile = async () => {
    const backup = await exportBackup(withPhotos)
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    return new File([blob], backupFileName(), { type: 'application/json' })
  }

  const download = async () => {
    setBusy(true)
    try {
      const file = await makeFile()
      downloadBlob(file, file.name)
      await setKV('lastBackupAt', new Date().toISOString())
      toast.show(`Pobrano kopię (${formatNumber(file.size / 1024 / 1024, 1)} MB)`)
    } finally {
      setBusy(false)
    }
  }

  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator
  const share = async () => {
    setBusy(true)
    try {
      const file = await makeFile()
      if (!navigator.canShare?.({ files: [file] })) {
        downloadBlob(file, file.name)
      } else {
        await navigator.share({ files: [file], title: 'Kopia zapasowa – Zielone Kule' })
      }
      await setKV('lastBackupAt', new Date().toISOString())
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.show('Nie udało się udostępnić pliku', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const onImport = async (file: File) => {
    try {
      const parsed = parseBackup(await file.text())
      const sum = summarizeBackup(parsed)
      const list = Object.entries(sum.counts)
        .filter(([k, n]) => n && TABLE_LABELS[k])
        .map(([k, n]) => `${n} ${TABLE_LABELS[k]}`)
        .join(', ')
      const ok = await confirm({
        title: 'Przywrócić dane z kopii?',
        message: (
          <>
            <p>
              Kopia z <strong>{formatTimestamp(sum.exportedAt)}</strong>: {list || 'pusta'}.
            </p>
            <p className="mt-2">Wszystkie obecne dane na tym urządzeniu zostaną zastąpione.{!sum.includesPhotos && ' Kopia nie zawiera zdjęć, więc obecne zdjęcia zostaną.'}</p>
          </>
        ),
        confirmLabel: 'Przywróć',
        tone: 'danger',
      })
      if (!ok) return
      setBusy(true)
      await importBackup(parsed)
      toast.show('Przywrócono dane z kopii')
    } catch (e) {
      toast.show((e as Error).message, { tone: 'error', duration: 6000 })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const clearSamples = async () => {
    const ok = await confirm({
      title: 'Wyczyścić dane przykładowe?',
      message: 'Znikną przykładowe partie, kule, wydatki, sprzedaże i wpisy. Ustawienia, instrukcje, lista zakupów z biznesplanu i Twoje własne wpisy zostaną.',
      confirmLabel: 'Wyczyść',
      tone: 'danger',
    })
    if (!ok) return
    const n = await clearSampleData()
    toast.show(`Usunięto ${n} przykładowych rekordów`)
  }

  const wipe = async () => {
    const ok = await confirm({
      title: 'Usunąć wszystkie dane?',
      message: 'Aplikacja wróci do stanu początkowego z biznesplanu, bez danych przykładowych. Tego nie da się cofnąć – najpierw pobierz kopię zapasową.',
      confirmLabel: 'Usuń wszystko',
      tone: 'danger',
    })
    if (!ok) return
    await resetAll(false)
    toast.show('Wyczyszczono dane')
  }

  const requestPersist = async () => {
    const granted = await navigator.storage?.persist?.()
    setPersisted(!!granted)
    toast.show(granted ? 'Przeglądarka nie usunie danych samoczynnie' : 'Przeglądarka nie zgodziła się. Zainstaluj aplikację na ekranie głównym i spróbuj ponownie.', { tone: granted ? 'success' : 'info' })
  }

  return (
    <SettingsSection id="dane" title="Dane i kopia zapasowa" description="Wszystko jest zapisane tylko w tej przeglądarce. Kopia zapasowa to jeden plik JSON, który możesz przenieść na inne urządzenie.">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={<Download className="h-4.5 w-4.5" />} onClick={download} disabled={busy}>
              Pobierz kopię zapasową
            </Button>
            {canShare && (
              <Button icon={<Share2 className="h-4.5 w-4.5" />} onClick={share} disabled={busy}>
                Wyślij / zapisz na Dysku
              </Button>
            )}
          </div>
          <Toggle className="mt-3" checked={withPhotos} onChange={setWithPhotos} label="Ze zdjęciami" description={photoCount ? `${photoCount} zdjęć – plik będzie większy` : 'Na razie brak zdjęć'} />
          <p className="mt-2 text-sm text-ink-500">{lastBackup ? `Ostatnia kopia: ${formatTimestamp(lastBackup)}` : 'Nie zrobiono jeszcze kopii zapasowej.'}</p>
        </div>

        <div className="border-t border-ink-100 pt-5">
          <h3 className="mb-1 text-sm font-semibold text-ink-800">Przywróć z kopii</h3>
          <p className="mb-3 text-sm text-ink-500">Wybierz plik .json pobrany wcześniej z tej aplikacji.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          <Button icon={<Upload className="h-4.5 w-4.5" />} onClick={() => fileRef.current?.click()} disabled={busy}>
            Wybierz plik kopii
          </Button>
        </div>

        <div className="border-t border-ink-100 pt-5">
          <h3 className="mb-1 text-sm font-semibold text-ink-800">Trwałość danych</h3>
          {persisted ? (
            <Callout tone="moss" icon={<ShieldCheck className="h-4.5 w-4.5" />}>
              Przeglądarka nie usunie tych danych samoczynnie.
            </Callout>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">Przy braku miejsca przeglądarka może usunąć dane stron. Poproś ją o trwałe przechowywanie (najlepiej działa po instalacji aplikacji).</p>
              <Button icon={<HardDrive className="h-4.5 w-4.5" />} onClick={requestPersist}>
                Chroń dane
              </Button>
            </div>
          )}
          {usage !== null && <p className="mt-2 text-xs text-ink-400">Zajęte miejsce: {formatNumber(usage / 1024 / 1024, 1)} MB</p>}
        </div>

        <div className="border-t border-ink-100 pt-5">
          <h3 className="mb-1 text-sm font-semibold text-ink-800">Dane przykładowe</h3>
          <p className="mb-3 text-sm text-ink-500">{sampleCount ? `W aplikacji jest ${sampleCount} przykładowych wpisów do oglądania.` : 'Brak danych przykładowych.'}</p>
          <div className="flex flex-wrap gap-2">
            {sampleCount ? (
              <Button variant="warm" icon={<Eraser className="h-4.5 w-4.5" />} onClick={clearSamples}>
                Wyczyść dane przykładowe
              </Button>
            ) : (
              <Button
                variant="soft"
                icon={<Sprout className="h-4.5 w-4.5" />}
                onClick={async () => {
                  await loadSampleData()
                  toast.show('Wczytano dane przykładowe – znajdziesz je oznaczone jako „przykład”')
                }}
              >
                Wczytaj dane przykładowe
              </Button>
            )}
            <Button variant="danger-soft" icon={<Trash2 className="h-4.5 w-4.5" />} onClick={wipe}>
              Usuń wszystkie dane
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
