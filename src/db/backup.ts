// Kopia zapasowa całej bazy do jednego pliku JSON (zdjęcia jako data URL).
import { db, DATA_TABLES, type DataTableName } from './db'
import type { Photo } from './types'
import { setKV } from './repo'

export const BACKUP_FORMAT = 'zielone-kule-backup'
export const BACKUP_VERSION = 1

interface SerializedPhoto extends Omit<Photo, 'blob' | 'thumb'> {
  blob: string
  thumb: string
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  includesPhotos: boolean
  tables: Partial<Record<DataTableName, unknown[]>>
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function exportBackup(includePhotos: boolean): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {}
  for (const name of DATA_TABLES) {
    if (name === 'photos') continue
    tables[name] = await db.table(name).toArray()
  }
  if (includePhotos) {
    const photos = await db.photos.toArray()
    tables.photos = await Promise.all(
      photos.map(async (p): Promise<SerializedPhoto> => ({ ...p, blob: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) })),
    )
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    includesPhotos: includePhotos,
    tables,
  }
}

export interface BackupSummary {
  exportedAt: string
  includesPhotos: boolean
  counts: Partial<Record<DataTableName, number>>
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('To nie jest poprawny plik JSON.')
  }
  const file = data as Partial<BackupFile>
  if (!file || file.format !== BACKUP_FORMAT || typeof file.tables !== 'object' || !file.tables) {
    throw new Error('To nie jest kopia zapasowa panelu Zielone Kule.')
  }
  if ((file.version ?? 0) > BACKUP_VERSION) {
    throw new Error('Kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.')
  }
  return file as BackupFile
}

export function summarizeBackup(file: BackupFile): BackupSummary {
  const counts: BackupSummary['counts'] = {}
  for (const name of DATA_TABLES) {
    const rows = file.tables[name]
    if (Array.isArray(rows)) counts[name] = rows.length
  }
  return { exportedAt: file.exportedAt, includesPhotos: file.includesPhotos, counts }
}

/** Zastępuje całą bazę zawartością kopii. Zdjęcia zostają, jeśli kopia ich nie zawiera. */
export async function importBackup(file: BackupFile): Promise<void> {
  const photoRows = file.includesPhotos && Array.isArray(file.tables.photos) ? (file.tables.photos as SerializedPhoto[]) : null
  const photos: Photo[] | null = photoRows
    ? await Promise.all(photoRows.map(async (p) => ({ ...p, blob: await dataUrlToBlob(p.blob), thumb: await dataUrlToBlob(p.thumb) })))
    : null

  const tables = DATA_TABLES.map((n) => db.table(n))
  await db.transaction('rw', [...tables, db.deletions], async () => {
    for (const name of DATA_TABLES) {
      if (name === 'photos' && !photos) continue
      await db.table(name).clear()
      const rows = name === 'photos' ? photos : file.tables[name]
      if (Array.isArray(rows) && rows.length) await db.table(name).bulkAdd(rows)
    }
    await db.deletions.clear()
  })
  await setKV('lastImportAt', new Date().toISOString())
}

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10)
  return `zielone-kule-kopia-${d}.json`
}
