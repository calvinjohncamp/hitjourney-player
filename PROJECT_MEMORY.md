# HitJourney Player - Projektgedaechtnis

Stand: 2. November 2026

## Projekt

- HitJourney ist die eigene Website und Web-App des Betreibers zur hochwertigen Praesentation seiner eigenen Musikproduktionen.
- Die Songs entstehen aus eigenen Songtexten und werden mit Suno entwickelt und produziert. Auch die verwendeten Artworks sind eigene Kreationen.
- Die Seite soll Musik, Alben, Vinyl-Veroeffentlichungen und Artwork nicht nur verwalten, sondern visuell hochwertig und als zusammenhaengende eigene Musikwelt praesentieren.
- Live-Seite: `https://hitjourney.com`
- Repository: `https://github.com/calvinjohncamp/hitjourney-player`
- Hauptbranch: `main`
- Statische Anwendung ohne Build-Schritt.
- Zentrale Dateien: `index.html`, `admin.html`, `dj.html`, `streams.json`.
- Lokale Vorschau und speicherfaehiger Admin laufen ueber `http://127.0.0.1:8787/` und `http://127.0.0.1:8787/admin.html`.
- Ein Doppelklick auf `admin.html` oeffnet nur eine `file://`-Version. Darueber funktionieren Netzwerkzugriffe und Uploads nicht verlaesslich.

## Zentrale Bereiche

- Die oeffentliche Home-Seite praesentiert Songs, Alben, Vinyl-Veroeffentlichungen, eigene Motive und redaktionelle Inhalte.
- `Mr. DJ` ist ein eigenstaendiger, visuell hochwertiger Tape-Deck-Bereich, ueber den die gesamte Musiksammlung komfortabel abgespielt werden kann.
- Die Alexa-Anbindung macht die wesentlichen Songs auch ueber Alexa abrufbar.
- Der Admin-Bereich ist das zentrale Gestaltungswerkzeug. Damit kann der Betreiber Songs und Alben pflegen sowie Aufbau, Reihenfolge, Ueberschriften, Motive, Promotionen, Unterseiten und weitere Inhalte nach aktuellen Wuenschen anpassen.
- Die Anwendung ist damit zugleich Musikpraesentation, Player und flexibel pflegbares persoenliches Publikationssystem.

## Historie

- Eine nachtraeglich rekonstruierte Detailchronik ist nicht erforderlich.
- Git bleibt die technische Versionshistorie fuer konkrete Dateiaenderungen.
- Dieses Projektgedaechtnis dokumentiert stattdessen den Zweck, dauerhafte Entscheidungen, wichtige Betriebsregeln und den jeweils gueltigen Funktionsstand.

## Dauerhafte Regeln

- Bestehende Funktionen wie Mr. DJ, Player, Home-Zeilen, Unterseiten und Landingpages muessen erhalten bleiben.
- Neue Home-Inhalte werden im Admin als normale Zeilen angelegt. Es darf keine leere Vinyl-Zeile automatisch erscheinen.
- Alle neuen Zeilentypen verwenden dieselbe konfigurierbare Ueberschriftenfunktion.
- `404.html` ist erforderlich. Die GitHub Action `.github/workflows/sync-404.yml` kopiert bei Aenderungen an `index.html` automatisch dessen Inhalt nach `404.html`, damit direkte Seitenaufrufe weiterhin die Anwendung laden.
- `CNAME` wird fuer die Domain `hitjourney.com` benoetigt.
- `.gitignore` haelt `.DS_Store`, lokale Claude-Einstellungen und Sicherungsdateien aus dem Repository.

## Vinyl Promotion

Der Home-Editor bietet den Zeilentyp `Vinyl Promotion` mit zwei Varianten:

- `Zwei Alben`: die bisherige Darstellung fuer zwei Alben.
- `Mehr als zwei`: aktuell fuer maximal vier Alben ausgelegt.

Fuer jedes ausgewaehlte Album werden separat gespeichert:

- Innensleeve Vorderseite
- Innensleeve Rueckseite
- Albumcover Rueckseite

Die Ueberschrift besitzt dieselben Optionen wie andere Home-Zeilen: keine, einfach oder modern, inklusive Ausrichtung und Farbe.

### Darstellung bei mehr als zwei Alben

