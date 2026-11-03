# Rhythm Warp

**Rhythm Warp** ist die eigenständige, offlinefähige Rhythmus-Trainings-App von Drum Track Studio.

Status: **Entwicklung / noch nicht für Schüler freigegeben**.

Die vollständige Metronom-Engine wird aus dem privaten Ursprung `DT-S/LCARSmetronome` übernommen, **ohne dort Dateien oder Historie zu verändern**. Diese öffentliche Repository-Fassung erhält vor der Codeübernahme eine eigene Marken-/Asset-Prüfung.

## Design

- Dunkelgrüne Flächen und warme Textfarbe direkt aus der Drum Track Studio Website.
- Konturierte, steilere Bögen statt mehrfarbiger Vollflächen.
- Eigenständiges Rhythmus-Symbol statt Franchise-Emblem.
- Keine Star-Trek-Bezeichnungen, Franchisegrafiken oder ungeprüften UI-Sounds in der öffentlichen App.
- Trainingsfunktionen, Audiosynthese und lokale Datenspeicherung werden nicht bewusst eingeschränkt.

[Designvorschau](preview/index.html) · [Designsystem](docs/DESIGN_SYSTEM.md) · [Migrationsplan](docs/MIGRATION.md)

> **Wichtiger Hinweis:** Diese öffentliche Entwicklungsbasis enthält noch keine vollständige Metronom-App. Die Vorschau ist eine statische Designstudie, kein Funktions- oder Rechtsnachweis.

## Technisches Freigabegate

`node scripts/audit-public.mjs`

Der Audit überprüft sichtbare Altmarken und blockiert Audio-Dateien, für die keine dokumentierte Freigabe vorliegt. Er ersetzt weder Tests im Browser noch eine Rechteprüfung.
