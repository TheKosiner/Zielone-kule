// Wartości startowe z biznesplanu (stan na 17.11.2026). Wszystko da się zmienić w Ustawieniach.
import type { ChannelSetting, CostItem, Recipe, Settings, StageSetting } from './types'

export const DEFAULT_RECIPE: Recipe = {
  name: 'Podstawowa 1 : 1,5 : 1,5',
  components: [
    { id: 'cement', name: 'Cement portlandzki', parts: 1, enabled: true },
    { id: 'perlite', name: 'Perlit', parts: 1.5, enabled: true },
    { id: 'peat', name: 'Torf kwaśny', parts: 1.5, enabled: true },
    { id: 'fiber', name: 'Włókno polipropylenowe', parts: null, note: 'garść', enabled: true },
  ],
  water: 'do konsystencji „mokrego twarogu”',
  notes: 'Koktajlu z mchu nie dodawaj do masy: mech zginie, a masa będzie słabsza.',
}

export const DEFAULT_STAGES: StageSetting[] = [
  {
    key: 'casting',
    name: 'Mieszanie i odlew',
    minDays: 0,
    plannedDays: 0,
    activeMinutesPerBall: 15,
    description: 'Styropian wypływa (wypiera ok. 1,5 kg masy): zablokuj go dystansami albo odlewaj w dwóch etapach. Nie odlewaj poniżej 5°C.',
  },
  {
    key: 'setting',
    name: 'Wiązanie w formie',
    minDays: 1,
    plannedDays: 2,
    activeMinutesPerBall: 0,
    description: '24–48 h w temperaturze pokojowej, 3–4 dni w chłodzie (5–12°C). Forma przykryta folią. Test: paznokieć zostawia rysę, ale nie wgniecenie.',
  },
  {
    key: 'demolding',
    name: 'Wyjęcie i szczotkowanie',
    minDays: 0,
    plannedDays: 0,
    activeMinutesPerBall: 10,
    description: 'Kula jest jeszcze krucha. Szczotką drucianą zetrzyj ślady warstw z druku.',
  },
  {
    key: 'curing',
    name: 'Wilgotne dojrzewanie',
    minDays: 21,
    plannedDays: 28,
    activeMinutesPerBall: 5,
    description: 'W worku, zraszanie co kilka dni. Pełna wytrzymałość po ok. 4 tygodniach.',
  },
  {
    key: 'rinsing',
    name: 'Płukanie (obniżanie pH)',
    minDays: 7,
    plannedDays: 14,
    activeMinutesPerBall: 5,
    description: 'Świeży cement ma pH 12–13 i zabija mech. Moczenie i płukanie, test papierkiem: szczep przy pH poniżej ok. 8.',
  },
  {
    key: 'inoculation',
    name: 'Szczepienie mchu',
    minDays: 1,
    plannedDays: 1,
    activeMinutesPerBall: 20,
    description: 'Kawałki mchu wciśnięte we wgłębienia i koktajl nałożony pędzlem.',
  },
  {
    key: 'establishing',
    name: 'Przyjmowanie się mchu',
    minDays: 42,
    plannedDays: 56,
    activeMinutesPerBall: 10,
    description: 'W cieniu, regularne zraszanie, bez mrozu.',
  },
  {
    key: 'selling',
    name: 'Gotowa do sprzedaży',
    minDays: 0,
    plannedDays: 0,
    activeMinutesPerBall: 15,
    description: 'Zdjęcia, aukcja, pakowanie, karta pielęgnacji.',
  },
]

