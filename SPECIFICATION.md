# LCARS METRONOME
## FINAL MASTER DEVELOPMENT PROMPT V3.0
### Professional Metronome, Rhythm Training & Practice Analytics PWA

---

# 1. DEINE AUFGABE

Du bist ein erfahrener Softwareentwickler mit besonderer Expertise in:

- Web Audio API und digitaler Audiotechnik
- Musikalischem Timing und Rhythmustheorie
- Schlagzeugtechnik und rhythmischem Training
- Progressive Web Apps
- TypeScript und moderner Webentwicklung
- Responsivem UI/UX-Design
- Touch- und Gestensteuerung
- IndexedDB und Offline-Datenspeicherung
- Datenvisualisierung
- Softwarearchitektur und Qualitätssicherung

Entwickle eine vollständige, professionelle Metronom- und Rhythmustrainings-App.

**Projektname: LCARS METRONOME | Rhythm Training System**

Das Ziel ist eine hochwertige Anwendung, die das intuitive, kreisförmige Bedienkonzept von Tempo Advance mit einem eigenständigen, eleganten LCARS-Interface im Stil von Star Trek: Voyager verbindet.

Die Anwendung soll sowohl als alltägliches Metronom als auch als professionelles Werkzeug für komplexe rhythmische Übungen funktionieren.

Zusätzlich soll sie Trainingszeiten, Übungsthemen, Tempi und Fortschritte dokumentieren und statistisch auswerten.

**Die Anwendung muss tatsächlich funktionieren.** Keine Attrappen, funktionslosen Buttons oder rein dekorativen Menüelemente.

Bei umfangreichen Entwicklungsschritten darf die Implementierung in mehrere klar abgegrenzte Etappen aufgeteilt werden. Jede fertiggestellte Etappe muss jedoch testbar und funktional sein.

# 2. GRUNDSÄTZLICHE ANFORDERUNGEN

## Plattformen

Die Anwendung muss funktionieren auf:

- iPhone 13 mit aktuellem iOS
- Safari als installierte PWA
- Firefox unter Arch Linux
- Modernen Chromium-basierten Browsern
- Desktop, Tablet und Smartphone

## Hosting

Die Anwendung wird kostenlos auf GitHub Pages veröffentlicht.

Sie muss:

- Vollständig statisch betreibbar sein
- HTTPS unterstützen
- Nach der Installation offline funktionieren
- Ohne Backend auskommen
- Keine Benutzerkonten benötigen
- Keine laufenden Kosten verursachen
- Keine obligatorischen externen Dienste verwenden

## Prioritäten

1. Präzises Audiotiming
2. Einfache und intuitive Bedienung
3. Zuverlässige Offlinefunktionalität
4. Sichere Datenspeicherung
5. Responsive Touch-Bedienung
6. Professionelles LCARS-Design
7. Erweiterbare Architektur
8. Vollständige Trainingsfunktionen

Die Grundbedienung des Metronoms muss jederzeit einfach bleiben, unabhängig davon, wie viele erweiterte Funktionen vorhanden sind.

---

# 3. TECHNISCHE ARCHITEKTUR

Verwende vorzugsweise:

- TypeScript
- HTML5
- CSS
- Web Audio API
- SVG für die Kreisvisualisierung
- IndexedDB
- Service Worker
- Web App Manifest
- Eine schlanke Build-Umgebung wie Vite

Verwende zusätzliche Bibliotheken nur, wenn sie einen klaren Nutzen bringen.

Die Projektstruktur muss übersichtlich, modular und wartbar sein.

## Zentrale Module

Trenne mindestens folgende Komponenten:

1. Audio Engine
2. Rhythm Engine
3. Audio Scheduler
4. Circular Sequencer
5. Linear Sequencer
6. Gesture Controller
7. Training Mode Engine
8. Sound Library
9. Audio Mixer
10. Practice Log
11. Preset Manager
12. Practice Routine Manager
13. Analytics Engine
14. Storage Manager
15. Backup & Import Manager
16. PWA / Offline Manager
17. LCARS UI System

Die Audio-Engine darf nicht direkt von der Benutzeroberfläche abhängig sein.

Änderungen am Design oder an den Statistiken dürfen das Audiotiming nicht beeinflussen.

# 4. AUDIO-ENGINE

Die Audio-Engine ist die wichtigste technische Komponente.

## Timing

Verwende die Web Audio API mit vorausschauendem Audio-Scheduling.

Der AudioContext bildet die verbindliche Zeitreferenz.

Verwende keine gewöhnlichen JavaScript-Intervalle als eigentliche Audiotaktung.

Ein Scheduler darf durch einen Web Worker unterstützt werden.

Prüfe den sinnvollen Einsatz von AudioWorklets.

Alle rhythmischen Ereignisse müssen anhand präziser musikalischer Zeitpositionen berechnet werden.

## Anforderungen

- Stabiles Tempo
- Kein kumulativer Timing-Drift
- Präzise rhythmische Unterteilungen
- Synchronisierte Rhythmuslinien
- Präzise Polyrhythmen
- Präzise Polymetrik
- Korrekte Tempoänderungen
- Gap Click ohne Verlust der zeitlichen Synchronisation
- Kein Einfluss der Bildwiederholrate auf das Timing

## Änderungen während der Wiedergabe

Tempoänderungen sollen möglichst unmittelbar und ohne hörbare Timingfehler übernommen werden.

Strukturelle Änderungen, beispielsweise der Anzahl von Beats oder Subdivisionen, sollen an einer definierten musikalischen Grenze wirksam werden.

Bereits geplante Ereignisse dürfen dabei nicht zu unbeabsichtigten doppelten Klicks führen.

## Visuelle Synchronisation

Die Animationen des Metronoms richten sich nach der Zeitbasis des AudioContext.

Nicht umgekehrt.

Optische Animationen dürfen keine Voraussetzung für eine korrekte Audiowiedergabe sein.

## Browserbesonderheiten

Berücksichtige:

