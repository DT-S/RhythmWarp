# P1 – Das iPhone-PADD wird zum universellen Layout

**Ziel:** Ein einziges visuelles Rhythm-PADD für mobile, Tablet und Desktop. Nicht das Phone „aufblasen“, sondern seine LCARS-Bausteine adaptiv komponieren.

**Status:** Tablet-/Desktop-Shell und erster Inhaltsraster-Pass in `v2-layout.css` implementiert. GitHub-CI und Browser- sowie Geräteabnahme stehen für den Commit aus; CSS-Konsolidierung anschließend.

## Wo die bestehende Architektur geändert wird

- `style.css` enthält mehrere Generationen CSS; die maßgeblichen iPhone-Shell-Regeln beginnen aktuell im Block `/* v0.5.5 · RHYTHM PADD mobile architecture */` bei `@media (max-width: 640px)`. Die spätere v0.5.6-Korrektur und Safe-Area-Patches haben höhere Kaskadenpriorität.
- `index.html`: eine Shell aus `.app-shell`, Header/Elbow, `aside` (6 echte Navigationstabs), `main` und Bottom-Frame-Pseudo-Element. Strukturell bereits für alle Geräte geeignet; möglichst nicht doppeln.
- `src/app.js`: `refreshMobileFrame()`, `applyScale()`, `layoutLinearPatterns()` nutzen aktuell 640 px als Trennlinie. Ein Element darf auf Desktop-/Tablet-Reflow nicht durch Re-Render seine laufende Pointer-Geste verlieren.
- `src/linear-layout.js`: balancierte Zeilenverteilung ist für 1–20 Steps bereits getestet; später auf die tatsächlich verfügbare Plot-Breite erweitern.
- `src/interface.js`: `installSegmentCorners` errechnet äußere Buttonradien anhand realer Geometrie; muss nach Reflow funktionieren.

## Kleine implementierbare P1-Schritte

### P1a – CSS-Audit und Design-Tokens
1. PADD-Farbpalette global unter einem eindeutigen Satz `--padd-*` nutzbar machen; bestehende Phone-Darstellung zunächst pixelgleich erhalten.
2. Extrahierte Shell-, Panel-, Button-, Navigations- und Typografieregeln benennen statt zusätzliche anonyme Überschreibungen anhängen.
3. Klaren Cascade-/Datei-Plan etablieren: Basis / Shell / Komponenten / responsive Anordnung / Motion. Temporäre V2-Migrationsdatei erlaubt, alte konkurrierende Regeln nach bestandener Abnahme entfernen.
4. Kein musikalisches JS anfassen. CI muss grün bleiben.

### P1b – Shell (Header / Sidebar / Footer)
1. Mobile Header, Elbow und Segmentband auf breitere Viewports erweitern; Größen proportional/adaptiv, nicht stumpf vervielfachen.
2. Side Nav flexibles Breitenprofil (compact ≈58px, medium ≈92px, wide ≈130–170px), alle 6 Tabs gut erkennbar.
3. Footerband am unteren Rand des **sichtbaren** Viewports; Safe-Area auf iPhone; Main-Inhalt scrollbar.
4. 320–1920 px, Zoom 70–110 %, Querformat, Tablet-Portrait und Split View: kein Cropping der Rahmen.
5. Vor vollständiger Übernahme Desktop-Screenshot vom Nutzer gegen das iPhone-PADD vergleichen.

### P1c – Seitenraster
1. Compact: 1 Spalte, gut lesbares Ringinstrument, fortlaufende Controls.
2. Medium: 1 Spalte für enge Tablet-Splits, 2 Spalten wo Platz.
3. Wide: Instrument + Hilfscontrols nebeneinander; nie leere ungenutzte Großflächen oder gedehnte 8er-Notenbuttons.
4. Audio Matrix auf Large zwei getrennte Kanäle nebeneinander nur wenn ausreichende Einzelbreite existiert.
5. Diagramme/Tabelle in Diary+Stats vollständig erreichbar, mit erwarteter semantischer Reihenfolge im DOM.

### P1d – Test und Konsolidierung
1. CSS-Sichtprüfung in Browser bei 320, 375, 390, 430, 600, 768, 834, 1024, 1280, 1440, 1920.
2. Circular/Linear, Einstellungen, Audio Matrix, Diary, Stats, leere Presets, lange Namen, 16 Custom Sounds.
3. Bei Browserbildern fehlende Beschriftungen, Scroll-/Überlaufprobleme, Safe-Area und Fokus prüfen.
4. Erst wenn V2 überall gut aussieht: veraltete Layout-Definitionen entfernen und P1 als abgeschlossen markieren.

