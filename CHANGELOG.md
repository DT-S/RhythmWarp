# Changelog

## 2.0.0-rc.1 – Release candidate (2026-10-20)

**Vorabversion**: Die automatisierte QA ist erfolgreich. Keine endgültige 2.0.0-Freigabe ohne iPhone-Safari- und Audio-Geräteabnahme sowie bestätigte Nutzungsrechte für die UI-Sounds.

### Neu
- Einheitliche responsive LCARS-Oberfläche auf Smartphone, Tablet und Desktop.
- Voyager-inspirierte Audio-Matrix, echte Segment- und Vernier-Regler, separate Kanalpegel und exakte Stereo-Position.
- Morphende Zahlenleiter bei Tempo, Beats, Subdivisions und weiteren Zahlenfeldern.
- Vertikales Scrubbing direkt auf Linear-View-Beats; Tap bleibt Akzentwechsel.
- Dezente Zustands- und Seitenanimationen, reale Daten-Fadenkreuze in Statistiken, Reduced Motion.
- Erweiterte Regressionstests für Touch, Maus, Tastatur, Offline-PWA, IndexedDB, Export/Restore, Service-Worker-Update und Firefox-Engine.

### Fehlerbehebungen
- Safari-Doppeltipp-Zoom per `touch-action: manipulation` unterbunden, ohne beabsichtigtes Pinch-Zoom zu deaktivieren; echte iOS-Bestätigung noch offen.
- Einheitliche Bedien- und Informationsschriftgrößen in System und Diary; Tagebuch-Datenblöcke kompakter.
- Schwarze Schrift auf hellblauen Statistik-Session-Buttons.
- Zahlenleiter behält die mittige Goldmarkierung auch an den Grenzen 1 und 16–20.

### Kompatibilität
- IndexedDB-Datenbank und bestehendes Backup-Schema bleiben unverändert.
- App-ID, Scope und URL der installierten PWA bleiben unverändert.
- Stabiler `main`-Branch und öffentliche Veröffentlichung unverändert bis zur finalen Freigabe.

### Release-Blocker
Siehe [Abnahmeliste](docs/V2_RELEASE_CANDIDATE.md). Vor öffentlichem Teilen insbesondere Rechte an den sechs UI-MP3-Sounds und gegebenenfalls Star-Trek-bezogenen Assets sicherstellen.
