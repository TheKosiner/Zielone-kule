// Eksport do .ics (iCalendar) – całodniowe wpisy, do importu w kalendarzu Google / Apple.
import { addDays } from './dates'

export interface IcsEvent {
  uid: string
  title: string
  date: string
  endDate?: string
  time?: string
  description?: string
  done?: boolean
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
}

/** Zawijanie linii do 75 bajtów zgodnie z RFC 5545 */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  out.push(current)
  return out.join('\r\n ')
}

const compact = (iso: string) => iso.replace(/-/g, '')

export function toIcs(events: IcsEvent[], calendarName = 'Zielone Kule'): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zielone Kule//Panel produkcji//PL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(calendarName)}`, 'X-WR-TIMEZONE:Europe/Warsaw']
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@zielone-kule`, `DTSTAMP:${stamp}`)
    if (e.time) {
      const t = e.time.replace(':', '') + '00'
      lines.push(`DTSTART;TZID=Europe/Warsaw:${compact(e.date)}T${t}`, 'DURATION:PT1H')
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(addDays(e.endDate ?? e.date, 1))}`)
    }
    lines.push(`SUMMARY:${esc((e.done ? '✓ ' : '') + e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`)
    lines.push('TRANSP:TRANSPARENT', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
