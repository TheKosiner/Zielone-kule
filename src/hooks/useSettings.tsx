import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { withDefaults } from '@/db/defaults'
import { ensureSeeded } from '@/db/seed'
import type { Settings } from '@/db/types'

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const stored = useLiveQuery(() => (ready ? db.settings.get('main') : undefined), [ready])
  const settings = useMemo(() => (stored ? withDefaults(stored) : null), [stored])

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-ink-700">
        <h1 className="text-lg font-semibold">Nie udało się otworzyć bazy danych</h1>
        <p className="mt-2 text-sm">{error}</p>
        <p className="mt-2 text-sm text-ink-500">Sprawdź, czy przeglądarka nie działa w trybie prywatnym, który blokuje IndexedDB.</p>
      </div>
    )
  }
  if (!settings) return <>{fallback}</>
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useSettings(): Settings {
  const s = useContext(SettingsContext)
  if (!s) throw new Error('useSettings poza SettingsProvider')
  return s
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update('main', { ...patch, updatedAt: new Date().toISOString() })
}
