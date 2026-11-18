import Dexie, { type Table } from 'dexie'
import type {
  Ball,
  Batch,
  CalendarEvent,
  Deletion,
  Expense,
  Instruction,
  JournalEntry,
  KV,
  Measurement,
  Photo,
  PlannedPurchase,
  Sale,
  Settings,
  WorkSession,
} from './types'

export class KuleDB extends Dexie {
  batches!: Table<Batch, string>
  balls!: Table<Ball, string>
  measurements!: Table<Measurement, string>
  workSessions!: Table<WorkSession, string>
  events!: Table<CalendarEvent, string>
  journal!: Table<JournalEntry, string>
  expenses!: Table<Expense, string>
  planned!: Table<PlannedPurchase, string>
  sales!: Table<Sale, string>
  instructions!: Table<Instruction, string>
  photos!: Table<Photo, string>
  settings!: Table<Settings, string>
  deletions!: Table<Deletion, [string, string]>
  kv!: Table<KV, string>

  constructor(name = 'zielone-kule') {
    super(name)
    this.version(1).stores({
      batches: 'id, number, castDate',
      balls: 'id, batchId, status, saleId',
      measurements: 'id, batchId, ballId, date',
      workSessions: 'id, batchId, date',
      events: 'id, date, batchId, source',
      journal: 'id, date, batchId, *tags',
      expenses: 'id, date, category, costItemKey',
      planned: 'id, category',
      sales: 'id, date, channel, batchId',
      instructions: 'id, category, order',
      photos: 'id, ownerId',
      settings: 'id',
      deletions: '[table+id], deletedAt',
      kv: 'key',
    })
  }
}

export const db = new KuleDB()

/** Tabele z danymi użytkownika (eksport, import, czyszczenie) */
export const DATA_TABLES = [
  'batches',
  'balls',
  'measurements',
  'workSessions',
  'events',
  'journal',
  'expenses',
  'planned',
  'sales',
  'instructions',
  'photos',
  'settings',
] as const

export type DataTableName = (typeof DATA_TABLES)[number]