- AudioContext-Aktivierung durch Benutzerinteraktion
- Suspend/Resume auf iOS
- Unterbrechungen durch andere Apps
- Bluetooth-Latenz
- Audioausgabe über Kopfhörer
- Einschränkungen bei gesperrtem Bildschirm
- Verhalten installierter iOS-PWAs

Hintergrundwiedergabe bei gesperrtem Display darf nicht als garantiert vorausgesetzt werden.

---

# 5. MUSIKALISCHES GRUNDMODELL

**Dieser Abschnitt ist verbindlich und besonders wichtig.**

Das normale Metronom verwendet eine einfache, konsistente musikalische Logik.

## Grundprinzip

Im Standardmodus ist die Viertelnote die grundlegende Zeiteinheit.

Die Anwendung besitzt zwei konzentrische Rhythmuskreise.

### Äußerer Kreis

Bestimmt die Anzahl der Viertelnoten pro Takt.

Beispiele:

- 3 = 3/4
- 4 = 4/4
- 5 = 5/4
- 7 = 7/4
- 9 = 9/4

Die Anzahl ist von 1 bis 20 einstellbar.

### Innerer Kreis

Bestimmt die Anzahl gleichmäßiger Unterteilungen innerhalb einer Viertelnote.

Die Anzahl ist ebenfalls von 1 bis 20 einstellbar.

### Zentrale Regel

**Der innere Kreis durchläuft alle seine Unterteilungen während genau einer Viertelnote. Erst danach rückt der äußere Kreis um eine Viertelnote weiter.**

Anschließend beginnt der innere Kreis erneut.

Dieses Prinzip wiederholt sich bis zum Ende des Taktes.

Danach beginnt der äußere Kreis wieder bei der ersten Viertelnote.

## Beispiele

| Äußerer Ring | Innerer Ring | Ergebnis |
|---|---|---|
| 4 | 1 | 4/4, Viertelklick |
| 4 | 2 | 4/4, Achtel |
| 4 | 3 | 4/4, Achteltriolen |
| 4 | 4 | 4/4, Sechzehntel |
| 4 | 5 | 4/4, Quintolen pro Viertel |
| 4 | 6 | 4/4, Sechzehnteltriolen |
| 4 | 7 | 4/4, Septolen pro Viertel |
| 4 | 9 | 4/4, Nonolen pro Viertel |
| 5 | 3 | 5/4, drei Unterteilungen je Viertel |
| 7 | 5 | 7/4, fünf Unterteilungen je Viertel |

Die Zahlen sind frei einstellbar.

Es dürfen keine festen Beschränkungen auf bestimmte Tuplets existieren.

## Maximale Komplexität

- Äußerer Ring: 1 bis 20
- Innerer Ring: 1 bis 20

Somit sind bis zu 400 Unterteilungspositionen pro Takt möglich.

Die kreisförmige Darstellung benötigt trotzdem nur maximal 20 sichtbare Punkte pro Ring.

Der innere Ring wird bei jeder Viertelnote erneut durchlaufen.

## Wichtige Unterscheidung

Fünf Viertelnoten mit drei Unterteilungen pro Viertel sind kein 5:3-Polyrhythmus.

Der Standardmodus ist kein Polyrhythmus-Modus.

Polyrhythmik und Polymetrik werden über separate Trainingsmodi realisiert.

## Halbe und ganze Noten

Auch langsamere Klickintervalle müssen möglich sein.

Beispielsweise:

- Klick auf jeder Viertel
- Klick auf jeder zweiten Viertel
- Klick auf jeder vierten Viertel

Dies kann durch einen entsprechenden Klickintervall-Modus beziehungsweise programmierbare Hauptbeat-Zustände realisiert werden.

## Erweiterbarkeit

Das zugrunde liegende Rhythmusmodell soll so gestaltet sein, dass später auch andere Notenwert-Nenner und zusammengesetzte Taktarten ergänzt werden können.

Für die reguläre Kreisbedienung bleibt zunächst die Viertelnote die verbindliche Bezugsgröße.

Andere rhythmische Bezugsnoten dürfen die einfache Standardbedienung nicht verkomplizieren.

---

# 6. CIRCULAR METRONOME INTERFACE

Das wichtigste Bedienelement der Anwendung.

Orientiere dich an der Bedienlogik von Tempo Advance und insbesondere am Screenshot, den der Nutzer in der ursprünglichen Projektunterhaltung bereitgestellt hat.

Falls dieser Screenshot im neuen Projekt nicht verfügbar ist, verwende die nachfolgende Beschreibung als verbindliche Referenz.

## Aufbau

Drei konzentrische Kreise:

1. Äußerer Beat-Ring
2. Innerer Subdivision-Ring
3. Zentraler BPM-Kreis

## Zentraler BPM-Kreis

Zeigt das aktuelle Tempo groß und gut lesbar an.

Beispiel:

**159 BPM**

Zusätzlich befinden sich Plus- und Minus-Buttons im Kreis.

### Touch-Steuerung

Der Nutzer kann mit seinem Finger eine Kreisbewegung auf dem zentralen Bedienelement ausführen.

- Im Uhrzeigersinn: Tempo erhöhen
- Gegen den Uhrzeigersinn: Tempo verringern

Die Drehbewegung muss flüssig und präzise funktionieren.

Die Winkeländerung um das Kreismittelpunkt bildet die Grundlage für die Steuerung.

Vermeide Sprünge an der 0°-/360°-Grenze.

Zusätzlich:

- Plus-Button
- Minus-Button
- Direkte BPM-Eingabe
- Optional beschleunigtes Ändern bei längerem Drücken

BPM-Bereich: mindestens 20 bis 400.

## Äußerer Beat-Ring

Zeigt die Anzahl der Viertelnoten pro Takt.

Jede Viertelnote wird als Punkt dargestellt.

### Drehen

- Uhrzeigersinn: Beat-Anzahl erhöhen
- Gegenuhrzeigersinn: Beat-Anzahl verringern

Bereich: 1 bis 20.

Die Punkte verteilen sich gleichmäßig auf dem Kreis.

## Innerer Subdivision-Ring

Zeigt die Anzahl der Unterteilungen pro Viertelnote.

### Drehen