- Kleine Albumcover stehen links senkrecht von oben nach unten.
- Bei drei Alben belegen sie die ersten drei Positionen; die Bedienelemente sitzen im vierten quadratischen Platz.
- Bei vier Alben rutschen die Bedienelemente automatisch auf den naechsten freien Platz.
- Rechts davon laufen zwei gleich grosse quadratische Praesentationsfelder.
- Album 1 ist beim Laden vorausgewaehlt.
- Die Praesentation beginnt nach einer Sekunde, weitere Phasen wechseln im Abstand von drei Sekunden.
- Ein Klick auf eines der beiden grossen Felder pausiert beziehungsweise setzt die Praesentation fort.
- Der Endzustand zeigt Cover und Rueckseite. Der rote Play-Button liegt auf dem Cover und die fertige Ansicht bleibt etwas laenger stehen.
- Danach blendet die komplette Endansicht weich aus, waehrend das Cover des naechsten Albums einblendet. Eine Sekunde spaeter beginnt dessen erstes Sleeve herauszufahren.
- Alle vorhandenen Promotionsalben laufen auch ohne Bedienung automatisch und endlos der Reihe nach durch.
- Beim manuellen Auswaehlen eines kleinen Covers beginnt die Schleife mit diesem Album und laeuft anschliessend weiter.

### Endloswiedergabe

- Der rote Play-Button unter den kleinen Covern spielt alle Songs der ausgewaehlten Alben in Albumreihenfolge und wiederholt sie endlos.
- Der hellblaue Wuerfel mischt alle Songs dieser Alben und erzeugt bei jedem Durchlauf eine neue Zufallsreihenfolge.
- Die Vinyl-Animation wechselt grundsaetzlich endlos durch die ausgewaehlten Alben. Die beiden Wiedergabemodi starten zusaetzlich die passende Musikwiedergabe.
- Der grosse rote Markierungspunkt auf kleinen Albumcovern wurde entfernt.
- Der kleine rote Aktivitaetspunkt oben rechts im grossen Cover bleibt bestehen, ohne Schatten oder zusaetzlichen Kreis.
- Play und Wuerfel sind in ihrem freien Platz optisch mittig ausgerichtet. Der Play-Button ist gegenueber der urspruenglichen Fassung um etwa 25 Prozent vergroessert.
- Der Originalwuerfel liegt als optimierte transparente Datei `random-dice-transparent.png` im Projekt.

## Bildladen

- Die Vinyl-Bilder werden gestaffelt geladen: sichtbares Cover und erstes Sleeve zuerst, weitere Cover und Rueckseiten danach.
- Das verbessert den Start, reduziert aber nicht die Dateigroesse der hochgeladenen Original-Druckdaten.
- Bei kuenftigen sehr grossen Motiven waere eine serverseitige oder beim Upload erzeugte Web-Version die nachhaltige Optimierung.

## Daten und Speicherung

- Home-Aufbau und Vinyl-Konfiguration werden ueber die bestehende Supabase-Struktur gespeichert.
- Bilddateien werden ueber den vorhandenen signierten Upload nach S3 uebertragen.
- Lokale Datei-Aufrufe sind fuer Upload und Speichern ungeeignet; dafuer immer die lokale HTTP-Adresse oder die Live-Admin-Seite verwenden.
- Eine Vinyl-Promotion wird erst sichtbar, nachdem sie als neue Home-Zeile angelegt, vollstaendig konfiguriert und gespeichert wurde.

## Automationen

- `.github/workflows/sync-404.yml`: synchronisiert `404.html` nach Aenderungen an `index.html`.
- `.github/workflows/hall-of-fame.yml`: aktualisiert `streams.json` taeglich anhand der SoundCloud-Streams.

## Aktueller freigegebener Stand

- Vinyl-Promotion mit drei Alben, automatischer Endlosschleife, weicher Kreuzblende, geordnetem und zufälligem Abspielen ist veröffentlicht.
- Fokusmodus mit skalierbarer Ansicht, ruhigen Ziehgriffen und Navigation zu/von Mr. DJ ist veröffentlicht.
- Mr.-DJ-Kopfzeilenlogo mit Admin-Vorschau, Upload, Einfärbung, Größe, Drehung und unabhängiger Ausrichtung von Mr. DJ und Making Waves ist veröffentlicht.
- Finale Desktop-Bildfolge in Mr. DJ: **kleines Cover → großes Cover → Lyrics → Cover → Lyrics …**. Vergrößern und Motivwechsel sind getrennte Schritte. Jede neue Öffnung beginnt mit dem Cover.

## Fokusmodus