## Kritische No-Regressions
- Kein versehentlicher Wechsel ins alte Desktop-Look.
- Kein versehentliches Scrollen des gesamten Shells, das das obere/untere LCARS-Band verschiebt.
- Keine Kleinstschrift auf Tablets; kein Pan-/Volume-Regler außerhalb des Viewports.
- Das SVG `#rings`, `#tempoValue`, `#linear` und dynamisch erzeugte `.step`-Buttons müssen sicht- und bedienbar bleiben.
- Semantik und `aria-label` der Navigation und Regler bleiben erhalten.
- Kein neues CSS-`zoom`, das mit dem Nutzer-Interface-Scale kollidiert.

**P1 wird erst nach Gerätebildern und Tests als abgeschlossen markiert; ein grüner Node-Workflow allein ist keine visuelle Abnahme.**
\n## P1b-Umsetzung / noch offene Risiken\n- Nur Viewports ab 641 CSS-px laden neue Layoutregeln. Smartphone unter 641px nutzt unveränderte bewährte v0.5.15-Stile.\n- Responsive LCARS-Shell mit fixem Header/Side Nav/Footer, scrollbarem Inhalt; Metronom-Ring und Audio-Kanäle werden nicht mehr wie alte Desktop-Karten dargestellt.\n- Neuer Stylesheet-Link wird im Service Worker vorgecached; Runtime / Datenmodell unverändert.\n- Die in `style.css` historisch verschachtelten Layoutblöcke sind noch **nicht** entfernt. Nach Browser- und Geräteabnahme schrittweise konsolidieren; nicht fälschlich P1 komplett abschließen.\n
## P1b: Erste Browserresultate

[Chromium CI-Run](https://github.com/DT-S/LCARSmetronome/actions/runs/39334206528) erfolgreich; Metronome-/Audio-Screenshots für 390/768/1024/1440/1920 px erzeugt und geprüft. Desktop-Audio-Matrix: beide Kanalpanels stehen nebeneinander. Tablet-Portrait: gemeinsames PADD-Fascia, ringförmiges Instrument und untere Statusleiste ohne Layoutabsturz.  
**Nicht abgeschlossen:** Desktop- und Tablet-Bedienung aller übrigen Seiten, Browserzoom/Interface-Scale, Feintuning der Tablet-Navigation und CSS-Konsolidierung. Nächster Teil: P1c, anschließend P1d.

## P1c: Detailraster aller Seiten
- Responsive Preset-, Diary-, Stats- und System-Layouts ergänzt.
- Kleinere Tablet-Fascia zeigt dieselben kurzen Bezeichner wie das iPhone, semantische Beschriftungen bleiben intakt.
- Grafiken bleiben Datenvisualisierungen und bekommen keine synthetischen Werte; erweiterte Browserprüfungen folgen.

## P1c Browser-Prüfung und Abnahmegrenzen

## P1c/P1d – Letzter erfolgreicher Browser-Nachweis (19.10.2026)

- **[GitHub Actions: 39336610055](https://github.com/DT-S/LCARSmetronome/actions/runs/39336610055) – SUCCESS**, beide Jobs `node-regressions` und `browser-smoke`.
- **9/9 Headless-Chromium-Viewports:** 320×740, 390×844, 641×820, 768×1024, 900×600, 1024×768, 1280×800, 1440×900, 1920×1080.
- Jeder Viewport: Start, Circular/Linear, Audio Matrix mit Center/Right-Panorama, Presets, Diary und dessen Editor/Cancel, Stats, System, Interface-Skalen 70 %/110 %, und nach Tab-Wechsel wieder am Seitenanfang.
- Alle Screenshots im Workflow-Artefakt `rhythm-padd-v2-layout-screenshots` (Aufbewahrung 7 Tage).
- **Sichtprüfung:** Für Tablet/PC sind die Hauptbereiche plausibel angeordnet, beide Audiokanäle auf breitem Desktop nebeneinander. Der 641-px-Grenzfall und kurzhohes 900×600-Landscape sind funktional, ein angeschnittener unterer Inhalt ist wegen des gezielt scrollbaren `main` zulässig.
- **Noch offen:** iOS Safari/echte iPhone/iPad-PWA, Arch-Firefox, Keyboard-Fokus/Accessibility, reale Audio-Latenz und volle Diagramme mit vielen Sessions. Diese Punkte sind keine bestandenen Tests.

**P1c = Layout-Implementierung + grundlegende Browser-QA erledigt; P1 Gesamtphase = weiterhin offen** (CSS-Konsolidierung und reale Geräteabnahme). Kein Merge nach `main` ohne Freigabe.