- Uhrzeigersinn: Unterteilungen erhöhen
- Gegenuhrzeigersinn: Unterteilungen verringern

Bereich: 1 bis 20.

Auch hier verteilen sich alle Punkte gleichmäßig.

## Wichtig bei der Interaktion

Die Anwendung muss zwischen Tippen und Drehen unterscheiden.

Ein Tap verändert den Soundzustand eines Punktes.

Eine Drehbewegung verändert die Anzahl der Punkte.

Eine kleine Fingerbewegung darf nicht versehentlich als Drehung erkannt werden.

Verwende robuste Gestenerkennung mit:

- Pointer Events
- Pointer Capture
- Bewegungsgrenzen
- Winkelschwellen
- Korrektur von Winkelübergängen
- Behandlung abgebrochener Gesten

Die Steuerung muss besonders auf dem iPhone komfortabel funktionieren.

## Änderungen der Punktanzahl

Wenn die Anzahl der Beats oder Unterteilungen verändert wird, sollen vorhandene Akzentmuster nach einer klar definierten Regel erhalten beziehungsweise angepasst werden.

Vermeide zufällige oder inkonsistente Zustandsänderungen.

## Viele Punkte

Bei 20 Punkten pro Kreis müssen die Punkte weiterhin gut erkennbar und bedienbar sein.

Implementiere bei Bedarf eine vergrößerte Bearbeitungsansicht.

Die normale Hauptansicht darf dadurch nicht überladen werden.

---

# 7. VIER SOUNDZUSTÄNDE PRO RHYTHMUSPUNKT

Jeder Punkt des äußeren und inneren Kreises besitzt vier Zustände.

Durch einfaches Antippen wird zwischen ihnen gewechselt.

## Zustand 1: Doppelakzent

Ein einzelner, sehr hoher Klicksound.

## Zustand 2: Einfacher Akzent

Ein einzelner, etwas tieferer Klicksound.

## Zustand 3: Normaler Klick

Der normale Metronom-Klicksound.

## Zustand 4: Stumm

Kein hörbarer Klick.

Danach beginnt der Zyklus wieder mit Zustand 1.

## WICHTIGE TECHNISCHE FESTLEGUNG

Diese vier Zustände sind **keine Lautstärkeabstufungen**.

Es handelt sich um verschiedene Sounds.

Der Doppelakzent bedeutet nicht zwei gleichzeitig gespielte Klicks.

Die drei hörbaren Zustände sollen anhand unterschiedlicher Klanghöhen beziehungsweise unterschiedlicher Samples identifizierbar sein.

Beispiel:

- Doppelakzent: sehr hoher Bell-Klick
- Einfachakzent: mittelhoher Bell-Klick
- Normal: gewöhnlicher Metronom-Klick
- Stumm: kein Audio

Für Stille muss keine tatsächliche Audiodatei abgespielt werden.

## Anpassbarkeit

Die Soundzuweisung für die drei hörbaren Zustände muss individuell konfigurierbar sein.

Die allgemeine Kanallautstärke bleibt davon unabhängig.

## Visuelle Unterscheidung

- Doppelakzent: markanter heller Punkt mit zusätzlicher Umrandung
- Einfacher Akzent: deutlich gefärbter Punkt
- Normal: regulärer Punkt
- Stumm: dunkler Punkt

Keine starken Leuchteffekte oder übertriebenes Shading.

Die Punkte sollen im LCARS-Stil gestaltet werden.

---

# 8. AUDIOVERHALTEN DER BEIDEN KREISE

Der äußere Ring besitzt einen eigenen Audiokanal.

Der innere Ring besitzt ebenfalls einen eigenen Audiokanal.

Beide können gleichzeitig hörbar sein.

Im Standardmodus wird bei Beginn einer Viertelnote das zugehörige Ereignis des äußeren Rings ausgelöst.

Gleichzeitig beginnt die neue Unterteilungssequenz des inneren Rings.

Wenn auf beiden Ringen an derselben musikalischen Position ein aktiver Klick eingestellt ist, dürfen beide Sounds gleichzeitig abgespielt werden.

Das ist beabsichtigte Überlagerung und kein Timingfehler.

Beide Kanäle verfügen über:

- Individuelle Soundzuweisung
- Eigene Lautstärke
- Eigenes Stereo-Panning
- Mute
- Solo

Die Audio-Engine muss diese Ereignisse präzise synchronisieren.

---

# 9. ALTERNATIVE LINEARE VISUALISIERUNG

Zusätzlich zum Circular Sequencer soll eine lineare Darstellung existieren.

## Circular View

Standardansicht.

## Linear View

Alternative Ansicht mit horizontal angeordneten Schritten.

Enthalten sind:

- Äußerer Rhythmuskanal
- Innerer Rhythmuskanal
- Positionsanzeige
- Akzentzustände
- Aktuelle Beat-Position

Beide Ansichten müssen dieselben Daten verwenden.

Der Wechsel der Darstellung darf die Audiowiedergabe nicht unterbrechen.

---

# 10. POLYRHYTHMUS-TRAINER

Polyrhythmik ist ein eigenständiger Modus.

Die beiden Kreise verwenden hierbei eine andere rhythmische Zuordnung als im Standardmodus.

## Funktionsweise

Beide Kreise repräsentieren unabhängige rhythmische Unterteilungen über dieselbe frei wählbare Zeitspanne.

Beispiel 3:2:

- Äußerer Ring: zwei gleichmäßige Ereignisse
- Innerer Ring: drei gleichmäßige Ereignisse

Beide durchlaufen ihren gemeinsamen Zyklus innerhalb derselben Zeitdauer.

## Beispiele

- 2:3
- 3:4
- 4:5
- 5:3
- 5:4
- 7:4
- 9:4
- Frei einstellbare Kombinationen von 1 bis 20

Die gemeinsame Zyklusdauer soll musikalisch sinnvoll definiert und bei Bedarf einstellbar sein.

## Audio

- Zwei unabhängige Sounds
- Zwei unabhängige Lautstärken
- Individuelles Stereo-Panning
- Mute/Solo
- Vier Klickzustände pro Punkt

