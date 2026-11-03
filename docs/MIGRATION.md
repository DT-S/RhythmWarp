# Migration: privat → Rhythm Warp (öffentliche Schülerfassung)

**Quellprojekt:** `DT-S/LCARSmetronome`, unverändert lassen.
**Zielprojekt:** `DT-S/RhythmWarp`, zunächst Entwicklung auf `feat/student-edition`.

## Regeln vor Übernahme

1. Änderungen ausschließlich im Zielprojekt, niemals ein Force-Push oder History-Rewrite im Quellprojekt.
2. Quellcode nach Bedarf kopieren, dabei Namen in sichtbaren Texten, Manifest, Sharing und Backup-Ausgabe ersetzen.
3. Startscreen-Logo mit dem stilisierten deltaförmigen Zeichen **nicht übernehmen**. Eigenständiges Rhythm-Warp-Symbol verwenden.
4. Platzhalter- und Nummerntexte aus den Rahmen entfernen. Zentrale Rhythmusinformationen (BPM, Taktart) bleiben erhalten.
5. Website-Farbpalette und neue Neonlinien installieren; Kurvengeometrie erkennbar weiterentwickeln.
6. Bestehende Audio-Engine, Metronom-Logik, Trainingsspeicher und Analysedaten durch Regressionstests schützen.
7. Rechte sämtlicher UI-Audiodateien prüfen. Das ursprüngliche Projekt dokumentiert noch ungeklärte Rechte; bis dahin **keine Kopie dieser Audios in das öffentliche Repo**. Falls nötig durch eigene synthetisierte UI-Klänge ersetzen.
8. App-Icon als neues SVG + eigene 192/512-PNGs generieren; keine fremden Logos.
9. PWA Service Worker, Manifest, installierte Daten und Cache-Namen sauber separieren.
10. iPhone-Standalone, Android-Installation, Timing, Sound, Speicher und Offline-Betrieb testen; anschließend visuelle und rechtliche Freigabe bewerten.

**Öffentliche GitHub-Branches sind ebenfalls öffentlich.** Daher keine unfertige 1:1-Kopie des alten Designs als Zwischenstand pushen.

## Audit / Abnahme

`node scripts/audit-public.mjs` überprüft sichtbare Altnamen und Audio-Assets, ist aber keine juristische Freigabe.
