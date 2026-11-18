// Minimalny Markdown → React (nagłówki, listy, pogrubienie, kursywa, akapity). Bez innerHTML.
import type { ReactNode } from 'react'

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={`${keyBase}-${i++}`}>{t.slice(2, -2)}</strong>)
    else out.push(<em key={`${keyBase}-${i++}`}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p${blocks.length}`} className="leading-relaxed">
          {para.flatMap((l, i) => (i ? [<br key={`br${i}`} />, ...inline(l, `p${blocks.length}-${i}`)] : inline(l, `p${blocks.length}-${i}`)))}
        </p>,
      )
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={`l${blocks.length}`} className={list.ordered ? 'list-decimal space-y-1.5 pl-5' : 'list-disc space-y-1.5 pl-5 marker:text-moss-500'}>
          {list.items.map((it, i) => (
            <li key={i} className="leading-relaxed">
              {inline(it, `l${blocks.length}-${i}`)}
            </li>
          ))}
        </Tag>,
      )
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line)
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (!line.trim()) {
      flushPara()
      flushList()
    } else if (h) {
      flushPara()
      flushList()
      const level = h[1].length
      const cls = level === 1 ? 'text-xl font-semibold text-ink-900' : level === 2 ? 'text-lg font-semibold text-ink-900' : 'text-base font-semibold text-ink-900'
      blocks.push(
        <div key={`h${blocks.length}`} className={cls} role="heading" aria-level={level + 1}>
          {inline(h[2], `h${blocks.length}`)}
        </div>,
      )
    } else if (ul || ol) {
      flushPara()
      const ordered = !!ol
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((ul ?? ol)![1])
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return <div className={className ?? 'space-y-3 text-[15px] text-ink-700'}>{blocks}</div>
}
