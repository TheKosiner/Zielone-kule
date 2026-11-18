// Zapis sprzedaży razem ze statusami kul (sprzedana ↔ gotowa).
import { db } from '@/db/db'
import { buildEntity } from '@/db/repo'
import type { Ball, Sale } from '@/db/types'
import { todayISO } from '@/lib/dates'

export type SaleInput = Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>

export async function saveSale(input: SaleInput, existing?: Sale | null): Promise<Sale> {
  const now = new Date().toISOString()
  const sale: Sale = existing ? { ...existing, ...input, updatedAt: now } : buildEntity<Sale>(input, now)
  const before = new Set(existing?.ballIds ?? [])
  const after = new Set(sale.ballIds)
  await db.transaction('rw', db.sales, db.balls, async () => {
    await db.sales.put(sale)
    const released = [...before].filter((id) => !after.has(id))
    const taken = [...after]
    const balls = await db.balls.bulkGet([...released, ...taken])
    const updates: Ball[] = []
    for (const b of balls) {
      if (!b) continue
      if (after.has(b.id)) {
        if (b.status !== 'sold' || b.saleId !== sale.id) updates.push({ ...b, status: 'sold', saleId: sale.id, statusChangedAt: sale.date, updatedAt: now })
      } else if (b.saleId === sale.id) {
        updates.push({ ...b, status: 'ready', saleId: null, statusChangedAt: todayISO(), updatedAt: now })
      }
    }
    await db.balls.bulkPut(updates)
  })
  return sale
}

export async function deleteSale(sale: Sale): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction('rw', db.sales, db.balls, db.deletions, async () => {
    const balls = (await db.balls.bulkGet(sale.ballIds)).filter((b): b is Ball => !!b && b.saleId === sale.id)
    await db.balls.bulkPut(balls.map((b) => ({ ...b, status: 'ready' as const, saleId: null, statusChangedAt: todayISO(), updatedAt: now })))
    await db.sales.delete(sale.id)
    await db.deletions.put({ table: 'sales', id: sale.id, deletedAt: now })
  })
}
