// Dane startowe z biznesplanu i dane przykładowe do oglądania.
// Startowe (ustawienia, lista zakupów, instrukcje) zostają po „Wyczyść dane przykładowe”.
// Przykładowe mają flagę sample: true.
import { db } from './db'
import { buildEntity, getKV, setKV } from './repo'
import { createDefaultSettings, withDefaults } from './defaults'
import type { Expense, PlannedPurchase } from './types'
import { addDays, todayISO } from '@/lib/dates'
import { seedDemoProduction } from './seedProduction'
import { createBuiltInInstructions } from './seedInstructions'

const allegro = (q: string) => `https://allegro.pl/listing?string=${encodeURIComponent(q)}`

export function startupPurchases(): PlannedPurchase[] {
  const rows: Omit<PlannedPurchase, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Kule styropianowe 12 cm (hurt)', category: 'materials', unitPrice: 6, quantity: 20, unit: 'szt.', costItemKey: 'core', ballsCovered: 20, priority: 'high', url: allegro('kula styropianowa 12 cm'), startup: true },
    { name: 'Filament na 2 dodatkowe formy', category: 'molds', unitPrice: 80, quantity: 1, unit: 'kg', costItemKey: 'mold', ballsCovered: 80, priority: 'high', url: allegro('filament PETG 1kg'), startup: true, note: 'ok. 80 odlewów' },
    { name: 'Kartony i wypełniacz', category: 'packaging', unitPrice: 6, quantity: 10, unit: 'szt.', costItemKey: 'packaging', ballsCovered: 10, priority: 'normal', url: allegro('karton wysyłkowy 25x25x25'), startup: true, note: '10 wysyłek, 3–4 cm wypełniacza z każdej strony' },
    { name: 'Mech (jeśli kupowany)', category: 'moss', unitPrice: 50, quantity: 1, unit: 'opak.', costItemKey: 'moss', ballsCovered: 10, priority: 'normal', url: allegro('mech żywy do terrarium'), startup: true, note: 'najbezpieczniej z hodowli' },
    { name: 'Papierki pH, olej, worki i folia', category: 'materials', unitPrice: 30, quantity: 1, unit: 'kpl.', costItemKey: 'misc', ballsCovered: 60, priority: 'high', url: allegro('papierki lakmusowe pH 1-14'), startup: true },
    { name: 'Perlit, worek 20 l', category: 'materials', unitPrice: 29, quantity: 1, unit: 'worek', costItemKey: 'perlite', ballsCovered: 20, priority: 'high', url: allegro('perlit ogrodniczy 20l'), startup: true },
    { name: 'Torf kwaśny, worek ok. 50 l', category: 'materials', unitPrice: 25, quantity: 1, unit: 'worek', costItemKey: 'peat', ballsCovered: 40, priority: 'high', url: allegro('torf kwaśny 50l'), startup: true },
    { name: 'Cement, worek 25 kg', category: 'materials', unitPrice: 21, quantity: 1, unit: 'worek', costItemKey: 'cement', ballsCovered: 20, priority: 'high', url: allegro('cement portlandzki 25kg'), startup: true },
    { name: 'Włókno polipropylenowe', category: 'materials', unitPrice: 20, quantity: 1, unit: 'opak.', costItemKey: 'fiber', ballsCovered: 60, priority: 'normal', url: allegro('włókno polipropylenowe do betonu'), startup: true },
  ]
  return rows.map((r) => buildEntity<PlannedPurchase>(r))
}

