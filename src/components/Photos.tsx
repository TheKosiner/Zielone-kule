import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { db } from '@/db/db'
import type { Photo, PhotoOwner } from '@/db/types'
import { addPhotos, deletePhoto } from '@/domain/photos'
import { useObjectUrl } from '@/hooks/usePhotoUrl'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { formatTimestamp } from '@/lib/dates'
import { cn } from '@/lib/cn'

function Thumb({ photo, onClick, className }: { photo: Photo; onClick?: () => void; className?: string }) {
  const url = useObjectUrl(photo.thumb)
  return (
    <button onClick={onClick} className={cn('group relative aspect-square overflow-hidden rounded-xl bg-ink-100 ring-1 ring-ink-150', className)}>
      {url && <img src={url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />}
    </button>
  )
}

interface PhotoGalleryProps {
  ownerType: PhotoOwner
  ownerId: string
  editable?: boolean
  /** mały pasek miniatur (np. w liście dziennika) */
  compact?: boolean
  sample?: boolean
}

export function PhotoGallery({ ownerType, ownerId, editable = true, compact, sample }: PhotoGalleryProps) {
  const photos = useLiveQuery(() => db.photos.where('ownerId').equals(ownerId).sortBy('createdAt'), [ownerId])
  const [viewer, setViewer] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const ids = await addPhotos(ownerType, ownerId, files)
      if (sample) await db.photos.bulkUpdate(ids.map((key) => ({ key, changes: { sample: true } })))
      toast.show(ids.length === 1 ? 'Dodano zdjęcie' : `Dodano ${ids.length} zdjęć`)
    } catch (e) {
      toast.show(`Nie udało się dodać zdjęcia: ${(e as Error).message}`, { tone: 'error' })
    } finally {
      setBusy(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (galleryRef.current) galleryRef.current.value = ''
    }
  }

  if (!photos) return null
  if (compact) {
    if (!photos.length) return null
    return (
      <>
        <div className="flex gap-1.5">
          {photos.slice(0, 4).map((p, i) => (
            <Thumb key={p.id} photo={p} className="h-16 w-16" onClick={() => setViewer(i)} />
          ))}
          {photos.length > 4 && <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-ink-100 text-sm font-medium text-ink-600">+{photos.length - 4}</div>}
        </div>
        {viewer !== null && <Lightbox photos={photos} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} editable={editable} />}
      </>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {photos.map((p, i) => (
          <Thumb key={p.id} photo={p} onClick={() => setViewer(i)} />
        ))}
        {editable && (
          <div className="col-span-1 grid aspect-square grid-rows-2 gap-1.5">
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-moss-100 text-sm font-medium text-moss-900 transition hover:bg-moss-200 active:scale-[0.97]"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              <span className="hidden sm:inline">Aparat</span>
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-ink-50 text-sm font-medium text-ink-700 ring-1 ring-ink-200 transition ring-inset hover:bg-white active:scale-[0.97]"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="hidden sm:inline">Galeria</span>
            </button>
          </div>
        )}
      </div>
      {!photos.length && !editable && <p className="text-sm text-ink-500">Brak zdjęć.</p>}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      {viewer !== null && photos[viewer] && <Lightbox photos={photos} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} editable={editable} />}
    </div>
  )
}

function Lightbox({ photos, index, onIndex, onClose, editable }: { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void; editable: boolean }) {
  const photo = photos[index]
  const url = useObjectUrl(photo?.blob)
  const confirm = useConfirm()
  if (!photo) return null
  const remove = async () => {
    if (!(await confirm({ title: 'Usunąć zdjęcie?', confirmLabel: 'Usuń', tone: 'danger' }))) return
    await deletePhoto(photo.id)
    if (photos.length <= 1) onClose()
    else onIndex(Math.max(0, index - 1))
  }
  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[55] flex flex-col bg-ink-950/95" role="dialog" aria-modal="true">
      <div className="flex items-center gap-2 p-3 text-white">
        <span className="flex-1 text-sm text-ink-300">
          {index + 1} / {photos.length} · {formatTimestamp(photo.createdAt)}
        </span>
        {editable && (
          <button onClick={remove} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Usuń zdjęcie">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Zamknij">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
        {url && <img src={url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />}
        {photos.length > 1 && (
          <>
            <button onClick={() => onIndex((index - 1 + photos.length) % photos.length)} className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white" aria-label="Poprzednie">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button onClick={() => onIndex((index + 1) % photos.length)} className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white" aria-label="Następne">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
