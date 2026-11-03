# Rhythm PADD 2.0 – QA-/Abnahmematrix

**Teststatus ehrlich führen:** `Automatisiert` heißt Node-/CI-Prüfung; `Browser` heißt reale Browserautomatisierung; `Gerät` heißt echtes Gerät. Ohne Nachweis nicht „getestet“ ankreuzen.

## Automatisierbare Checks
- Alle relativen ESM-Importdateien existieren und die Runtime-Module stehen im SW-Precache.
- `npm test` komplett grün; bekannte Regressionen (fehlende Importe, Circular/Linear-Rendermodul, dynamische Row Sizes, Corner Geometry).
- Roundtrip für Backup/Presets/Diary/Soundbank und keine Schemaänderung durch UI.
- Gestenberechnung rein testen (drag threshold, fine movement, 1–20 clamp, Tap-vs-Drag, L/C/R exact).
- `prefers-reduced-motion` per CSS-/Browsercheck; Navigation unabhängig von Transitions.

## Viewport-/Plattformmatrix (noch nicht durchgeführt)
| Gerät / Browser | Portrait / Breite | Landscape / Breite | Touch/Maus | Offline PWA |
|---|---|---|---|---|
| iPhone 13, iOS Safari PWA | 375–430 px* | ja | Touch | ja |
| kleines Android, Chrome | 320–390 px* | ja | Touch | ja |
| Tablet, iPad Safari | 768/834 px* | 1024/1194 px* | Touch | ja |
| Arch Linux, Firefox Desktop | 1024/1280/1440/1920 px | ja | Maus/Keyboard | optional |
| Chromium Desktop | 1024/1280/1440/1920 px | ja | Maus/Keyboard | ja |

* CSS-Pixel/Browserzoom und reale PWA safe areas bestimmen, daher auf dem Gerät nachmessen.

## Pro Ansicht prüfen
1. **Header/Navigation:** kein abgeschnittener Elbow, Band, Home-Indikator oder Tabs; 6 Seiten erreichbar; nur gewünschte Scrollregion.
2. **Metronome Circular:** Ring vollständig, 1–20 Punkte pro Kanal, 3:5, 3:7, 8+, Zoom; im Betrieb beleuchtet die richtige Note.
3. **Linear:** Wrap gleichmäßig nach verfügbarer Breite, keine überflüssigen Zeilen, Tap ändert Akzent; Drag Anzahl; Einfinger/Mehrfinger und Scroll.
4. **Audio Matrix:** beide Kanalpanels, alle 3×8 Sound-Buttons, L/C/R und Slider, eigene Sounds, keine Überlagerungen.
5. **Diary/Presets:** Liste/Editor/Filter/Texteingabe/Export/Import, keine unleserlichen Datums- und Aktionsfelder.
6. **Stats:** echte aggregierte Daten, lange Achsenbeschriftungen, Charts nach Segmentwechsel und bei leeren Daten.
7. **System:** Scale 70/80/90/100/110, Persistent Storage, Haptik-/Sound-Toggles, PWA-Update und Hilfe.

## Gesten-QA
- Tippen mit + ohne Bewegung; langer Druck; Drag klein/weit; Maus links; zweiter Finger; `pointercancel`; Scroll in Inhaltsbereich.
- Pan-Slider grob -> fein -> CENTER via Preset -> zurück via Slider; keine ungewollten Werte.
- Zahlenleiter zeigt sinnvolle Schrittmarken, verschwindet beim Loslassen, überdeckt keine essentiellen Buttons.
- Bei `prefers-reduced-motion` keine irrelevanten Bewegungen; Screenreader-Labels und Keyboard funktionieren.

## Audio-/Datensicherheit
- Audio Timing: 20–400 BPM, Swing, Polyrhythmus, Gap/Random, Offbeat, Displacement, Tempo Ramp, Stop/Restart, Count-in.
- Kopfhörer: Outer/Inner separat L/C/R, Solo/Mute, Volumes, Custom Sounds; keine doppelten Preview-Samples beim Tap.
- PWA: während Playback Appwechsel testen; Netz aus, Start ohne Netz, Daten speichern, Beenden, Neustart, JSON-Backup, Cache-Update.
- Lizenzprüfung: sämtliche UI-Audios, Icons, Fonts/Grafiken und „Star Trek“-nahe Materialien vor Schülerfreigabe dokumentieren.

