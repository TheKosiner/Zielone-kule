// CSV pod polskiego Excela: średnik jako separator, przecinek dziesiętny, BOM dla UTF-8.

export type CsvCell = string | number | null | undefined

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'number' ? String(Math.round(value * 100) / 100).replace('.', ',') : value
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
}
