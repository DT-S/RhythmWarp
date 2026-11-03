# Rhythm PADD 2.0 – Fortschrittsprotokoll

| Schritt | Status | Beleg / Nächster Schritt |
|---|---|---|
| Branch `develop/v2-rhythm-padd` aus v0.5.15 | ERLEDIGT | Basis-Commit `17ae97c` |
| Architektur-/Implementierungsinventur | ERLEDIGT | `ARCHITECTURE.md`, `src/app.js`, `src/interface.js`, `src/linear-layout.js`, `src/number-control.js`, `src/tempo-control.js`, CSS v0.5.15 gesichtet |
| Roadmap, Design, QA | ERLEDIGT | Diese V2-Dokumente |
| Test-Sicherheitsnetz + CI | ERLEDIGT | [Erster GitHub-Actions-Lauf erfolgreich](https://github.com/DT-S/LCARSmetronome/actions/runs/39332554154); `tests/module-integrity.test.js` prüft Import-/PWA-Integrität |
| P1 Universelles Layout | BROWSER-QA ERFOLGREICH; GERÄTE OFFEN | Shell, P1c Detailraster, Navigation und Zoom für 9 Viewports erfolgreich; CSS-Konsolidierung und echte iPhone/iPad/Firefox-Tests offen |
| P2 Alle Seiten | OFFEN | Metronome, Audio, Presets, Diary, Stats, System |
| P3 Präzisions-Fader | IMPLEMENTIERT + CI GRÜN, HARDWARE OFFEN | [9-Viewport + Touch-/Mouse-/Keyboard-Test](https://github.com/DT-S/LCARSmetronome/actions/runs/39338925485); iOS-/Firefox-Abnahme ausstehend |
| P4 Zahlenleiter | OFFEN | BPM + Parameter |
| P5 Linear-Drag | IMPLEMENTIERT + CI GRÜN, GERÄTE OFFEN | [Chromium P5 3:5 / 3:7 / 20:20, Touch & Tastatur](https://github.com/DT-S/LCARSmetronome/actions/runs/39348800249) |
| P6 Motion / Plots | OFFEN | dezente Transitions |
| P7 Release-Freigabe | OFFEN | reale Geräte, PWA, Audio, Lizenzen |

**Abmachung:** Hier werden Testnachweise und bekannte offene Punkte nach jedem V2-Commit ergänzt. V0.5.15 auf `main` bleibt produktiv; V2 ist experimentell, bis die Geräteabnahme erfolgt.

## Beobachtungen aus dem Bestand
- Die iPhone-Optik ist als `@media (max-width:640px)` spät in `style.css` ergänzt; Desktop/Tablet nutzen deutlich ältere Regeln.
- Layout-/Skalierungscode in `src/app.js` und `src/linear-layout.js` ist mit dem Phone-Viewport gekoppelt.
- Number-Drag lebt in `src/number-control.js`, Tempo-Drag in `src/tempo-control.js`, Circular-Drag im `src/app.js`; Linear hat derzeit nur `button.onclick` für Akzente.
- Dynamische Buttongruppen bekommen Rundungen durch `installSegmentCorners`.
- Audio-Stereo-Panner hat bereits -1/0/+1 Presets; kein Audio-Rewrite nötig.

## P0: technische Absicherung
- Import-/Service-Worker-Graph wird im Node-Test-Runner geprüft, bevor ein PWA-Update veröffentlicht wird.
- GitHub Actions führt `npm test` bei Push auf den V2-Branch und bei PRs nach `main` aus.
- Browser- und Geräteprüfung stehen weiter aus; ein CI-Status kann diese nicht ersetzen.

## Erster verifizierter CI-Nachweis
- Workflow: [Rhythm PADD V2 checks / Run 39332554154](https://github.com/DT-S/LCARSmetronome/actions/runs/39332554154).
- Status: `completed`, Conclusion: `success`; Checkout, Node.js 22, `npm test` erfolgreich.
- Dieser Nachweis umfasst **Node-Tests**, keine realen Safari-/Firefox-/Tablet-Screenshots.
\n- P1b Implementierung der Tablet-/Desktop-Shell und responsiver Metronom-/Audio-Container in isolierter CSS-Migrationsdatei; Phone-CSS bleibt unverändert.\n- Browser-Layout, Geräte-Gegenprobe und CSS-Konsolidierung stehen weiterhin aus.\n
## P1b – Automatisierte Browserprüfung am 19.10.2026

- Commit: `e943fe729f974f0c8b3d5ecd77b76cddb7932a4c`.
- [GitHub Actions / Chromium-Smoke-Test](https://github.com/DT-S/LCARSmetronome/actions/runs/39334206528): beide Jobs `node-regressions` und `browser-smoke` erfolgreich.
- Fünf geprüfte Auflösungen: 390×844 (iPhone-ähnlich), 768×1024 (Tablet Portrait), 1024×768 (Tablet Landscape), 1440×900 und 1920×1080 (Desktop).
- Browser-Checks: Boot ohne JS-/Asset-Fehler; 8 Modes; sichtbare Header-/Sidebar-/Contentbereiche; Circular/Linear-Switch; Audio Matrix mit sechs L/C/R-Buttons und Werten `+1` / `0`.
- Zehn Screenshots (Metronome + Audio Matrix pro Auflösung) sind im Workflow als 7-Tage-Artefakt `rhythm-padd-v2-layout-screenshots` hinterlegt.
- Erste manuelle Sichtung dieser Chromium-Screenshots: Header/Fascia/Footer sichtbar und konsistent, Metronom auf Tablet sinnvoll skaliert, Audio Matrix auf Desktop zweispaltig. Tablet-Seitennavigation recht eng, hier folgt Feintuning.
- **Offen:** Safari auf echtem iPhone/iPad, Firefox auf Arch Linux, volle Seiten Presets/Diary/Stats/System, 70–110%-Zoom, sehr schmale/extrem breite Fenster, Scroll/Focus, visuelle Endabnahme. Browser-Screenshots allein sind kein Release-Gate.


## P1c: Zweiteilige responsiv gestaltete Seiten (Implementierung)
- `v2-layout.css`: Preset-Formular und Karten; Diary-Session-Setup/Editor/History; Stats-Filters/Plots/Kalender; System-Karten/Skalierung; Tablet-Navigation mit Kurzlabels. Ohne geänderten Audio- oder Speicher-Code.
- Noch offen: automatisierte Browserprüfung **aller sechs** Seiten inkl. Zoom und echte Geräteabnahme. Erst nach Resultaten Status aktualisieren.

- **Skalierungsregression gefunden:** Der erste Volltest deckte bei `0.7` Desktop-/Tablet-Zoom rechts abgeschnittene Rahmen auf. Doppelte Breitenkompensation in `v2-layout.css` entfernt; Browser-Neutest ausstehend. Der erste Fehltest zuvor war nur ein falsch geschachtelter Playwright-Selektor, bereits korrigiert.

- [Chromium CI-Erfolg: Lauf 39336109612](https://github.com/DT-S/LCARSmetronome/actions/runs/39336109612): 5/5 Auflösungen, sechs Tabs, Diary-Editor, L/C/R-Panorama, Interface-Skalen 70 % und 110 %. Zoomfehler der vorigen Tests behoben. Vier zusätzliche Grenzauflösungen sind als P1d-Regression eingerichtet und noch nicht abgenommen.

- Screenshot-Sichtung nach 9/9 grünem Chromium-Lauf ergab eine Navigationsschwäche: bei Tablet/Desktop blieb die alte Main-Scrollposition erhalten. `src/app.js` setzt jetzt bei **jedem** Tabwechsel `main.scrollTop=0`; Browser-Regressionstest und SW-Cache-Update ergänzt. Erneute CI-Abnahme ausstehend.

## P1c/P1d – Letzter erfolgreicher Browser-Nachweis (19.10.2026)

- **[GitHub Actions: 39336610055](https://github.com/DT-S/LCARSmetronome/actions/runs/39336610055) – SUCCESS**, beide Jobs `node-regressions` und `browser-smoke`.
- **9/9 Headless-Chromium-Viewports:** 320×740, 390×844, 641×820, 768×1024, 900×600, 1024×768, 1280×800, 1440×900, 1920×1080.
- Jeder Viewport: Start, Circular/Linear, Audio Matrix mit Center/Right-Panorama, Presets, Diary und dessen Editor/Cancel, Stats, System, Interface-Skalen 70 %/110 %, und nach Tab-Wechsel wieder am Seitenanfang.
- Alle Screenshots im Workflow-Artefakt `rhythm-padd-v2-layout-screenshots` (Aufbewahrung 7 Tage).
- **Sichtprüfung:** Für Tablet/PC sind die Hauptbereiche plausibel angeordnet, beide Audiokanäle auf breitem Desktop nebeneinander. Der 641-px-Grenzfall und kurzhohes 900×600-Landscape sind funktional, ein angeschnittener unterer Inhalt ist wegen des gezielt scrollbaren `main` zulässig.
- **Noch offen:** iOS Safari/echte iPhone/iPad-PWA, Arch-Firefox, Keyboard-Fokus/Accessibility, reale Audio-Latenz und volle Diagramme mit vielen Sessions. Diese Punkte sind keine bestandenen Tests.

**P1c = Layout-Implementierung + grundlegende Browser-QA erledigt; P1 Gesamtphase = weiterhin offen** (CSS-Konsolidierung und reale Geräteabnahme). Kein Merge nach `main` ohne Freigabe.

## P3 – LCARS Precision Faders (erster funktionaler Ausbau)
- Wiederverwendbares Modul `src/precision-slider.js`, eigene `v2-precision.css`. Verbunden mit Outer/Inner Panorama und Volume sowie Master-/Interface-Volume. Native Range-Inputs bleiben sichtbar und per Tastatur/Maus bedienbar.
- Touch-/Pen-Drag setzt den Wert anhand der berührten Reglerposition, anschließend verändert vertikale Entfernung die Empfindlichkeit. Optische Wertblase und vergrößerter Regler werden beim Loslassen und bei `pointercancel` geschlossen.
- Panorama-Beschriftung ist `L xx%` / `CENTER` / `R xx%`, Volume `xx%`; die bestehenden L/C/R-Presets bleiben exakt `-1/0/+1`.
- Unit-Tests für Werteberechnung und Formatierung bestanden. [Chromium-Lauf 39338298760](https://github.com/DT-S/LCARSmetronome/actions/runs/39338298760) bestanden: 9/9 Auflösungen und echte simulierte Touch-Drag-Ereignisse. Gleiche 40px-Bewegung: grob +0,68, fein bei 125px Abstand +0,18.
- Nach Sichtprüfung sitzt die orange Wertblase nun näher am Regler und erhält eine Zuordnungslinie; überarbeitete Variante muss separat erneut durch CI.
- **P3 noch nicht hardware-abgenommen:** iPhone Safari, Tablet Touch, Maus/Firefox und VoiceOver/Screenreader stehen offen. P4–P6 sind unverändert ausstehend.

## P3: Nutzerinteraktion, letzter Chromium-Nachweis
- [Browserlauf 39338667688](https://github.com/DT-S/LCARSmetronome/actions/runs/39338667688) war nach Feinpositionierung der Wertblase erfolgreich (9/9 Layout-Ansichten und Touch-Differenzierung: grob 0,68 / fein 0,18).
- Sichtkontrolle: Die Pan-Wertblase gehört optisch zum aktiven Pan-Fader und verdeckt nicht mehr die Mitte des Volume-Sliders darüber.
- Zusätzliche Keyboard-/Mouse-/Pointer-Cancel-Regressionschecks eingebaut; die Ausführung des **folgenden** CI-Runs steht noch aus.

## P3 – Automatisierte Abschlussprüfung
- [GitHub Actions 39338925485](https://github.com/DT-S/LCARSmetronome/actions/runs/39338925485): **SUCCESS**, beide Jobs (`node-regressions`, `browser-smoke`) bestanden.
- 9 Browser-Viewports von 320×740 bis 1920×1080; native Tastatureingabe an Volume-Slidern und Maus-Down/Up bei Desktop; echtes simuliertes Touch-Dragging inkl. `touchCancel` in mobilem Chromium.
- Präzisionsbeweis (gleiche 40 CSS px): grob Panorama `+0.68`, fein bei 125 px Fingerabstand `+0.18`. L/C/R-Center synchronisiert weiterhin exakt.
- Keine Änderungen an Scheduler, Sounderzeugung, Storage-Datenformat oder Backup-Kompatibilität.
- **Hardware-Release-Gate weiter offen:** Safari iPhone-PWA, iPad/Tablet, Arch Firefox und tatsächliche Audio-Hörprüfung.

## P3b – Voyager-Matrix (20.10.2026)
- User-supplied second HTML/CSS/JS example reviewed. Segmented bar with needle and wave transition, 35-tick harmonic Vernier, click-and-hold ±1% steps, L/C/R presets and embedded numeric display integrated as `src/matrix-faders.js` and scoped `v2-matrix.css`.
- **Explicit exclusions:** No scanline overlay, no moving three-node SYS-bar, no fake random telemetry ticker, no second sound synthesizer, no external CDN/Google font imports.
- **Preserved:** Both AudioEngine stereo channels, accurate per-channel `-1/0/+1` L/C/R presets, Mute/Solo, custom sound bank, backup/storage, UI audio settings, and existing native range keyboard semantics.
- Previous floating precision widgets remain in use only for Master/UI volumes, not Channel 1/2 Pan and Volume.
- Unit checks in `tests/matrix-faders.test.js`; full Chromium and device verification pending.

- P3b Feinschliff gemäß zweitem Beispiel: Panorama-Schnellschritte ±5 %, zusätzliche FINE ADJ ±1 %, echtes OFFSET-Readout (aus Pan, kein Fake), schlanke Pointer-/Verniernadeln. Browser-Neutest ausstehend.

## Voyager Audio Matrix – geprüfter Integrationsstand (20.10.2026)

- Quelle: der vom Nutzer bereitgestellte **zweite** Voyager-HTML/CSS/JS-Prototyp; entsprechend bestehendem App-Datenmodell und Audioengine adaptiert, nicht als getrennte Demo eingefügt.
- Neue UI: 20 bewegliche Bandsegmente je Fader, 35-Tick-Vernierskalen, dynamische wave-peak/wave-near Akzente, Laser-Nadeln mit kurzen Übergängen, bei aktiver Bedienung eine dezente Vernier-Lichtbewegung und Lock-/Readout-Wechsel.
- Panorama: grobes absolutes Scrubbing, relatives Mikro-Scrubbing in 1%-Schritten, Quick ±5%, Fine Adj ±1%, eingebettetes echtes Offset, LEFT/CENTER/RIGHT exakt -1/0/+1.
- Lautstärke: grobes Scrubbing, relatives 1%-Vernier, ±1% Buttons, echtes Volume (0–100%) pro Kanal. Master/UI behalten bewusst die bisherige Präzisionssteuerung.
- Kein `padd-frame::after`-Scanline-Overlay, **keine** animierten drei `sidebar-node`-Balken, keine täuschenden zufälligen Telemetriezahlen oder zusätzlicher Audiosynthesizer. Kein CDN/externes Font laden; offlinefähiges Precache aktualisiert.
- [Finaler V2-Lauf 39343815394](https://github.com/DT-S/LCARSmetronome/actions/runs/39343815394): **SUCCESS**, Node-Regression und 9-Viewport-Chromium-Suite inklusive Maus, Tastatur, Click-Presets und simulierter Touch-Scrub-Gesten.
- UI-Screenshots als kurzlebiges GitHub-Actions-Artefakt `rhythm-padd-v2-layout-screenshots`.
- **Offen:** tatsächliche Safari-PWA auf iPhone, weitere Tablet-Geräte, Arch Firefox, Audio-Kopfhörerprüfung und endgültige visuelle Freigabe durch den Nutzer. `main` nicht geändert.

## P4 – Animierte Zahlenleiter (Implementation)
- Das zentrale Visualisierungsmodul `src/gesture-guide.js` zeigt zwei rote gestrichelte Schienen mit dreizehn 1-Step-Querrungen und aktivem Wert.
- Die Zahlenleiter ist für BPM (20–400), Beats/Subdivisions (1–20) sowie Count-in/Duration mit existierenden Drag-Steuerungen verbunden.
- Die bisherige Drag-/Orbit-/Tastatur-/Direkteingabe-Logik wird nicht ersetzt; das zusätzliche Overlay ist `pointer-events:none`.
- Das Overlay erscheint erst nach echter Bewegung und verschwindet bei Pointer-Up, Cancel, Capture-Verlust, Edit-Modus und Browser-Unfocus.
- CSS nutzt reduzierte Animation gemäß `prefers-reduced-motion`.
- Softwaretests und reale Browser-/Geräteabnahme sind noch gesondert nachzuweisen.

## P4 – Bestätigter Testnachweis

- [GitHub Actions 39345968421](https://github.com/DT-S/LCARSmetronome/actions/runs/39345968421): **SUCCESS** für Node-Regressions und Chromium-Browser-Smoke.
- Neun Viewports 320–1920 px; vorhandene Audio-Matrix und Navigation weiterhin intakt.
- Reale simulierte Touch-Gesten für Tempo sowie Beat-Anzahl; Leiter erscheint mit aktivem Strich, Zustand aktualisiert sich und wird bei Pointer-Up/Cancel entfernt.
- Regression entdeckt und behoben: eine falsche automatische Ersetzung verdoppelte einen JavaScript-Bezeichner in `src/app.js`. Neu: `node --check` für alle Laufzeitmodule als fester Syntax-Regressionstest.
- **P4 im Code technisch umgesetzt, hardwareseitige Abnahme noch offen. P5 Linear-View-Drag und P6 Plotter-/Seitenanimationen weiterhin offen.**

## P4b – Gestenleiter transformiert jetzt direkt aus dem Button
- Nutzerfeedback umgesetzt: Die Zahlenleiter erscheint **nicht** mehr seitlich. Sie beginnt exakt mit der Form, Größe und Position des berührten Buttons und erweitert sich zentriert an derselben Stelle zu 104×260 px. An kleinen Bildschirmrändern wird die Endposition nur so weit wie nötig verschoben.
- Beim Loslassen/Abbruch schrumpft die Führung zurück; der ursprüngliche Button wird wieder sichtbar. Seine Pointer-Capture-/Tastatursemantik und die musikalische Zustandslogik bleiben unverändert.
- Die morphende Führung ist bewusst `aria-hidden`, `pointer-events:none`; bei `prefers-reduced-motion` gibt es keine Übergänge und sofortige Rückkehr.
- Browser-Suite prüft Touch-Positionierung, Pointer-Cancel, Rückgabe der Originalbuttons sowie die tatsächliche Vorwärts-/Rückwärtsanimation in Chromium; erster CI-Nachweis ausstehend.
- Keine Änderungen an Audio-Scheduler, Datenmodell, Linear View oder V2-P5.

### P4b – Abgenommen im automatisierten Browsercheck
- [GitHub Actions 39347394768](https://github.com/DT-S/LCARSmetronome/actions/runs/39347394768): **SUCCESS**, Node-Regressions und Chromium-Browser-Smoke, 9/9 Bildschirmgrößen.
- Simulierte Touch-Drags für Tempo und Beats: korrekte Position **über dem ursprünglichen Button**, Source während der Morph-Animation verborgen und nach Loslassen/`pointercancel` wiederhergestellt.
- Getrennter Browsercheck mit Bewegung prüft Öffnen, Endgröße, Zentrierung, Rückanimation und unveränderte Button-Geometrie.
- Nach visueller Screenshot-Abnahme wurden die kurzen Titel (`OUTER BEATS`, `SUBDIVISIONS`, `COUNT-IN`, `DURATION`) sowie Schriftgröße/-familie/-farbe des Ausgangsbuttons für die Rücktransformation übernommen.
- Echte iPhone-Safari-Abnahme weiterhin offen; P5 und P6 bewusst nicht begonnen.

## P5 – Linear View Beat-Gesten (Implementierung)
- Direkt auf einem Beat nach oben/unten ziehen, um die Länge der jeweiligen äußeren/inneren Reihe von 1–20 zu verändern. Eine kurze Berührung ändert weiterhin den Akzent, eine Ziehbewegung ausschließlich die Länge; horizontale Gesten werden ignoriert.
- Beide `pattern-row`-Container bleiben über sämtliche Render-Zyklen **identische DOM-Elemente** und besitzen die Pointer-Capture, während Buttons umgeordnet, entfernt oder ergänzt werden. Keyboard-/AT-Klicks bleiben möglich. Dynamische mobile Zeilenumbrüche werden beibehalten.
- Die P4-Morph-Leiter dient als visuelle Rückmeldung unter dem Finger. Der Original-Audiokern und `number()`/Scheduler/Storage bleiben unverändert.
- Pure Schrittberechnung besitzt Node-Regressionstests; geräteübergreifende Browser-/Touch-Prüfung noch offen.

## P5 – Automatisierter Browsernachweis (20.10.2026)
- [GitHub Actions Run 39348533144](https://github.com/DT-S/LCARSmetronome/actions/runs/39348533144): **SUCCESS** (Node + Chromium), neun Auflösungen, vorbestehende Audio- und P4-Tests weiter grün.
- Linear: Touch-Tap ausschließlich Akzentwechsel, vertikaler Touch-Drag verändert Beats unabhängig von Subdivisions; Pointer-Capture bleibt auf persistenten Row-DOM-Knoten trotz neuem Beat-Layout; Escalation 4→7, 2→7, Reduktion 7→3, `pointercancel` rollt Teiländerungen zurück und hinterlässt keine offene Leiter.
- Desktop: Tastatur `Enter` bleibt nutzbar und der Fokus nach Akzentänderung erhalten; Maus-Drag 4→7 funktioniert.
- Zusätzlich Grenzfälle 3:5, 3:7 und 20:20 mit gleichmäßigem Wrapping in die Browser-Suite aufgenommen. Der Lauf für diese ergänzten Assertions steht noch aus.
- **Offen:** Echter iPhone-/iPad-Safari- und Firefox-Praxistest; vom Nutzer erwähnter kleiner Bug bleibt gemäß Wunsch auf später vertagt.

## P5 – Abschließender automatisierter Nachweis
- [GitHub Actions Run 39348800249](https://github.com/DT-S/LCARSmetronome/actions/runs/39348800249): **SUCCESS**, Node-Regressionen und Browser-Smoke erfolgreich.
- **9/9 Chromium-Auflösungen** (320–1920 px) inklusive unveränderter Audio-/P4-Regressionstests.
- Direkte Linear-View-Touchgesten mit persistenten Reihen, Akzent-Taps, unabhängigen äußeren/inneren Beat-Zahlen, Undo bei Pointer-Cancel, keine Phantomklicks, 1–20 Grenzen.
- 3:5, 3:7 und 20:20 erfolgreich überprüft; mobile Zeilen sind auch bei 20:20 gleichmäßig verteilt, mit unverändertem DOM-Zeilencontainer.
- Desktop-Tastatur und Mausdrag getestet, inklusive Fokus-Erhalt bei Akzentwechsel.
- **P5 im Code und automatisiert abgeschlossen.** Für die Produktfreigabe bleiben echter iPhone-/Tablet-Safari-, Arch-Firefox- und Audio-Gerätetest offen. Der vom Nutzer separat entdeckte kleine Bug wird absichtlich später behandelt.

## P6 – State-triggered LCARS motion (implementation)
- `src/motion.js` provides short transition acknowledgments ONLY after explicit page, Circular/Linear, mode and start/stop state changes. No animation or forced layout per audio frame.
- Page change: 210ms left-to-right materialization; view change: 195ms gentle slide; modes and start/stop: single 220ms/230ms emphasis. Same-page tabs do not restart the transition.
- Plotter crosshairs track **actual** user-selected recorded session points on focus/hover; readout reflects stored point label. Single plot-entry animations remain brief, and charts with >120 points skip per-point motions.
- `prefers-reduced-motion:reduce` disables all non-essential motion, no scanlines, no pulsing SYS-bars and no invented numerical telemetry.
- Changed frontend assets are included in the offline cache. Unit and Chromium behavior tests are still to follow. Audio/diary storage model unchanged.

## P6 – Bestätigter automatisierter Abschluss (20.10.2026)

- [Erfolgreiche GitHub Actions: 39351420336](https://github.com/DT-S/LCARSmetronome/actions/runs/39351420336): beide Jobs (`node-regressions`, `browser-smoke`) erfolgreich. 9/9 Chromium-Zielauflösungen zwischen 320×740 und 1920×1080 bestanden; bestehende Audio-Matrix, P4- und P5-Gesten ebenfalls grün.
- **Navigation:** Wechsel auf andere Seite startet genau einen ~210-ms-Aufbau von links; derselbe Tab wiederholt die Animation nicht. Der Titel-/Seiteninhalt bleibt sofort zugänglich und die Scrollposition wird weiterhin zurückgesetzt.
- **Instrumente:** Circular/Linear jeweils mit ~195-ms-Einblendung; aktive Operating Modes bekommen eine einzelne ~220-ms-Bestätigung, Start/Stop eine ~230-ms-Bestätigung. Keine periodische Animation und kein zusätzlicher Code im Audio-`requestAnimationFrame`.
- **Plotter:** Echter Messpunktfokus/Touch/Hover positioniert einmalig zwei dünne Kreuzlinien auf den tatsächlichen x-/y-Werten, hebt nur diesen Marker hervor und zeigt die unveränderte Datenbeschreibung. Linien-/Balkenaufbau nur beim Neubau des Plots, und bei mehr als 120 Punkten keine massenweisen Marker-Animationen.
- **Explizit entfernt/vermieden:** Keine Scanlines, keine animierten SYS-Streifen, kein blinkendes Idle-Telemetrie-Display, keine zufälligen Messwerte. `prefers-reduced-motion: reduce` deaktiviert nicht notwendige Animationen vollständig (Browsercheck).
- **P6 im Code + CI abgeschlossen**, aber nicht endgültig für echte Geräte freigegeben. Offene P7-Gates: Safari auf iPhone/iPad, Arch Firefox, Offline-Start/Updates, Accessibility und Audio-/Latenzhörtest. Der vom Nutzer erwähnte kleine Bug bleibt wie gewünscht für später vorgemerkt, ohne Ursachenbehauptung. Version bleibt auf `main` unangetastet.

## P7 – Release-Gates angelegt
- Release-Kandidat und konkrete Abnahmeliste unter [V2_RELEASE_CANDIDATE.md](V2_RELEASE_CANDIDATE.md). Kein V2.0.0-Tag, keine Änderung an `main` und kein Deployment ohne ausdrückliche Freigabe.
- P7 Offline-Neustart-/IndexedDB-Browsercheck ist in die CI-Suite aufgenommen; Ergebnis muss geprüft werden.
- Hardware-, Lizenz- und bekannter Bug-Blocker sind bewusst offen und werden nicht als automatisiert bestanden markiert.

## P7 – Bestätigter browserbasierter Release-Gate-Lauf

- [GitHub Actions 39354186197](https://github.com/DT-S/LCARSmetronome/actions/runs/39354186197): **SUCCESS**, beide Jobs und sämtliche Prüfschritte.
- 9/9 Chromium-Viewports; zusätzlich: gecachter Offline-Neustart, persistentes IndexedDB, Export/Restore, produktiver Service-Worker-Austausch, Live-Transport/Panorama/Mute-Solo-Regression sowie Firefox-Engine-Navigation und Persistenz.
- Automatisierte Firefox-Engine ist **nicht identisch** mit einem echten lokalen Arch-Linux-Firefox-Gerätetest; Chromium-Touchprofile sind kein Safari-iOS.
- Kein Test kann die subjektive Qualität von Stereopanning, Lautstärke, Soundimport, Hörlatenz oder PWA-Safe-Areas auf echter Hardware garantieren. Die Nutzerabnahme und der erwähnte Bug bleiben Release-Blocker.
