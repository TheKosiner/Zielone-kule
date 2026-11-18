# Architektura i model danych

Panel „Zielone Kule” to aplikacja jednostronicowa (SPA), która działa w całości w przeglądarce. Nie ma serwera. Dane leżą w IndexedDB na urządzeniu, a kopię zapasową robi się eksportem do pliku JSON.

## Stos technologiczny

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Budowanie | Vite + React + TypeScript | szybki start, typy chronią przed błędami w liczbach |
| Wygląd | Tailwind CSS 4, font Inter (lokalnie, bez Google Fonts) | spójne tokeny kolorów, działa offline |
| Ikony | lucide-react | lekkie, czytelne |
| Wykresy | Recharts | proste wykresy słupkowe i kołowe |
| Dane | Dexie (IndexedDB) + `useLiveQuery` | widoki odświeżają się same po każdej zmianie |
| Routing | React Router (HashRouter) | działa na GitHub Pages bez sztuczek z 404 i offline |
| PWA | vite-plugin-pwa (Workbox) | instalacja na telefonie, praca bez sieci |
| PDF | widoki do druku + „Zapisz jako PDF” w przeglądarce | polskie znaki bez osadzania fontów, mały rozmiar |
| Testy | Vitest | harmonogram, koszty i ewidencja mają testy jednostkowe |

## Warstwy w kodzie

```
src/
  lib/        formatowanie PLN i dat (pl-PL, Europe/Warsaw), CSV, ICS, kompresja zdjęć, mini-markdown
  db/         schemat Dexie, typy encji, repozytorium (CRUD + znaczniki czasu), kopia zapasowa, dane startowe
  domain/     czysta logika bez Reacta: harmonogram partii, koszty, zysk, ewidencja, limit kwartalny
  hooks/      useSettings, usePhotoUrl, stoper
  components/ zestaw UI (przyciski, karty, arkusze, pola liczbowe z przecinkiem) i układ strony
  features/   moduły: pulpit, partie, kalendarz, dziennik, wydatki, sprzedaż, instrukcje, biznesplan, ustawienia
```

Komponenty nie piszą do IndexedDB bezpośrednio. Wszystko idzie przez `db/repo.ts`, które ustawia `id`, `createdAt` i `updatedAt`, a przy usuwaniu zapisuje „nagrobek” w tabeli `deletions`. Dzięki temu później da się dodać synchronizację (np. Supabase) bez przepisywania widoków: wystarczy wysyłać rekordy z `updatedAt` nowszym niż ostatnia synchronizacja oraz listę usunięć, a przy konflikcie wygrywa nowszy zapis.

## Model danych

Wszystkie encje mają `id` (UUID), `createdAt`, `updatedAt` i opcjonalną flagę `sample` (dane przykładowe, które usuwa przycisk „Wyczyść dane przykładowe”). Daty dzienne zapisuję jako tekst `RRRR-MM-DD`, więc strefa czasowa nigdy nie przesunie terminu o dzień.