- Vorbild: F-Button und Präsentationsansicht in `9. TFB-Website/01 Software/assets/js/focus.js` und `presentation.js`.
- Der rote Punkt im HitJourney-Logo ist das Easter Egg zum Ein-/Ausschalten. Der übrige Schriftzug bleibt Home. Keine sichtbare Aktiv-Markierung am Punkt; Tastaturfokus bleibt erkennbar.
- `assets/focus-entry.js` öffnet beim direkten HTTP(S)-Einstieg `focus.html`. Die App läuft von Anfang an in einem gleichursprünglichen iframe; die sichtbare Adresse entspricht der App-URL. Fokuswechsel und Größenänderung laden den Player nicht neu.
- Der beständige Rahmen hält Vollbild und Ansichtsbreite über interne HTML-Navigation und Zurück/Vorwärts hinweg. Ein tatsächlicher HTML-Dokumentwechsel entlädt weiterhin den bisherigen Seitenplayer.
- Zentrierte Ansicht vor dunklem Außenraum, stufenlose Breite ab 320px über beide Seitenränder. Es wird die echte iframe-Breite verändert, damit responsive Layouts reagieren. Außerhalb des Fokus füllt die App das Browserfenster; beim erneuten Aktivieren bleibt die gewählte Breite erhalten.
- Griffbalken erscheinen beim Einstieg und bei Annäherung/Anfassen für drei Sekunden. Annäherungsbereich: 80px um die echten Viewportränder, sowohl in der App als auch im dunklen Außenraum. Zentrale Mausbewegungen und ruhendes Hover halten sie nicht sichtbar. Unsichtbare Ziehflächen bleiben nutzbar; Tastaturbedienung bleibt zugänglich.
- Beim Fokusstart keine eigenen Status-/Escape-Hinweise oder Tooltips anzeigen. Das Schließen-X erscheint nur auf bewusste Annäherung an den oberen Rand oder Tastaturfokus und blendet nach zwei Sekunden aus. Technische Fehler-/Fallback-Meldungen bleiben möglich. Escape, Browser-Vollbildende und Ausschalten synchronisieren den Zustand.
- Echtes Vollbild benötigt Nutzerinteraktion und Browserfreigabe. Bei fehlender API/Ablehnung wird ausdrücklich der Browserfenster-Modus angezeigt. Reload, externe Navigation oder Tab-Schließen können Vollbild beenden; kein automatischer Wiedereinstieg ohne Klick. Mobile Browser/Systemleisten bleiben durch die Plattform begrenzt.
- Dateien: `focus.html`, `assets/focus-entry.js`, `assets/focus.js`, `assets/focus.css`. Aktuelle Fokus-Assets und Rahmenaufruf: `v=4`. Host- und App-Versionen gemeinsam ausliefern; die Brücke toleriert bereits geöffnete ältere Hosts.