export const DEFAULT_COST_ITEMS: CostItem[] = [
  { key: 'core', name: 'Kula styropianowa 12 cm', plannedPerBall: 6, quantityNote: '1 szt.', unitPriceNote: 'ok. 12,60 zł pojedynczo, 5–7 zł w hurcie', coverageHint: '1 szt. = 1 kula', kind: 'material' },
  { key: 'moss', name: 'Mech (kupiony)', plannedPerBall: 5, quantityNote: 'garść', unitPriceNote: '—', coverageHint: 'ok. 50 zł ≈ 10 kul', kind: 'material' },
  { key: 'perlite', name: 'Perlit', plannedPerBall: 1.4, quantityNote: 'ok. 1 l', unitPriceNote: 'ok. 1,45 zł/l (worek 20 l)', coverageHint: 'worek 20 l ≈ 20 kul', kind: 'material' },
  { key: 'cement', name: 'Cement portlandzki', plannedPerBall: 1, quantityNote: 'ok. 1,2 kg', unitPriceNote: 'ok. 0,85 zł/kg (worek 25 kg)', coverageHint: 'worek 25 kg ≈ 20 kul', kind: 'material' },
  { key: 'mold', name: 'Amortyzacja formy z druku 3D', plannedPerBall: 1, quantityNote: '1/40 formy', unitPriceNote: 'ok. 40 zł filamentu na formę', coverageHint: '1 forma ≈ 40 odlewów', kind: 'material' },
  { key: 'peat', name: 'Torf kwaśny', plannedPerBall: 0.4, quantityNote: 'ok. 1 l', unitPriceNote: 'ok. 0,40 zł/l', coverageHint: 'worek 50 l ≈ 40 kul', kind: 'material' },
  { key: 'fiber', name: 'Włókno polipropylenowe', plannedPerBall: 0.3, quantityNote: 'szczypta', unitPriceNote: '—', coverageHint: 'opakowanie ≈ 60 kul', kind: 'material' },
  { key: 'misc', name: 'Olej do formy, papierki pH, drobne', plannedPerBall: 0.5, quantityNote: '—', unitPriceNote: '—', coverageHint: '30 zł ≈ 60 kul', kind: 'material' },
  { key: 'packaging', name: 'Karton i wypełniacz (na wysyłkę)', plannedPerBall: 6, quantityNote: '1 wysyłka', unitPriceNote: '5–8 zł', coverageHint: '60 zł ≈ 10 wysyłek', kind: 'packaging' },
]

export const DEFAULT_CHANNELS: ChannelSetting[] = [
  { key: 'allegro', name: 'Allegro', commissionPct: 12, fixedFee: 0, defaultPrice: 119, packagingCost: 6, shipped: true, enabled: true },
  { key: 'local', name: 'Lokalnie (odbiór)', commissionPct: 0, fixedFee: 0, defaultPrice: 79, packagingCost: 0, shipped: false, enabled: true },
  { key: 'instagram', name: 'Instagram', commissionPct: 0, fixedFee: 0, defaultPrice: 119, packagingCost: 6, shipped: true, enabled: true },
  { key: 'facebook', name: 'Facebook / Marketplace', commissionPct: 0, fixedFee: 0, defaultPrice: 99, packagingCost: 0, shipped: false, enabled: true },
  { key: 'fair', name: 'Targi i kiermasze', commissionPct: 0, fixedFee: 0, defaultPrice: 89, packagingCost: 0, shipped: false, enabled: true },
  { key: 'etsy', name: 'Etsy', commissionPct: 10, fixedFee: 0, defaultPrice: 149, packagingCost: 6, shipped: true, enabled: true },
  { key: 'florist', name: 'Kwiaciarnia (komis)', commissionPct: 25, fixedFee: 0, defaultPrice: 109, packagingCost: 0, shipped: false, enabled: true },
]

