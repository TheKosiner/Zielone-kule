import { useEffect, useRef, useState } from 'react'

/** Lokalna kopia do edycji z informacją, czy coś się zmieniło */
export function useDraft<T>(source: T): { draft: T; setDraft: React.Dispatch<React.SetStateAction<T>>; dirty: boolean; reset: () => void } {
  const [draft, setDraft] = useState<T>(() => structuredClone(source))
  const sourceJson = JSON.stringify(source)
  const lastSource = useRef(sourceJson)

  useEffect(() => {
    if (sourceJson !== lastSource.current) {
      lastSource.current = sourceJson
      setDraft(structuredClone(source))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceJson])

  return {
    draft,
    setDraft,
    dirty: JSON.stringify(draft) !== sourceJson,
    reset: () => setDraft(structuredClone(source)),
  }
}
