// Ładna karta linku bez pobierania strony: rozpoznajemy sklep po domenie.

export interface ShopInfo {
  host: string
  name: string
  color: string
  initial: string
}

const SHOPS: { match: RegExp; name: string; color: string }[] = [
  { match: /(^|\.)allegrolokalnie\.pl$/, name: 'Allegro Lokalnie', color: '#ff5a00' },
  { match: /(^|\.)allegro\.pl$/, name: 'Allegro', color: '#ff5a00' },
  { match: /(^|\.)olx\.pl$/, name: 'OLX', color: '#002f34' },
  { match: /(^|\.)leroymerlin\.pl$/, name: 'Leroy Merlin', color: '#78be20' },
  { match: /(^|\.)castorama\.pl$/, name: 'Castorama', color: '#0078d7' },
  { match: /(^|\.)obi\.pl$/, name: 'OBI', color: '#f39200' },
  { match: /(^|\.)kaufland\.pl$/, name: 'Kaufland', color: '#e10915' },
  { match: /(^|\.)amazon\.(pl|de|com)$/, name: 'Amazon', color: '#232f3e' },
  { match: /(^|\.)aliexpress\.(com|pl|us)$/, name: 'AliExpress', color: '#e62e04' },
  { match: /(^|\.)temu\.com$/, name: 'Temu', color: '#fb7701' },
  { match: /(^|\.)etsy\.com$/, name: 'Etsy', color: '#f1641e' },
  { match: /(^|\.)ikea\.com$/, name: 'IKEA', color: '#0058a3' },
  { match: /(^|\.)empik\.com$/, name: 'Empik', color: '#e2001a' },
  { match: /(^|\.)bricomarche\.pl$/, name: 'Bricomarché', color: '#e30613' },
  { match: /(^|\.)psb\.pl$/, name: 'PSB Mrówka', color: '#e30613' },
  { match: /(^|\.)ceneo\.pl$/, name: 'Ceneo', color: '#f68b1f' },
]

export function normalizeUrl(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withProto)
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

export function shopInfo(url: string | undefined | null): ShopInfo | null {
  if (!url) return null
  const normalized = normalizeUrl(url)
  if (!normalized) return null
  const host = new URL(normalized).hostname.replace(/^www\./, '')
  const known = SHOPS.find((s) => s.match.test(host))
  const name = known?.name ?? host
  return { host, name, color: known?.color ?? '#5b8a4c', initial: name.charAt(0).toUpperCase() }
}
