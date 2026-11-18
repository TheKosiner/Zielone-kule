import { PageHeader } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'
import { useEffect, useState } from 'react'
import { GeneralSettings, RecipeSettings, StagesSettings } from './ProductionSettings'
import { ChannelSettings, CostSettings, JournalTagSettings, LimitSettings } from './MoneySettings'
import { DataSettings } from './DataSettings'

const SECTIONS = [
  { id: 'dane', label: 'Kopia zapasowa' },
  { id: 'receptura', label: 'Receptura' },
  { id: 'etapy', label: 'Etapy i harmonogram' },
  { id: 'koszty', label: 'Koszty' },
  { id: 'kanaly', label: 'Ceny i kanały' },
  { id: 'limity', label: 'Limity i stawki' },
  { id: 'tagi', label: 'Tagi dziennika' },
  { id: 'ogolne', label: 'Ogólne' },
]

export default function SettingsPage() {
  const [active, setActive] = useState('dane')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const go = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <PageHeader title="Ustawienia" subtitle="Wszystkie stałe z biznesplanu w jednym miejscu. Zmieniasz je tutaj, a nie w kodzie." />
      <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
        <nav className="scrollbar-none sticky top-0 z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-moss-50/95 px-4 py-2 backdrop-blur lg:top-9 lg:mx-0 lg:mb-0 lg:flex-col lg:gap-0.5 lg:self-start lg:bg-transparent lg:p-0">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={cn(
                'h-9 shrink-0 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition lg:h-10 lg:rounded-xl lg:text-left',
                active === s.id ? 'bg-moss-900 text-white lg:bg-moss-100 lg:text-moss-900' : 'bg-white text-ink-600 ring-1 ring-ink-200 ring-inset hover:text-ink-900 lg:bg-transparent lg:ring-0 lg:hover:bg-ink-100',
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-5">
          <DataSettings />
          <RecipeSettings />
          <StagesSettings />
          <CostSettings />
          <ChannelSettings />
          <LimitSettings />
          <JournalTagSettings />
          <GeneralSettings />
        </div>
      </div>
    </>
  )
}