Beispiel:

Track 1 vollständig links.

Track 2 vollständig rechts.

## Visualisierung

Beide Rhythmusströme werden in konzentrischen Kreisen dargestellt.

Die Positionen müssen zeitlich korrekt wiedergegeben werden.

---

# 11. POLYMETRIK-TRAINER

Implementiere einen eigenständigen Polymetrik-Modus.

Anders als bei Polyrhythmen besitzen die Rhythmuslinien hier unterschiedliche Taktlängen über einen gemeinsamen Grundpuls.

Beispiel:

- Track 1: 3/4
- Track 2: 4/4

Beide laufen mit derselben Viertelpulsdauer.

Die Zyklen verschieben sich gegeneinander und treffen erst nach ihrer gemeinsamen Periodendauer wieder zusammen.

Unterstütze:

- Unterschiedliche Patternlängen
- Individuelle Akzente
- Individuelle Sounds
- Stereo-Panning
- Lautstärkeregelung
- Visuelle Synchronisation

---

# 12. DUAL RHYTHM SEQUENCER

Beide Rhythmuslinien sollen frei programmierbar sein.

Jeder rhythmische Punkt kann einen der vier Soundzustände erhalten.

Unterstütze:

- Unterschiedliche Patternlängen
- Unterschiedliche Unterteilungen
- Unterschiedliche Sounds
- Unterschiedliche Lautstärken
- Stereo-Panning
- Mute/Solo
- Individuelle Akzentmuster

Die Circular View ist die bevorzugte Bearbeitungsoberfläche.

Für komplexe Patterns darf ein zusätzlicher Rastereditor angeboten werden.

Ein optionaler dritter Akzent- oder Hilfskanal ist zulässig, darf die Bedienung aber nicht unnötig verkomplizieren.

---

# 13. GAP CLICK TRAINER

Implementiere einen normalen Gap Click.

Beispiel:

- Vier Takte Klick
- Vier Takte Stille
- Anschließend Wiederholung

Einstellungen:

- Anzahl hörbarer Takte
- Anzahl stummer Takte
- Wiederholung
- Optional automatisches Ende
- Optional visuelle Anzeige der aktuellen Phase

Während der stummen Phase läuft die interne Zeitbasis weiter.

Es dürfen keine Timingverschiebungen entstehen.

# 14. RANDOM GAP TRAINER

Separater Trainingsmodus.

Nicht mit dem normalen Gap Click zusammenlegen.

Die hörbaren und stummen Phasen werden zufällig bestimmt.

Einstellungen:

- Minimale hörbare Taktanzahl
- Maximale hörbare Taktanzahl
- Minimale stumme Taktanzahl
- Maximale stumme Taktanzahl

Optional:

- Reproduzierbare Zufallssequenzen
- Einstellbare Gesamtdauer
- Anzeige der aktuellen Phase

Die Zufälligkeit darf das zugrunde liegende Tempo nicht beeinflussen.

---

# 15. OFFBEAT TRAINER

Implementiere gezieltes Offbeat-Training.

Beispiel:

Vier Takte Downbeat, anschließend vier Takte Offbeat.

Unterstütze:

- Achtel-Offbeats
- Sechzehntel-Offbeats
- Frei einstellbare Wechselintervalle
- Automatische Wiederholung
- Visuelle Anzeige der aktuellen Position

---

# 16. BEAT DISPLACEMENT TRAINER

Implementiere einen eigenständigen Trainingsmodus zur Verschiebung des Metronom-Klicks.

Beispiel:

1 → 1e → 1& → 1a → 1

Der Klick wird nach einer definierten Anzahl von Takten um eine Unterteilungsposition verschoben.

Einstellungen:

- Anzahl der Takte pro Position
- Verschiebungsrichtung
- Schrittgröße
- Rhythmische Auflösung
- Automatischer oder manueller Wechsel

Die aktuelle Verschiebung muss optisch eindeutig erkennbar sein.

---

# 17. TEMPO RAMP TRAINER

Implementiere automatische Tempoveränderungen.

Beispiel:

80 BPM, alle vier Takte +5 BPM, bis 160 BPM.

Einstellungen:

- Starttempo
- Zieltempo
- BPM-Schrittgröße
- Taktanzahl zwischen Tempoänderungen
- Aufwärts
- Abwärts
- Aufwärts/Abwärts
- Optional kontinuierliche Beschleunigung

Alle Tempoänderungen müssen musikalisch sauber geplant werden.

---

# 18. SWING UND SHUFFLE

Implementiere Swing für geeignete Unterteilungen.

Unterstütze:

- Gerade Unterteilungen
- Achtel-Swing
- Sechzehntel-Swing
- Triolisches Swing-Feeling
- Stufenlos einstellbaren Swing-Faktor

Der Swing-Faktor verändert die Abstände zwischen geeigneten Unterteilungsereignissen, nicht das zugrunde liegende BPM-Tempo.

Bei Unterteilungen, für die die gewählte Swing-Regel musikalisch nicht eindeutig definiert ist, muss die Funktion sinnvoll eingeschränkt oder ausdrücklich konfiguriert werden.

---

# 19. PARADIDDLE- UND STICKING-TRAINER

Implementiere einen speziellen Schlagzeug-Trainingsmodus.

## Vordefinierte Stickings

- Single Paradiddle
- Double Paradiddle
- Triple Paradiddle
- Paradiddle-Diddle
- Frei definierbare Stickings

## Funktionen

- Anzeige von R und L
- Individuelle Sounds pro Hand
- Akzentuierung
- Automatische Permutationen
- Zyklische Patternverschiebungen
- Automatischer Wechsel nach X Takten
- Optional zufällige Permutationen
- Kombination mit Tempo Ramp
- Speicherbare Presets

## Linkshänder-Modus

- Spiegelung von R/L
- Individuelle Start-Hand
- Entsprechende Anpassung der Darstellung

Die aktuelle Permutation muss während der Wiedergabe sichtbar sein.

---

# 20. FREIER RHYTHMUS-EDITOR

Implementiere einen Editor, mit dem eigene Rhythmuspatterns erstellt werden können.

