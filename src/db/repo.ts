// Jedyne miejsce, które zapisuje encje. Ustawia id i znaczniki czasu, a przy usuwaniu
// zapisuje „nagrobek” w tabeli deletions – przyda się przy późniejszej synchronizacji.
import type { Table } from 'dexie'
import { db } from './db'
import { newId } from '@/lib/id'
import type { BaseEntity } from './types'

type NewEntity<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export async function createEntity<T extends BaseEntity>(table: Table<T, string>, data: NewEntity<T>): Promise<T> {
  const now = new Date().toISOString()
  const entity = { ...data, id: data.id ?? newId(), createdAt: now, updatedAt: now } as T
  await table.add(entity)
  return entity
}

export function buildEntity<T extends BaseEntity>(data: NewEntity<T>, now = new Date().toISOString()): T {
  return { ...data, id: data.id ?? newId(), createdAt: now, updatedAt: now } as T
}

export async function updateEntity<T extends BaseEntity>(table: Table<T, string>, id: string, changes: Partial<T>): Promise<void> {
  // Dexie typuje zmiany jako UpdateSpec; zwykły obiekt pól jest tu poprawny.
  await table.update(id, { ...changes, updatedAt: new Date().toISOString() } as never)
}

export async function deleteEntity<T extends BaseEntity>(table: Table<T, string>, id: string): Promise<void> {
  await db.transaction('rw', table, db.deletions, async () => {
    await table.delete(id)
    await db.deletions.put({ table: table.name, id, deletedAt: new Date().toISOString() })
  })
}

export async function deleteEntities<T extends BaseEntity>(table: Table<T, string>, ids: string[]): Promise<void> {
  if (!ids.length) return
  const now = new Date().toISOString()
  await db.transaction('rw', table, db.deletions, async () => {
    await table.bulkDelete(ids)
    await db.deletions.bulkPut(ids.map((id) => ({ table: table.name, id, deletedAt: now })))
  })
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}

export async function setKV(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value })
}

/** Przywraca usunięty rekord (np. „Cofnij”) i kasuje jego nagrobek */
export async function restoreEntity<T extends BaseEntity>(table: Table<T, string>, entity: T): Promise<void> {
  await db.transaction('rw', table, db.deletions, async () => {
    await table.put({ ...entity, updatedAt: new Date().toISOString() })
    await db.deletions.delete([table.name, entity.id])
  })
}
