import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber } from '@/lib/format'

export interface ColumnDatum {
  key: string
  label: string
  value: number
  /** opis w dymku, np. „listopad 2026” */
  tooltipLabel?: string
}

interface ColumnChartProps {
  data: ColumnDatum[]
  format: (v: number) => string
  height?: number
  color?: string
  /** podświetlony słupek (np. bieżący miesiąc) */
  highlightKey?: string
  ariaLabel: string
}

interface TipProps {
  active?: boolean
  payload?: { payload: ColumnDatum }[]
  format: (v: number) => string
}

function Tip({ active, payload, format }: TipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-pop ring-1 ring-ink-150">
      <div className="text-xs text-ink-500">{d.tooltipLabel ?? d.label}</div>
      <div className="font-semibold text-ink-900 tabular">{format(d.value)}</div>
    </div>
  )
}

/** Jedna seria słupków: kolor akcentu, delikatna siatka, dymek po najechaniu. */
export function ColumnChart({ data, format, height = 220, color = '#5b8a4c', highlightKey, ariaLabel }: ColumnChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#e3e8df" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#d9dfd5' }} tick={{ fill: '#747f71', fontSize: 12 }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#97a194', fontSize: 12 }}
            width={48}
            tickFormatter={(v: number) => formatNumber(v, 0)}
            allowDecimals={false}
          />
          <Tooltip cursor={{ fill: '#e7f0e1', radius: 6 }} content={(p) => <Tip active={p.active} payload={p.payload as unknown as TipProps['payload']} format={format} />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
            isAnimationActive={false}
            shape={(props: unknown) => {
              const { x, y, width, height: h, payload } = props as { x: number; y: number; width: number; height: number; payload: ColumnDatum }
              if (!h || h <= 0) return <g />
              const r = Math.min(4, width / 2, h)
              const fill = highlightKey && payload.key !== highlightKey ? '#95bc85' : color
              return <path d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + h} Z`} fill={fill} />
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