Beispiele:

- Clave-Patterns
- Synkopierte Rhythmen
- Verschobene Akzente
- Ungewöhnliche Gruppierungen
- Eigene Drum-Patterns

Jeder Schritt besitzt die vier bekannten Soundzustände.

Die Hauptbearbeitung erfolgt über den Circular Sequencer.

Bei Bedarf kann eine alternative Rasterdarstellung verwendet werden.

---

# 21. SOUNDBIBLIOTHEK

Implementiere eine lokale Soundbibliothek.

## Standardsounds

- Klassischer Metronom-Klick
- Kugelglocke / Bell
- Kick Drum
- Snare Drum
- Side Stick
- Woodblock
- Unterschiedliche Klickhöhen
- Voice Count

Ermögliche den Import eigener Audiodateien.

Die Sounds müssen offline verfügbar sein.

## Technische Anforderungen

Kurze, perkussive Sounds sollen vorzugsweise als unkomprimierte Samples oder synthetische Klangereignisse vorliegen.

Importierte Audiodateien sollen vor der Wiedergabe dekodiert und vorbereitet werden.

Vermeide unnötige Latenzen.

Verwende keine urheberrechtlich geschützten Fremdsounds ohne entsprechende Nutzungsrechte.

Die App muss mit selbst erstellten oder rechtmäßig verwendbaren Sounds funktionieren.

---

# 22. VOICE COUNT

Implementiere einen gesprochenen Count-Modus.

Beispiele:

- One, Two, Three, Four
- One and Two and
- One e and a
- Triolische Zählweisen

Ermögliche den Import eigener Sprachaufnahmen.

## Mehrere Variationen

Für jede Zählzeit sollen mehrere verschiedene Sprachsamples hinterlegt werden können.

Beispiel:

Drei oder vier verschiedene Aufnahmen von „One“.

Die App soll zwischen diesen Aufnahmen wechseln können.

Optional:

- Zufällige Auswahl
- Vermeidung unmittelbar identischer Wiederholungen
- Fest definierte Reihenfolge

Die rhythmische Startposition der Aufnahme muss bei allen Variationen korrekt sein.

## Audioformat

Bevorzuge kompakte Formate.

Geeignet sind beispielsweise:

- Opus mit 48–96 kbit/s
- AAC als kompatibler Fallback
- WAV als unkomprimiertes Ausgangsformat
- MP3 für importierte Dateien

Prüfe die tatsächliche Browserunterstützung.

Eine Abtastrate von beispielsweise 48 kHz ist von einer Bitrate von 48–96 kbit/s zu unterscheiden.

Alle Samples müssen offline verfügbar sein.

---

# 23. AUDIOMATRIX

Implementiere ein übersichtliches Mischpult beziehungsweise eine Audiomatrix.

## Primäre Rhythmuskanäle

- Track 1 / äußerer Ring
- Track 2 / innerer Ring

## Zusätzliche Audiokanäle

Soweit aktiviert:

- Voice Count
- Optionale Hilfskanäle
- UI-Sounds

Jeder geeignete Audiokanal besitzt:

- Eigenen Lautstärkeregler
- Eigenes Stereo-Panning
- Mute
- Solo
- Soundauswahl

Zusätzlich existiert ein Master-Lautstärkeregler.

## Wichtig

Die drei hörbaren Klickzustände bleiben unterschiedliche Sounds.

Die Lautstärkeregler verändern den Pegel der Audiokanäle und ersetzen nicht die Klangunterschiede zwischen Doppelakzent, Einfachakzent und Normal.

## Stereo

Das Panorama soll stufenlos einstellbar sein.

Beispiele:

- Track 1 vollständig links
- Track 2 vollständig rechts
- Beide mittig
- Beliebige Zwischenpositionen

Die Audiomatrix muss unbeabsichtigte doppelte Wiedergabe vermeiden, wenn verschiedene Benutzeroberflächen dieselben logischen Rhythmuskanäle steuern.

Bei bewusst gleichzeitig gesetzten Klicks auf beiden Spuren sollen beide Ereignisse hörbar sein.

---

# 24. COUNT-IN UND TRAININGS-TIMER

Implementiere:

- Optionales Count-in
- Einstellbare Anzahl von Einzähltakten
- Stoppuhr
- Countdown
- Automatisches Trainingsende
- Optionale Trainingspausen

Das Count-in darf die eigentliche Trainingsdauer nicht verfälschen.

---

# 25. PRACTICE LOG

Implementiere ein umfangreiches, lokal gespeichertes Übungstagebuch.

## Trainingsdaten

Speichere:

- Datum
- Startzeit
- Endzeit
- Aktive Übungsdauer
- Pausendauer
- Übungsname
- Übungskategorie
- BPM
- BPM-Verlauf bei Tempoänderungen
- Verwendetes Preset
- Trainingsmodus
- Optionale Notizen
- Optional subjektive Bewertung
- Höchstes erreichtes Tempo
- Optional höchstes sauber beherrschtes Tempo

Unterscheide zwischen tatsächlich gemessenen und manuell angegebenen Trainingsinformationen.

Die Anwendung darf nicht ohne entsprechende Messung behaupten, eine Übung sei sauber gespielt worden.

## Kategorien

Vordefinierte Kategorien:

- Rudiments
- Grooves
- Songs
- Patterns
- Technik
- Polyrhythmik
- Timing
- Sonstiges

Eigene Kategorien müssen erstellbar sein.

## Automatisches Logging

Das Logging soll optional automatisch beim Start einer Trainingseinheit beginnen.

Pausen werden separat erfasst.

Der Nutzer kann:

- Einträge bearbeiten
- Notizen hinzufügen
- Kategorien ändern
- Einträge löschen
- Trainingsdaten manuell ergänzen

Das Logging muss deaktiviert werden können.

---

# 26. TRAININGSSTATISTIKEN

Implementiere ein umfangreiches Statistik-Dashboard.

Alle Statistiken müssen auf tatsächlich gespeicherten Trainingsdaten basieren.

## Auswertungen

