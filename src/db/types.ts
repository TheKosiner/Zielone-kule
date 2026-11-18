import type { ISODate } from '@/lib/dates'

export type ID = string

export interface BaseEntity {
  id: ID
  createdAt: string
  updatedAt: string
  /** Dane przykładowe – usuwa je przycisk „Wyczyść dane przykładowe” */
  sample?: boolean
}

// ───────── Produkcja ─────────

export type StageKey =
  | 'casting'
  | 'setting'
  | 'demolding'
  | 'curing'
  | 'rinsing'
  | 'inoculation'
  | 'establishing'
  | 'selling'

export type BallStatus =
  | 'in_mold'
  | 'curing'
  | 'rinsing'
  | 'inoculated'
  | 'establishing'
  | 'ready'
  | 'sold'
  | 'waste'

export interface RecipeComponent {
  id: ID
  name: string
  /** części objętościowe; null gdy ilość opisowa (np. „garść”) */
  parts: number | null
  note?: string
  enabled: boolean
}

export interface Recipe {
  name: string
  components: RecipeComponent[]
  water: string
  notes?: string
}

export interface Batch extends BaseEntity {
  number: number
  name?: string
  castDate: ISODate
  count: number
  variantId?: ID
  recipe: Recipe
  temperatureC?: number | null
  /** odlew w dwóch etapach / dystanse blokujące styropian */
  castMethod?: 'spacers' | 'two_stage' | 'other'
  notes?: string
  photoIds: ID[]
  /** faktyczne daty rozpoczęcia etapów, od nich liczy się reszta harmonogramu */
  stageActuals: Partial<Record<StageKey, ISODate>>
  archived?: boolean
}

export interface Ball extends BaseEntity {
  batchId: ID
  index: number
  status: BallStatus
  statusChangedAt: ISODate
  mossRating?: number | null
  hasCracks?: boolean
  cracksNote?: string
  lastPh?: number | null
  notes?: string
  photoIds: ID[]
  saleId?: ID | null
}

export type MeasurementType = 'ph' | 'cracks' | 'moss' | 'weight' | 'note'

export interface Measurement extends BaseEntity {
  batchId: ID
  ballId?: ID | null
  date: ISODate
  type: MeasurementType
  value?: number | null
  text?: string
}

export interface WorkSession extends BaseEntity {
  batchId?: ID | null
  stage?: StageKey | 'other'
  date: ISODate
  minutes: number
  startedAt?: string
  endedAt?: string
  note?: string
}

// ───────── Kalendarz i dziennik ─────────

export type EventKind = 'task' | 'milestone' | 'event'
export type EventSource = 'schedule' | 'manual' | 'plan'

export interface CalendarEvent extends BaseEntity {
  title: string
  date: ISODate
  /** koniec okna (np. „wyjmij między 18 a 19.11”) */
  endDate?: ISODate
  time?: string
  kind: EventKind
  done: boolean
  doneAt?: ISODate
  batchId?: ID | null
  source: EventSource
  stage?: StageKey
  /** np. 'demold', 'mist', 'cure_end' – do przeliczania harmonogramu */
  scheduleKey?: string
  notes?: string
}

export interface JournalEntry extends BaseEntity {
  date: ISODate
  title?: string
  text: string
  tags: string[]
  photoIds: ID[]
  batchId?: ID | null
}

// ───────── Pieniądze ─────────

export type ExpenseCategory = 'materials' | 'molds' | 'packaging' | 'moss' | 'tools' | 'marketing' | 'other'

export interface Expense extends BaseEntity {
  name: string
  category: ExpenseCategory
  url?: string
  unitPrice: number
  quantity: number
  unit: string
  date: ISODate
  note?: string
  /** pozycja kosztowa z ustawień (np. 'cement'), do liczenia kosztu kuli */
  costItemKey?: string | null
  /** na ile kul (albo wysyłek dla opakowań) starczy ten zakup */
  ballsCovered?: number | null
  /** część inwestycji startowej z biznesplanu */
  startup?: boolean
}

export interface PlannedPurchase extends BaseEntity {
  name: string
  category: ExpenseCategory
  url?: string
  unitPrice: number
  quantity: number
  unit: string
  note?: string
  priority: 'high' | 'normal' | 'low'
  costItemKey?: string | null
  ballsCovered?: number | null
  startup?: boolean
  neededBy?: ISODate
}

