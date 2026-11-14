# WARP-HUD // MECHA-CHRONO DECK

## Abschnitt 1 — Ausgangslage und Token-Migration (2026-11-14)

Branch: `feat/rhythmwarp-ui-redesign`. Ausgangszustand: 338 Node-Tests bestanden.
Die separate Gemini-Datei liegt nicht vor; maßgeblich ist die Spezifikation im Arbeitsauftrag.

### Verantwortlichkeiten

- `styles/tokens.css`: zentrale vollständige Paletten und semantische Variablen;
  einschließlich der vorübergehend notwendigen alten Variablennamen.
- `rhythm-warp-colors.css`: bestehende Bindungen von Komponenten an diese Rollen;
  importiert die Tokens, enthält keine zweite Palettendefinition.
- `rhythm-warp-layout.css`: bestehende responsive Größen und Rahmengeometrie;
  wird komponentenweise bereinigt, nachdem Sichtprüfungen möglich sind.
- `rhythm-warp.css`, `v2-*.css`, `style.css`: noch nicht vollständig migrierter Bestand.
  Ihre Entfernung ist ausdrücklich kein erledigter Teil dieser Etappe.

Die Farbpalette wird an ihrer bisherigen Quelle ersetzt, nicht durch zusätzliche
späte Farb-Overrides. Die internen Theme-Keys `voyager`, `elite`, `redalert`
und alle Speicherformate bleiben unverändert. Der Service Worker hält die neue
importierte Token-Datei im Precache; die Release-Cacheversion wurde angehoben.

### Funktionale DOM-Verträge

IDs, `data-*`-Attribute, SVG-ViewBox und Koordinaten, Pointer-Zielflächen und
Capture-Handler bleiben bestehen. `#lcarsStartup`, `#lcarsInitialize`,
`[data-set-theme]`, `#rings`, `.point`, `.playing` und native Eingabeelemente
werden von bestehendem JavaScript verwendet. Alte interne Namen sind keine
Freigabe, sie global umzubenennen. Kein `clip-path` auf interaktiven Flächen.
Scheduler, Audio-Uhr, Mikrofonanalyse und Training bleiben vom CSS unabhängig.

### Audit und offene Grenzen

Der Public-Audit verwendete URL-`pathname` als Dateisystempfad. Unter Windows
wurde dadurch keine Quelle geprüft. Jetzt erfolgt die Konvertierung mit
`fileURLToPath`; fehlende Pflichtquellen schlagen fehl. Ein isolierter Test
prüft echte Dateien, Leerzeichen im Pfad, Branding, Audio und fehlende Quellen.
Der Audit bleibt rot: Audio-Rechte sind ungeklärt und der bisherige pauschale
Branding-Scan meldet auch erlaubte interne Namen. Diese Befunde werden nicht
durch eine globale Ausnahme unterdrückt. Keine Veröffentlichung empfohlen.

Playwright ist lokal nicht installiert. Chromium-/Firefox-Sichtprüfung,
iOS Safari, Standalone-PWA, reale Touch-Bedienung und Offline-Installation
sind noch offen. Node-Tests belegen keine visuelle Abnahme.

## Abschnitt 2 — Rahmen und erste Effekte

Die feste Grün-Overrideschicht in `rhythm-warp.css` ist entfernt. Die Datei
enthält nur noch strukturelle Regeln und Fokusdarstellung. In
`rhythm-warp-layout.css` ersetzen gemeinsame Rahmenregeln die mehrfachen
Cutout-/Border-Passes. Seitenleistenbreiten, responsive Tracks und
Mindesthöhen bleiben bestehen. Innere Elbow-Cutouts sind deaktiviert;
Rahmen verwenden `2px 14px 2px 14px`. Es gibt kein Clipping bedienbarer Flächen.

`styles/effects.css` trennt Effekte von Palette und Layout: statisches Raster,
Paneltiefe, Fokus-/Hoverlicht, bestehende Beat-Marken, Startup-Scanlines.
Keine zusätzlichen JavaScript-Timer. Reduced Motion deaktiviert die neuen
Übergänge und Beatfilter. Die flächigen `box-shadow:none!important` und
`filter:none!important` aus den Komponentenfarbbindungen sind entfernt.
Bestehende spezielle V2-Styles können einzelne Effekte noch übersteuern;
ihre visuelle Migration ist nicht abgeschlossen.

Validierung nach Abschnitt 2: 338/338 Tests bestanden. Der Audit-Test ist neu;
veraltete Cutout-Formtests wurden zu zwei HUD-Geometrieprüfungen konsolidiert.
Unter Windows wurde `npm.cmd test` verwendet, nachdem PowerShell den
`npm.ps1`-Wrapper durch die Ausführungsrichtlinie blockiert hatte.

Edge ist installiert. Der neue optionale, dependencyfreie Chromium-Smoke-Test
`node tests/warp-hud-browser.mjs` startet eine isolierte Headless-Instanz,
läuft derzeit aber beim CDP-Aufruf `Runtime.enable` in einen Timeout.
Damit liegen ausdrücklich noch keine erfolgreichen Screenshots oder
gemessenen Browserabnahmen vor. Erzeugte Profile/Artefakte werden ignoriert.

Offen: Browserzugriff reparieren und alle Themes visuell abnehmen; weitere
Komponenten-/Dialoggeometrien, Secondary-Akzente und Branding prüfen;
V2-Overridebestand weiter reduzieren; Theme-Persistenz, Touch, Tastatur,
Offline/PWA und reale Geräte validieren; Audio-Rechte klären.

## Korrektur — Aufbau nach Theme-Wechsel aus Settings

Die Rückkehr vom erneut geöffneten Startfenster spielte bisher keinen Aufbau:
`bootStarted` verhinderte Wiederholung; zusätzlich verlangte der Controller
eine sichtbare Metronomseite, während Settings weiterhin aktiv war.
Der Initialisieren-Handler fordert jetzt für diesen Fall explizit einen rein
visuellen Replay an. Rahmen und weiterhin aktive Settings-Inhalte bauen sich
erneut auf. Launch-Sound und Audio-Initialisierung bleiben auf den Erststart
beschränkt. Kein Navigations- oder Datenreset; Reduced Motion bleibt wirksam.
Cacheversion auf v12 erhöht. 339/339 Tests bestehen, einschließlich Replay,
Timerersetzung, Cleanup und Reduced Motion. Firefox-Sichtprüfung weiterhin offen.
