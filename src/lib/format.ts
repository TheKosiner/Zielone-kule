// Formatowanie liczb po polsku: spacja (twarda) jako separator tysięcy, przecinek dziesiętny.
// Intl dla pl-PL nie grupuje liczb czterocyfrowych (1220,50), a chcemy zawsze „1 220,50”.

const NBSP = ' '

export function formatNumber(value: number, decimals = 2, trimZeros = false): string {
  if (!Number.isFinite(value)) return '–'
  const negative = value < 0
  const fixed = Math.abs(value).toFixed(decimals)
  let [intPart, frac = ''] = fixed.split('.')
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  if (trimZeros) frac = frac.replace(/0+$/, '')
  const body = frac ? `${intPart},${frac}` : intPart
  return negative && Number(fixed) !== 0 ? `−${body}` : body
}

/** 1220.5 → „1 220,50 zł” */
export function formatPLN(value: number, opts: { decimals?: number; sign?: boolean } = {}): string {
  const decimals = opts.decimals ?? 2
  const s = formatNumber(value, decimals)
  const plus = opts.sign && value > 0 ? '+' : ''
  return `${plus}${s}${NBSP}zł`
}

/** Krótko: 119 zł, 15,60 zł (bez ,00 przy pełnych złotych) */
export function formatPLNShort(value: number): string {
  const decimals = Math.abs(value - Math.round(value)) < 0.005 ? 0 : 2
  return formatPLN(value, { decimals })
}

export function formatPercent(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals, true)}${NBSP}%`
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return '–'
  if (hours < 1) return `${Math.round(hours * 60)}${NBSP}min`
  return `${formatNumber(hours, 1, true)}${NBSP}h`
}

export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) return '–'
  const m = Math.round(minutes)
  if (m < 60) return `${m}${NBSP}min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}${NBSP}h ${rest}${NBSP}min` : `${h}${NBSP}h`
}

/** Parsuje „12,50”, „1 220,5”, „12.5” → liczba albo null */
export function parseDecimal(input: string): number | null {
  const cleaned = input.replace(/[\s zł]/g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Do pola tekstowego: 12.5 → „12,5” */
export function toInputString(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return String(Math.round(value * 10000) / 10000).replace('.', ',')
}

/** Odmiana: 1 kula, 2 kule, 5 kul */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  if (abs === 1) return one
  const d = abs % 10
  const dd = abs % 100
  if (d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14)) return few
  return many
}

export function kul(n: number): string {
  return `${n}${NBSP}${plural(n, 'kula', 'kule', 'kul')}`
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
