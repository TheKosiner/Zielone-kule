import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, CircleAlert, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Sheet, SheetFooter } from './Sheet'

// ───────── Powiadomienia (toast) ─────────

type Tone = 'success' | 'info' | 'error'

interface Toast {
  id: number
  message: ReactNode
  tone: Tone
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  show: (message: ReactNode, opts?: { tone?: Tone; action?: Toast['action']; duration?: number }) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast poza ToastProvider')
  return ctx
}

// ───────── Potwierdzenia ─────────

interface ConfirmOptions {
  title: ReactNode
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>
const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm poza FeedbackProvider')
  return ctx
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback<ToastApi['show']>(
    (message, opts = {}) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-2), { id, message, tone: opts.tone ?? 'success', action: opts.action }])
      setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 6000 : 3200))
    },
    [dismiss],
  )

  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const confirm = useCallback<ConfirmFn>((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), [])
  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value)
    setConfirmState(null)
  }

  return (
    <ToastContext.Provider value={{ show }}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <Sheet
          open={!!confirmState}
          onClose={() => closeConfirm(false)}
          title={confirmState?.title}
          size="sm"
          footer={
            <SheetFooter>
              <Button onClick={() => closeConfirm(false)}>{confirmState?.cancelLabel ?? 'Anuluj'}</Button>
              <Button variant={confirmState?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => closeConfirm(true)} data-autofocus>
                {confirmState?.confirmLabel ?? 'Potwierdź'}
              </Button>
            </SheetFooter>
          }
        >
          <div className="text-[15px] leading-relaxed text-ink-700">{confirmState?.message}</div>
        </Sheet>
        {createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className="animate-pop-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink-900 py-3 pr-2 pl-4 text-[15px] text-white shadow-pop"
              >
                {t.tone === 'success' ? (
                  <CircleCheck className="h-5 w-5 shrink-0 text-moss-400" />
                ) : t.tone === 'error' ? (
                  <CircleAlert className="h-5 w-5 shrink-0 text-clay-500" />
                ) : (
                  <Info className="h-5 w-5 shrink-0 text-water-100" />
                )}
                <div className="min-w-0 flex-1">{t.message}</div>
                {t.action ? (
                  <button
                    className={cn('h-9 shrink-0 rounded-lg px-3 text-sm font-semibold text-moss-300 hover:bg-white/10')}
                    onClick={() => {
                      t.action!.onClick()
                      dismiss(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                ) : (
                  <span className="w-2" />
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}