Browser-/Betriebssystem-eigene Vollbild-Hinweise sind keine Website-Elemente und lassen sich per Webseiten-Code nicht abschalten; keine Zusage machen, diese zu unterdrücken. Siehe [Vollbild-Standard](https://fullscreen.spec.whatwg.org/#security-and-privacy-considerations).

## Kopfzeilenlogo und Admin-Vorschau

- Vorgabe ist die unveränderte transparente Nutzerdatei `Mr. DJ.png`, veröffentlicht als `assets/mr-dj-logo.png`. Das mittlere Logo verlinkt immer auf `/dj.html` über die Fokus-Navigation.
- Admin → Home → direkt oben „Mr. DJ · Logo in der Kopfzeile“. Änderungen sofort in der Vorschau; Veröffentlichung der Einstellungen erst über **Logo speichern**. Verwerfen stellt den gespeicherten Stand wieder her.
- Transparente PNG/WebP bis 8 MB; Upload über das bestehende signierte S3-Verfahren erst beim Speichern. Größe 40–240px an der längsten Seite, Drehung ±180°, Farbe per HEX `#RRGGBB`, Farbwähler oder nativer Bildschirm-Pipette.
- Die Pipette kann in unterstützten Desktop-Browsern auch außerhalb des Browserfensters wählen, benötigt einen Nutzerklick und einen sicheren Kontext. Bei fehlender EyeDropper-API bleiben HEX/Farbwähler verfügbar. Escape bricht die Auswahl ab.
- Ein lokaler SVG-Filter erhält beim Einfärben die Bildtransparenz und funktioniert auch bei S3-Bildern ohne CORS-Lesefreigabe.
- Gemeinsame Vorschau-/Website-Implementierung: `assets/header-logo.js` und `assets/header-logo.css`; Editor: `assets/header-logo-admin.js`. Aktuelle Header-Asset-Version: `v=3`.
- Persistenz in geschützter `home_layout`-Zeile `row_order=-7`, `cells[0].type='headerLogo'`. Felder: `src`, `color`, `width`, `rotation`, `ratio`, `djAlign`, `wavesAlign`. Normales Home-Speichern darf diese Zeile nicht bearbeiten/löschen. Vor Schreiben lesen, anschließend Readback prüfen; Entwürfe bei Fehlern erhalten. Kein Schemawechsel.
- Mr. DJ und Making Waves lassen sich unabhängig oben, mittig oder unten zu HitJourney ausrichten. HitJourney bleibt beim Wechsel der Ausrichtung fest; benötigter Platz wird für alle Varianten gleich reserviert. Bild-Laden und responsive Größenänderungen werden berücksichtigt. Legacy-Datensätze ohne Ausrichtung bleiben mittig.
- **Unten bündig bedeutet die normale Buchstabengrundlinie, ohne j/y-Unterlängen.** Im 1829×294-HitJourney-Bild liegt sie bei y=230; runde Buchstaben haben einen kleinen optischen Überstand bis y=233. Die Grundlinie ist in beiden Ansichten identisch, nicht der untere Bildrand bei y=294. Bei Austausch des HitJourney-Bildes muss diese Referenz neu geprüft werden.
- Die echte gerenderte Grundlinie wurde mit gespeicherten Nutzer-Einstellungen in Homepage und Admin sowie in Chromium/WebKit geprüft. Darstellung und Linkfunktion wurden bestätigt. Gespeicherte Nutzerwerte nicht durch Vorgaben überschreiben.

## Mr.-DJ-Cover und Lyrics

- Der rote Deck-Button öffnet zunächst das Cover im bisherigen kleinen Anzeigebereich.
- **Desktop:** Klick auf das kleine Cover vergrößert dasselbe Cover. Erst der folgende Klick zeigt Lyrics. Danach wechseln Cover und Lyrics fortlaufend, die Ansicht bleibt groß. Erneuter Deck-Button verwendet denselben Ablauf; X schließt. Nach Schließen oder neuem Song beginnt eine neue Ansicht mit dem Cover.
- **Touch:** Die feste große Ansicht öffnet direkt mit dem Cover; weitere Taps wechseln Lyrics/Cover. Die mobile Stage verwendet dieselbe Zweierfolge und setzt nach Schließen/neuem Song auf Cover zurück.
- `renderDJArtwork` ist der gemeinsame Renderer. Revisionsprüfung verhindert, dass verspätete Lyrics-/Cover-Antworten eine spätere Auswahl überschreiben. Fehlende Bilder zeigen einen Hinweis; der weitere Motivwechsel bleibt möglich. Kein Einfluss auf die laufende Wiedergabe.

## Prüfung und Veröffentlichung

- Statische Dateien auf GitHub `main`, GitHub Pages veröffentlicht `https://hitjourney.com/`. Kein eigener App-Build; GitHub führt seinen Pages-Build aus. `404.html` mit `index.html` identisch halten.
- Neueste Anpassungen: Cover beim ersten Vergrößern beibehalten; keine eigenen Hinweise/Tooltips beim Fokus-Einstieg. Beide sind mit dem aktualisierten Projektgedächtnis und `HANDOFF.md` dokumentiert.
- Browser-Tests: `scripts/test_focus.cjs`, `scripts/test_focus_artwork.cjs`, `scripts/test_header_logo.cjs`, `scripts/test_header_alignment.cjs`. Lokaler HTTP-Server Port 8787; Playwright erforderlich. Optional `PLAYWRIGHT_MODULE` und `HJ_TEST_URL` setzen. Tests simulieren Daten und schreiben nicht in die Produktionsdatenbank.
- Geprüft: echtes Chromium-Vollbild, Fokusnavigation, Resize/Griff-Timer, Desktop-/Touch-Bildfolge, verzögerte/fehlende Bilder, Admin-Speichern/Reload/Fehlerfälle, Upload-Integration und alle neun Ausrichtungskombinationen auf Desktop/Mobilbreite. Ausrichtung zusätzlich in WebKit und an gerenderten Pixeln geprüft. Echte Mobilgeräte, native Safari-Browseroberfläche und tatsächliche Bildschirm-Pipettenauswahl wurden nicht manuell geprüft.
- Erst nach erfolgreichem Pages-Deployment und Live-Dateiabgleich „live“ melden. Browser können ältere HTML-/Asset-Versionen zwischenspeichern; bei zusammenhängenden JS-/CSS-Änderungen Versionsparameter gemeinsam erhöhen. Nach Änderungen Admin und Website neu laden.
- Lokaler Git-Stand kann deutlich hinter `origin/main` liegen, obwohl Arbeitsdateien aktuell sind. Vor Commit/Pull vergleichen; vorhandene Nutzeränderungen nicht überschreiben. Die bereits vorhandene lokale Änderung in `admin.html/getS3Names` wurde in diesen Veröffentlichungen bewusst nicht übernommen. Veröffentlichungen aus einem separaten, aktuellen Checkout vorbereiten.
