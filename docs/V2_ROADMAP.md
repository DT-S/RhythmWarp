# Rhythm PADD 2.0 – Entwicklungsplan

**Ziel:** Ein durchgängiges, responsives LCARS-Rhythmusinstrument für Smartphone, Tablet und Desktop, mit präzisem Touch-/Maus-Feedback und bewusst dezenten Animationen.

**Status:** Planung und Absicherung begonnen. Release 2.0 ist **nicht** fertig. Die funktionsfähige Version 0.5.15 bleibt auf `main`.
**Arbeitsbranch:** `develop/v2-rhythm-padd` (kein Fork).
**Grundlage:** `main` @ `17ae97c658228b4db0d38244c3268233371fd1d5`, Version 0.5.15.
**Leitmotiv:** Das aktuelle iPhone-RHYTHM-PADD ist der visuelle Standard; größere Screens sind **neue Anordnungen desselben Systems**, keine zweite UI.

## Nicht verhandelbare Regeln

1. **Audio bleibt verlässlich.** Web Audio / Scheduler-Zeitbasis, Mode-Logik, Mute/Solo, Panorama, Signalwege und Soundbank dürfen durch UI-Arbeit nicht verändert werden.
2. **Kein Datenverlust.** Das bestehende IndexedDB-/JSON-Modell v5 bleibt gültig. Presets, Diary, eigene Klänge, CSV-Export, Backups und Offline-Nutzung behalten ihre Funktion. UI-Änderungen dürfen keine speicherrelevanten Nebenwirkungen erzeugen.
3. **Kein kaputter Start.** Nach jeder Etappe sollen Circular und Linear rendern; alle Module müssen existieren und in der Service-Worker-Precache-Liste stehen. Ein fehlender Import darf nicht erneut die gesamte App deaktivieren.
4. **Echte Bedienelemente.** Keine klickbar aussehenden Dekorationen. Touch, Maus, Tastatur und Screenreader-Fokus berücksichtigen. Native Inputs bleiben zugänglich.
5. **LCARS-Kantenlogik.** Nur offene Außenkanten einer Button-Gruppe werden abgerundet; Innenkanten gerade. Klammern, Außenrahmen und Safe-Area bleiben vollständig sichtbar.
6. **Keine UI-Animation im Audio-Taktpfad.** Alle Übergänge sind visuell, abbrechbar und bevorzugt CSS-/Compositor-basiert; niemals die Audio-Uhr durch Animationsframes steuern.
7. **V2 bleibt isoliert.** Branch-Änderungen nicht ungeprüft auf `main` schieben. Separate Browser-/PWA-Installation beim Testen; kein unbeabsichtigtes SW-Update der stabilen Installation.
8. **Keine Phantom-Erfolge.** Automatisierte Checks und tatsächliche Geräteprüfungen getrennt dokumentieren; ohne echten Browsertest keine entsprechenden Behauptungen.

## Reihenfolge / Meilensteine

