// Treści z biznesplanu (stan na 17.11.2026), które nie są liczbami do edycji w ustawieniach.

export const MARKET_PRICES = [
  { product: 'Drzewko z chrobotkiem, 50 cm', price: 229, source: 'Allegro Lokalnie' },
  { product: 'Kula ogrodowa (dekoracja)', price: 170, source: 'Kaufland' },
  { product: 'Obraz z mchu stabilizowanego, 0,1 m²', price: 156, source: 'Decormania' },
  { product: 'Drzewko z chrobotkiem, 20 cm', price: 120, source: 'Allegro Lokalnie' },
  { product: 'Korona ogrodowa, ok. 24 cm', price: 85, source: 'Kaufland' },
  { product: 'Doniczka betonowa z chrobotkiem, 13 cm', price: 75, source: 'Allegro Lokalnie' },
]

export const CHANNEL_NOTES: Record<string, { cost: string; pros: string; cons: string }> = {
  allegro: { cost: 'ok. 12% prowizji', pros: 'duży ruch, kupujący ufają', cons: 'konkurencja cenowa, wysyłka' },
  local: { cost: '0 zł', pros: 'brak wysyłki, klient widzi produkt', cons: 'mały zasięg' },
  instagram: { cost: '0 zł', pros: 'najwyższa marża', cons: 'wolny start, trzeba budować zasięg' },
  facebook: { cost: '0 zł', pros: 'najwyższa marża, lokalni klienci', cons: 'wolny start, trzeba budować zasięg' },
  fair: { cost: 'opłata za stoisko', pros: 'klient widzi żywy mech', cons: 'kilka dni w roku' },
  etsy: { cost: 'kilka–10% opłat', pros: 'klienci płacą więcej za handmade', cons: 'drogie wysyłki za granicę' },
  florist: { cost: 'narzut sklepu', pros: 'wiele sztuk naraz', cons: 'niższa cena za sztukę' },
}

export const RISKS = [
  { title: 'Długi czas produkcji', text: 'Odlewaj partiami co 1–2 tygodnie, żeby stale mieć kule na różnych etapach.' },
  { title: 'Sezonowość', text: 'Dekoracje ogrodowe sprzedają się głównie od marca do września. Zimą produkuj na zapas.' },
  { title: 'Mech u klienta', text: 'Sprzedawaj tylko kule z przyrośniętym mchem i pisz jasno: „tylko na zewnątrz, w cieniu”.' },
  { title: 'Pęknięcia', text: 'Pomaga włókno PP, płytsze wgłębienia i dobre pakowanie. W wyliczeniach jest zapas na straty.' },
  { title: 'Mała znajomość produktu', text: 'Pomagają zdjęcia w ogrodzie i filmiki z procesu na Instagramie.' },
]

export const FORMALITIES = [
  { title: 'Działalność nierejestrowana', text: 'Limit przychodu na kwartał to 225% płacy minimalnej, prosta ewidencja sprzedaży, rozliczenie w PIT-36. Po przekroczeniu limitu jest 7 dni na wpis do CEIDG.' },
  { title: 'Mech', text: 'Część gatunków jest chroniona (np. torfowce, bielistka siwa). Zbiór z lasów państwowych na sprzedaż zwykle wymaga zgody nadleśnictwa. Najbezpieczniej kupować mech z hodowli albo rozmnażać pospolite gatunki z własnej działki.' },
  { title: 'Sprzedaż online', text: 'Liczy się z 14-dniowym prawem do zwrotu i reklamacjami, więc warto mieć prosty regulamin. Szczegóły potwierdź w przepisach albo u księgowego.' },
]

export const SOURCES =
  'Leroy Merlin: cement 25 kg · Kaufland: perlit 20 l · Kaufland: kula styropianowa 12 cm · Allegro Lokalnie: dekoracje z mchem · Allegro Lokalnie: drzewka z chrobotkiem · Decormania: obraz z mchu · Priceva: prowizje Allegro (30.09.2026) · inFakt: minimalna stawka godzinowa 2026 · Fakturowo: działalność nierejestrowana 2026 · money.pl: limit i CEIDG'