export function createDefaultSettings(): Settings {
  return {
    id: 'main',
    brandName: 'Zielone Kule',
    ownerName: '',
    ownerAddress: '',
    recipe: structuredClone(DEFAULT_RECIPE),
    productVariants: [
      { id: 'std', name: 'Kula 18 cm', diameterCm: 18, coreCm: 12, note: 'ścianka ok. 3 cm, waga 2–2,8 kg' },
      { id: 'premium', name: 'Kula 18 cm premium', diameterCm: 18, coreCm: 12, note: 'podstawka, więcej mchu' },
    ],
    stages: structuredClone(DEFAULT_STAGES),
    schedule: {
      warmThresholdC: 12,
      warmMinHours: 24,
      warmMaxHours: 48,
      coldMinDays: 3,
      coldMaxDays: 4,
      freezingThresholdC: 5,
      freezingExtraDays: 2,
      curingMistEveryDays: 3,
      rinseWaterEveryDays: 3,
      phTestEveryDays: 3,
      phTarget: 8,
      mossCheckAfterDays: 14,
      mossMistEveryDays: 3,
    },
    costItems: structuredClone(DEFAULT_COST_ITEMS),
    lossReservePct: 10,
    channels: structuredClone(DEFAULT_CHANNELS),
    priceVariants: [
      { id: 'local', name: 'Sprzedaż lokalna (odbiór, targi)', price: 69, channel: 'local' },
      { id: 'low', name: 'Allegro, cena niska', price: 89, channel: 'allegro' },
      { id: 'rec', name: 'Allegro, cena rekomendowana', price: 119, channel: 'allegro' },
      { id: 'premium', name: 'Wersja premium (podstawka, więcej mchu)', price: 149, channel: 'allegro' },
    ],
    recommendedPrice: 119,
    minAllegroPrice: 75,
    hourlyRates: [31.4, 40, 50],
    targetHourlyRate: 40,
    years: [{ year: 2026, minWage: 4806, minHourly: 31.4 }],
    limitPctOfMinWage: 225,
    includeShippingInRevenue: true,
    startupBudget: 435,
    startupBalls: 20,
    journalTags: ['test receptury', 'mech', 'sprzedaż', 'formy', 'zakupy', 'pomysł', 'problem', 'pielęgnacja'],
    planPhases: [
      { id: 'tests', title: 'Testy', from: '2026-11-01', to: '2026-12-31', text: 'Odlej 3–4 kule próbne w różnych wariantach. Zmierz czas pracy, zważ zużycie materiałów i popraw liczby w planie.' },
      { id: 'series', title: 'Pierwsza seria', from: '2026-12-01', to: '2027-01-31', text: 'Wydrukuj 2 dodatkowe formy i odlewaj 5–6 kul tygodniowo, aż będzie 20 sztuk.' },
      { id: 'inoculation', title: 'Szczepienie mchu', from: '2027-01-01', to: '2027-02-28', text: 'Szczep kule po płukaniu (pH poniżej ok. 8). Trzymaj je w chłodzie, ale bez mrozu. Załóż Instagram i pokazuj proces.' },
      { id: 'prep', title: 'Przygotowanie', from: '2027-03-01', to: '2027-03-31', text: 'Zrób zdjęcia w ogrodzie, kartę pielęgnacji, opisy, regulamin i ewidencję sprzedaży.' },
      { id: 'launch', title: 'Start sprzedaży', from: '2027-03-01', to: '2027-04-30', text: 'Allegro po 119 zł, sprzedaż lokalna po 79–89 zł, oferta komisu dla 1–2 kwiaciarni.' },
      { id: 'review', title: 'Ocena', from: '2027-05-01', to: '2027-05-31', text: 'Sprawdź, które kanały i ceny działają najlepiej, i zdecyduj o drugim rozmiarze kul albo zestawach.' },
    ],
    updatedAt: new Date(0).toISOString(),
  }
}

/** Uzupełnia brakujące pola po aktualizacji aplikacji (stare kopie zapasowe, nowe ustawienia) */
export function withDefaults(stored: Partial<Settings> | undefined): Settings {
  const d = createDefaultSettings()
  if (!stored) return d
  return {
    ...d,
    ...stored,
    schedule: { ...d.schedule, ...(stored.schedule ?? {}) },
    recipe: stored.recipe ?? d.recipe,
    id: 'main',
  }
}
