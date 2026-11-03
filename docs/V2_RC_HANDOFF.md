# Rhythm PADD 2.0 – Release Candidate / P7 Übergabe

**Branch:** `develop/v2-rhythm-padd`  
**Status:** Automatisierte Freigabekontrollen implementiert; reale Geräte- und Audioabnahme sowie Asset-Freigabe ausstehend. **Nicht für Schüler veröffentlicht.**

## Automatische Gates
Die CI führt die unabhängigen Jobs `node-regressions` und `browser-smoke` aus.
- ECMAScript-Syntax aller Laufzeit- und Testdateien; relative Imports und vollständiges Offline-Precache.
- Schema `version:5` unverändert; vorhandene v1–v5-Importkonvertierung / JSON-Validierung / Presets / Soundbank.
- Neun Chromium-Auflösungen, Metronom-Circular/Linear, beide Audio-Matrix-Kanäle, Gesten, 3:5/3:7/20:20, Diary, Stats, System.
- P6-Seitenanimationen, Plotterpunkte und Reduced Motion.
- **Neue P7-Ende-zu-Ende-Suite:** Offline nach Service-Worker-Installation, Offline-Neustart und zweiter Tab, IndexedDB-Werte unverändert; echter JSON-Download und Restore zurück ins DOM/IndexedDB; PWA-Update von einem alten Test-Worker auf den produktiven Worker, anschließend erneut offline; Firefox-Browserengine mit Navigation und Datenerhalt.
- Zusätzlich Chromium-Audiotransport Start/Stop und Panorama L/C/R + Mute/Solo während Live-Playback. Diese Prüfung beobachtet Programmzustände; sie ersetzt **keinen Hörtest**.

**Nach jedem Code-Fix:** beide CI-Jobs auf demselben Commit erfolgreich, Screen-/Release-Artifacts prüfen. Keine Abnahme auf Grundlage älterer Commits.

## Nicht automatisierbare oder noch offene Gates
Die folgenden Prüfungen müssen **vor einem Merge und vor Weitergabe an Schüler** auf realen Geräten erfolgen.

### A. iPhone 13 / iOS Safari als Home-Screen-PWA
- Update des bestehenden Installationspfads testen; nicht vorschnell App-Daten durch Löschen der PWA vernichten.
- Header-Elbow und Bottom-Rail inklusive Safe Areas im Hoch- und Querformat. Kein Abschneiden hinter Dynamic Island/Home-Indikator.
- Mit normalem und 70–110-%-Interface-Scale durch die sechs Tabs navigieren.
- P3: Volume/Pan, 1-%-Vernier, LEFT/CENTER/RIGHT; echte Fingerberührungen und erweiterter Fingerabstand.
- P4: Tempo-/Beats-/Subdivision-Tasten verwandeln sich unter dem Finger in die Leiter, kommen nach Loslassen wieder zurück. Abbruch/Scroll testen.
- P5: Linear 3:5 / 3:7 / 20:20, Drag beider Kanäle, Tap-Akzent, Scroll, Multi-Touch und Fokus.
- P6: Seitenwechsel und Diagramm-Highlight ruhig; unter `Bewegung reduzieren` keine unnötigen Animationen.
- Offline: zuerst online laden/installieren, dann Flugmodus, PWA schließen/neu starten, weiterarbeiten, Speichern und Neustart erneut testen.
- Backup ausgeben und auf sicherem Datenträger separat aufbewahren.

### B. iPad Safari oder vergleichbares Tablet
- Hoch-/Querformat; beide Audiokanäle, Bedienbarkeit aller 3×8 Soundbuttons, scrollbare Stats.
- Drag, Hover-Ersatz per Touch, Keyboard bei externer Tastatur (falls vorhanden), Standalone-Offline-PWA.

### C. Arch Linux Firefox
- 1024/1280/1440/1920; Input-Fokus, Tastatur, Mausrad, Tabs, Dauer-Scrollbereiche.
- IndexedDB + Offline-Browserneustart; Firefox-spezifische Berechtigungen für Persistent Storage.
- Kopfhörer und PipeWire-Audio-Ausgabe unter normaler Systemkonfiguration testen.

### D. Kopfhörer / reales Audio
- Panorama beider Kanäle **separat** bei L −100 %, CENTER 0 %, R +100 % prüfen; keine Kanäle vertauscht.
- Lautstärken/Mute/Solo und eigene Sounds; doppelte Akzente und UI-Click dürfen nicht fälschlich zusätzlich getriggert werden.
- 20–400 BPM, Count-in, Swing, Polyrhythmik/Polymeter, Gap, Random Gap, Offbeat, Displacement, Tempo Ramp; Start/Stop, Hintergrundwechsel und Unterbrechungen.
- Rhythmus exakt mit akustischem Click oder externer DAW-Referenz vergleichen, vor allem unter UI-Animation. Headless-Browser-Meldungen sind **kein** Latenz- oder Klangnachweis.

### E. Lizenz-/Markenfreigabe
Siehe [V2_ASSET_AUDIT.md](V2_ASSET_AUDIT.md). Sechs MP3-Dateien haben im Repository keinen dokumentierten Rechtebeleg. Bitte **vor öffentlicher Weitergabe** Nachweis ergänzen oder durch eigene/lizenzierte Samples ersetzen. MIT-Lizenz des Codes reicht für diese Medien nicht aus.

### F. Offene Fehler und Anpassungen
Der Nutzer hat einen kleinen Bug und weitere Änderungswünsche angekündigt. Diese werden **vor finaler Freigabe** dokumentiert, reproduziert, behoben und gegen die gesamte Testmatrix geprüft.

## Release-Prozess / Schutz des stabilen Builds
1. Auf dem Entwicklungsbranch alle automatisierten Gates grün bekommen und reale Geräteergebnisse dokumentieren.
2. Offene Bugs beheben; letzte Audio- und Datenprüfung, Asset-Rechte geklärt.
3. Erst dann Versionsnummer auf **2.0.0**, passenden Cache-Namen und finalen CHANGELOG/Release-Notes-Text setzen. Weitere vollständige CI.
4. Diff/`git diff main...develop/v2-rhythm-padd` kontrollieren und vollständiges JSON-Backup vom bestehenden Produktivgerät sicher außerhalb des Browsers verwahren.
5. **Nur nach ausdrücklicher Freigabe des Eigentümers** Pull Request und Merge nach `main`, anschließend GitHub Pages/Installations-Update kontrollieren.
6. Kein automatisch veranlasstes Deployment, kein Entfernen bisheriger Daten, keine Schema-Migration ohne Plan.

**Abnahmekriterium:** Nachweisbare Funktion auf echten Zielgeräten, aktuelle CI grün, Lizenz geklärt, Nutzerfreigabe. Bis dahin: Release-Kandidat, kein veröffentlichtes V2.
