# HitJourney Player – Übergabe

Stand: 2. November 2026

## Status und letzter Abschluss

Die Website läuft unter [hitjourney.com](https://hitjourney.com/) über GitHub Pages aus `calvinjohncamp/hitjourney-player`, Branch `main`. Die aktuellen Fokus-, Logo- und Grundlinien-Anpassungen sind veröffentlicht. Die früher als ausstehend bezeichnete Vinyl-Endlosschleifen-/Crossfade-Reparatur ist bereits enthalten.

Die letzte Korrektur dieser Freigabe betrifft Mr. DJ: **kleines Cover → großes Cover → Lyrics → Cover → Lyrics …**. Der erste Klick auf das kleine Cover vergrößert nur das Cover; er darf nicht gleichzeitig zu Lyrics wechseln. Auf Touch öffnet die feste Ansicht bereits groß mit Cover, danach wechseln Taps zwischen Lyrics und Cover. Schließen über X, neue Öffnung wieder mit Cover. Diese Freigabe umfasst die Cover-Korrektur und beide aktualisierten Dokumentationsdateien.

## Maßgebliche Dateien

| Datei | Aufgabe |
| --- | --- |
| `index.html` | Öffentliche App, Home, Alben, Vinyl und Unterseiten |
| `404.html` | Identischer Fallback für direkte Unterseitenaufrufe |
| `dj.html` | Mr. DJ, Player und Cover-/Lyrics-Ansicht |
| `admin.html` | Inhaltsverwaltung und Logo-Editor oben im Home-Tab |
| `focus.html`, `assets/focus-entry.js`, `assets/focus.js`, `assets/focus.css` | Beständiger Fokusrahmen, Vollbild, Resize und Griffsteuerung |
| `assets/header-logo.js`, `assets/header-logo.css`, `assets/header-logo-admin.js` | Gemeinsame Logo-Darstellung, Ausrichtung und Admin-Vorschau |
| `assets/mr-dj-logo.png` | Unveränderte transparente Nutzer-PNG als Vorgabe |
| `random-dice-transparent.png` | Originalwürfel für Vinyl-Zufallswiedergabe |
| `CNAME`, `streams.json`, `.github/workflows/` | Domain, Streamdaten und Pages-/Synchronisations-Automationen |
| `PROJECT_MEMORY.md` | Dauerhafte Regeln und vollständiger aktueller Funktionsstand |

## Verbindliches Verhalten

### Fokus

- Roter HitJourney-Logo-Punkt schaltet Fokus, übriger Schriftzug führt Home. Keine Aktiv-Markierung am Punkt.
- App von Anfang an im gleichursprünglichen iframe; Fokus/Resize laden den Player nicht neu. Echter Viewport, mittig vor dunklem Hintergrund; Breite ab 320px. Interne Navigation einschließlich Mr. DJ und Zurück/Vorwärts behält Rahmen und Breite.
- Griffbalken verschwinden nach drei Sekunden. Erst Annäherung an die tatsächlichen Seitenkanten (80px-Bereich) oder Anfassen zeigt sie wieder. Mittige Mausbewegungen und ruhendes Hover verlängern die Anzeige nicht. Tastaturbedienung bleibt möglich.
- Status-/Schließen-Anzeige blendet nach zwei Sekunden aus, oberer Rand/Tastatur holt sie zurück. Escape/Browser-Ausgang synchronisieren den Zustand. Vollbild nur nach Nutzerinteraktion; ehrlicher Browserfenster-Fallback bei fehlender Freigabe. Fokus-Asset-/Host-Version `v=3`.

### Kopfzeilenlogo und Grundlinie

- Admin → Home → ganz oben: WYSIWYG-Vorschau, PNG/WebP-Upload bis 8 MB, Größe 40–240px, Drehung ±180°, HEX/Farbwähler/Bildschirm-Pipette. Nur „Logo speichern“ veröffentlicht Einstellungen; Verwerfen setzt zurück.
- Das Logo führt immer zu Mr. DJ innerhalb des Fokusrahmens. SVG-Filter färbt anhand der Originaltransparenz, auch bei S3-Bildern ohne CORS-Leserechte.
- Mr. DJ und Making Waves unabhängig oben/mittig/unten zu HitJourney. HitJourney bleibt beim Wechsel der Ausrichtung fest. Admin und öffentliche Seite verwenden denselben Code.
- **„Unten bündig“ = normale Buchstabengrundlinie von Hit/ourne, nicht j/y-Unterlängen.** Referenz im 1829×294-Logo: y=230, also `230/294` der dargestellten Höhe. Nicht auf den Bildrand y=294 zurückstellen. Header-Assets `v=3`.
- Persistenz ausschließlich in geschützter Supabase-`home_layout`-Zeile `row_order=-7`, Typ `headerLogo`. Enthält `src/color/width/rotation/ratio/djAlign/wavesAlign`. Legacy-Ausrichtungen ohne Felder sind mittig. Vor Schreiben lesen und anschließend bestätigen. Nutzerwerte nicht durch Vorgaben überschreiben.

### Bestehende Musik-/Home-Funktionen

- Vinyl Promotion bleibt ein bewusst angelegter normaler Home-Zeilentyp, niemals automatisch leer einfügen. Zwei Varianten, aktuell maximal vier Alben; live sind drei Alben eingerichtet.
- Automatische Endlosanimation und weiche Kreuzblende, Reihenfolge-/Zufallswiedergabe und gestaffeltes Bildladen erhalten. Würfeldatei und übrige Player-/Unterseitenfunktionen nicht ersetzen.
- Normales Home-Speichern darf geschützte Sonderzeilen nicht löschen. `home_layout`-Sonderbereiche: -1 About, -2 Landingpages, -3 Unterseiten, -4 Overlay-Bibliothek, -5 Album-Promotions, -6 Vinyl-Promotions, -7 Kopfzeilenlogo.

## Lokal prüfen

Im Projektordner einen HTTP-Server auf Port 8787 starten, etwa `python3 -m http.server 8787 --bind 127.0.0.1`. Website unter `http://127.0.0.1:8787/`, Admin unter `/admin.html`. Kein `file://` für API-/Upload-/Speichertests.

Browser-Regressionen mit installiertem Playwright:

```sh
node scripts/test_focus.cjs
node scripts/test_focus_artwork.cjs
node scripts/test_header_logo.cjs
node scripts/test_header_alignment.cjs
```

Falls Playwright nicht im Projekt installiert ist, `PLAYWRIGHT_MODULE` auf eine vorhandene Installation setzen. In dieser Umgebung wurde `/Users/jk/Dropbox/9. TFB-Website/01 Software/node_modules/playwright` verwendet. `HJ_TEST_URL` überschreibt bei Bedarf die Testbasis. Die Tests simulieren Datenzugriffe und verändern keine Produktionsdaten.

Nach der letzten Korrektur ist besonders die vollständige Desktop-Folge kleines Cover → großes Cover → Lyrics → Cover zu prüfen, einschließlich Schließen/Neuöffnen, verspäteter Bildantworten und fehlender Motive. Touch bleibt Cover → Lyrics → Cover. Die Ausrichtungs-Tests decken Chromium und WebKit, Desktop/Mobilbreiten, alle neun Kombinationen, Save/Reload und den Fokus-Link ab. Native Pipettenauswahl und echte Mobilgeräte wurden nicht manuell geprüft.

## Veröffentlichung und Git-Hinweis

1. `origin/main` abrufen und mit den lokalen Arbeitsdateien vergleichen. Der Haupt-Arbeitsordner hat einen alten lokalen Git-Stand und bereits vorhandene Nutzeränderungen; nicht blind pullen, resetten oder sämtliche Dateien committen.
2. In einem separaten aktuellen Checkout nur den gewünschten Unterschied übernehmen. Eine bereits vorher vorhandene lokale Änderung in `admin.html/getS3Names` ist nicht Bestandteil der hier veröffentlichten Änderungen. Temporäre Checkouts sind keine dauerhafte Quelle.
3. Passende Tests, Inline-JS-Syntax und `git diff --check` prüfen. `index.html` und `404.html` identisch halten; bei Asset-Änderungen alle benötigten Dateien und passende Versionsparameter mitnehmen.
4. Auf `main` pushen, GitHub-Pages-Deployment bis Erfolg verfolgen und live ausgelieferte Dateien vergleichen. Ein erfolgreicher Push allein ist noch kein abgeschlossenes Deployment.
5. Nach zusammenhängenden Änderungen Admin und Homepage neu laden. Bereits offene Fokusrahmen/Browser-Caches können alte Dokumente behalten.

Die Action `Sync 404.html with index.html` synchronisiert den Fallback zusätzlich automatisch. Kein eigener App-Build erforderlich; GitHub Pages führt seinen statischen Build aus. Inhalte und Uploads verwenden die vorhandene Supabase-/S3-Infrastruktur, kein neuer Hostingdienst.

## Später, nur bei Bedarf

- Erst beim fünften veröffentlichten Vinylalbum die linke Auswahl auf ein Sechser-Raster erweitern.
- Bei erneut sehr großen Druckdateien eine gesonderte Web-Bildvariante erwägen; gestaffeltes Laden allein reduziert keine Dateigröße.
