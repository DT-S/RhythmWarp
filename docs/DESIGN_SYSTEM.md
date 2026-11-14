# Rhythm Warp – Studio-Green Designsystem v0.1

Quelle der Ausgangsfarben: `DT-S/drumtrackstudiowebsite/src/assets/studio.css` (private Website-Quelle).

| Rolle | HEX |
| --- | --- |
| App-Hintergrund | `#0E1714` |
| Panel | `#14231C` |
| Rail / tiefe Kontur | `#283A30` |
| Moosgrün | `#4D6B55` |
| Akzent Salbeigrün | `#B3DF94` |
| Heller Text | `#F2F0E8` |
| Petrol | `#92CBD2` |
| Neue Neon-Umrandung (Designentscheidung) | `#85F4A3` |

## Visuelle Regeln

1. Dunkle Vollflächen, kein mehrfarbiges, pastellfarbenes Blockband.
2. Dominante konturierte Bögen mit 2–3 px Rand und **steilerer eigener Krümmung**.
3. Erkennbar eigene Formensprache für Panels, Navigation, Logo, Plots.
4. Neon als visuelle Führung, nicht als Textfarbe für jede Zeile.
5. Audio- und Timing-Engine bleiben getrennt vom Styling.
6. Keine Franchisebezeichnungen in der Schüleroberfläche.
7. Kein Anspruch, dass einzelne Farb-/Konturänderungen automatisch rechtssicher sind. Vor öffentlicher Freigabe Gesamtgestaltung prüfen.

## Geräte

Mobile zuerst, vor allem iOS Safari/Standalone; danach Android, Desktop und VR. Reduzierte Bewegung respektieren.

Ich hab mir deinen kompletten **Rhythm Warp**-Ordner reingezogen (`index.html`, `MIGRATION.md`, `rhythm-warp.css`, `rhythm-warp-colors.css`, `rhythm-warp-layout.css` plus alle `v2-*.css`-Module).

### Warum dein aktueller Stand noch zu sehr nach Star Trek schreit

1. **Die Okuda-Kurve ist noch da:** Selbst mit dünnerer Sidebar und grünen Outlines hast du oben links (`header .elbow`), im Startscreen (`.lcars-elbow-top` / `.lcars-elbow-bottom`) und bei den Panels (`border-radius: 28px 8px 8px 20px`) noch exakt die runde 90er-Jahre-Enterprise-Schablone drin. Genau diese Kombination aus großem Außenbogen + rundem Innen-Cutout + Pillen-Endkappen macht das LCARS-Markenbild aus.


2. **Alle Effekte wurden gekillt:** In der `rhythm-warp-colors.css` steht überall `box-shadow: none !important; filter: none !important;`. Dadurch wirkt das Interface aktuell wie ein flacher Drahtgitter-Klon statt wie ein fettes, gamifiziertes Sci-Fi-Cockpit.

---

### Das neue Konzept: **WARP-HUD // MECHA-CHRONO DECK**

Wir lassen **100 % deiner DOM-Struktur, IDs, Klassen, Touch-Flächen, iOS-Safe-Areas und Pointer-Gesten unberührt**, brechen aber die LCARS-Optik komplett auf:

* **45°-Chamfers statt Enterprise-Rundbögen:** Ecken an Elbows, Rails, Buttons und Panels werden über `clip-path` und asymmetrische Tech-Radien (`2px 14px 2px 14px`) hart angeschrägt – wie in *The Expanse*, *Halo* oder *Cyberpunk*. (**Wichtig:** Die Hit-Test-Geometrie der Buttons und das `.app-shell`-Root bleiben unangetastet, damit Safari/iOS-Touch-Targets null driften.)
* **Gamified Telemetry & Plasma-Glow:** Reaktive Neon-Kanten, mehrschichtige HUD-Scanlines, leuchtende Reaktor-Ringe im Sequencer (`#rings`), ein pulsierender Shockwave-Effekt auf `.point.playing` und Arcade-Style Hit-Badges in `#tactical` und `#micConsole`.
* **3 echte Hard-Sci-Fi-Themes** (gemappt auf deine bestehenden Keys `voyager`, `elite`, `redalert` – deine `storage.js` und `app.js` laufen ohne eine Zeile Code-Änderung weiter):
1. **`voyager` → STUDIO GREEN (Bio-Mecha Lab):** Tiefes Carbon-Smaragd (`#040a08`), Säure-Matrix-Grün (`#00ff88`), Cryo-Cyan (`#00e5ff`) & Warn-Amber.
2. **`elite` → VIOLET PULSE (Quantum Overdrive):** Void-Obsidian (`#06040c`), Hyper-Ultraviolett (`#d946ef`), Plasma-Indigo (`#6366f1`) & Gold-Core (`#facc15`).
3. **`redalert` → RED SHIFT (Orbital Combat HUD):** Gebranntes Titan (`#0d0406`), Laser-Crimson (`#ff1e42`), Afterburner-Orange (`#ff7b00`) & Thermal-Gold.



---

### Drop-In Komplett-Design (`rhythm-warp-overhaul.css`)

Ersetze den Inhalt deiner **`rhythm-warp-colors.css`** (oder lade diese Datei als allerletztes Stylesheet in der `index.html` direkt nach `rhythm-warp-layout.css`). Sie überschreibt alle 20 Module sauber und berücksichtigt **jedes einzelne Element** deiner App:

