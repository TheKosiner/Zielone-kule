import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { computeBusiness, type BusinessInput, type BusinessStats } from '@/domain/business'
import { useSettings } from './useSettings'

export function useBusinessInput(): BusinessInput | undefined {
  return useLiveQuery(async () => {
    const [sales, balls, batches, sessions, expenses] = await Promise.all([db.sales.orderBy('date').reverse().toArray(), db.balls.toArray(), db.batches.toArray(), db.workSessions.toArray(), db.expenses.toArray()])
    return { sales, balls, batches, sessions, expenses }
  }, [])
}

/** Liczby biznesowe na żywo (odświeżają się po każdej zmianie w bazie) */
export function useBusiness(): (BusinessStats & { input: BusinessInput }) | undefined {
  const settings = useSettings()
  const input = useBusinessInput()
  return useMemo(() => (input ? { ...computeBusiness(input, settings), input } : undefined), [input, settings])
}
