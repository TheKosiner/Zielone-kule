import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'warm' | 'danger' | 'danger-soft'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-moss-900 text-white shadow-sm hover:bg-moss-800 active:bg-moss-950',
  secondary: 'bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  soft: 'bg-moss-100 text-moss-900 hover:bg-moss-200',
  warm: 'bg-cream-100 text-cream-800 ring-1 ring-inset ring-cream-200 hover:bg-cream-200',
  danger: 'bg-clay-600 text-white hover:bg-clay-700',
  'danger-soft': 'bg-clay-50 text-clay-700 hover:bg-clay-100',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-13 px-5 text-base gap-2.5 rounded-xl',
}

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 w-9 rounded-lg',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-13 w-13 rounded-xl',
}

export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra?: string) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    extra,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, cn(block && 'w-full', className))} {...rest}>
      {icon}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  label: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', label, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        ICON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function ButtonLink({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className as string)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
