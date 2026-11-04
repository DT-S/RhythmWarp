# Architektur / Etappe 0.3

## Module

- `model.js`: Datenformat 3 mit drei Instrumentnamen je Kanal; explizite Migration aus Format 1 und 2; Validierung der Patterns, Mixerkanäle, Akzent-Soundnamen, Trainingsparameter und Presets. Keine verschachtelten Presetlisten.
- `rhythm.js`: Reine Ereignisplanung in Viertelpositionen. Standard, Polyrhythmik, Polymetrik, Gap, Random-Gap-Stummschaltung, Offbeat, Displacement, Ramp und paarweiser Swing.
- `scheduler.js`: AudioContext-Zeitbasis; 100 ms Vorschau, 25-ms-Queue-Poll. Separate Zyklusgrenze als Scheduling-Ereignis, damit auch spärliche Polyrhythmen Änderungen rechtzeitig übernehmen. Globale Anzeige-Taktzahl und modusspezifische Phase getrennt. Keine Audio-Timer-Taktung.
- `synth.js`: Deterministische Wellenform-Erzeugung für acht Klangfamilien mit drei Zuständen. Unterschiedliche Tonhöhe/Klangfarbe; gleicher maximaler Samplepegel. Kurze Attack-/Release-Hüllkurven, keine Fremdsamples.
- `audio.js`: Vorab dekodierte UI-MP3s und vorberechnete Metronom-Synthese-Buffer, zwei unabhängige Mixerpfade, Stereo-Panning, Master und separater UI-Pegel. Metronom-MP3-Slots wurden auf Nutzerwunsch entfernt.
- `training-ui.js`: Modusspezifische Parameter direkt rechts vom Instrument, LCARS-Optionsbuttons, Swing-Verfügbarkeit und manuelle Verschiebung.
- `app.js`: Navigation, SVG und lineare Ansichten, Pointer-Gesten, Klangwahl pro Kanal und Akzent/Hörproben, Presets, Import/Export, Audio-Freischaltung und Visualisierung anhand der Audio-Uhr.
- `storage.js`: Bestehender IndexedDB-Store; atomare Snapshot-Schreibvorgänge. Formatmigration betrifft die JSON-Inhalte, nicht den Datenbankspeicher.
- `sw.js`: Versionscache je Scope; gleiche Origin mit unterschiedlichen Repo-Pfaden kollidiert nicht. Updates warten auf Nutzeraktivierung und löschen keine Übungs-/Presetdaten.

## Musikalische Definitionen

Standard: B Viertel pro Takt, S Unterteilungen je Viertel. Polyrhythmus: B äußere und S innere Ereignisse teilen Q gemeinsame Viertel. Polymetrik: B- und S-Punkt-Muster schreiten pro Viertel vorwärts; innere Position ist `(modeBar * B + beat) % S`.

Gap verändert ausschließlich Klickzustände, niemals Zeitpositionen. Random Gap wählt Phasenlängen nur an Phasengrenzen. Offbeat/Displacement verschieben den äußeren Kanal und behalten den inneren als stumme Orientierung. Ramp ändert Vierteldauer an Taktgrenzen; Hin-/Rücklauf erreicht Ziel/Start ohne Überschwingen. Swing verschiebt nur das jeweils zweite Ereignis eines Unterteilungspaars.

Bei Modus-, Patternlängen-, Starttempo- oder Trainingsparameteränderung beginnt die lokale Trainerphase an der nächsten Grenze neu. Akzent-/Mixer-/Soundänderungen behalten sie bei. Count-in wird bis zu seinem Ende nicht strukturell geändert.

## Nachweise und Grenzen

51 Tests mit Node-Test-Runner. Planungssimulation einschließlich 100 Takten ohne Drift; Signalprüfungen für endliche Samples, gleiches Peak-Level und unterschiedliche Klangzustände; Migration alter Presets; ungültige Daten werden verworfen.

Keine visuelle oder akustische Browserprüfung dieser Version in der Entwicklungsumgebung. Versionen 0.1 und 0.2 laut Nutzer auf Firefox erprobt; aktuelle Version 0.3 benötigt erneuten Praxistest. iPhone und Hintergrundverhalten weiterhin offen. Kein Browser-Preview-Server gestartet, da kein unterstützter Browser-QA-Zugang verfügbar war.

## Nächste Etappen

