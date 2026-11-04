# Rhythm PADD 2.0 – Release Notes (ENTWURF)

**Status:** Release Candidate, noch nicht freigegeben. Unveröffentlichter V2-Branch; produktive Version auf `main` bleibt unverändert.

## Neu
- Einheitliches responsives LCARS-Design für iPhone, Tablet und Desktop mit sechs vollständig nutzbaren Ansichten.
- Audio Matrix: segmentierte Gain- und Panorama-Regler mit Vernier-Scrubbing, schmalen Positionsnadeln, Offset-Telemetrie und exakten L/C/R-Presets.
- LCARS-Morph-Zahlenleiter für Tempo und numerische Bedienelemente mit Touch-Feedback.
- Lineare Beat-Reihen können durch vertikale Gesten erweitert und gekürzt werden; Tap-Akzentsteuerung bleibt bestehen.
- Zurückhaltende LCARS-Seitenwechsel, Mode-/Status-Quittierungen und Marker für reale Plotterpunkte.
- Accessibility-Prinzipien, Keyboard-Steuerung, Reduced-Motion-Unterstützung, Offline-Precache.

## Kompatibilität
- Persistiertes v5-Datenmodell unverändert, keine automatische Datenmigration.
- Existierende JSON-Backups, Übungsarchiv, Presets und persönliche Samples bleiben unterstützt.
- Browser- und Node-Regressionssuite für alle Entwicklungsphasen P0–P6, P7-E2E für Offline, Backup und Update.

## Vor Veröffentlichung ausstehend
- Echte iPhone-/iPad-/Arch-Firefox-Geräteprüfung und Kopfhörer-/Latenztest.
- Herkunft/Rechte aller MP3-/Bild-/Markenmaterialien dokumentieren.
- Vom Nutzer gemeldeten Bug sowie zusätzliche kleinere Verbesserungen abschließen.
- Aktuelle CI-Abnahme auf finalem Code, Benutzerfreigabe und ausdrückliche Merge-Zustimmung.

**Wichtig:** Noch **nicht** als Version 2.0.0 oder Schüler-Release ausgeben. Finales Datum und Versionsnummer erst beim Release.
