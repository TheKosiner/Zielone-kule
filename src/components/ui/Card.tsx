import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl bg-white shadow-card ring-1 ring-ink-150', className)} {...rest} />
}

interface CardHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, icon, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5', className)}>
      {icon && <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-800">{icon}</div>}
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5', className)} {...rest} />
}