- Gesamte Trainingszeit
- Trainingsdauer pro Tag
- Trainingsdauer pro Woche
- Trainingsdauer pro Monat
- Trainingshäufigkeit
- Kalender-Heatmap
- Übungszeit pro Kategorie
- Übungszeit pro Übung
- BPM-Fortschritt
- Höchstes erreichtes Tempo
- Höchstes sauber beherrschtes Tempo
- Persönliche Rekorde
- Fortschritt bei Trainingszielen
- Nutzung einzelner Trainingsmodi

## Diagramme

Verwende hochwertige, interaktive Diagramme.

Das Design muss zum LCARS-System passen.

Unterstütze:

- Zeitraumfilter
- Kategorienfilter
- Übungsfilter
- Auswahl einzelner Übungen
- Mobile-optimierte Darstellung

Diagramme sollen übersichtlich und gut lesbar sein.

Keine übertriebenen Animationen.

---

# 27. TRAININGSZIELE

Implementiere persönliche Trainingsziele.

Beispiele:

- Single Stroke Roll bei 180 BPM
- Paradiddle zwei Minuten bei 150 BPM
- Jeden Tag mindestens 20 Minuten üben
- Zehn Stunden Rudiments in einem Monat

Ziele können anhand gespeicherter Daten ausgewertet werden, soweit sie objektiv messbar sind.

Subjektive Kriterien wie „sauber gespielt“ müssen vom Nutzer bestätigt oder durch eine später implementierte Timing-Analyse ermittelt werden.

---

# 28. PRACTICE ROUTINE BUILDER

Implementiere einen Editor für komplette Übungsabläufe.

Beispiel:

1. Single Strokes, 5 Minuten
2. Double Strokes, 5 Minuten
3. Paradiddles, 10 Minuten
4. Gap Click, 5 Minuten
5. Polyrhythmik, 5 Minuten

Jeder Abschnitt besitzt eigene Metronomeinstellungen.

Die App kann automatisch zwischen den Abschnitten wechseln.

Unterstütze:

- Count-in
- Pausen
- Automatische Wechsel
- Akustische Hinweise
- Wiederholungen
- Speichern der Routinen

Die Trainingsdaten sollen korrekt protokolliert werden.

---

# 29. PRESET-VERWALTUNG

Implementiere ein vollständiges Preset-System.

Ein Preset kann enthalten:

- BPM
- Beat-Anzahl
- Subdivision-Anzahl
- Rhythmuspatterns
- Vier Klickzustände pro Punkt
- Sounds
- Lautstärken
- Stereo-Panning
- Trainingsmodus
- Modusspezifische Einstellungen
- Count-in
- Swing
- Tempo Ramp

Presets müssen:

- Erstellt
- Benannt
- Gespeichert
- Bearbeitet
- Dupliziert
- Gelöscht
- Importiert
- Exportiert

werden können.

---

# 30. LCARS-DESIGN

Die App erhält ein eigenständiges Design, das deutlich an das LCARS-System aus Star Trek: Voyager erinnert.

## Farben

Bevorzugte Palette:

- Schwarz
- Dunkles Anthrazit
- Orange
- Lachsfarben
- Beige
- Violett
- Gedämpftes Rosa

Farben sollen funktionale Bedeutung besitzen.

## Formen

- Typische LCARS-Rundungen
- Abgerundete Panels
- Farbige Menüsegmente
- Klare Trennflächen
- Technische Beschriftungen
- Große, gut erkennbare Bedienelemente

## WICHTIGE DESIGNKORREKTUR

Das erste generierte LCARS-Konzeptbild war grundsätzlich gelungen, jedoch zu dicht und teilweise zu stark schattiert.

Die endgültige Anwendung soll:

- Flacher gestaltet sein
- Größere Abstände besitzen
- Ruhiger wirken
- Weniger starke Glows verwenden
- Keine übertriebenen 3D-Effekte enthalten
- Weniger dekorative Elemente verwenden
- Den Circular Sequencer stärker in den Mittelpunkt stellen

Bevorzuge modernes Flat Design mit LCARS-typischer Formsprache.

Die App soll wie ein hochwertiges Instrument wirken, nicht wie ein überladenes Science-Fiction-Dashboard.

---

# 31. NAVIGATION UND MENÜSYSTEM

Die wichtigsten Funktionen müssen direkt erreichbar sein.

## Hauptbildschirm

Enthält:

- Circular Sequencer
- Große BPM-Anzeige
- BPM-Steuerung
- Start/Stopp
- Tap Tempo
- Beat-Anzahl
- Subdivision-Anzahl
- Aktuellen Trainingsmodus
- Zugriff auf weitere Funktionen

## Hauptmenüs

- METRONOME
- RHYTHM
- TRAINING
- AUDIO
- PRESETS
- PRACTICE LOG
- ANALYTICS
- SETTINGS

## Untermenüs

Erweiterte Funktionen befinden sich in logisch gegliederten Untermenüs.

Diese sollen durch LCARS-typische seitliche Register oder farbige Menüsegmente sichtbar angedeutet werden.

Die Existenz zusätzlicher Funktionen muss erkennbar bleiben, ohne den Bildschirm zu überladen.

Auf dem Desktop dürfen mehrere Panels gleichzeitig sichtbar sein.

Auf dem iPhone sollen sie platzsparend geöffnet werden können.

Der Circular Sequencer soll möglichst häufig sichtbar bleiben.

Menüwechsel dürfen die Audiowiedergabe nicht unterbrechen.

---

# 32. RESPONSIVE DESIGN

Die Anwendung muss mobile-first entwickelt werden.

Besonders wichtig ist die Bedienung auf dem iPhone 13.

## Anforderungen

- Hochformat
- Querformat
- Safe-Area-Unterstützung
- Große Touchflächen
- Ergonomische Positionierung
- Keine winzigen Buttons
- Klare Typografie
- Gut lesbare Zahlen
- Keine unnötigen Scrollvorgänge
- Keine horizontal überlaufenden Panels
- Dynamische Anpassung des Circular Sequencers

Auf Desktop-Geräten soll der zusätzliche Platz sinnvoll genutzt werden.

