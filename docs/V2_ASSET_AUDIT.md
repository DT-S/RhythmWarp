# V2 – Asset- und Herkunftsprüfung

**Stand:** 20.10.2026, Repository `DT-S/LCARSmetronome`. Diese Prüfung dokumentiert die vorhandenen Dateien und ihren im Repository erkennbaren Status, **keine juristische Freigabe**.

| Pfad | Verwendung | Beobachteter Stand | Gate vor Schüler-Freigabe |
|---|---|---|---|
| `assets/audio/ui/Acceptsound.mp3` | UI Bestätigung | MP3 vorhanden, Quelle/Lizenz nicht dokumentiert | Rechtebeleg oder ersetzen |
| `assets/audio/ui/Warningsound.mp3` | Warnung | Quelle/Lizenz nicht dokumentiert | Rechtebeleg oder ersetzen |
| `assets/audio/ui/buttonpress.mp3` | Click | Quelle/Lizenz nicht dokumentiert | Rechtebeleg oder ersetzen |
| `assets/audio/ui/hoversound.mp3` | Hover/Touch | Quelle/Lizenz nicht dokumentiert | Rechtebeleg oder ersetzen |
| `assets/audio/ui/invalidsound.mp3` | Fehler | Quelle/Lizenz nicht dokumentiert | Rechtebeleg oder ersetzen |
| `assets/audio/ui/switchingmenus.mp3` | Navigation | Quelle/Lizenz nicht dokumentiert | Rechtebeleg oder ersetzen |
| `assets/icon.svg` | App-Icon | Einfaches Vektor-PADD im Repository, Urheberherkunft nicht dokumentiert | Urheberschaft bestätigen |
| `assets/icon-192.png`, `assets/icon-512.png` | PWA-Icon | PNG im Repository; Beziehung zum SVG und Herkunft nicht schriftlich belegt | bestätigen |
| `src/synth.js` | Generierte Instrumentenklänge | Erzeugung per eigenem JavaScript im Projekt | Quellcodeautorschaft bestätigen |
| CSS-Systemschriften | UI-Typografie | Systemschriften per CSS, keine mitgelieferten Fonts | keine separaten Fontdateien verteilen |

Die Repository-Lizenz `LICENSE` ist MIT (Copyright DT-S 2026). Das garantiert **nicht**, dass sämtliche beigefügten MP3s oder Marken-/Designbezüge übertragbar lizenziert sind. Für die Star-Trek-/LCARS-inspirierte Gestaltung keine offizielle Paramount-/Star-Trek-Zugehörigkeit behaupten; Namens-, Marken- und Gestaltungsfragen vor breiter Veröffentlichung separat prüfen.

**Praktischer Weg:** Die UI-Samples eigenständig erstellen oder eindeutige kommerzielle Weitergabe-/Redistributionsrechte festhalten (inklusive Quelle, Lizenz, Datum und notwendiger Attribution). Die Referenz-Herkunft anschließend hier pro Datei mit Beleg ergänzen. Erst danach Asset-Gate auf bestanden setzen.

Unverändert: Der SW-Precache lädt alle sechs MP3s lokal, um den vollständig offlinefähigen Betrieb zu erhalten. Solange die Lizenzfrage offen ist, **keine** Freigabe zur Verteilung ableiten.
