import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Ellipsis,
  HandCoins,
  LayoutDashboard,
  Layers,
  NotebookPen,
  Plus,
  Presentation,
  Settings as SettingsIcon,
  Timer,
  Wallet,
  CalendarPlus,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Sheet } from '@/components/ui/Sheet'
import { useSettings } from '@/hooks/useSettings'
import { Logo } from './Logo'
import { TimerPill } from './TimerPill'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Pulpit', icon: LayoutDashboard },
  { to: '/partie', label: 'Partie i kule', icon: Layers },
  { to: '/kalendarz', label: 'Kalendarz', icon: CalendarDays },
  { to: '/dziennik', label: 'Dziennik', icon: NotebookPen },
  { to: '/wydatki', label: 'Wydatki', icon: Wallet },
  { to: '/sprzedaz', label: 'Sprzedaż', icon: HandCoins },
  { to: '/instrukcje', label: 'Instrukcje', icon: BookOpen },
  { to: '/biznesplan', label: 'Biznesplan', icon: Presentation },
  { to: '/ustawienia', label: 'Ustawienia', icon: SettingsIcon },
]

const MOBILE_PRIMARY = ['/', '/partie', '/kalendarz']

interface QuickAction {
  label: string
  description: string
  icon: LucideIcon
  to: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Nowa partia', description: 'Odlew, harmonogram powstanie sam', icon: Layers, to: '/partie?nowa=1' },
  { label: 'Wydatek', description: 'Zakup z linkiem do oferty', icon: Wallet, to: '/wydatki?nowy=1' },
  { label: 'Sprzedaż', description: 'Trafi do ewidencji', icon: HandCoins, to: '/sprzedaz?nowa=1' },
  { label: 'Wpis w dzienniku', description: 'Notatka, zdjęcie, tagi', icon: NotebookPen, to: '/dziennik?nowy=1' },
  { label: 'Zadanie', description: 'Własny wpis w kalendarzu', icon: CalendarPlus, to: '/kalendarz?nowe=1' },
  { label: 'Do kupienia', description: 'Zakup na później', icon: ShoppingCart, to: '/wydatki?zakupy=1&nowy=1' },
  { label: 'Stoper pracy', description: 'Mierz czas pracy przy partii', icon: Timer, to: '/partie?stoper=1' },
]

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const settings = useSettings()
  const [quickOpen, setQuickOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const moreActive = !MOBILE_PRIMARY.some((p) => isActive(pathname, p))

  return (
    <div className="min-h-dvh lg:flex">
      {/* Boczna nawigacja (komputer) */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-150 bg-white/70 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <Logo className="h-10 w-10" />
          <div className="min-w-0">
            <div className="truncate text-[17px] leading-tight font-semibold text-moss-900">{settings.brandName}</div>
            <div className="text-xs text-ink-500">panel produkcji i sprzedaży</div>
          </div>
        </div>
        <div className="px-3 pb-3">
          <button onClick={() => setQuickOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-moss-900 text-[15px] font-medium text-white shadow-sm transition hover:bg-moss-800 active:scale-[0.98]">
            <Plus className="h-5 w-5" /> Dodaj
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive: a }) =>
                cn(
                  'group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition',
                  a ? 'bg-moss-100 text-moss-900' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )
              }
            >
              {({ isActive: a }) => (
                <>
                  <item.icon className={cn('h-5 w-5', a ? 'text-moss-700' : 'text-ink-400 group-hover:text-ink-600')} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 p-4">
          <TimerPill variant="sidebar" />
          <p className="px-1 text-[11px] leading-relaxed text-ink-400">Dane są zapisane tylko na tym urządzeniu. Rób kopię zapasową w Ustawieniach.</p>
        </div>
      </aside>

      {/* Treść */}
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-32 sm:px-6 sm:pt-7 lg:px-10 lg:pt-9 lg:pb-16">{children}</main>
      </div>

      {/* Stoper nad dolnym paskiem (telefon) */}
      <div className="no-print fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:hidden">
        <TimerPill variant="floating" />
      </div>

      {/* Dolna nawigacja (telefon) */}
      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink-150 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-stretch px-1">
          {NAV_ITEMS.filter((n) => MOBILE_PRIMARY.includes(n.to)).slice(0, 2).map((item) => (
            <BottomLink key={item.to} item={item} active={isActive(pathname, item.to)} />
          ))}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setQuickOpen(true)}
              aria-label="Dodaj"
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-900 text-white shadow-pop ring-4 ring-moss-50 transition active:scale-95"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>
          {NAV_ITEMS.filter((n) => n.to === '/kalendarz').map((item) => (
            <BottomLink key={item.to} item={item} active={isActive(pathname, item.to)} />
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn('flex flex-col items-center justify-center gap-1 text-[11px] font-medium', moreActive ? 'text-moss-900' : 'text-ink-500')}
          >
            <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition', moreActive && 'bg-moss-100')}>
              <Ellipsis className="h-5.5 w-5.5" />
            </span>
            Więcej
          </button>
        </div>
      </nav>

      <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Dodaj" size="md">
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                setQuickOpen(false)
                navigate(a.to)
              }}
              className="flex min-h-24 flex-col items-start gap-2 rounded-2xl bg-ink-50 p-3.5 text-left ring-1 ring-ink-150 transition ring-inset hover:bg-moss-50 hover:ring-moss-300 active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-moss-700 shadow-sm">
                <a.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-ink-900">{a.label}</span>
                <span className="block text-xs text-ink-500">{a.description}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu" size="sm">
        <div className="grid grid-cols-3 gap-2">
          {NAV_ITEMS.map((item) => {
            const a = isActive(pathname, item.to)
            return (
              <button
                key={item.to}
                onClick={() => {
                  setMoreOpen(false)
                  navigate(item.to)
                }}
                className={cn(
                  'flex aspect-[1.1] flex-col items-center justify-center gap-2 rounded-2xl p-2 text-center text-[13px] font-medium ring-1 transition ring-inset active:scale-[0.97]',
                  a ? 'bg-moss-100 text-moss-900 ring-moss-200' : 'bg-ink-50 text-ink-700 ring-ink-150',
                )}
              >
                <item.icon className={cn('h-6 w-6', a ? 'text-moss-700' : 'text-ink-500')} />
                {item.label}
              </button>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  const label = item.to === '/partie' ? 'Partie' : item.label
  return (
    <NavLink to={item.to} end={item.to === '/'} className={cn('flex flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-moss-900' : 'text-ink-500')}>
      <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition', active && 'bg-moss-100')}>
        <item.icon className="h-5.5 w-5.5" />
      </span>
      {label}
    </NavLink>
  )
}
