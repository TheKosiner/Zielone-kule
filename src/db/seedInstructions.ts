// Wbudowane instrukcje (SOP) z procesu produkcji i karta pielęgnacji dla klienta.
// Stałe id pozwalają przywrócić oryginalną treść po edycji.
import type { Instruction, StageKey } from './types'

interface Def {
  id: string
  title: string
  category: Instruction['category']
  stage?: StageKey
  duration?: string
  summary?: string
  steps?: string[]
  pitfalls?: [string, string][]
  body?: string
}

export const CARE_CARD_ID = 'care-card'

const DEFS: Def[] = [
  {
    id: 'sop-casting',
    title: 'Mieszanie i odlew',
    category: 'process',
    stage: 'casting',
    duration: 'dzień 0 · ok. 15 min na kulę',
    summary: 'Receptura objętościowa: 1 część cementu portlandzkiego, 1,5 części perlitu, 1,5 części kwaśnego torfu i garść włókna polipropylenowego. Woda do konsystencji „mokrego twarogu”.',
    steps: [
      'Sprawdź temperaturę: co najmniej 5°C, najlepiej powyżej 12°C.',
      'Posmaruj formę z druku 3D cienko olejem albo wazeliną.',
      'Odmierz objętościowo: 1 cement : 1,5 perlitu : 1,5 torfu. Torf przesiej.',
      'Wymieszaj na sucho, dodaj garść włókna PP i rozbij grudki.',
      'Dolewaj wodę stopniowo, aż masa będzie jak mokry twaróg i utrzyma kształt w dłoni.',
      'Zablokuj rdzeń ze styropianu (12 cm) dystansami albo odlewaj w dwóch etapach.',
      'Wypełniaj formę warstwami i dociskaj, żeby nie zostały pustki. Ścianka ok. 3 cm.',
      'Odciśnij wgłębienia na mech, pilnując, żeby ścianka przy nich nie była za cienka.',
      'Przykryj formę folią.',
      'Dodaj partię w aplikacji: data, liczba kul i temperatura. Harmonogram powstanie sam.',
    ],
    pitfalls: [
      ['Wypływający styropian', 'Rdzeń wypiera ok. 1,5 kg masy i wypływa do góry. Zablokuj go dystansami (patyczki, drut) albo odlej najpierw dolną połowę, odczekaj, aż zgęstnieje, i dopiero wtedy włóż rdzeń.'],
      ['Odlewanie w zimnie', 'Poniżej 5°C cement prawie nie wiąże. Przy 5–12°C wiązanie trwa 3–4 dni zamiast 1–2.'],
      ['Za rzadka masa', 'Nadmiar wody osłabia kulę i sprzyja pęknięciom. Masa ma przypominać mokry twaróg, a nie ciasto naleśnikowe.'],
      ['Koktajl z mchu w masie', 'Nie dodawaj zblendowanego mchu do cementu. Mech zginie przy pH 12–13, a masa będzie słabsza.'],
    ],
  },
  {
    id: 'sop-setting',
    title: 'Wiązanie w formie',
    category: 'process',
    stage: 'setting',
    duration: '24–48 h w cieple, 3–4 dni w chłodzie (5–12°C)',
    summary: 'Forma stoi przykryta folią w spokojnym miejscu. O wyjęciu decyduje test paznokcia.',
    steps: [
      'Zostaw formę przykrytą folią i nie przestawiaj jej.',
      'Po 24 h (w chłodzie po 3 dniach) zrób test paznokcia na odsłoniętej powierzchni.',
      'Paznokieć robi wgniecenie: czekaj kolejne 12–24 h.',
      'Paznokieć zostawia rysę, ale nie wgniecenie: można wyjmować.',
    ],
    pitfalls: [
      ['Za wczesne wyjęcie', 'Kula się kruszy albo odpadają krawędzie wgłębień. Lepiej odczekać kilka godzin dłużej.'],
      ['Przesuszenie', 'Odkryta forma szybko traci wodę i pojawiają się rysy skurczowe. Folia ma leżeć szczelnie.'],
    ],
  },
  {
    id: 'sop-demolding',
    title: 'Wyjęcie i szczotkowanie',
    category: 'process',
    stage: 'demolding',
    duration: 'zaraz po wyjęciu · ok. 10 min na kulę',
    summary: 'Kula jest jeszcze krucha. To najlepszy moment, żeby zetrzeć ślady warstw z druku 3D.',
    steps: [
      'Rozdziel formę ostrożnie i trzymaj kulę od spodu.',
      'Szczotką drucianą zetrzyj ślady warstw z druku.',
      'Popraw krawędzie wgłębień, jeśli się wykruszyły.',
      'Oczyść formę i posmaruj ją przed kolejnym odlewem.',
      'W aplikacji odhacz „Wyjmij z formy” – kule dostaną status „Dojrzewa”.',
    ],
    pitfalls: [['Pęknięcia przy cienkich wgłębieniach', 'Najczęściej pęka tam, gdzie ścianka przy wgłębieniu jest najcieńsza. Pomaga włókno PP, płytsze wgłębienia i ostrożne wyjmowanie.']],
  },
  {
    id: 'sop-curing',
    title: 'Wilgotne dojrzewanie',
    category: 'process',
    stage: 'curing',
    duration: '3–4 tygodnie · ok. 5 min na kulę',
    summary: 'Cement potrzebuje wilgoci, żeby osiągnąć pełną wytrzymałość (ok. 4 tygodnie).',
    steps: ['Włóż kule do worka foliowego albo przykryj folią.', 'Zraszaj co ok. 3 dni – zadania są w kalendarzu.', 'Trzymaj w cieniu i bez mrozu.', 'Po 3–4 tygodniach odhacz „Koniec dojrzewania” i zacznij płukanie.'],
    pitfalls: [
      ['Wysychanie', 'Przesuszona kula ma pylącą, słabą powierzchnię i łatwiej pęka.'],
      ['Mróz', 'Woda zamarzająca w porach świeżego betonu potrafi go rozsadzić.'],
    ],
  },
  {
    id: 'sop-rinsing',
    title: 'Płukanie i test pH',
    category: 'process',
    stage: 'rinsing',
    duration: '1–2 tygodnie · ok. 5 min na kulę',
    summary: 'Świeży cement ma pH 12–13 i zabija mech. Moczenie i płukanie obniża pH. Szczepisz dopiero poniżej ok. 8.',
    steps: [
      'Zanurz kule w wodzie (wiadro, beczka).',
      'Wymieniaj wodę co ok. 3 dni.',
      'Od 7. dnia rób test pH papierkiem na mokrej powierzchni.',
      'Zapisuj wynik jako pomiar w partii – zobaczysz wykres spadku pH.',
      'Przy pH poniżej ok. 8 odhacz „Koniec płukania” albo od razu „Zaszczep mech”.',
    ],
    pitfalls: [['Za wysokie pH', 'Szczepienie „na oko” kończy się zbrązowiałym mchem. Zawsze rób test papierkiem i notuj wynik.']],
  },
  {
    id: 'sop-inoculation',
    title: 'Szczepienie mchu',
    category: 'process',
    stage: 'inoculation',
    duration: '1 dzień · ok. 20 min na kulę',
    summary: 'Kawałki żywego mchu we wgłębieniach plus koktajl ze zblendowanego mchu na powierzchni.',
    steps: [
      'Sprawdź ostatni pomiar pH: musi być poniżej ok. 8.',
      'Przygotuj mech z hodowli albo z własnej działki.',
      'Wciśnij kawałki mchu we wgłębienia.',
      'Zblenduj mech z wodą na gęsty koktajl.',
      'Nałóż koktajl pędzlem na powierzchnię kuli.',
      'Zrosz i odstaw w cień.',
      'Odhacz „Zaszczep mech” w aplikacji.',
    ],
    pitfalls: [['Mech chroniony', 'Część gatunków jest chroniona (np. torfowce, bielistka siwa). Zbiór z lasów państwowych na sprzedaż zwykle wymaga zgody nadleśnictwa. Najbezpieczniej kupować mech z hodowli albo rozmnażać pospolite gatunki z własnej działki.']],
  },
  {
    id: 'sop-establishing',
    title: 'Przyjmowanie się mchu',
    category: 'process',
    stage: 'establishing',
    duration: '6–8 tygodni · ok. 10 min na kulę',
    summary: 'Mech musi się przyjąć, zanim kula trafi do klienta. Sprzedawaj tylko kule z przyrośniętym mchem.',
    steps: ['Trzymaj kule w cieniu.', 'Zraszaj regularnie (co ok. 3 dni, w cieple częściej).', 'Chroń przed mrozem.', 'Po 2 tygodniach oceń mech w skali 1–5.', 'Uzupełnij puste miejsca koktajlem.', 'Po 6–8 tygodniach odhacz „Gotowa do sprzedaży”.'],
    pitfalls: [
      ['Słońce', 'Na pełnym słońcu mech brązowieje w kilka dni.'],
      ['Przesuszenie', 'Mech bez wody przechodzi w spoczynek i blednie. Zraszaj częściej w ciepłe dni.'],
    ],
  },
  {
    id: 'sop-selling',
    title: 'Zdjęcia, sprzedaż i wysyłka',
    category: 'process',
    stage: 'selling',
    duration: 'ok. 15 min na kulę',
    summary: 'Dobre zdjęcia w ogrodzie i karta pielęgnacji są częścią oferty. Produkt trzeba klientowi wytłumaczyć.',
    steps: [
      'Zrób zdjęcia w ogrodzie: rano, w cieniu, na kamieniach albo w trawie.',
      'Opis: średnica 18 cm, waga 2–2,8 kg, tylko na zewnątrz, w cieniu.',
      'Cena: ok. 119 zł na Allegro, 69–89 zł lokalnie.',
      'Pakowanie: karton z 3–4 cm wypełniacza z każdej strony.',
      'Mech owiń wilgotnym papierem i włóż w woreczek.',
      'Wysyłaj na początku tygodnia, żeby paczka nie leżała w weekend.',
      'Dołącz kartę pielęgnacji.',
      'Dodaj sprzedaż w aplikacji – trafi do ewidencji.',
    ],
    pitfalls: [
      ['Reklamacja: mech zbrązowiał', 'Sprzedawaj tylko kule z przyrośniętym mchem i pisz jasno: „tylko na zewnątrz, w cieniu”.'],
      ['Zwroty w sprzedaży online', 'Klient ma 14 dni na zwrot. Przygotuj prosty regulamin.'],
    ],
  },
  {
    id: CARE_CARD_ID,
    title: 'Karta pielęgnacji',
    category: 'care',
    summary: 'Do wydrukowania i dołączenia do każdej kuli.',
    body: `## Twoja kula z żywym mchem

Ręcznie robiona kula z hipertufy (cement, perlit, torf) z żywym mchem. Każda jest inna.

- **Tylko na zewnątrz.** W domu mech uschnie.
- **Cień albo półcień.** Na pełnym słońcu mech brązowieje.
- **Zraszanie.** W suche dni zrosz mech wodą, najlepiej deszczówką.
- **Zimowanie.** Postaw kulę w osłoniętym miejscu, na podkładkach, żeby nie stała w wodzie. Mech zimą odpoczywa i wiosną znów się zazieleni.
- **Brązowe plamy?** To zwykle przesuszenie. Zraszaj częściej – mech odbija w 2–3 tygodnie.
- **Ciężka i krucha przy krawędziach.** Waży 2–2,8 kg, podnoś ją od spodu.`,
  },
]

export function createBuiltInInstructions(): Instruction[] {
  const now = new Date().toISOString()
  return DEFS.map((d, i) => builtInFromDef(d, i, now))
}

function builtInFromDef(d: Def, order: number, now: string): Instruction {
  return {
    id: d.id,
    createdAt: now,
    updatedAt: now,
    title: d.title,
    category: d.category,
    order,
    stage: d.stage,
    duration: d.duration,
    summary: d.summary,
    steps: (d.steps ?? []).map((text, i) => ({ id: `${d.id}-s${i}`, text })),
    pitfalls: (d.pitfalls ?? []).map(([title, text], i) => ({ id: `${d.id}-p${i}`, title, text })),
    body: d.body,
    checkedStepIds: [],
    builtIn: true,
  }
}

/** Oryginalna treść wbudowanej instrukcji (do „Przywróć oryginał”) */
export function originalInstruction(id: string): Instruction | null {
  const i = DEFS.findIndex((d) => d.id === id)
  return i < 0 ? null : builtInFromDef(DEFS[i], i, new Date().toISOString())
}