export function demoExpenses(today: string): Expense[] {
  const d = (n: number) => addDays(today, -n)
  const rows: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Kula styropianowa 12 cm (pojedynczo, test)', category: 'materials', unitPrice: 12.6, quantity: 5, unit: 'szt.', date: d(112), costItemKey: 'core', ballsCovered: 5, url: allegro('kula styropianowa 12 cm') },
    { name: 'Cement portlandzki CEM II 25 kg', category: 'materials', unitPrice: 21, quantity: 1, unit: 'worek', date: d(112), costItemKey: 'cement', ballsCovered: 20, url: 'https://www.leroymerlin.pl/' },
    { name: 'Perlit ogrodniczy 20 l', category: 'materials', unitPrice: 29, quantity: 1, unit: 'worek', date: d(111), costItemKey: 'perlite', ballsCovered: 20, url: 'https://www.kaufland.pl/' },
    { name: 'Torf kwaśny 50 l', category: 'materials', unitPrice: 25.99, quantity: 1, unit: 'worek', date: d(111), costItemKey: 'peat', ballsCovered: 40 },
    { name: 'Filament PETG 1 kg (forma)', category: 'molds', unitPrice: 79.9, quantity: 1, unit: 'kg', date: d(118), costItemKey: 'mold', ballsCovered: 80, url: allegro('filament PETG 1kg') },
    { name: 'Włókno polipropylenowe 0,6 kg', category: 'materials', unitPrice: 19.9, quantity: 1, unit: 'opak.', date: d(111), costItemKey: 'fiber', ballsCovered: 60, url: allegro('włókno polipropylenowe do betonu') },
    { name: 'Papierki pH 1–14 (100 szt.)', category: 'materials', unitPrice: 12.99, quantity: 1, unit: 'opak.', date: d(80), costItemKey: 'misc', ballsCovered: 40, url: allegro('papierki lakmusowe pH 1-14') },
    { name: 'Wazelina techniczna', category: 'materials', unitPrice: 9.5, quantity: 1, unit: 'szt.', date: d(112), costItemKey: 'misc', ballsCovered: 30 },
    { name: 'Szczotka druciana', category: 'tools', unitPrice: 14.99, quantity: 1, unit: 'szt.', date: d(110), url: 'https://www.castorama.pl/' },
    { name: 'Spryskiwacz ciśnieniowy 2 l', category: 'tools', unitPrice: 34.9, quantity: 1, unit: 'szt.', date: d(108), url: allegro('opryskiwacz ciśnieniowy 2l') },
    { name: 'Mech z hodowli', category: 'moss', unitPrice: 45, quantity: 1, unit: 'opak.', date: d(55), costItemKey: 'moss', ballsCovered: 8, url: allegro('mech żywy do terrarium') },
    { name: 'Kula styropianowa 12 cm (hurt)', category: 'materials', unitPrice: 6.2, quantity: 10, unit: 'szt.', date: d(72), costItemKey: 'core', ballsCovered: 10, url: allegro('kula styropianowa 12 cm 10 szt') },
    { name: 'Kartony 25×25×25 i wypełniacz', category: 'packaging', unitPrice: 5.8, quantity: 10, unit: 'szt.', date: d(12), costItemKey: 'packaging', ballsCovered: 10, url: allegro('karton wysyłkowy 25x25x25') },
    { name: 'Worki strunowe i folia', category: 'materials', unitPrice: 15, quantity: 1, unit: 'kpl.', date: d(95), costItemKey: 'misc', ballsCovered: 30 },
    { name: 'Wizytówki z kodem QR', category: 'marketing', unitPrice: 39, quantity: 1, unit: 'kpl.', date: d(5), url: 'https://www.vistaprint.pl/' },
  ]
  return rows.map((r) => buildEntity<Expense>({ ...r, sample: true }))
}

export const SEED_VERSION = 1

let seeding: Promise<void> | null = null

/** Przy pierwszym uruchomieniu wypełnia bazę. Później nic nie robi. Bezpieczne przy wielokrotnym wywołaniu. */
export function ensureSeeded(): Promise<void> {
  seeding ??= doEnsureSeeded().finally(() => {
    seeding = null
  })
  return seeding
}

async function doEnsureSeeded(): Promise<void> {
  const existing = await db.settings.get('main')
  if (existing) return
  const seeded = await getKV<number>('seedVersion')
  if (seeded) {
    // Ktoś usunął ustawienia, ale zostawił resztę: odtwarzamy same ustawienia.
    await db.settings.put(createDefaultSettings())
    return
  }
  await seedAll()
}

export async function seedAll(withDemo = true): Promise<void> {
  const today = todayISO()
  const settings = createDefaultSettings()
  await db.transaction('rw', [db.settings, db.planned, db.expenses, db.instructions, db.kv], async () => {
    await db.settings.put(settings)
    await db.planned.bulkAdd(startupPurchases())
    await db.instructions.bulkAdd(createBuiltInInstructions())
    if (withDemo) await db.expenses.bulkAdd(demoExpenses(today))
    await setKV('seedVersion', SEED_VERSION)
  })
  if (withDemo) await seedDemoProduction(settings, today)
}

/** Ponownie wczytuje dane przykładowe (np. do testów po wyczyszczeniu) */
export async function loadSampleData(): Promise<void> {
  if ((await countSampleData()) > 0) return
  const today = todayISO()
  const settings = withDefaults(await db.settings.get('main'))
  await db.expenses.bulkAdd(demoExpenses(today))
  await seedDemoProduction(settings, today)
}

/** Usuwa wszystko, co ma flagę sample (w tym zdjęcia) */
export async function clearSampleData(): Promise<number> {
  let removed = 0
  const tables = [db.batches, db.balls, db.measurements, db.workSessions, db.events, db.journal, db.expenses, db.planned, db.sales, db.photos] as const
  await db.transaction('rw', [...tables], async () => {
    for (const table of tables) {
      const ids = (await (table as typeof db.expenses).filter((r) => !!r.sample).primaryKeys()) as string[]
      removed += ids.length
      await table.bulkDelete(ids)
    }
  })
  await setKV('sampleCleared', new Date().toISOString())
  return removed
}

export async function countSampleData(): Promise<number> {
  const tables = [db.batches, db.expenses, db.sales, db.journal, db.events]
  let n = 0
  for (const t of tables) n += await (t as typeof db.expenses).filter((r) => !!r.sample).count()
  return n
}

/** Usuwa wszystkie dane i wypełnia bazę od nowa (bez danych przykładowych) */
export async function resetAll(withDemo: boolean): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
  await seedAll(withDemo)
}
