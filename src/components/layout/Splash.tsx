import { Logo } from './Logo'

export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-moss-50">
      <Logo className="h-16 w-16 animate-pulse" />
      <p className="text-sm text-ink-500">Otwieram panel…</p>
    </div>
  )
}
