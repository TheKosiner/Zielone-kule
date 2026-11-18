import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/Feedback'
import { isStandalone } from '@/hooks/useInstall'

/** Rejestracja service workera: praca offline i komunikat o nowej wersji */
export function PwaManager() {
  const toast = useToast()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // sprawdzaj aktualizacje co godzinę, gdy aplikacja jest otwarta
      if (registration) setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (offlineReady) {
      toast.show('Aplikacja jest gotowa do pracy bez internetu', { tone: 'info' })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady, toast])

  // zainstalowana aplikacja prosi przeglądarkę o trwałe przechowywanie danych
  useEffect(() => {
    if (isStandalone()) navigator.storage?.persist?.().catch(() => undefined)
  }, [])

  if (!needRefresh) return null
  return (
    <div className="no-print fixed inset-x-0 top-0 z-[70] flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="animate-pop-in flex w-full max-w-md items-center gap-3 rounded-2xl bg-moss-900 py-2.5 pr-2 pl-4 text-[15px] text-white shadow-pop">
        <RefreshCw className="h-5 w-5 shrink-0 text-moss-300" />
        <span className="min-w-0 flex-1">Jest nowa wersja aplikacji.</span>
        <button className="h-9 rounded-lg px-3 text-sm font-medium text-moss-200 hover:bg-white/10" onClick={() => setNeedRefresh(false)}>
          Później
        </button>
        <button className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-moss-900" onClick={() => updateServiceWorker(true)}>
          Odśwież
        </button>
      </div>
    </div>
  )
}