Sticking-/Paradiddle-Trainer und freie zusätzliche Rhythmusmodelle; Voice Count; Übungstagebuch/Kategorien/CSV; Routinen/Ziele/Statistiken; abschließende Geräte- und Langzeittests. Die App behauptet keine nicht gemessene Spielgenauigkeit.

## UI-Korrekturen 0.3

`number-control.js`: direkte Zahleneingabe und Pointer-Capture, 8-px-Schwelle, vertikaler oder winkelbasierter Drag, normalisierte ±π-Übergänge, Tastaturbedienung. Wertefelder behalten während der Geste ihre DOM-Identität; dynamische Trainingsfelder werden nicht bei jedem Zahlenwechsel ersetzt.

Aktives SVG-Highlight verwendet `#rings .point.playing` / `#rings .point.state0.playing`, damit die Ruhefarben den Abspielring nicht mehr überschreiben. Ramp-Ausgabe erhält Start/Ziel/Live-Metadaten im zeitgestempelten Event; die Anzeige verarbeitet sie erst nach Erreichen des Audiotimestamps. Keine Rückkopplung der Anzeige in den Scheduler.

Ein Operating-Mode-Buttonstreifen und eine Parameteransicht statt doppelter Trainingsseite. Kein Patterndialog. Linear View bleibt der zweite Editor. Klangwahl besteht aus drei Zeilen mit je acht Tasten pro Kanal. Alte automatische Sampleauswahl wird bewusst zu synthetischem Classic migriert.

## Gestaltung 0.3.1

Reines UI-Update: semantische Label-Spans, gefüllte Parameter- und Statusfelder, größere Touchflächen, Checkboxen mit ON/OFF-Darstellung und native Details/Summary-Infobereiche. Dynamische Parameter- und Mixerbeschriftungen nutzen dieselbe Feldstruktur. Audio, Rhythmus, Scheduler, Datenformat und Zahlengesten bleiben unverändert. Native Buttons, Inputs und Labels behalten ihre Bedienfunktion; statische Farbfelder werden nicht als funktionslose Buttons ausgegeben.

## 0.4 practice archive

`diary.js` owns validation, audio-time recording, aggregation and CSV. `diary-ui.js` renders inline editing and filtered statistics using text nodes for user content. Model version 4 migrates versions 1–3 with an empty diary. Preset helpers separate diary data from rhythm configuration. Scheduler snapshots exclude diary/presets so growing history is not cloned in the audio scheduling loop. Recorder boundaries use scheduled timestamps independently of requestAnimationFrame; stopping trims future look-ahead. Countdown completion passes the exact deadline; stalls cap recorded time at the prior healthy scheduling horizon. Persistence remains IndexedDB with explicit stop as the reliable session save boundary; pagehide is best effort. No microphone performance evaluation or pause/resume is claimed.

## 0.5 visual analysis and samples

`charts.js` creates SVG plots from daily aggregates or recorded session boundaries. Missing tempo values break paths; time/count plots include zero days. The seven-day mean uses matching entries before the selected display window. `custom-sounds.js` validates bounded base64 sample banks and manages upload/deletion. Model v5 includes the bank in full backups, with references only in presets. Scheduler snapshots exclude the sample bank. AudioEngine decodes samples before transport starts and schedules them directly through existing channel paths. Import prepares a temporary decoded bank before committing state; a decode failure preserves current data.

## 0.5.1 interaction/audio fixes

`tempo-control.js` separates the persistent BPM gesture display from its hidden keyboard editor. Pointer capture remains on the tempo surface during re-rendering. The shared numeric gesture calculation supports vertical and orbit adjustment; double tap/click or holding activates editing. Dial ticks use explicit 5-degree geometry. Mixer channel gains include a 2x multiplier; their stereo outputs feed a dedicated DynamicsCompressor before master. UI gain bypasses that compressor.

## 0.5.2 mobile feedback and scaling

`interface.js` centralizes delegated pointer/click feedback. Click classification occurs in capture phase before page/mode state changes. Pointer-held feedback awaits audio unlock/loading and is cancelled on release, cancellation or scrolling. Summary controls are included; native label forwarding is deduplicated. `uiScale` is an optional backwards-compatible model-v5 field (default 1), bounded to predefined choices, rendered with CSS zoom on the app shell and preserved when loading rhythm presets. Mobile layout remains responsive; viewport pinch zoom is unrestricted.
