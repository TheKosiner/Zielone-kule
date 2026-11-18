# Zielone Kule – panel produkcji i biznesu

Osobisty panel do produkcji i sprzedaży kul ogrodowych z hipertufy z żywym mchem. Działa w przeglądarce na komputerze i telefonie, także bez internetu. Nie ma serwera: dane leżą na urządzeniu (IndexedDB).

**Moduły:** pulpit, partie i kule z automatycznym harmonogramem, kalendarz z dziennikiem, wydatki z linkami do sklepów, sprzedaż z ewidencją dla działalności nierejestrowanej, instrukcje (SOP) z kartą pielęgnacji, biznesplan z liczbami na żywo i kalkulatorem ceny, ustawienia.

Architektura i model danych: [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md).

## Uruchomienie

Potrzebny jest Node.js 20 lub nowszy.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testy jednostkowe (harmonogram, koszty, ewidencja, kalkulator)
npm run build    # wersja produkcyjna w dist/
npm run preview  # podgląd wersji produkcyjnej
```

Przy pierwszym uruchomieniu aplikacja wypełnia się danymi z biznesplanu (ustawienia, lista zakupów za ok. 435 zł, instrukcje) i danymi przykładowymi (4 partie na różnych etapach, wydatki, 2 sprzedaże, wpisy w dzienniku). Dane przykładowe usuwa przycisk **Wyczyść dane przykładowe** na pulpicie albo w Ustawieniach. Ustawienia, instrukcje i lista zakupów zostają.

Żeby obejrzeć aplikację na telefonie w tej samej sieci Wi-Fi: `npm run dev -- --host` i otwórz adres „Network” z terminala.

## Kopia zapasowa

Dane są zapisane tylko w przeglądarce, na danym urządzeniu. Telefon i komputer mają osobne bazy.

- **Zrób kopię:** Ustawienia → Kopia zapasowa → *Pobierz kopię zapasową*. Powstaje jeden plik `zielone-kule-kopia-RRRR-MM-DD.json` (ze zdjęciami albo bez). Na telefonie przycisk *Wyślij / zapisz na Dysku* pozwala od razu wysłać plik na Dysk Google albo do siebie mailem.
- **Przywróć:** Ustawienia → *Wybierz plik kopii*. Aplikacja pokaże, co jest w pliku, i zastąpi obecne dane.
- **Przeniesienie na inne urządzenie:** zrób kopię na jednym, przywróć na drugim.
- Pulpit przypomina o kopii, gdy ostatnia jest starsza niż 14 dni.
- *Chroń dane* w Ustawieniach prosi przeglądarkę, żeby nie usuwała danych przy braku miejsca (działa najlepiej po instalacji aplikacji).

## Wdrożenie na GitHub Pages

Repozytorium ma gotowy workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), który przy każdym pushu do `main` uruchamia testy, buduje aplikację i publikuje ją.

1. Na GitHubie: **Settings → Pages → Build and deployment → Source: GitHub Actions** (jednorazowo).
2. Połącz zmiany z gałęzią `main` (np. przez pull request).
3. Po ok. minucie aplikacja jest pod adresem `https://<użytkownik>.github.io/Zielone-kule/`.
4. Na telefonie otwórz ten adres i zainstaluj aplikację: Android/Chrome – menu ⋮ → *Zainstaluj aplikację*; iPhone/Safari – *Udostępnij* → *Do ekranu początkowego*.

Gdy pojawi się nowa wersja, aplikacja pokaże u góry komunikat *Jest nowa wersja – Odśwież*. Dane się nie zmieniają.

Repozytorium jest publiczne, ale strona nie zawiera Twoich danych – każda przeglądarka ma własną bazę.

### Inne hostingi

Aplikacja to statyczne pliki z `dist/` i używa adresów z `#` (HashRouter), więc działa na każdym hostingu bez dodatkowej konfiguracji:

- **Vercel / Netlify:** podłącz repozytorium, polecenie budowania `npm run build`, katalog `dist`. Strona działa w głównym katalogu, więc `VITE_BASE` nie jest potrzebne.
- **Własny serwer w podkatalogu:** zbuduj z `VITE_BASE=/podkatalog/ npm run build`.

## Struktura

```
src/
  lib/         formatowanie PLN i dat, CSV, ICS, kompresja zdjęć, mini-markdown
  db/          schemat Dexie, typy encji, repozytorium, kopia zapasowa, dane startowe
  domain/      logika bez Reacta: harmonogram, koszty, sprzedaż i ewidencja, kalkulator
  hooks/       ustawienia, dane biznesowe na żywo, stoper, instalacja PWA
  components/  zestaw UI i układ strony (boczne menu na komputerze, dolne na telefonie)
  features/    moduły aplikacji
scripts/       generator ikon PWA (node scripts/generate-icons.cjs)
```

## Synchronizacja w przyszłości

Wszystkie zapisy idą przez `src/db/repo.ts`, które nadaje rekordom UUID i `updatedAt`, a usunięcia zapisuje w tabeli `deletions`. Dzięki temu da się później dodać synchronizację (np. Supabase): wysyłać rekordy nowsze niż ostatnia synchronizacja i listę usunięć, a przy konflikcie brać nowszy zapis. Widoki nie wymagają zmian.

## Ważne liczby (do zmiany w Ustawieniach)

- Receptura 1 : 1,5 : 1,5 (cement : perlit : torf) + włókno PP, czasy etapów, progi temperatury.
- Materiały 15,60 zł na kulę, 10% zapasu na straty, opakowanie 6 zł.
- Prowizje i ceny kanałów (Allegro 12%, 119 zł), minimum 75 zł.
- Limit działalności nierejestrowanej = 225% płacy minimalnej na kwartał (2026: 10 813,50 zł). **Na 2027 dopisz nową płacę minimalną w Ustawieniach → Limity i stawki**, zanim ruszy sprzedaż.

Liczby z biznesplanu to szacunki. Kwestie prawne i podatkowe (ewidencja, wysyłka w przychodzie, zwroty) potwierdź w przepisach albo u księgowego.
