// Daty dzienne trzymamy jako tekst RRRR-MM-DD. Arytmetyka na UTC, więc zmiana czasu nie przesuwa dni.
// „Dziś” liczymy w strefie Europe/Warsaw.

export const TIME_ZONE = 'Europe/Warsaw'
export type ISODate = string

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function warsawParts(date: Date) {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]))
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute }
}

export function todayISO(now: Date = new Date()): ISODate {
  const p = warsawParts(now)
  return `${p.y}-${p.m}-${p.d}`
}

export function nowTimeHM(now: Date = new Date()): string {
  const p = warsawParts(now)
  return `${p.hh}:${p.mm}`
}

/** Data dzienna (Warszawa) dla znacznika czasu ISO */
export function isoToLocalDate(timestamp: string): ISODate {
  return todayISO(new Date(timestamp))
}

export function nowTimestamp(): string {
  return new Date().toISOString()
}

export function toUTCDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function fromUTCDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = toUTCDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUTCDate(d)
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = toUTCDate(iso)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return fromUTCDate(d)
}

/** b − a w dniach */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTCDate(b).getTime() - toUTCDate(a).getTime()) / 86_400_000)
}

/** 0 = poniedziałek … 6 = niedziela */
export function weekdayMon0(iso: ISODate): number {
  return (toUTCDate(iso).getUTCDay() + 6) % 7
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayMon0(iso))
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`
}

export function endOfMonth(iso: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(iso), 1), -1)
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7)
}

export function quarterOf(iso: ISODate): { year: number; quarter: number } {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  return { year, quarter: Math.floor((month - 1) / 3) + 1 }
}

export function quarterRange(year: number, quarter: number): { from: ISODate; to: ISODate } {
  const startMonth = (quarter - 1) * 3 + 1
  const from = `${year}-${String(startMonth).padStart(2, '0')}-01`
  return { from, to: endOfMonth(addMonths(from, 2)) }
}

export function isBetween(iso: ISODate, from: ISODate, to: ISODate): boolean {
  return iso >= from && iso <= to
}

/** 42 dni siatki miesiąca (od poniedziałku) */
export function monthGrid(iso: ISODate): ISODate[] {
  const first = startOfWeek(startOfMonth(iso))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
export const WEEKDAYS = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela']
export const WEEKDAYS_SHORT = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']

function ymd(iso: ISODate) {
  return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)), d: Number(iso.slice(8, 10)) }
}

/** 17.11.2026 */
export function formatDate(iso: ISODate | undefined | null): string {
  if (!iso) return '–'
  const { y, m, d } = ymd(iso)
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
}

/** 17.11 */
export function formatDateShort(iso: ISODate): string {
  const { m, d } = ymd(iso)
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`
}

/** 17 listopada 2026 */
export function formatDateLong(iso: ISODate, withYear = true): string {
  const { y, m, d } = ymd(iso)
  return `${d} ${MONTHS_GEN[m - 1]}${withYear ? ` ${y}` : ''}`
}

/** wtorek, 17 listopada */
export function formatDateWithWeekday(iso: ISODate, withYear = false): string {
  return `${WEEKDAYS[weekdayMon0(iso)]}, ${formatDateLong(iso, withYear)}`
}

/** listopad 2026 */
export function formatMonth(iso: ISODate): string {
  const { y, m } = ymd(iso)
  return `${MONTHS[m - 1]} ${y}`
}

export function formatMonthShort(key: string): string {
  const m = Number(key.slice(5, 7))
  return `${MONTHS_SHORT[m - 1]} ${key.slice(2, 4)}`
}

export function monthNameGenitive(month1: number): string {
  return MONTHS_GEN[month1 - 1]
}

/** „dziś”, „jutro”, „za 3 dni”, „2 dni temu” */
export function relativeDay(iso: ISODate, today: ISODate = todayISO()): string {
  const n = diffDays(today, iso)
  if (n === 0) return 'dziś'
  if (n === 1) return 'jutro'
  if (n === -1) return 'wczoraj'
  if (n === 2) return 'pojutrze'
  const abs = Math.abs(n)
  const word = abs === 1 ? 'dzień' : 'dni'
  return n > 0 ? `za ${abs} ${word}` : `${abs} ${word} temu`
}

export function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const p = warsawParts(d)
  return `${p.d}.${p.m}.${p.y}, ${p.hh}:${p.mm}`
}