Der Circular Sequencer darf nicht durch unnötige Panels verdrängt werden.

---

# 33. UI-SOUNDS

Implementiere LCARS-inspirierte Sounds.

## Soundtypen

- Hover
- Button Press
- Bestätigung
- Warnung
- Menüwechsel

Die Sounds sollen hochwertig, dezent und futuristisch sein.

## Maus

- Hover-Effekt
- Optionaler Hover-Sound
- Klick-Feedback

## Touch

- Press-Effekt
- Klick-Sound
- Optional haptisches Feedback, wenn technisch unterstützt

Die UI-Sounds sollen nicht aufdringlich sein.

Implementiere:

- Separaten Lautstärkeregler
- Mute
- Optional vollständige Deaktivierung

Die UI-Sounds dürfen die Präzision der Metronom-Engine nicht beeinträchtigen.

Verwende ausschließlich eigene oder rechtmäßig nutzbare Audiodateien.

---

# 34. DATENSPEICHERUNG

Verwende IndexedDB.

## Zu speichernde Informationen

- Trainingslogs
- Einstellungen
- Presets
- Trainingsroutinen
- Kategorien
- Trainingsziele
- Benutzerdefinierte Patterns
- Importierte Sounds
- Voice-Count-Samples

Die Datenstruktur muss versioniert sein.

Implementiere migrationsfähige Datenschemata.

Fordere persistente Speicherung an, soweit der Browser dies unterstützt.

Die Anwendung soll über den tatsächlichen Speicherstatus informieren können.

Weise darauf hin, dass auch persistente Browserdaten unter bestimmten Umständen verloren gehen können.

---

# 35. BACKUP UND RESTORE

Implementiere eine vollständige manuelle Backupfunktion.

## JSON-Export

Erstelle ein vollständiges, portables Backup.

Das Backup soll enthalten:

- Trainingsdaten
- Presets
- Routinen
- Kategorien
- Ziele
- Einstellungen
- Eigene Rhythmuspatterns
- Importierte Audiodateien
- Voice-Count-Samples

Binäre Audiodaten können in einem geeigneten transportierbaren Format eingebettet werden.

Berücksichtige die dadurch entstehende Dateigröße.

## JSON-Import

Implementiere:

- Validierung
- Versionsprüfung
- Vorschau
- Fehlerbehandlung
- Zusammenführen
- Vollständiges Ersetzen
- Schutz vor versehentlichem Datenverlust

Ein fehlerhafter Import darf bestehende Daten nicht beschädigen.

## CSV-Export

Ermögliche den Export der Trainingslogs in einem Format, das von Excel und anderen Tabellenprogrammen gelesen werden kann.

Verwende eine geeignete UTF-8-Codierung und einen nachvollziehbaren Spaltenaufbau.

## Datumsformat

Benutzeroberfläche:

- DD.MM.YYYY
- 24-Stunden-Uhr

Keine amerikanischen Datumsformate und keine AM/PM-Anzeige.

Intern dürfen ISO-8601-Zeitstempel verwendet werden.

---

# 36. PWA UND OFFLINEBETRIEB

Die Anwendung muss als PWA installierbar sein.

Implementiere:

- Web App Manifest
- Geeignete App-Icons
- Service Worker
- Versionierte Caches
- Offlinefähige Ressourcen
- Update-Strategie
- Lokale Datenhaltung

GitHub Pages muss unterstützt werden.

Berücksichtige ausdrücklich den Repository-Unterpfad.

Ein App-Update darf die laufende Wiedergabe nicht unkontrolliert unterbrechen und keine Nutzerdaten löschen.

---

# 37. OPTIONALE SPÄTERE ERWEITERUNG

Die Architektur soll eine spätere Timing-Analyse ermöglichen.

Mögliche Funktionen:

- Schlag-Erkennung über Mikrofon
- MIDI-Eingabe
- Timing-Abweichungen in Millisekunden
- Vor beziehungsweise hinter dem Beat
- Timingverteilung
- Statistische Timinggenauigkeit

Diese Funktionen gehören nicht zwingend zur ersten vollständigen Version.

Sie dürfen die Entwicklung der Kernfunktionen nicht verzögern.

---

# 38. ENTWICKLUNGSREIHENFOLGE

Entwickle die Anwendung in funktionsfähigen Etappen.

## Phase 1: Fundament

- Projektstruktur
- TypeScript-Konfiguration
- PWA-Grundkonfiguration
- IndexedDB-Datenmodell
- Web Audio Engine
- Scheduler
- BPM-Steuerung
- Viertelbasierte Rhythmuslogik
- Unterteilungen von 1 bis 20
- Vier Klickzustände
- Start/Stopp
- Count-in
- Grundlegender Backup-Export

Teste die Audio-Engine möglichst früh auf dem iPhone.

## Phase 2: Circular Sequencer

- Äußerer Kreis
- Innerer Kreis
- BPM-Mittelkreis
- Drehgesten
- Tap-Steuerung
- Vier Soundzustände
- Synchronisierte Visualisierung
- Lineare Alternativansicht

## Phase 3: LCARS-Interface

- Designsystem
- Hauptnavigation
- Untermenüs
- Responsive Layout
- Touch-Optimierung
- UI-Sounds
- Desktop-Optimierung

## Phase 4: Erweiterte Rhythmik

- Polyrhythmik
- Polymetrik
- Dual Rhythm Sequencer
- Gap Click
- Random Gap
- Offbeat
- Beat Displacement
- Tempo Ramp
- Swing
- Paradiddle Trainer
- Freier Rhythmus-Editor

## Phase 5: Soundverwaltung

- Soundbibliothek
- Import eigener Sounds
- Voice Count
- Mehrere Sprachvariationen
- Audiomatrix
- Stereo-Panning
- Mute/Solo

## Phase 6: Training

- Practice Log
- Kategorien
- Presets
- Trainingsziele
- Routine Builder
- Statistiken
- Diagramme

## Phase 7: Datensicherung

- Vollständige JSON-Backups
- JSON-Import
- CSV-Export
- Import eigener Audiodateien in Backups
- Datenmigrationen
- Persistenzprüfung

