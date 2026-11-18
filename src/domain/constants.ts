import { Ellipsis, Megaphone, Package, Shapes, Sprout, Wrench, FlaskConical, type LucideIcon } from 'lucide-react'
import type { BallStatus, ChannelKey, ExpenseCategory, InstructionCategory, MeasurementType, StageKey } from '@/db/types'

export interface StatusMeta {
  label: string
  short: string
  /** kolor w pasku etapów: jedna zieleń od jasnej (forma) do ciemnej (gotowa), sprawdzona walidatorem */
  color: string
  /** klasy odznaki */
  badge: string
  stage: StageKey | null
}

export const BALL_STATUSES: BallStatus[] = ['in_mold', 'curing', 'rinsing', 'inoculated', 'establishing', 'ready', 'sold', 'waste']

/** Statusy „w produkcji”, czyli bez sprzedanych i odpadów */
export const ACTIVE_STATUSES: BallStatus[] = ['in_mold', 'curing', 'rinsing', 'inoculated', 'establishing', 'ready']

export const STATUS_META: Record<BallStatus, StatusMeta> = {
  in_mold: { label: 'W formie', short: 'Forma', color: '#9dbd88', badge: 'bg-ink-100 text-ink-700 ring-ink-200', stage: 'setting' },
  curing: { label: 'Dojrzewa', short: 'Dojrzewa', color: '#7fa766', badge: 'bg-cream-100 text-cream-800 ring-cream-200', stage: 'curing' },
  rinsing: { label: 'Płukanie', short: 'Płukanie', color: '#64904f', badge: 'bg-water-50 text-water-700 ring-water-100', stage: 'rinsing' },
  inoculated: { label: 'Zaszczepiona', short: 'Zaszczep.', color: '#4c783e', badge: 'bg-moss-100 text-moss-800 ring-moss-200', stage: 'inoculation' },
  establishing: { label: 'Mech się przyjmuje', short: 'Mech rośnie', color: '#38602f', badge: 'bg-moss-200 text-moss-900 ring-moss-300', stage: 'establishing' },
  ready: { label: 'Gotowa', short: 'Gotowa', color: '#26401f', badge: 'bg-moss-900 text-white ring-moss-900', stage: 'selling' },
  sold: { label: 'Sprzedana', short: 'Sprzedana', color: '#c58b1c', badge: 'bg-cream-200 text-cream-800 ring-cream-300', stage: null },
  waste: { label: 'Odpad', short: 'Odpad', color: '#c0624d', badge: 'bg-clay-50 text-clay-700 ring-clay-100', stage: null },
}

export const STAGE_ORDER: StageKey[] = ['casting', 'setting', 'demolding', 'curing', 'rinsing', 'inoculation', 'establishing', 'selling']

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['materials', 'molds', 'packaging', 'moss', 'tools', 'marketing', 'other']

/** Kategorie rozróżnia ikona i nazwa, nie kolor */
export const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: LucideIcon; costRelevant: boolean }> = {
  materials: { label: 'Materiały', icon: FlaskConical, costRelevant: true },
  molds: { label: 'Formy i filament', icon: Shapes, costRelevant: true },
  packaging: { label: 'Opakowania', icon: Package, costRelevant: true },
  moss: { label: 'Mech', icon: Sprout, costRelevant: true },
  tools: { label: 'Narzędzia', icon: Wrench, costRelevant: false },
  marketing: { label: 'Marketing', icon: Megaphone, costRelevant: false },
  other: { label: 'Inne', icon: Ellipsis, costRelevant: false },
}

export const CHANNEL_ORDER: ChannelKey[] = ['allegro', 'local', 'instagram', 'facebook', 'fair', 'etsy', 'florist']

export const MEASUREMENT_META: Record<MeasurementType, { label: string; unit: string }> = {
  ph: { label: 'pH', unit: '' },
  cracks: { label: 'Pęknięcie', unit: '' },
  moss: { label: 'Ocena mchu', unit: '/5' },
  weight: { label: 'Waga', unit: 'kg' },
  note: { label: 'Notatka', unit: '' },
}

export const INSTRUCTION_CATEGORY_META: Record<InstructionCategory, { label: string }> = {
  process: { label: 'Proces produkcji' },
  tips: { label: 'Porady i błędy' },
  care: { label: 'Karta pielęgnacji' },
  custom: { label: 'Moje instrukcje' },
}

export const UNITS = ['szt.', 'kg', 'l', 'worek', 'opak.', 'm', 'rolka', 'g', 'kpl.']
