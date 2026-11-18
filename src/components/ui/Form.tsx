import { forwardRef, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { parseDecimal, toInputString } from '@/lib/format'

// Pola mają 16 px tekstu, żeby iPhone nie powiększał strony przy wpisywaniu.
export const inputClasses =
  'block h-11 w-full rounded-xl bg-white px-3.5 text-base text-ink-900 ring-1 ring-inset ring-ink-200 transition outline-none placeholder:text-ink-400 hover:ring-ink-300 focus:ring-2 focus:ring-moss-600 disabled:bg-ink-50 disabled:text-ink-500'

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
  htmlFor?: string
  optional?: boolean
}

export function Field({ label, hint, error, children, className, htmlFor, optional }: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-ink-700">
          {label}
          {optional && <span className="text-xs font-normal text-ink-400">(opcjonalnie)</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-sm text-clay-600">{error}</p> : hint ? <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputClasses, className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(inputClasses, 'h-auto py-2.5 leading-relaxed', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(inputClasses, 'appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-500" />
    </div>
  )
})

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  suffix?: ReactNode
  integer?: boolean
}

/** Pole liczbowe przyjmujące przecinek („12,50”). Trzyma tekst, żeby dało się wpisać „12,”. */
export function NumberInput({ value, onValueChange, suffix, integer, className, onBlur, onFocus, ...rest }: NumberInputProps) {
  const [text, setText] = useState(() => toInputString(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(toInputString(value))
  }, [value])

  return (
    <div className="relative">
      <input
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        autoComplete="off"
        className={cn(inputClasses, 'tabular', suffix ? 'pr-12' : undefined, className)}
        value={text}
        onFocus={(e) => {
          focused.current = true
          onFocus?.(e)
        }}
        onBlur={(e) => {
          focused.current = false
          setText(toInputString(value))
          onBlur?.(e)
        }}
        onChange={(e) => {
          const raw = e.target.value
          if (!/^-?[\d\s ]*[,.]?\d*$/.test(raw)) return
          setText(raw)
          const n = parseDecimal(raw)
          onValueChange(n === null ? null : integer ? Math.round(n) : n)
        }}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-500">{suffix}</span>}
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  className?: string
}

export function Toggle({ checked, onChange, label, description, className }: ToggleProps) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 py-1', className)}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-10 rounded-full bg-ink-200 transition peer-checked:bg-moss-600 peer-focus-visible:ring-2 peer-focus-visible:ring-moss-600 peer-focus-visible:ring-offset-2" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] text-ink-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  )
}

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  className?: string
  size?: 'md' | 'lg'
}

export function Checkbox({ checked, onChange, label, className, size = 'md' }: CheckboxProps) {
  const box = size === 'lg' ? 'h-7 w-7 rounded-lg' : 'h-5 w-5 rounded-md'
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5', className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={cn(
          box,
          'flex shrink-0 items-center justify-center ring-1 ring-ink-300 transition ring-inset peer-checked:bg-moss-600 peer-checked:ring-moss-600 peer-focus-visible:ring-2 peer-focus-visible:ring-moss-600',
        )}
      >
        <svg viewBox="0 0 16 16" className={cn(size === 'lg' ? 'h-4.5 w-4.5' : 'h-3.5 w-3.5', 'text-white', checked ? 'opacity-100' : 'opacity-0')}>
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label && <span className="text-[15px] text-ink-800">{label}</span>}
    </label>
  )
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>
}