## Phase 8: Qualitätssicherung

- Audiotiming
- Polyrhythmik
- Polymetrik
- Lange Übungseinheiten
- Tempoänderungen
- Drehgesten
- iPhone-Tests
- Firefox-Tests
- Offline-Tests
- Backup-/Restore-Tests
- Responsive Optimierung
- Fehlerbehebung

---

# 39. VERBINDLICHE TESTANFORDERUNGEN

Implementiere automatisierte Tests, soweit sinnvoll.

Besonders wichtig:

## Rhythmustests

- 4 Viertel mit 1 Unterteilung
- 4 Viertel mit 3 Unterteilungen
- 4 Viertel mit 6 Unterteilungen
- 5 Viertel mit 7 Unterteilungen
- 7 Viertel mit 9 Unterteilungen
- 20 Viertel mit 20 Unterteilungen
- Korrekte Taktübergänge
- Korrekte Beatwechsel

## Polyrhythmik

- 3:2
- 4:3
- 5:4
- 7:4

## Polymetrik

- 3 gegen 4
- Unterschiedliche Patternlängen
- Korrektes Wiederzusammentreffen der Zyklen

## Audio

- Gleichzeitige Ereignisse beider Rhythmuskanäle
- Mute/Solo
- Stereo-Panning
- Tempoänderungen
- Gap Click
- Keine unbeabsichtigten Doppeltrigger

## Interaktion

- Tap auf einen Punkt
- Drehung eines Rings
- Wechsel zwischen Tippen und Drehen
- Änderung der Punktanzahl
- Bedienung mit 20 Punkten
- Schneller Richtungswechsel beim Drehen

## Datenspeicherung

- App-Neustart
- Offline-Neustart
- JSON-Export
- JSON-Import
- Wiederherstellung eigener Sounds
- Wiederherstellung von Presets
- Datenmigrationen

## Darstellung

- iPhone-Hochformat
- iPhone-Querformat
- Desktop
- Kleine Displays
- Große Displays

---

# 40. WICHTIGE ENTWICKLUNGSREGELN

1. Entwickle keine rein dekorativen Funktionen, die tatsächlich nichts tun.
2. Verwende keine fragilen Timer für die Audiowiedergabe.
3. Erhalte die musikalische Logik des Standardmodus konsequent.
4. Trenne Standardmetronom, Polyrhythmik und Polymetrik logisch.
5. Verwende zwei unabhängige Audiokanäle für die beiden Kreisringe.
6. Behandle Doppelakzent und Einfachakzent als unterschiedliche Sounds, nicht als Lautstärkepegel.
7. Halte die Bedienung der Kreise so intuitiv wie möglich.
8. Überlade den Hauptbildschirm nicht.
9. Verwende flaches, großzügiges LCARS-Design.
10. Berücksichtige iOS-Besonderheiten.
11. Speichere alle Nutzerdaten lokal und exportierbar.
12. Behaupte keine Funktionalität, die noch nicht implementiert oder getestet wurde.
13. Dokumentiere technische Einschränkungen transparent.
14. Halte den Code modular.
15. Sorge dafür, dass der Nutzer die App langfristig unabhängig von externen Diensten betreiben kann.

---

# 41. ARBEITSWEISE

Beginne nicht damit, sofort Tausende Zeilen ungeprüften Codes zu erzeugen.

Arbeite strukturiert.

## Schritt 1

Leite aus dieser Spezifikation eine konkrete Projektarchitektur und einen Implementierungsplan ab.

Definiere die wichtigsten Datenmodelle, insbesondere für:

- Beats
- Subdivisionen
- Rhythmusereignisse
- Klickzustände
- Rhythmuskanäle
- Audio-Scheduling
- Trainingsmodi
- Presets
- Trainingslogs

## Schritt 2

Entwickle einen funktionierenden Audio-Prototypen.

Dieser muss bereits die grundlegende Viertel-/Subdivision-Logik und die vier Klickzustände korrekt abspielen.

## Schritt 3

Entwickle den Circular Sequencer mit vollständiger Touch-Steuerung.

## Schritt 4

Implementiere das LCARS-Designsystem.

## Schritt 5

Erweitere die Anwendung schrittweise um die übrigen Funktionen.

Halte nach jeder Phase fest:

- Was tatsächlich implementiert wurde
- Was getestet wurde
- Welche Einschränkungen bestehen
- Welche Funktionen noch fehlen

Bei notwendigen Architekturentscheidungen darfst du eigenständig sinnvolle Lösungen wählen.

Frage nur nach, wenn eine Entscheidung wesentliche Auswirkungen auf das gewünschte Bedienkonzept oder die musikalische Funktion hat.

---

# 42. FINALES PROJEKTZIEL

Das fertige LCARS METRONOME soll ein professionelles Metronom und Rhythmustrainingssystem sein, das:

- Präzise läuft
- Auf dem iPhone hervorragend bedienbar ist
- Auf Desktop-Browsern funktioniert
- Vollständig offline genutzt werden kann
- Keine Accounts benötigt
- Komplexe rhythmische Übungen ermöglicht
- Beliebige gleichmäßige Unterteilungen von 1 bis 20 unterstützt
- Polyrhythmik und Polymetrik beherrscht
- Individuelle Sounds und Stereo-Panning ermöglicht
- Trainingsdaten zuverlässig dokumentiert
- Fortschritte übersichtlich visualisiert
- Vollständig exportierbare Daten verwendet
- Ein hochwertiges, ruhiges LCARS-Interface besitzt

Die gesamte Anwendung soll intuitiv funktionieren und sich wie ein professionelles Musikinstrument bedienen lassen.

Der zentrale Gedanke lautet:

**Maximale rhythmische Flexibilität bei minimaler Bedienkomplexität.**

Das kreisförmige Interface ist dabei das wichtigste Werkzeug.

Die erweiterten Trainingsfunktionen sollen umfangreich sein, ohne die Grundbedienung unnötig zu verkomplizieren.

**Beginne jetzt mit der technischen Planung und anschließend der tatsächlichen Implementierung dieser Anwendung.**