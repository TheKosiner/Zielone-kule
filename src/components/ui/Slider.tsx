import { useId } from 'react'
import { NumberInput } from './Form'

interface SliderProps {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  suffix: string
  hint?: string
}

/** Suwak z polem liczbowym obok (wygodny na telefonie i komputerze) */
export function Slider({ label, value, onChange, min, max, step, suffix, hint }: SliderProps) {
  const id = useId()
  const pct = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
        <div className="w-28">
          <NumberInput value={value} onValueChange={(v) => onChange(v ?? min)} suffix={suffix} className="h-9 text-right" aria-label={label} />
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="zk-range h-8 w-full cursor-pointer appearance-none bg-transparent"
        style={{ ['--pct' as string]: `${pct}%` }}
      />
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}