### P0 – Bestand erfassen und Sicherheitsnetz aufbauen
- [x] Branch aus dem letzten geprüften `main`-Stand erstellen.
- [x] Architektur, Mobile-CSS, Gesten, PWA-Service-Worker und Tests prüfen.
- [x] V2-Roadmap, Designspezifikation und Geräte-Testmatrix schreiben.
- [x] Import-/SW-Precache-Integrität als Regressionstest absichern (Code eingebaut; Ausführung durch CI noch zu bestätigen).
- [x] GitHub-Actions-Workflow für Node-Testläufe bei Push/PR einrichten.
- [x] Ergebnis der ersten CI-Ausführung prüfen: [GitHub Actions / Erfolg](https://github.com/DT-S/LCARSmetronome/actions/runs/39332554154).
- [ ] Aktuelle Oberfläche für Vergleich dokumentieren: iPhone Portrait (Circular/Linear), iPad Portrait/Landscape, Desktop.
- **Fertig wenn:** keine unkontrollierten Runtime-Änderungen, Dokumentation im Branch, Test-Sicherheitsnetz verfügbar.

### P1 – Ein gemeinsames responsives LCARS-Fundament

**Status:** P1b-Implementierung des großen LCARS-PADD in `v2-layout.css` begonnen; visuelle Abnahme, P1a-Konsolidierung und P1c/P1d noch offen.

**Konkrete Umsetzung:** [P1-Implementierungspaket](V2_PHASE1_IMPLEMENTATION.md).
- [ ] Globale Farb-, Abstand-, Typografie-, Rahmen-, Animations- und Touchgrößen-Tokens aus dem iPhone-PADD ableiten. Keine optisch zweite Desktop-Variante.
- [ ] CSS in nachvollziehbare Basis-/Layout-/Component-/Motion-Schichten überführen. Alte verstreute Media-Query-Überschreibungen schrittweise ersetzen, nicht weitere Blindfixes anhängen.
- [ ] Header, obere Schienen, linke Navigation, unteres Band und Safe-Area auf **allen** Viewports erhalten.
- [ ] Layout vom verfügbaren Platz abhängig machen, nicht vom Gerätenamen; echte Touchfähigkeit per Pointer/hover abfragen.
- [ ] Compact: kompakte Seitenleiste, 1 Hauptspalte und scrollbarer Inhalt. Medium: Tablet-Grid mit gut erreichbaren Controls. Wide: Desktop-Instrument und Seitenpanels nebeneinander.
- [ ] Zoom 70–110 % sowie Browserzoom und Rotation ohne Clipping/Überlauf prüfen.
- **Fertig wenn:** alle Seiten bei 320, 375, 390, 430, 600, 768, 834, 1024, 1280, 1440 und 1920 CSS-px vernünftig und ohne horizontales Scrollen nutzbar sind; sichtbare PADD-Bänder nicht abgeschnitten.

### P2 – Alle Ansichten an dasselbe Designsystem anbinden

**Stand:** Erster responsiver Layout-Pass für alle sechs Seiten plus Neun-Viewport-Browser-Smoke erfolgreich; die vollständige reale Geräteabnahme steht noch aus.
- [ ] Metronome: Circular und Linear sinnvoll skalieren, Zahlentastatur, Mode-Matrix, Training und Practice Clock konsistent platzieren.
- [ ] Audio Matrix: zwei Kanalbereiche abhängig vom Platz gestapelt/neben­einander; Pan, Volume, Mute, Solo und Soundauswahl vollständig bedienbar; nur freie Gruppenecken rund.
- [ ] Presets, Diary, Stats, Settings: konsistente Panels, responsive Tabellen/Plots/Formulare, keine abgeschnittenen Zahlen oder unsichtbaren Actions.
- [ ] Lange Namen, 20 Beats/Subdivisions, 16 Custom Sounds und leere/volle Datenlisten berücksichtigen.
- **Fertig wenn:** jede Seite auf Telefon, Tablet und Desktop vollständig erreichbar und visuell stimmig ist.

### P3 – Präzisions-Fader mit Touch-/Maus-Feedback

**Status:** P3 technisch implementiert; Node-/Chromium-Browserprüfung inklusive Touch-Feinsteuerung, Maus, Tastatur und Abbruch erfolgreich ([Testlauf](https://github.com/DT-S/LCARSmetronome/actions/runs/39338925485)). Echte iPhone-/Tablet-/Firefox-Abnahme bleibt offen.
- [ ] Wiederverwendbare UI-Hilfe für Volume, Pan, Master und Interface-Volume.
- [ ] Drag-Beginn: dezente Vergrößerung/Hervorhebung und gut lesbare **Wertblase oberhalb** des Fingers/Cursors.
- [ ] Pan als `L 0–100 %` / `CENTER` / `R 0–100 %`, links = -1, rechts = +1; Lautstärke `0–100 %`.
- [ ] Fader horizontale Grobbewegung, vertikale Entfernung (vom Ursprung) reduziert die Empfindlichkeit. Wert bleibt auf `[min,max]` begrenzt.
- [ ] Exakte CENTER-/LEFT-/RIGHT-Presetbuttons bleiben unverändert und setzen Wert und UI synchron.
- [ ] `pointercancel`, Multi-Touch, Scroll-Konflikte, Fokus, Tastatur, Accessibility, `prefers-reduced-motion` und Re-Render während der Geste absichern.
- **Fertig wenn:** grobes Verschieben und exakte Feineinstellung auf iPhone und iPad zuverlässig funktionieren und weder Audioaussetzer noch Phantomklicks verursachen.

**Nachtrag P3b:** Voyager-inspirierte segmentierte Audio-Matrix mit funktionsfähigem Scrubbing, animierter Nadel, 35-Tick-Vernier und zusätzlichen Schrittbuttons. [Automatisierte Prüfung erfolgreich](https://github.com/DT-S/LCARSmetronome/actions/runs/39343815394), reale Gerätefreigabe ausstehend.

### P4 – Zahlenleiter für Tempo und Parameter

**Status:** Zahlenleiter für Tempo und numerische Bedienelemente implementiert und automatisiert geprüft ([9 Viewports + Touch-Gesten](https://github.com/DT-S/LCARSmetronome/actions/runs/39345968421)). Geräteabnahme weiterhin ausstehend. Neue Gesten für Linear View gehören weiterhin zu P5.
- [ ] Gemeinsame visuelle Gestenanzeige für BPM, Beats, Subdivisions, Count-in und ausgewählte Trainingsparameter.
- [ ] Bei einer echten Geste: vertikale LCARS-Führung, gestrichelte rote/korallfarbene Leitschiene, horizontale Stufen und markierte aktuelle Position. Neben statt unter dem Finger.
- [ ] Bestehende Bedienlogik (Drag nach oben/unten, kreisförmig für Tempo, Antippen zum Tippen, Keyboard Arrow/Home/End) erhalten.
- [ ] Stufen mit klar definierten Intervallen; Zoom/hohe Werte dürfen die Anzeige nicht überfüllen. Wert-Clamping beibehalten.
- **Fertig wenn:** schnell ablesbare Schritte, keine Steuerkonflikte oder doppelten Änderungsereignisse.

**P4b Feinschliff abgeschlossen (automatisiert):** Die Führung morphiert aus dem Value-Button direkt unter dem Finger und klappt wieder zurück. [9/9 Auflösungen sowie Touch-/Morph-Tests grün](https://github.com/DT-S/LCARSmetronome/actions/runs/39347394768). Echte Safari-Geräteabnahme noch offen.

### P5 – Linear View: Beat-Gesten

**Status:** P5 implementiert, sämtliche automatisierten Checks inklusive 3:5, 3:7, 20:20, Touch-Tap/Drag, Desktop-Maus und Tastatur [erfolgreich](https://github.com/DT-S/LCARSmetronome/actions/runs/39348800249). Reale Safari-/Firefox-Geräteabnahme bleibt offen; der separat gemeldete Bug ist zurückgestellt.
- [x] **Tap** auf Beat-Button verändert weiter nur seinen Akzentzustand.
- [x] **Vertikaler Drag** auf einen Beat der äußeren bzw. inneren Reihe verändert die jeweilige **Anzahl** (1–20), analog zur Ring-Längeninteraktion; Drag darf keinen Akzent auslösen.
- [x] Pointer-Capture auf dem **stabilen Zeilencontainer**: neue DOM-Buttons durch `renderPatterns` dürfen die laufende Geste nicht abbrechen.
- [x] Multitouch/Scroll/Klick-Suppression/Berechnungs­schwelle sauber definieren; Fokus/Tastatur-Nutzung weiter möglich.
- [x] Anzahländerungen laufen weiterhin über die vorhandene `number()`-Funktion und greifen gemäß bestehender Scheduling-Semantik.
- **Fertig wenn:** 3:5, 3:7, 8+, 20:20, Tap und Drag in beiden Views ohne doppelte Akzente oder Verschiebungen funktionieren.

### P6 – LCARS-Motion-System und Plotter

**Status:** P6 implementiert und [vollständige Node-/Chromium-Regression erfolgreich](https://github.com/DT-S/LCARSmetronome/actions/runs/39351420336); echte Safari-/Firefox-/Audio-Praxisprüfung als P7-Gate weiterhin offen.
- [x] Seitenwechsel: unaufdringlicher Aufbau/Slide von links nach rechts (~150–250 ms), keine navigationsblockierende Wartezeit.
- [x] Aktive Modi, Umschalten zwischen Circular/Linear und Statuswechsel erhalten kleine Animationen; starke Blinkeffekte vermeiden.
- [x] Statistik-Plots: dezente Linien-/Markierungsbewegung nur als dekorativer Akzent, **keine simulierten Messwerte**.
- [x] `prefers-reduced-motion: reduce` deaktiviert nicht notwendige Effekte vollständig.
- [x] Motion nur bei Zustandswechsel; keine permanente Neuberechnung/Reflows pro Audio-Frame.
- **Fertig wenn:** Navigation und Diagramme ruhig, hochwertig, verständlich, flüssig und auditiv unverändert bleiben.

### P7 – Release-Kandidat, Geräteprüfung, Freigabe

**In Arbeit:** Abnahmecheckliste, Asset-Herkunft und Offline-PWA-Regressionen. Kein Release ohne physische Geräte-/Audio-/Lizenzprüfung und Behebung des vom Nutzer erwähnten Bugs.
- [ ] Sämtliche Node-Regressionstests grün und echte Browser-/PWA-Tests gemäß `V2_TEST_MATRIX.md`.
- [ ] Tests auch mit Offline-Start, Versionwechsel, Speicher, Export/Import, Aktualisierung und App-Neustart.
- [ ] Audiohören mit Kopfhörern: Panorama L/C/R, unabhängige Kanäle, Mute/Solo, Custom Sounds, Tap, Swing, Ramp; Timing/Audio unter UI-Animation beobachten.
- [ ] UI-Sounds/Icons/sonstige verwendete Assets vor Schülerfreigabe auf Lizenz prüfen bzw. eigenständig ersetzen.
- [ ] Versionsnummer **erst nach Release-Abnahme** auf 2.0.0 setzen, SW-Cache korrekt versionieren, changelog und Release-Notes schreiben.
- [ ] **Nur mit ausdrücklicher Freigabe:** PR nach `main` zusammenführen und GitHub-Pages-Deployment aktualisieren.
- **Fertig wenn:** vollständig getestete V2 in allen Zielumgebungen; stabile V1-Daten bleiben lesbar.

## Technische Umsetzung: keine große Alles-auf-einmal-Änderung

- Zuerst Dokumentation/Regressionstests, dann jeweils kleine atomare Commits pro Layout-Komponente oder Interaktion.
- `src/audio.js`, `src/scheduler.js`, `src/rhythm.js` und `src/model.js` bei reinen UI-Schritten möglichst unangetastet lassen.
- CSS-Zuständigkeiten und wichtige Elemente in `V2_DESIGN_SYSTEM.md` festhalten, damit nur **eine** Layoutdefinition der Ausgangspunkt ist.
- Wiederverwendbare Gestenberechnung als reine Funktion testen, UI-Indikatoren getrennt vom Audio-State halten.
- Bei Fehlern den letzten guten V2-Commit revertieren statt `main` zu reparieren.
- Browser-PWA-Updates vorsichtig: `sw.js` cachet importierte Module; bei jeder neuen Runtime-Datei den Cache ergänzen.

## Arbeitsmodus

Pro Etappe: **(1)** Ist-Stand messen, **(2)** kleines Design-/Verhaltensziel definieren, **(3)** implementieren, **(4)** automatische Tests, **(5)** echte Geräteabnahme durch den Nutzer, **(6)** im Fortschrittsprotokoll abhaken. Keine Vermischung von geplant, implementiert und auf iPhone bestätigt.

**Links:** [Designsystem](V2_DESIGN_SYSTEM.md) · [Testmatrix](V2_TEST_MATRIX.md) · [Fortschritt](V2_PROGRESS.md).
