# Rhythm PADD 2.0 – responsives Design- und Interaktionssystem

## Visuelle Identität
Das freigegebene iPhone-Layout (v0.5.15) ist **Masterreferenz**. Schwarz als Negativraum; große warme LCARS-Farbflächen; gelbe/orange Instrumentierung; Lila/Rot/Blau/Tan als strukturelle Akzente; präzise abgerundete Außenkanten und rechtwinklige innere Fugen. Keine Card-UI in Standard-Webapp-Optik. Inspiration: The Next Generation, eigenständige Gestaltung und eigene Nutzungsrechte.

## Ein Layoutsystem, drei Platzprofile
Dies sind **Startwerte zum Testen**, keine unveränderlichen technischen Grenzen.

| Profil | Verfügbarer Platz (CSS px, grob) | Instrument / Sidebar / Panels |
|---|---|---|
| Compact | bis ~600 | schmales LCARS-Fascia links, Kopf/Bodenband, Hauptinhalt 1 Spalte und scrollbarer Hauptbereich |
| Medium | ~601–1023 | Fascia mit Platz für längere Labels, flexible Instrument-/Control-Zonen, primär 1–2 Spalten |
| Wide | ab ~1024 | Navigation und Instrument in ruhiger 2-/3-Spalten-Anordnung, längere Charts und 2 Kanalpanels |

Wichtiger als `window.innerWidth`: reale Breite der jeweiligen Content-Zone. Wo möglich CSS Grid/Flex/`minmax`/`clamp` und ggf. Container Queries verwenden. Hardwaretyp/Touch nicht aus der Breite ableiten. Zoom und Landscape mitdenken.

### Rahmen und feste Teile
- Oberer „Elbow“ + horizontale farbsegmentierte Schiene.
- Linkes Nav-Fascia mit sechs tatsächlichen Reitern und Statusabschnitt; Desktop darf Beschriftungen ausführlicher zeigen.
- Untere farbsegmentierte Schiene; nie über iOS Home Indicator legen.
- Nur der Contentbereich muss bei knappem Platz scrollen; keine überlagerte untere Leiste.
- Safe-Area-Inset und tatsächlichen Layout-/Visual-Viewport respektieren. Nicht `screen.height` als Browserhöhe verwenden.
- Mindest-Touchziel ~44 × 44 CSS px für primäre Aktionen; dichte Notenbuttons brauchen passende Hitareas.

### Seitenraster
- **Metronom**: Operating Modes, Circular/Linear, Tempo, Quartal/Unterteilung, Transport, Training, Clock, Hilfetext. Wide: Instrument als klarer Fokus neben Controls, nicht riesig skaliertes Smartphone.
- **Audio Matrix**: zwei Channel-Panels (Outer/Inner), Volume, Pan plus L/C/R-Presets, Mute/Solo, Double Accent/Accent/Normal Sound-Raster. Gruppenrundung berechnet sich nach sichtbaren Zeilen.
- **Preset, Diary, Stats, System**: gleiche Panel-Geometrie, Abstände und Typo; Formulare vollständig; Charts ohne abgeschnittene Achsen.

### Farben, Geometrie, Typografie (Bestandswerte, in P1 zentralisieren)
- Bestehende `--padd-orange`, `--padd-amber`, `--padd-peach`, `--padd-lavender`, `--padd-blue`, `--padd-tan`, `--padd-red`.
- Kantenfamilien: große LCARS-Kappe / mittlere Buttongruppe / kleiner Indikator; konkrete Radien skalieren mit Elementhöhe statt mit Viewportbreite.
- Innenkanten in verbundenen Button-Gruppen bleiben immer 0. Nebeneinanderliegende Segmente bekommen sichtbare dunkle Fugen.
- Überschrift und Labelposition auf allen Bildschirmgrößen stabil. Keinen Unterschied „Desktop alte Optik vs Mobile PADD“.

