import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Formularz w arkuszu: Enter wysyła */
  onSubmit?: () => void
}

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

let openCount = 0

/** Na telefonie wysuwa się od dołu, na komputerze to okno na środku. */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'md', onSubmit }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    openCount++
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]):not([type=checkbox]), textarea, select')
      // Na telefonie nie otwieramy klawiatury automatycznie
      if (first && window.matchMedia('(min-width: 640px)').matches) first.focus()
      else panelRef.current?.focus()
    }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      openCount--
      if (openCount === 0) document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  const content = (
    <>
      <div className="flex items-start gap-3 border-b border-ink-100 px-5 pt-4 pb-3.5 sm:px-6 sm:pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight font-semibold text-ink-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        <IconButton label="Zamknij" onClick={onClose} size="sm" className="-mt-1 -mr-2">
          <X className="h-5 w-5" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      {footer && <div className="pb-safe border-t border-ink-100 bg-ink-50/60 px-5 py-3 sm:rounded-b-2xl sm:px-6">{footer}</div>}
    </>
  )

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="animate-fade-in absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'animate-sheet-up sm:animate-pop-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-pop outline-none sm:max-h-[88vh] sm:rounded-2xl',
          WIDTHS[size],
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink-200 sm:hidden" />
        {onSubmit ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>,
    document.body,
  )
}

export function SheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>{children}</div>
}
