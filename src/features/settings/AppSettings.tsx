import { CloudOff, Download, Share, Smartphone, SquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Feedback'
import { useInstallPrompt } from '@/hooks/useInstall'
import { SettingsSection } from './SettingsSection'

export function AppSettings() {
  const { canInstall, installed, ios, install } = useInstallPrompt()
  const toast = useToast()
  return (
    <SettingsSection id="aplikacja" title="Aplikacja na telefonie" description="Panel działa jak zwykła aplikacja: ikona na ekranie głównym, pełny ekran, praca bez internetu w warsztacie i ogrodzie.">
      <div className="space-y-4">
        {installed ? (
          <Callout tone="moss" icon={<Smartphone className="h-4.5 w-4.5" />}>
            Aplikacja jest zainstalowana na tym urządzeniu.
          </Callout>
        ) : canInstall ? (
          <Button
            variant="primary"
            icon={<Download className="h-4.5 w-4.5" />}
            onClick={async () => {
              if (await install()) toast.show('Zainstalowano – ikona jest na ekranie głównym')
            }}
          >
            Zainstaluj aplikację
          </Button>
        ) : ios ? (
          <Callout tone="water" icon={<Share className="h-4.5 w-4.5" />}>
            Na iPhonie otwórz tę stronę w Safari, stuknij <strong>Udostępnij</strong>, a potem <strong>Do ekranu początkowego</strong> <SquarePlus className="inline h-4 w-4" />.
          </Callout>
        ) : (
          <Callout tone="water" icon={<Smartphone className="h-4.5 w-4.5" />}>
            W Chrome na Androidzie otwórz menu (⋮) i wybierz <strong>Zainstaluj aplikację</strong> albo <strong>Dodaj do ekranu głównego</strong>.
          </Callout>
        )}
        <p className="flex gap-2 text-sm text-ink-600">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          Po pierwszym otwarciu aplikacja działa bez internetu. Dane zapisują się na urządzeniu, a telefon i komputer mają osobne bazy – przenoś je kopią zapasową.
        </p>
      </div>
    </SettingsSection>
  )
}