## Interaktionsvertrag
### Fader
- Jeder native Slider bleibt zugänglich für Tastatur, Assistive Technology, Maus.
- Down: Wertindikator oberhalb des Touchpunkts; visuelle Vergrößerung, nicht das tatsächliche Layout verschieben.
- Horizontaler Fingerweg -> Wert; vertikaler Abstand -> reduzierte Empfindlichkeit. Event-Handling `pointercancel` / Capture / passive Scroll beachten.
- UI-Animation und State-Updates voneinander trennen. Prozentanzeige bei Pan als Richtungswert; Audio bleibt bei `[-1,1]`.
- Presetbuttons L/C/R bleiben exakt `-1/0/+1`.

### Zahleneinstellung
- Feste Ziehschwelle zum Schutz gegen versehentliche Änderungen.
- Vertikale animierte Leiter mit gleichmäßigen Stufen, aktueller Wert/Step markiert, Orientierung rot/korallfarben.
- Weiter direkte Eingabe und Pfeiltasten; keine falschen Buttons durch bloße Dekoration.

### Lineares Beat-Editing
- Tippen: existierender Akzentzyklus.
- Klarer Drag: Beat-Anzahl der betroffenen Zeile ändern (1–20).
- Kein Doppeltrigger durch nachträglichen `click`; stabile Pointer-Capture an der Zeile, nicht am bei Änderungen ersetzten Button.
- Keine dynamische Neuerstellung des aktiven Gestenträgers.

## Motion-Vertrag
- Übergänge meist 150–250 ms; bevorzugt `transform` / `opacity`, nicht kontinuierliche `top/width`-Animationen.
- Plots dürfen nur vorhandene Daten zeigen; eventuell animiertes Reveal oder Highlight.
- Keine hektischen Blinks / erzwungene Dauerschleifen; keine Ablenkung beim Zählen.
- `prefers-reduced-motion: reduce` -> unnötige Animation aus, UI voll bedienbar.
- Bei fehlender Pointer-Precision oder schlechter Framerate einfache Animationen priorisieren.

## CSS-Strategie
Es gibt zurzeit viele historisch gewachsene `@media(max-width:640px)` und Sonderüberschreibungen in der großen `style.css`. **Nicht** als nächstes noch einen großen weiteren Patch am Dateiende anhängen. In P1 systematisch konsolidieren:
1. Tokens und Design-Vertrag.
2. Ein PADD-Shell-Layout mit adaptiven Spalten.
3. Komponentenregeln nur einmal, responsives Rearrangement in begrenzten Breakpoint-/Container-Regeln.
4. Altes Überschreibungs-CSS entfernen, sobald visuell getestet.
5. Sicherstellen, dass `main` und die V2-Tests den gleichen musikalischen Kern bewahren.

## Originalfunktion bleibt
Circular Drag, Zoom, Number-Dials, Touch-Hover-Feedback, Mute/Solo, Pan-L/C/R, Sound-Raster, JSON/CSV, Zeitstatus, Persistenz und Offline-Installation bleiben erhalten. Animationen beeinflussen keine geschedulten Audiosamples.

## P6 konkreter Motion-Vertrag
- `src/motion.js` wird ausschließlich bei Nutzeraktionen aufgerufen: neue Tabs, instrumentale Ansicht, Modus- oder Transportstatus. State und Audio-Scheduling hängen nicht von CSS-Ereignissen ab.
- `v2-motion.css`: 210-ms-Seitenreveal, 195-ms-Ansichtswechsel, 220–230-ms-Zustandsquittung. Keine animierten SYS-Fascia-Elemente, keine Scanlines und keine Dauerloops.
- `src/charts.js` legt ein Fadenkreuz direkt auf existierende Messpunkte, die lediglich `pointerenter`/`pointerdown`/`focus` auswählen. Die Crosshair-Position wird aus den vorhandenen x/y-Skalierungsfunktionen berechnet. Die eigentlichen gespeicherten Daten, Labels und Plots werden nicht verändert.
- Bei Datensätzen über 120 markierten Punkten wird die Einzelpunktanimation ausgelassen, ohne die Datenpunkte zu reduzieren.
- Alle visuellen Zustände sind mit `prefers-reduced-motion` ohne Animation nutzbar; kein Fokus- oder Pointerverhalten hängt von einer Animationsdauer ab.