export type ChannelKey = 'allegro' | 'local' | 'instagram' | 'facebook' | 'fair' | 'etsy' | 'florist'
export type SaleStatus = 'ok' | 'returned' | 'complaint'

export interface Sale extends BaseEntity {
  date: ISODate
  ballIds: ID[]
  batchId?: ID | null
  quantity: number
  channel: ChannelKey
  /** cena za wszystkie sztuki razem (brutto, tyle zapłacił klient za towar) */
  price: number
  commissionPct: number
  commission: number
  /** ile klient zapłacił za wysyłkę */
  shippingCharged: number
  /** mój faktyczny koszt wysyłki */
  shippingCost: number
  packagingCost: number
  customer?: string
  description?: string
  status: SaleStatus
  refundAmount?: number
  refundDate?: ISODate
  statusNote?: string
  notes?: string
}

// ───────── Instrukcje i zdjęcia ─────────

export type InstructionCategory = 'process' | 'tips' | 'care' | 'custom'

export interface ChecklistItem {
  id: ID
  text: string
}

export interface Pitfall {
  id: ID
  title: string
  text: string
}

export interface Instruction extends BaseEntity {
  title: string
  category: InstructionCategory
  order: number
  stage?: StageKey
  duration?: string
  summary?: string
  steps: ChecklistItem[]
  pitfalls: Pitfall[]
  body?: string
  checkedStepIds: ID[]
  builtIn?: boolean
}

export type PhotoOwner = 'batch' | 'ball' | 'journal'

export interface Photo {
  id: ID
  ownerType: PhotoOwner
  ownerId: ID
  blob: Blob
  thumb: Blob
  width: number
  height: number
  createdAt: string
  sample?: boolean
}

// ───────── Ustawienia ─────────

export interface StageSetting {
  key: StageKey
  name: string
  minDays: number
  plannedDays: number
  activeMinutesPerBall: number
  description: string
}

export interface CostItem {
  key: string
  name: string
  plannedPerBall: number
  quantityNote: string
  unitPriceNote: string
  /** podpowiedź do pola „starczy na”, np. „worek 20 l ≈ 20 kul” */
  coverageHint: string
  /** 'material' wchodzi w koszt kuli, 'packaging' to koszt na wysyłkę */
  kind: 'material' | 'packaging'
}

export interface ChannelSetting {
  key: ChannelKey
  name: string
  commissionPct: number
  fixedFee: number
  defaultPrice: number
  packagingCost: number
  shipped: boolean
  enabled: boolean
}

export interface PriceVariant {
  id: ID
  name: string
  price: number
  channel: ChannelKey
  note?: string
}

export interface YearSettings {
  year: number
  minWage: number
  minHourly: number
}

export interface ProductVariant {
  id: ID
  name: string
  diameterCm: number
  coreCm: number
  note?: string
}

export interface ScheduleSettings {
  warmThresholdC: number
  warmMinHours: number
  warmMaxHours: number
  coldMinDays: number
  coldMaxDays: number
  freezingThresholdC: number
  freezingExtraDays: number
  curingMistEveryDays: number
  rinseWaterEveryDays: number
  phTestEveryDays: number
  phTarget: number
  mossCheckAfterDays: number
  mossMistEveryDays: number
}

export interface PlanPhase {
  id: ID
  title: string
  from: ISODate
  to: ISODate
  text: string
}

export interface Settings {
  id: 'main'
  brandName: string
  ownerName: string
  ownerAddress: string
  recipe: Recipe
  productVariants: ProductVariant[]
  stages: StageSetting[]
  schedule: ScheduleSettings
  costItems: CostItem[]
  lossReservePct: number
  channels: ChannelSetting[]
  priceVariants: PriceVariant[]
  recommendedPrice: number
  minAllegroPrice: number
  hourlyRates: number[]
  targetHourlyRate: number
  years: YearSettings[]
  limitPctOfMinWage: number
  includeShippingInRevenue: boolean
  startupBudget: number
  startupBalls: number
  journalTags: string[]
  planPhases: PlanPhase[]
  updatedAt: string
}

export interface Deletion {
  table: string
  id: ID
  deletedAt: string
}

export interface KV {
  key: string
  value: unknown
}
