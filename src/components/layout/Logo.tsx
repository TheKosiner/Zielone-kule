export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="logo-stone" cx="36%" cy="30%" r="72%">
          <stop offset="0" stopColor="#d3d8cd" />
          <stop offset="0.55" stopColor="#a2ab9c" />
          <stop offset="1" stopColor="#6f7a69" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#logo-stone)" />
      <circle cx="23" cy="21" r="7.5" fill="#5b8a4c" />
      <circle cx="41" cy="29" r="9.5" fill="#46703f" />
      <circle cx="26" cy="42" r="6.5" fill="#74a363" />
      <circle cx="43" cy="46" r="4.5" fill="#5b8a4c" />
      <circle cx="14.5" cy="33" r="3.8" fill="#46703f" />
      <circle cx="35" cy="14" r="2.6" fill="#74a363" />
    </svg>
  )
}