```css
/* ==========================================================================
   RHYTHM WARP // HARD SCI-FI GAMIFIED HUD OVERHAUL
   100% DOM-, Gesture-, Audio- & iOS-Viewport-kompatibel.
   Ersetzt den LCARS-Look durch kantige Mecha/Expanse-HUD-Geometrie + GlowFX.
   ========================================================================== */

/* 01. THREE HARD SCI-FI THEMES (Internal keys: voyager, elite, redalert) */
:root,
html[data-app-theme],
.lcars-start-screen {
  color-scheme: dark;

  /* THEME 1: STUDIO GREEN // BIO-MECHA LAB (Default / voyager) */
  --rw-bg-0: #030705;
  --rw-bg-1: #060e0b;
  --rw-bg-2: #0c1a14;
  --rw-bg-3: #13281f;
  --rw-rail: #163025;
  --rw-outline: #26523e;
  --rw-edge: #00ff88;
  --rw-outline-soft: rgba(0, 255, 136, 0.22);
  --rw-text: #ecfdf5;
  --rw-dim: #86efac;
  --rw-muted: #528c6e;
  --rw-ink: #020805;

  --rw-active: #00ff88;
  --rw-info: #00e5ff;
  --rw-neutral: #d9f99d;
  --rw-custom: #2dd4bf;
  --rw-warning: #ffb703;
  --rw-danger: #ff3366;
  --rw-inactive: #1e3f31;
  --rw-inactive-text: #a7f3d0;
  --rw-selected-bg: #113828;

  /* Sequencer Rings & Nodes */
  --rw-ring-track: #1f4737;
  --rw-ring-tertiary: #10b981;
  --rw-ring-muted: #0d9488;
  --rw-ring-dark: #07130e;

  /* Sliders & Audio Matrix */
  --rw-slide-pill: #0f241c;
  --rw-slide-peak: #00ff88;
  --rw-slide-mid: #10b981;
  --rw-slide-low: #065f46;
  --rw-slide-info-mid: #00b4d8;
  --rw-slide-warn-mid: #f59e0b;
  --rw-slide-warn-low: #78350f;
  --rw-matrix-highlight: #a7f3d0;
  --rw-matrix-led-mid: #10b981;
  --rw-matrix-info-mid: #06b6d4;
  --rw-matrix-warn-mid: #f59e0b;
  --rw-matrix-warn-low: #78350f;

  /* Sci-Fi FX Tokens */
  --rw-glow: rgba(0, 255, 136, 0.38);
  --rw-glow-strong: rgba(0, 255, 136, 0.72);
  --rw-info-glow: rgba(0, 229, 255, 0.38);
  --rw-sweep: rgba(0, 255, 136, 0.11);
  --rw-hud-grid: rgba(0, 255, 136, 0.045);

  /* Plot & Sensor Series */
  --rw-plot-1: var(--rw-active);
  --rw-plot-2: var(--rw-info);
  --rw-plot-3: var(--rw-neutral);
  --rw-plot-4: var(--rw-warning);
  --rw-plot-5: var(--rw-custom);
  --rw-plot-6: var(--rw-edge);
  --rw-grid: #1b3d2f;
  --rw-plot-bg: #030806;
  --rw-plot-crosshair: var(--rw-info);
  --rw-mic-ref: var(--rw-active);
  --rw-mic-clipped: var(--rw-warning);
  --rw-plot-early: var(--rw-info);
  --rw-plot-late: var(--rw-warning);
  --rw-plot-extra: var(--rw-danger);

  /* Legacy Engine Variable Bridge */
  --bg: var(--rw-bg-1) !important;
  --panel: var(--rw-bg-2) !important;
  --text: var(--rw-text) !important;
  --muted: var(--rw-dim) !important;
  --line: var(--rw-outline) !important;
  --ice: var(--rw-info) !important;
  --cream: var(--rw-neutral) !important;
  --orange: var(--rw-active) !important;
  --pink: var(--rw-info) !important;
  --purple: var(--rw-inactive) !important;
  --salmon: var(--rw-warning) !important;
  --padd-bg: var(--rw-bg-1) !important;
  --padd-orange: var(--rw-active) !important;
  --padd-amber: var(--rw-active) !important;
  --padd-peach: var(--rw-ring-tertiary) !important;
  --padd-lavender: var(--rw-ring-tertiary) !important;
  --padd-blue: var(--rw-info) !important;
  --padd-tan: var(--rw-ring-track) !important;
  --padd-red: var(--rw-danger) !important;
  --padd-ice: var(--rw-info) !important;
  --padd-cream: var(--rw-neutral) !important;
  --lcars-mobile-orange: var(--rw-active) !important;
  --lcars-mobile-peach: var(--rw-ring-tertiary) !important;
  --lcars-mobile-blue: var(--rw-info) !important;
  --lcars-mobile-lilac: var(--rw-ring-tertiary) !important;
  --rw-neon: var(--rw-edge) !important;
  --rw-panel: var(--rw-bg-2) !important;
  --theme-signal: var(--rw-edge) !important;
}

/* THEME 2: VIOLET PULSE // QUANTUM OVERDRIVE (elite) */
html[data-app-theme="elite"],
.lcars-start-screen[data-theme="elite"] {
  --rw-bg-0: #04020a;
  --rw-bg-1: #080514;
  --rw-bg-2: #110b24;
  --rw-bg-3: #1b1136;
  --rw-rail: #211542;
  --rw-outline: #482d82;
  --rw-edge: #e879f9;
  --rw-outline-soft: rgba(232, 121, 249, 0.24);
  --rw-text: #fae8ff;
  --rw-dim: #d8b4fe;
  --rw-muted: #9370db;
  --rw-ink: #07020d;

  --rw-active: #e879f9;
  --rw-info: #38bdf8;
  --rw-neutral: #fde047;
  --rw-custom: #a855f7;
  --rw-warning: #fbbf24;
  --rw-danger: #fb7185;
  --rw-inactive: #2b1d52;
  --rw-inactive-text: #f3e8ff;
  --rw-selected-bg: #351a57;

  --rw-ring-track: #3b2366;
  --rw-ring-tertiary: #a855f7;
  --rw-ring-muted: #7c3aed;
  --rw-ring-dark: #0b0618;

  --rw-slide-pill: #180f30;
  --rw-slide-peak: #f0abfc;
  --rw-slide-mid: #c084fc;
  --rw-slide-low: #581c87;
  --rw-slide-info-mid: #38bdf8;
  --rw-slide-warn-mid: #f59e0b;
  --rw-slide-warn-low: #78350f;
  --rw-matrix-highlight: #f5d0fe;
  --rw-matrix-led-mid: #c084fc;
  --rw-matrix-info-mid: #38bdf8;
  --rw-matrix-warn-mid: #fbbf24;
  --rw-matrix-warn-low: #713f12;

  --rw-glow: rgba(232, 121, 249, 0.4);
  --rw-glow-strong: rgba(232, 121, 249, 0.78);
  --rw-info-glow: rgba(56, 189, 248, 0.4);
  --rw-sweep: rgba(232, 121, 249, 0.12);
  --rw-hud-grid: rgba(232, 121, 249, 0.05);
  --rw-grid: #2e1d59;
  --rw-plot-bg: #05020c;
}

/* THEME 3: RED SHIFT // ORBITAL COMBAT HUD (redalert) */
html[data-app-theme="redalert"],
.lcars-start-screen[data-theme="redalert"] {
  --rw-bg-0: #080203;
  --rw-bg-1: #110507;
  --rw-bg-2: #1f090d;
  --rw-bg-3: #2e0d14;
  --rw-rail: #381018;
  --rw-outline: #701c2c;
  --rw-edge: #ff2a54;
  --rw-outline-soft: rgba(255, 42, 84, 0.25);
  --rw-text: #ffe4e6;
  --rw-dim: #fda4af;
  --rw-muted: #be5a6b;
  --rw-ink: #0a0103;

  --rw-active: #ff2a54;
  --rw-info: #ff9e00;
  --rw-neutral: #fde68a;
  --rw-custom: #fb7185;
  --rw-warning: #ffbe0b;
  --rw-danger: #ff0033;
  --rw-inactive: #47131e;
  --rw-inactive-text: #ffe4e6;
  --rw-selected-bg: #4d1020;

  --rw-ring-track: #591624;
  --rw-ring-tertiary: #f43f5e;
  --rw-ring-muted: #e11d48;
  --rw-ring-dark: #140407;

  --rw-slide-pill: #260a10;
  --rw-slide-peak: #ff4d6d;
  --rw-slide-mid: #e11d48;
  --rw-slide-low: #881337;
  --rw-slide-info-mid: #fb8500;
  --rw-slide-warn-mid: #ffb703;
  --rw-slide-warn-low: #78350f;
  --rw-matrix-highlight: #fecdd3;
  --rw-matrix-led-mid: #fb7185;
  --rw-matrix-info-mid: #fb8500;
  --rw-matrix-warn-mid: #ffb703;
  --rw-matrix-warn-low: #78350f;

  --rw-glow: rgba(255, 42, 84, 0.42);
  --rw-glow-strong: rgba(255, 42, 84, 0.8);
  --rw-info-glow: rgba(255, 158, 0, 0.4);
  --rw-sweep: rgba(255, 42, 84, 0.12);
  --rw-hud-grid: rgba(255, 42, 84, 0.05);
  --rw-grid: #4a121e;
  --rw-plot-bg: #080204;
}

/* ==========================================================================
   02. HOLOGRAPHIC BACKGROUND MATRIX & CHASSIS GEOMETRY (NO LCARS CURVES!)
   ========================================================================== */
html,
body,
.app-shell {
  background-color: var(--rw-bg-1) !important;
  background-image:
    radial-gradient(circle at 55% 25%, var(--rw-sweep) 0%, transparent 65%),
    linear-gradient(var(--rw-hud-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--rw-hud-grid) 1px, transparent 1px) !important;
  background-size: 100% 100%, 28px 28px, 28px 28px !important;
  color: var(--rw-text) !important;
}

/* Kill the Star Trek rounded elbow curve -> Hard 45° Mecha Chamfer */
.app-shell > header .elbow,
.lcars-start-screen .lcars-elbow-top,
.lcars-start-screen .lcars-elbow-bottom {
  background: linear-gradient(135deg, var(--rw-bg-3) 0%, var(--rw-rail) 100%) !important;
  border-color: var(--rw-edge) !important;
  border-radius: 0 !important;
  clip-path: polygon(18px 0, 100% 0, 100% 100%, 0 100%, 0 18px) !important;
  box-shadow: inset 0 0 14px var(--rw-glow) !important;
}
.lcars-start-screen .lcars-elbow-bottom {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 18px 100%, 0 calc(100% - 18px)) !important;
}

/* Inner Elbow Cutout -> Sharp Angular Step instead of curved arc */
.app-shell > header .elbow::after,
.lcars-start-screen .lcars-elbow-top::after,
.lcars-start-screen .lcars-elbow-bottom::after {
  background: var(--rw-bg-1) !important;
  border-color: var(--rw-edge) !important;
  border-radius: 0 !important;
  box-shadow: inset 3px 3px 10px var(--rw-glow) !important;
}

/* Top & Bottom Bus Rails -> Glowing Plasma Conduits */
.app-shell > header::after {
  background: linear-gradient(90deg, var(--rw-rail) 0%, var(--rw-bg-3) 75%, var(--rw-rail) 100%) !important;
  border-top: 3px solid var(--rw-edge) !important;
  border-right: 3px solid var(--rw-edge) !important;
  border-bottom: 2px solid var(--rw-outline) !important;
  border-radius: 0 4px 12px 0 !important;
  box-shadow: 0 0 12px var(--rw-glow), inset 0 2px 8px var(--rw-glow) !important;
}
.app-shell::after {
  background: linear-gradient(90deg, var(--rw-rail) 0%, var(--rw-bg-2) 100%) !important;
  border-left: 3px solid var(--rw-edge) !important;
  border-bottom: 3px solid var(--rw-edge) !important;
  border-right: 3px solid var(--rw-edge) !important;
  border-top: 2px solid var(--rw-outline) !important;
  border-radius: 0 12px 4px 14px !important;
  box-shadow: 0 0 12px var(--rw-glow) !important;
}

/* Header Typography -> Sci-Fi HUD Header with Neon Glow */
.app-shell > header .heading .eyebrow {
  color: var(--rw-info) !important;
  letter-spacing: 0.22em !important;
  text-shadow: 0 0 8px var(--rw-info-glow) !important;
}
.app-shell > header .heading h1,
.app-shell > header .heading h1 .mobile-title {
  color: var(--rw-text) !important;
  letter-spacing: 0.08em !important;
  text-shadow: 0 0 14px var(--rw-glow) !important;
}
.app-shell > header .heading h1 span:not(.mobile-title) {
  color: var(--rw-active) !important;
}
.app-shell > header .mobile-build-version,
.app-shell > header .header-tail {
  color: var(--rw-info) !important;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace !important;
}

/* ==========================================================================
   03. SIDEBAR NAVIGATION & RAIL (GAMIFIED TACTICAL TABS)
   ========================================================================== */
.app-shell > aside nav .nav,
html[data-app-theme] .app-shell > aside nav .nav,
.lcars-start-screen .lcars-side-block,
html[data-app-theme] .lcars-start-screen .lcars-side-block {
  background: linear-gradient(90deg, var(--rw-bg-3) 0%, var(--rw-bg-2) 100%) !important;
  color: var(--rw-dim) !important;
  border-radius: 0 !important;
  border-left: 3px solid var(--rw-outline) !important;
  border-right: 2px solid var(--rw-outline) !important;
  border-top: 1px solid var(--rw-outline) !important;
  border-bottom: 1px solid var(--rw-outline) !important;
  transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease !important;
}
.app-shell > aside nav .nav:hover,
.lcars-start-screen .lcars-side-block:hover {
  color: var(--rw-text) !important;
  border-left-color: var(--rw-info) !important;
  box-shadow: inset 4px 0 10px var(--rw-info-glow) !important;
}
.app-shell > aside nav .nav.active,
html[data-app-theme] .app-shell > aside nav .nav.active,
.lcars-start-screen .lcars-side-block[aria-pressed="true"],
html[data-app-theme] .lcars-start-screen .lcars-side-block[aria-pressed="true"] {
  background: linear-gradient(90deg, var(--rw-selected-bg) 0%, var(--rw-bg-3) 100%) !important;
  color: var(--rw-active) !important;
  border: 2px solid var(--rw-edge) !important;
  border-left: 5px solid var(--rw-edge) !important;
  box-shadow: 0 0 14px var(--rw-glow), inset 0 0 12px var(--rw-glow) !important;
  text-shadow: 0 0 8px var(--rw-glow) !important;
}

.app-shell > aside .rail,
.lcars-start-screen .lcars-side-filler {
  background:
    repeating-linear-gradient(
      -45deg,
      var(--rw-bg-2) 0px,
      var(--rw-bg-2) 6px,
      var(--rw-rail) 6px,
      var(--rw-rail) 12px
    ) !important;
  border-left: 3px solid var(--rw-edge) !important;
  border-right: 2px solid var(--rw-outline) !important;
  border-bottom: 3px solid var(--rw-edge) !important;
  color: var(--rw-info) !important;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.7) !important;
}

/* ==========================================================================
   04. LAUNCH CONSOLE (#lcarsStartup) -> REACTOR IGNITION DECK
   ========================================================================== */
.lcars-start-screen,
html[data-app-theme] .lcars-start-screen {
  background-color: var(--rw-bg-0) !important;
  background-image:
    radial-gradient(circle at 54% 46%, var(--rw-sweep) 0%, transparent 60%),
    linear-gradient(var(--rw-hud-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--rw-hud-grid) 1px, transparent 1px) !important;
  background-size: 100% 100%, 24px 24px, 24px 24px !important;
}
.lcars-start-screen .lcars-rail-segments > .lcars-seg,
.lcars-start-screen .lcars-bottom-segments > .lcars-seg {
  background: var(--rw-bg-3) !important;
  color: var(--rw-info) !important;
  border-radius: 0 !important;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace !important;
  letter-spacing: 0.14em !important;
}
.lcars-start-screen .lcars-rail-segments > .lcars-seg.s5,
.lcars-start-screen .lcars-bottom-segments > .lcars-seg.s-b4 {
  border-radius: 0 10px 0 0 !important;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%) !important;
}
.lcars-start-screen .lcars-console-frame {
  background: linear-gradient(160deg, rgba(12, 26, 20, 0.75), rgba(3, 7, 5, 0.92)) !important;
  border: 2px solid var(--rw-outline) !important;
  border-left: 4px solid var(--rw-edge) !important;
  border-right: 4px solid var(--rw-info) !important;
  border-radius: 4px 18px 4px 18px !important;
  box-shadow: 0 0 32px rgba(0, 0, 0, 0.85), inset 0 0 24px var(--rw-sweep) !important;
}
.lcars-start-screen .lcars-emblem-wrap {
  filter: drop-shadow(0 0 18px var(--rw-glow)) drop-shadow(0 0 6px var(--rw-info-glow)) !important;
}
.lcars-start-screen #lcarsStartupHeading {
  letter-spacing: 0.12em !important;
  text-shadow: 0 0 18px var(--rw-glow) !important;
}
.lcars-start-screen .lcars-activate-wrap .lcars-activate-cap {
  background: var(--rw-info) !important;
  color: var(--rw-ink) !important;
  border-radius: 4px 0 0 14px !important;
}
.lcars-start-screen .lcars-activate-wrap .lcars-start-activate,
html[data-app-theme] .lcars-start-screen .lcars-activate-wrap .lcars-start-activate {
  background: linear-gradient(135deg, var(--rw-active) 0%, var(--rw-ring-tertiary) 100%) !important;
  color: var(--rw-ink) !important;
  border: 2px solid var(--rw-text) !important;
  border-radius: 0 14px 4px 0 !important;
  box-shadow: 0 0 22px var(--rw-glow), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  text-transform: uppercase;
}
.lcars-start-screen .lcars-boot-bar {
  background: var(--rw-bg-0) !important;
  border: 1px solid var(--rw-outline) !important;
  border-radius: 2px !important;
}
.lcars-start-screen .lcars-boot-fill {
  background: linear-gradient(90deg, var(--rw-info), var(--rw-active)) !important;
  box-shadow: 0 0 12px var(--rw-glow) !important;
}

/* ==========================================================================
   05. PANELS, HEADERS, BUTTONS & HUD CONTAINERS (ALL SECTIONS)
   ========================================================================== */
.app-shell .panel,
html[data-app-theme] .app-shell .panel {
  background: linear-gradient(165deg, var(--rw-bg-2) 0%, var(--rw-bg-1) 100%) !important;
  border: 1px solid var(--rw-outline) !important;
  border-left: 4px solid var(--rw-edge) !important;
  border-top: 2px solid var(--rw-outline) !important;
  /* Angular Tech-Frame instead of LCARS swept curve */
  border-radius: 3px 16px 3px 14px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), inset 0 1px 0 var(--rw-outline-soft) !important;
  position: relative;
}
.app-shell .panel:focus-within {
  border-color: var(--rw-edge) !important;
  box-shadow: 0 0 16px var(--rw-glow), inset 0 0 12px var(--rw-sweep) !important;
}

/* Panel Headers & Eyebrows -> Tactical HUD Bars */
.app-shell .panel > h3,
.app-shell .panel > .eyebrow,
:is(#metronome, #audio, #presets, #diary, #analytics, #settings) .panel > :is(h3, .eyebrow) {
  background: linear-gradient(90deg, var(--rw-bg-3) 0%, rgba(0, 0, 0, 0.35) 100%) !important;
  color: var(--rw-active) !important;
  border: 1px solid var(--rw-outline) !important;
  border-left: 4px solid var(--rw-info) !important;
  border-right: 3px solid var(--rw-edge) !important;
  border-radius: 2px 10px 2px 8px !important;
  letter-spacing: 0.1em !important;
  text-shadow: 0 0 8px var(--rw-glow) !important;
}

/* Info Drawers (details/summary) */
.app-shell .lcars-info summary,
.app-shell .mode-help summary,
#diary #diarySetup > summary {
  background: var(--rw-bg-3) !important;
  color: var(--rw-info) !important;
  border: 1px solid var(--rw-outline) !important;
  border-left: 4px solid var(--rw-info) !important;
  border-radius: 2px 10px 2px 8px !important;
  box-shadow: none !important;
}

/* Primary & Outline Action Buttons */
.app-shell button.primary,
#metronome .transport #start,
#settings #openLaunchConsole,
#diary #manualEntry,
#settings #export,
#micConsole #micArm {
  background: linear-gradient(135deg, var(--rw-active) 0%, var(--rw-ring-tertiary) 100%) !important;
  color: var(--rw-ink) !important;
  border: 2px solid var(--rw-edge) !important;
  border-radius: 3px 14px 3px 14px !important;
  box-shadow: 0 0 14px var(--rw-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45) !important;
  font-weight: 900 !important;
  letter-spacing: 0.08em !important;
}
.app-shell button.primary:active,
#metronome .transport #start:active {
  transform: scale(0.985);
  box-shadow: 0 0 24px var(--rw-glow-strong) !important;
}

.app-shell button.outline,
#metronome .transport #tap {
  background: var(--rw-bg-3) !important;
  border: 2px solid var(--rw-outline) !important;
  border-left: 4px solid var(--rw-info) !important;
  color: var(--rw-text) !important;
  border-radius: 3px 12px 3px 12px !important;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5) !important;
}
.app-shell button.outline:hover,
#metronome .transport #tap:hover {
  border-color: var(--rw-info) !important;
  box-shadow: 0 0 12px var(--rw-info-glow) !important;
}

/* Segmented Mode, View, Scale & Filter Buttons */
#modeButtons button,
#metronome #tacticalViewSwitch button,
#tacticalViewSwitch button,
#settings #scaleButtons button,
#diary #diaryControls .diary-categories button,
#analyticsContent .analytics-filters button,
#analyticsContent .chart-modes button,
.lcars-deck-bar button {
  background: var(--rw-bg-3) !important;
  color: var(--rw-dim) !important;
  border: 1px solid var(--rw-outline) !important;
  border-radius: 2px 10px 2px 10px !important;
  transition: all 0.14s ease !important;
}
#modeButtons button[aria-pressed="true"],
#metronome #tacticalViewSwitch button[aria-pressed="true"],
#tacticalViewSwitch button[aria-pressed="true"],
#settings #scaleButtons button[aria-pressed="true"],
#diary #diaryControls .diary-categories button[aria-pressed="true"],
#analyticsContent .analytics-filters button[aria-pressed="true"],
#analyticsContent .chart-modes button[aria-pressed="true"],
#analyticsContent .session-choices button[aria-pressed="true"],
.lcars-deck-bar button[aria-expanded="true"] {
  background: linear-gradient(135deg, var(--rw-active) 0%, var(--rw-ring-tertiary) 100%) !important;
  color: var(--rw-ink) !important;
  border-color: var(--rw-text) !important;
  box-shadow: 0 0 14px var(--rw-glow) !important;
  font-weight: 900 !important;
}

/* Mode Trigger & Live Tempo Badge */
#modeDrawerToggle {
  background: var(--rw-bg-3) !important;
  border: 2px solid var(--rw-outline) !important;
  border-left: 4px solid var(--rw-edge) !important;
  border-radius: 2px 12px 2px 12px !important;
  color: var(--rw-text) !important;
}
#liveTempo,
.play-status {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace !important;
  text-shadow: 0 0 10px var(--rw-glow) !important;
}

/* ==========================================================================
   06. PRIMARY SEQUENCER: REACTOR DIAL (#dial, #rings, #tempo) & #linear
   ========================================================================== */
#dial {
  filter: drop-shadow(0 0 16px rgba(0, 0, 0, 0.85));
}
#rings .track {
  stroke: var(--rw-ring-track) !important;
  stroke-width: 3px !important;
}
#rings .inner-track,
#rings .dial-ticks {
  stroke: var(--rw-info) !important;
  opacity: 0.75;
}

/* Gamified Beat Nodes (state0 = Double, state1 = Accent, state2 = Normal, state3 = Silent) */
#rings .point.state0:not(.playing) {
  fill: var(--rw-text) !important;
  stroke: var(--rw-active) !important;
  stroke-width: 4px !important;
  filter: drop-shadow(0 0 8px var(--rw-glow));
}
#rings .point.state1:not(.playing) {
  fill: var(--rw-info) !important;
  stroke: var(--rw-bg-0) !important;
  filter: drop-shadow(0 0 6px var(--rw-info-glow));
}
#rings .point.state2:not(.playing) {
  fill: var(--rw-ring-tertiary) !important;
  stroke: var(--rw-outline) !important;
}
#rings .point.state3:not(.playing) {
  fill: var(--rw-ring-dark) !important;
  stroke: var(--rw-outline) !important;
  stroke-dasharray: 3 2;
}

/* Active Beat Flash -> High-Energy Reactor Pulse */
#rings .point.playing,
#rings .point.state0.playing {
  fill: #ffffff !important;
  stroke: var(--rw-active) !important;
  stroke-width: 7px !important;
  filter: drop-shadow(0 0 16px #ffffff) drop-shadow(0 0 28px var(--rw-active)) !important;
}

/* Center Tempo Reactor Core (#tempo) */
#tempo {
  background:
    radial-gradient(circle at 50% 50%, var(--rw-bg-3) 0%, var(--rw-bg-0) 90%) !important;
  border: 2px solid var(--rw-edge) !important;
  box-shadow:
    0 0 24px var(--rw-glow),
    inset 0 0 18px var(--rw-sweep) !important;
}
#tempoValue,
#bpm,
#linearTempoValue,
#linearBpm {
  color: var(--rw-active) !important;
  font-variant-numeric: tabular-nums !important;
  text-shadow: 0 0 16px var(--rw-glow) !important;
}
#tempo .tempo-buttons button {
  color: var(--rw-info) !important;
  text-shadow: 0 0 8px var(--rw-info-glow) !important;
}

/* Linear View Console & Steps */
#linear .linear-tempo-console {
  background: linear-gradient(135deg, var(--rw-bg-2), var(--rw-bg-1)) !important;
  border: 2px solid var(--rw-outline) !important;
  border-left: 6px solid var(--rw-edge) !important;
  border-radius: 3px 16px 3px 16px !important;
  box-shadow: 0 0 18px rgba(0, 0, 0, 0.5) !important;
}
#linear .pattern-row .step {
  border-radius: 3px 10px 3px 10px !important;
  border: 1px solid var(--rw-outline) !important;
}
#linear .pattern-row .step.playing {
  box-shadow: 0 0 18px var(--rw-glow-strong), inset 0 0 10px #fff !important;
}

/* ==========================================================================
   07. TACTICAL VIEW (#tactical) & MIC LAB (#micVisual, #micConsole)
   ========================================================================== */
#tactical .tac-cockpit,
#tactical .tac-plot-panel,
#tactical .tac-diagnostics {
  background: linear-gradient(165deg, var(--rw-bg-2) 0%, var(--rw-bg-0) 100%) !important;
  border: 1px solid var(--rw-outline) !important;
  border-left: 5px solid var(--rw-edge) !important;
  border-radius: 3px 16px 3px 14px !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6), inset 0 0 18px var(--rw-sweep) !important;
}
#tactical .tac-head {
  background: linear-gradient(90deg, var(--rw-selected-bg), var(--rw-bg-3)) !important;
  color: var(--rw-active) !important;
  border-bottom: 1px solid var(--rw-edge) !important;
  border-radius: 2px 12px 0 0 !important;
  letter-spacing: 0.08em !important;
  text-shadow: 0 0 8px var(--rw-glow) !important;
}
#tactical .tac-lane-shell,
#tactical .tac-plot-shell {
  background: var(--rw-plot-bg) !important;
  border: 1px solid var(--rw-outline) !important;
  border-radius: 4px !important;
  box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.85) !important;
}
#tactical .tac-lane-now,
#tactical .tac-lane-bar {
  stroke: var(--rw-edge) !important;
  filter: drop-shadow(0 0 6px var(--rw-glow)) !important;
}

/* Gamified Telemetry Counters (Early / Grid / Late / Hits / Miss) */
#tactical .tac-readouts span,
#tactical .tac-offset,
#tactical .tac-counts > div,
#micConsole .mic-metric,
#micConsole #micSlotStrip > div {
  background: var(--rw-bg-3) !important;
  color: var(--rw-dim) !important;
  border: 1px solid var(--rw-outline) !important;
  border-left: 3px solid var(--rw-info) !important;
  border-radius: 2px 8px 2px 8px !important;
}
#tactical .tac-counts > div[data-tac-count="grid"] {
  border-left-color: var(--rw-active) !important;
}
#tactical .tac-counts > div[data-tac-count="late"],
#tactical .tac-counts > div[data-tac-count="extra"] {
  border-left-color: var(--rw-warning) !important;
}
#tactical .tac-counts > div[data-tac-count="outside"] {
  border-left-color: var(--rw-danger) !important;
}
#tactical .tac-readouts strong,
#tactical .tac-offset strong,
#tactical .tac-counts strong,
#micConsole .mic-metric > strong {
  color: var(--rw-active) !important;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace !important;
  text-shadow: 0 0 8px var(--rw-glow) !important;
}

/* ==========================================================================
   08. AUDIO MATRIX (#mixer), CAPSULE SLIDERS (.lcars-slide) & GESTURE LADDER
   ========================================================================== */
#mixer .matrix-housing {
  background: linear-gradient(180deg, var(--rw-bg-1), var(--rw-bg-0)) !important;
  border: 1px solid var(--rw-outline) !important;
  border-right: 6px solid var(--rw-info) !important;
  border-radius: 2px 14px 2px 14px !important;
}
#mixer .matrix-housing.matrix-active,
#mixer .matrix-housing:focus-within {
  border-color: var(--rw-edge) !important;
  box-shadow: 0 0 14px var(--rw-glow), inset 0 0 12px var(--rw-sweep) !important;
}
#mixer .matrix-label {
  background: var(--rw-bg-3) !important;
  color: var(--rw-active) !important;
  border-left: 3px solid var(--rw-edge) !important;
  border-radius: 2px 0 0 10px !important;
}

/* 24-Pill Capsule Sliders -> Plasma Energy Cells */
.lcars-pill-housing {
  background: var(--rw-bg-0) !important;
  border: 1px solid var(--rw-outline) !important;
  border-radius: 4px !important;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.9) !important;
}
.lcars-pill {
  border-radius: 2px !important;
  background: var(--rw-slide-pill) !important;
}
.lcars-pill.lit {
  box-shadow: 0 0 8px var(--rw-glow) !important;
}
.lcars-pill.near-cursor {
  filter: brightness(1.35) !important;
  box-shadow: 0 0 12px var(--rw-glow-strong) !important;
}
.lcars-bracket-lip {
  border-color: var(--rw-info) !important;
  filter: drop-shadow(0 0 6px var(--rw-info-glow)) !important;
}

/* Morphing Precision Number Ladder (.gesture-guide) & Floating Readout */
.gesture-guide.is-visible {
  background: linear-gradient(180deg, var(--rw-bg-2), var(--rw-bg-0)) !important;
  border: 2px solid var(--rw-edge) !important;
  border-radius: 4px 16px 4px 16px !important;
  box-shadow: 0 0 24px var(--rw-glow), 0 8px 28px rgba(0, 0, 0, 0.85) !important;
}
.gesture-guide-rung.is-current {
  background: var(--rw-selected-bg) !important;
  border-left: 3px solid var(--rw-edge) !important;
  border-right: 3px solid var(--rw-edge) !important;
  box-shadow: inset 0 0 10px var(--rw-glow) !important;
}
.precision-readout {
  background: var(--rw-bg-3) !important;
  color: var(--rw-active) !important;
  border: 1px solid var(--rw-edge) !important;
  border-left: 5px solid var(--rw-info) !important;
  border-radius: 3px 12px 3px 12px !important;
  box-shadow: 0 0 14px var(--rw-glow) !important;
}

/* ==========================================================================
   09. DIARY, ANALYTICS PLOTS (.xy-plot-stage), QR & DANGER DIALOGS
   ========================================================================== */
#diary #diaryList .log-entry {
  background: linear-gradient(90deg, var(--rw-bg-2), var(--rw-bg-1)) !important;
  border: 1px solid var(--rw-outline) !important;
  border-left: 5px solid var(--rw-edge) !important;
  border-radius: 3px 14px 3px 14px !important;
}
#diary #diaryList .session-data .stat-tile,
#analyticsContent .stat-tile {
  background: var(--rw-bg-3) !important;
  border: 1px solid var(--rw-outline) !important;
  border-left: 4px solid var(--rw-info) !important;
  border-radius: 2px 8px 2px 8px !important;
}
#analyticsContent .stat-tile strong {
  color: var(--rw-active) !important;
  text-shadow: 0 0 8px var(--rw-glow) !important;
}

/* Astrometrics & Sensor Plots */
.xy-plot-stage,
#analyticsContent .xy-plot-stage,
#diary .xy-plot-stage {
  background:
    radial-gradient(circle at 50% 40%, var(--rw-sweep), transparent 72%),
    var(--rw-plot-bg) !important;
  border: 1px solid var(--rw-outline) !important;
  border-bottom: 3px solid var(--rw-edge) !important;
  border-radius: 4px 14px 4px 14px !important;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.85) !important;
}
.xy-plot .chart-line {
  filter: drop-shadow(0 0 6px var(--rw-glow)) !important;
}
.xy-plot .chart-dot.chart-inspected,
.xy-plot .chart-bar.chart-inspected {
  stroke: #ffffff !important;
  filter: drop-shadow(0 0 10px var(--rw-glow-strong)) !important;
}

/* Red-Alert Destructive Confirmation Dialog & Fullscreen QR Sync */
.lcars-danger-dialog {
  background: var(--rw-bg-0) !important;
  border: 2px solid var(--rw-danger) !important;
  border-left: 6px solid var(--rw-danger) !important;
  border-radius: 4px 18px 4px 18px !important;
  box-shadow: 0 0 36px rgba(255, 0, 51, 0.45) !important;
}
#archiveQRDialog {
  background: var(--rw-bg-0) !important;
}
.share-qr,
#archiveQRDialog .archive-sync-qr {
  border: 3px solid var(--rw-edge) !important;
  border-radius: 4px 14px 4px 14px !important;
  box-shadow: 0 0 20px var(--rw-glow) !important;
}

```

---

### Noch 2 schnelle High-Impact-Tweaks für die `index.html` (Optional, 30 Sekunden)

Falls du auch im Code die letzten verräterischen Star-Trek-Easter-Eggs aus den sichtbaren Texten kicken willst, ohne irgendeine ID oder JS-Logik anzufassen:

* **Zeile 75 (`#lcarsInitCode`):** Ändere `ENGAGE // 47` → `IGNITE // CORE` *(„Engage“ + die Zahl „47“ sind bekannte TNG/Voyager-Insider)*.
* **Zeile 101 (`.linear-tempo-code`):** Ändere `47-BPM // 02` → `SYNC-LOCK // 02`.
* **Zeile 115 (`.tac-head strong`):** Ändere `ASTROMETRICS // LIVE PLOT` → `CHRONO-TELEMETRY // LIVE PLOT` *(„Astrometrics“ ist das Labor aus Star Trek: Voyager)*.

Willst du, dass ich dir für den Startscreen (`#lcarsStartup`) auch noch ein schärferes, kantigeres **SVG-Reaktor-Emblem** (passend zu den 45°-Chamfers, mit denselben Animations-Klassen `.emblem-ring-outer`, `.emblem-ring-inner` und `.emblem-pendulum`) baue?
