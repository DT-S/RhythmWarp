# RC25.9 Voyager Astrometrics / Telemetry Console (preview only)

Based on the supplied design specification for the Analytics/Stats page,
including the daily Astrometrics charts and retained microphone highlights.

## Changes
- Filter deck defaults **closed on phones (≤640px)** so the first two
  readouts, remaining three KPIs and plotted history are near the top.
  A keyboard-operable button with aria-expanded/aria-controls exposes all
  original filter controls. The open/closed state survives re-rendering.
  Desktop/tablet start with the filters expanded.
- The expanded filter deck uses one row of four period buttons, a
  three-column category matrix, a compact horizontal exercise input and one
  row of three source buttons. Selection semantics are unchanged.
- The five real statistics form a 2+3 LCARS bridge telemetry grid on phones.
- Astrometrics plot navigation and chart readouts are condensed, as are
  per-category/mode bar readouts. Real series and chart animations are unchanged.
- The microphone archive uses a **3-column/2-row** choice grid for its six
  retained session highlights; currently missing slots remain disabled.
- The microphone archive's measurement caveat is accessible in a native
  `details/summary` disclosure instead of vanishing on narrow screens.
- Styling added to existing `v2-astrometrics.css` per RC16 test restrictions,
  with strict `#analytics`/ `#micAnalytics` scoping.
- RC25.9 package/UI version and Service Worker cache refreshed.

## Safety
No changes to charts.js mathematical series or the mic-index benchmark,
practice session recording, SQLite/IndexedDB storage, backup format, timing
analysis, metronome controls, or the deferred iOS black bottom strip.
The existing application is an offline-first PWA.

## Testing
`npm test` checks the Stats source contract and styling alongside all legacy
regressions. `tests/stats-telemetry-browser.mjs` seeds four valid practice
records, renders actual Plotter SVGs, tests the filter drawer and persistence,
checks telemetry-grid widths at 320/390/768/1440px, and inspects the 3×2
mic-highlight layout with a six-button DOM fixture without polluting or
overwriting real retained microphone records. CI uploads preview images from
`artifacts/stats-telemetry`.

The microphone fixture verifies **layout only**; microphone retention logic
continues to be exercised separately by existing model tests.

## Deployment
Use GitHub Pages with branch
`feature/rc25-9-voyager-stats-telemetry` for iPhone preview. It temporarily
changes which revision the public site serves, but **does not merge code**
into `main`. Export a JSON backup and avoid clearing installed PWA storage.