## Mindestabnahme (Release Gate)
**Alle Node-/CI-Tests** bestanden **und** manuell kontrolliert auf (1) iPhone Safari PWA, (2) Tablet Safari oder vergleichbar, (3) Arch Linux Firefox, (4) Chromium. Größere Layout-/Gesture-Bugs = kein Merge nach `main`.

## Letzter automatisierter Browser-Smoke-Nachweis

[Erfolgreicher V2-Lauf](https://github.com/DT-S/LCARSmetronome/actions/runs/39334206528), Commit `e943fe7`. Chromium Headless: 390×844, 768×1024, 1024×768, 1440×900, 1920×1080; Start/Circular/Linear/Audio/Pan geprüft; 10 PNGs als Workflow-Artefakt abgelegt. Dies ist **keine** reale iOS-Safari-/Tablet-Hardwareabnahme.

## Erweiterte Chromium-Abdeckung (P1d)
Der erste vollständige Lauf `39336109612` bestand alle 5 bisherigen Ziele, inklusive aller Tabs/Diary-Editor/UI-Scale 70/110 %. Zur Breakpoint-Prüfung wurden vier weitere Ziele ergänzt: 320×740, 641×820, 900×600 und 1280×800. Abnahme dieser zusätzlichen Breiten steht bis zum CI-Nachweis aus.

## V2 P1c/P1d Browser-Matrix und Ergebnis

## P1c/P1d – Letzter erfolgreicher Browser-Nachweis (19.10.2026)

- **[GitHub Actions: 39336610055](https://github.com/DT-S/LCARSmetronome/actions/runs/39336610055) – SUCCESS**, beide Jobs `node-regressions` und `browser-smoke`.
- **9/9 Headless-Chromium-Viewports:** 320×740, 390×844, 641×820, 768×1024, 900×600, 1024×768, 1280×800, 1440×900, 1920×1080.
- Jeder Viewport: Start, Circular/Linear, Audio Matrix mit Center/Right-Panorama, Presets, Diary und dessen Editor/Cancel, Stats, System, Interface-Skalen 70 %/110 %, und nach Tab-Wechsel wieder am Seitenanfang.
- Alle Screenshots im Workflow-Artefakt `rhythm-padd-v2-layout-screenshots` (Aufbewahrung 7 Tage).
- **Sichtprüfung:** Für Tablet/PC sind die Hauptbereiche plausibel angeordnet, beide Audiokanäle auf breitem Desktop nebeneinander. Der 641-px-Grenzfall und kurzhohes 900×600-Landscape sind funktional, ein angeschnittener unterer Inhalt ist wegen des gezielt scrollbaren `main` zulässig.
- **Noch offen:** iOS Safari/echte iPhone/iPad-PWA, Arch-Firefox, Keyboard-Fokus/Accessibility, reale Audio-Latenz und volle Diagramme mit vielen Sessions. Diese Punkte sind keine bestandenen Tests.

**P1c = Layout-Implementierung + grundlegende Browser-QA erledigt; P1 Gesamtphase = weiterhin offen** (CSS-Konsolidierung und reale Geräteabnahme). Kein Merge nach `main` ohne Freigabe.

## P3 – Automatisierte Abschlussprüfung
- [GitHub Actions 39338925485](https://github.com/DT-S/LCARSmetronome/actions/runs/39338925485): **SUCCESS**, beide Jobs (`node-regressions`, `browser-smoke`) bestanden.
- 9 Browser-Viewports von 320×740 bis 1920×1080; native Tastatureingabe an Volume-Slidern und Maus-Down/Up bei Desktop; echtes simuliertes Touch-Dragging inkl. `touchCancel` in mobilem Chromium.
- Präzisionsbeweis (gleiche 40 CSS px): grob Panorama `+0.68`, fein bei 125 px Fingerabstand `+0.18`. L/C/R-Center synchronisiert weiterhin exakt.
- Keine Änderungen an Scheduler, Sounderzeugung, Storage-Datenformat oder Backup-Kompatibilität.
- **Hardware-Release-Gate weiter offen:** Safari iPhone-PWA, iPad/Tablet, Arch Firefox und tatsächliche Audio-Hörprüfung.

## Voyager Audio Matrix – geprüfter Integrationsstand (20.10.2026)

- Quelle: der vom Nutzer bereitgestellte **zweite** Voyager-HTML/CSS/JS-Prototyp; entsprechend bestehendem App-Datenmodell und Audioengine adaptiert, nicht als getrennte Demo eingefügt.
- Neue UI: 20 bewegliche Bandsegmente je Fader, 35-Tick-Vernierskalen, dynamische wave-peak/wave-near Akzente, Laser-Nadeln mit kurzen Übergängen, bei aktiver Bedienung eine dezente Vernier-Lichtbewegung und Lock-/Readout-Wechsel.
- Panorama: grobes absolutes Scrubbing, relatives Mikro-Scrubbing in 1%-Schritten, Quick ±5%, Fine Adj ±1%, eingebettetes echtes Offset, LEFT/CENTER/RIGHT exakt -1/0/+1.
- Lautstärke: grobes Scrubbing, relatives 1%-Vernier, ±1% Buttons, echtes Volume (0–100%) pro Kanal. Master/UI behalten bewusst die bisherige Präzisionssteuerung.
- Kein `padd-frame::after`-Scanline-Overlay, **keine** animierten drei `sidebar-node`-Balken, keine täuschenden zufälligen Telemetriezahlen oder zusätzlicher Audiosynthesizer. Kein CDN/externes Font laden; offlinefähiges Precache aktualisiert.
- [Finaler V2-Lauf 39343815394](https://github.com/DT-S/LCARSmetronome/actions/runs/39343815394): **SUCCESS**, Node-Regression und 9-Viewport-Chromium-Suite inklusive Maus, Tastatur, Click-Presets und simulierter Touch-Scrub-Gesten.
- UI-Screenshots als kurzlebiges GitHub-Actions-Artefakt `rhythm-padd-v2-layout-screenshots`.
- **Offen:** tatsächliche Safari-PWA auf iPhone, weitere Tablet-Geräte, Arch Firefox, Audio-Kopfhörerprüfung und endgültige visuelle Freigabe durch den Nutzer. `main` nicht geändert.

## P4 – Bestätigter Testnachweis

- [GitHub Actions 39345968421](https://github.com/DT-S/LCARSmetronome/actions/runs/39345968421): **SUCCESS** für Node-Regressions und Chromium-Browser-Smoke.
- Neun Viewports 320–1920 px; vorhandene Audio-Matrix und Navigation weiterhin intakt.
- Reale simulierte Touch-Gesten für Tempo sowie Beat-Anzahl; Leiter erscheint mit aktivem Strich, Zustand aktualisiert sich und wird bei Pointer-Up/Cancel entfernt.
- Regression entdeckt und behoben: eine falsche automatische Ersetzung verdoppelte einen JavaScript-Bezeichner in `src/app.js`. Neu: `node --check` für alle Laufzeitmodule als fester Syntax-Regressionstest.
- **P4 im Code technisch umgesetzt, hardwareseitige Abnahme noch offen. P5 Linear-View-Drag und P6 Plotter-/Seitenanimationen weiterhin offen.**

## P5 – Linear View Regressionen
- Touch Tap ändert nur Akzent; vertikaler Drag nur Anzahl; erster Finger bleibt durch Pointer-Capture auf unveränderter Row-Node.
- Absicherung für 1–20, 3:5, 3:7, 20:20 und ausgeglichene mobile Zeilenumbrüche.
- Nach `pointercancel` springt die veränderte Anzahl auf ihren Startwert zurück und die Morph-Leiter verschwindet.
- Keyboard-Fokus bleibt beim Umschalten des Akzents erhalten; Mausdrag und Circular-View-Switch weiterhin aktiv.
- Automatisierter Basisnachweis: [Run 39348533144](https://github.com/DT-S/LCARSmetronome/actions/runs/39348533144). Ergänzte 3:5-/3:7-/20:20-Checks ausstehend.

## P5 – Abschließender Browser-Beleg
[Erfolgreiche GitHub Actions Run 39348800249](https://github.com/DT-S/LCARSmetronome/actions/runs/39348800249). Alle neun Chromium-Zielauflösungen bestanden, außerdem Touch-Taps, direktes vertikales Scrubbing, stabile Pointer-Capture/Re-Renders, 3:5 / 3:7 / 20:20, ausgewogenes Row-Wrapping, Pointer-Cancel-Rollback, 1–20-Clamping, Desktop-Keyboard/Mouse. Das ist keine reale iOS- oder Firefox-Hardwareprüfung.

## P6 – Bestätigter automatisierter Abschluss (20.10.2026)

- [Erfolgreiche GitHub Actions: 39351420336](https://github.com/DT-S/LCARSmetronome/actions/runs/39351420336): beide Jobs (`node-regressions`, `browser-smoke`) erfolgreich. 9/9 Chromium-Zielauflösungen zwischen 320×740 und 1920×1080 bestanden; bestehende Audio-Matrix, P4- und P5-Gesten ebenfalls grün.
- **Navigation:** Wechsel auf andere Seite startet genau einen ~210-ms-Aufbau von links; derselbe Tab wiederholt die Animation nicht. Der Titel-/Seiteninhalt bleibt sofort zugänglich und die Scrollposition wird weiterhin zurückgesetzt.
- **Instrumente:** Circular/Linear jeweils mit ~195-ms-Einblendung; aktive Operating Modes bekommen eine einzelne ~220-ms-Bestätigung, Start/Stop eine ~230-ms-Bestätigung. Keine periodische Animation und kein zusätzlicher Code im Audio-`requestAnimationFrame`.
- **Plotter:** Echter Messpunktfokus/Touch/Hover positioniert einmalig zwei dünne Kreuzlinien auf den tatsächlichen x-/y-Werten, hebt nur diesen Marker hervor und zeigt die unveränderte Datenbeschreibung. Linien-/Balkenaufbau nur beim Neubau des Plots, und bei mehr als 120 Punkten keine massenweisen Marker-Animationen.
- **Explizit entfernt/vermieden:** Keine Scanlines, keine animierten SYS-Streifen, kein blinkendes Idle-Telemetrie-Display, keine zufälligen Messwerte. `prefers-reduced-motion: reduce` deaktiviert nicht notwendige Animationen vollständig (Browsercheck).
- **P6 im Code + CI abgeschlossen**, aber nicht endgültig für echte Geräte freigegeben. Offene P7-Gates: Safari auf iPhone/iPad, Arch Firefox, Offline-Start/Updates, Accessibility und Audio-/Latenzhörtest. Der vom Nutzer erwähnte kleine Bug bleibt wie gewünscht für später vorgemerkt, ohne Ursachenbehauptung. Version bleibt auf `main` unangetastet.

## P7 – Release-Kandidat
- Vollständige P7-Gate-Liste und dokumentierte Assetrisiken: [V2_RELEASE_CANDIDATE.md](V2_RELEASE_CANDIDATE.md).
- Offline-Neustart mit Cache und IndexedDB ist neuer Teil des Chromium-Smoke; alle echten Safari-/Firefox-/Kopfhörerprüfungen bleiben unabhängig davon offen.

## P7 – Bestätigter browserbasierter Release-Gate-Lauf

- [GitHub Actions 39354186197](https://github.com/DT-S/LCARSmetronome/actions/runs/39354186197): **SUCCESS**, beide Jobs und sämtliche Prüfschritte.
- 9/9 Chromium-Viewports; zusätzlich: gecachter Offline-Neustart, persistentes IndexedDB, Export/Restore, produktiver Service-Worker-Austausch, Live-Transport/Panorama/Mute-Solo-Regression sowie Firefox-Engine-Navigation und Persistenz.
- Automatisierte Firefox-Engine ist **nicht identisch** mit einem echten lokalen Arch-Linux-Firefox-Gerätetest; Chromium-Touchprofile sind kein Safari-iOS.
- Kein Test kann die subjektive Qualität von Stereopanning, Lautstärke, Soundimport, Hörlatenz oder PWA-Safe-Areas auf echter Hardware garantieren. Die Nutzerabnahme und der erwähnte Bug bleiben Release-Blocker.
