import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useConfirm, useToast } from '@/components/ui/Feedback'

interface SettingsSectionProps {
  id: string
  title: string
  description?: ReactNode
  children: ReactNode
  dirty?: boolean
  onSave?: () => Promise<void> | void
  onCancel?: () => void
  onRestoreDefaults?: () => void
}

/** Karta sekcji ustawień z paskiem „Zapisz” pokazywanym tylko po zmianach */
export function SettingsSection({ id, title, description, children, dirty, onSave, onCancel, onRestoreDefaults }: SettingsSectionProps) {
  const toast = useToast()
  const confirm = useConfirm()
  return (
    <Card id={id} className="scroll-mt-6 overflow-hidden">
      <div className="flex items-start gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>}
        </div>
        {onRestoreDefaults && (
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={async () => {
              const ok = await confirm({ title: 'Przywrócić wartości z biznesplanu?', message: 'Zmiany w tej sekcji zostaną zastąpione wartościami domyślnymi. Zapiszesz je przyciskiem „Zapisz”.', confirmLabel: 'Przywróć' })
              if (ok) onRestoreDefaults()
            }}
          >
            <span className="hidden sm:inline">Domyślne</span>
          </Button>
        )}
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
      {onSave && dirty && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-cream-200 bg-cream-100/90 px-4 py-3 backdrop-blur sm:px-6">
          <span className="mr-auto text-sm text-cream-800">Masz niezapisane zmiany</span>
          <Button size="sm" onClick={onCancel}>
            Anuluj
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={async () => {
              await onSave()
              toast.show('Zapisano ustawienia')
            }}
          >
            Zapisz
          </Button>
        </div>
      )}
    </Card>
  )
}