| Encja | Najważniejsze pola |
|---|---|
| **Partia** (`batches`) | numer (#1, #2…), nazwa, data odlewu, liczba kul, receptura (kopia z ustawień z możliwością zmian), temperatura, notatki, zdjęcia, faktyczne daty etapów (`stageActuals`) |
| **Kula** (`balls`) | partia, numer w partii (kod np. `3-07`), status, data zmiany statusu, ocena mchu 1–5, pęknięcia, ostatnie pH, notatki, zdjęcia, sprzedaż |
| **Pomiar** (`measurements`) | partia, opcjonalnie kula, data, typ (pH, pęknięcie, ocena mchu, waga, notatka), wartość |
| **Czas pracy** (`workSessions`) | partia (opcjonalnie), etap, data, minuty, start/koniec ze stopera |
| **Zadanie / wydarzenie** (`events`) | tytuł, data, okno do (`endDate`), rodzaj (zadanie / kamień milowy / wydarzenie), zrobione, partia, źródło (harmonogram / ręczne / plan), klucz harmonogramu |
| **Wpis dziennika** (`journal`) | data, tytuł, treść, tagi, zdjęcia, partia |
| **Wydatek** (`expenses`) | nazwa, kategoria, link do oferty, cena jednostkowa, ilość, jednostka, data, notatka, pozycja kosztowa (np. „Cement”), „starczy na N kul” |
| **Zakup planowany** (`planned`) | jak wydatek, ale z ceną szacowaną i priorytetem; jednym kliknięciem staje się wydatkiem |
| **Sprzedaż** (`sales`) | data, kule lub partia, liczba sztuk, kanał, cena, prowizja, wysyłka (płacona przez klienta i mój koszt), opakowanie, klient, status (OK / zwrot / reklamacja), kwota zwrotu |
| **Instrukcja** (`instructions`) | tytuł, kategoria (proces / porady / karta pielęgnacji / własne), etap, czas, kroki checklisty, typowe błędy, treść |
| **Zdjęcie** (`photos`) | plik po kompresji, miniatura, właściciel (partia / kula / dziennik) |
| **Ustawienia** (`settings`, jeden rekord) | marka, receptura, etapy z czasami i minutami pracy, progi temperatury, pozycje kosztowe, straty %, kanały z prowizjami i cenami, warianty cenowe, stawki godzinowe, płaca minimalna i limit kwartalny wg roku, tagi dziennika, dane do ewidencji |

Statusy kuli: `w formie → dojrzewa → płukanie → zaszczepiona → mech się przyjmuje → gotowa → sprzedana / odpad`.

## Automatyczny harmonogram

`domain/schedule.ts` liczy terminy z ustawień, a nie ze stałych w kodzie:

1. Odlew w dniu 0. Poniżej 5°C aplikacja ostrzega.
2. Wiązanie: przy ≥ 12°C 24–48 h, przy 5–12°C 3–4 dni, poniżej 5°C dłużej (wszystkie progi da się zmienić). Zadanie „Test paznokcia i wyjęcie z formy” ma okno od–do.
3. Dojrzewanie 3–4 tygodnie ze zraszaniem co 3 dni.
4. Płukanie 1–2 tygodnie z wymianą wody i testami pH.
5. Szczepienie mchu, ocena po 2 tygodniach, zraszanie mchu co 3 dni.
6. Gotowość do sprzedaży po 6–8 tygodniach przyjmowania się mchu.

Kamienie milowe są powiązane ze statusami. Gdy odhaczasz „Wyjmij partię #3 z formy”, aplikacja proponuje zmianę statusu kul na „dojrzewa” i przelicza resztę harmonogramu od faktycznej daty. Zadania już zrobione zostają, a niezrobione z minionych etapów znikają.

## Liczenie kosztów i zysku

- **Rzeczywisty koszt kuli**: każdy wydatek przypisany do pozycji kosztowej (np. „Cement”) z polem „starczy na N kul” daje koszt na kulę dla tej pozycji (suma kwot / suma kul). Pozycje bez danych biorą wartość z planu, a aplikacja pokazuje, ile pozycji jest już „rzeczywistych”.
- **Zysk ze sprzedaży** = cena + wysyłka od klienta − prowizja − mój koszt wysyłki − opakowanie − materiały (z zapasem na straty) − zwroty.
- **Zarobek za godzinę** = zysk / godziny pracy. Godziny pochodzą ze stopera i wpisów ręcznych dla partii (minuty partii / liczba kul). Bez pomiarów aplikacja używa założenia 1,3 h.
- **Ewidencja**: liczba porządkowa, data, kwota, narastająco w miesiącu i w kwartale, a zwroty jako korekty ujemne. Limit kwartalny = 225% płacy minimalnej danego roku (2026: 4 806 zł → 10 813,50 zł). Na 2027 trzeba będzie wpisać nową płacę minimalną w ustawieniach.

## Plan etapów

1. Szkielet, nawigacja, ustawienia, wydatki z linkami i sumami, eksport/import JSON.
2. Partie i kule z harmonogramem, kalendarz i dziennik.
3. Sprzedaż, ewidencja, limit kwartalny, pulpit.
4. Biznesplan z liczbami na żywo, kalkulator ceny, instrukcje, karta pielęgnacji.
5. PWA, szlif na telefonie, dane przykładowe, wdrożenie na GitHub Pages.
