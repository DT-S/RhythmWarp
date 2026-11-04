# RC25.11 — Voyager Tactical View / live instrumentation (preview branch)

**Branch:** `feature/rc25-11-tactical-view` • **Base:** RC25.10 on `main`  
**Status:** Work-in-progress Draft PR. No merge until verified on a real iPhone.

## Main view contract

Three choices: Circular, Linear and Tactical. Tactical is a third
visual mode, not a microphone mode. Changing views never initializes,
stops, or restarts the audio engine or microphone. The original single
`#dial`, including its actual outer quarter pattern and inner subdivision
pattern, is **moved** into the Tactical cockpit while displayed and returned
to its previous place on exit. This is deliberate: it avoids a decorative
second ring that can fall out of sync or lose step gestures. The project
previously used a binary `linear` flag; RC25.11 adds a view controller
and preserves the legacy `#view` navigation toggle.

The Tactical cockpit also contains:

- Audio-clock-driven scrolling reference lane. Right = future, left =
  past. Quarter references are heavier than subdivisions. Real microphone
  hits appear on the same time axis as stems and glowing dots.
- Fading time-corrected strike dots around the two-ring sequencer.
- Real START/STOP and TAP delegating to the existing metronome controls,
  and ENGAGE/DISENGAGE delegating to the original microphone button.
- Tempo, quarters, subdivisions and current session clock displays.
- A configuration drawer that keeps the existing calibration and guided /
  free capture controls reachable on demand.
- The existing Timing/Hit Rate/Distribution measurements, rendered into
  a dedicated Tactical SVG with blue sensor grid, mathematically scaled
  ±10 ms tolerance band, zero line, stems and headed dots.
- A compact diagnostic panel: last measured offset, hits per minute,
  EARLY/GRID/LATE/EXTRA/OUT live event counts and existing evaluated
  reference slots / detected / missed counts.

The animation system uses `requestAnimationFrame`, CSS accent glows
and a soft low-opacity scan; motion is reduced under
`prefers-reduced-motion: reduce`.

## Accuracy and privacy rules

- `Scheduler`, `AudioEngine`, `MicCapture`, `TimingSession`, offline
  IndexedDB, local JSON backups and microphone archives remain unchanged.
- No fake live data enters Tactical. With mic off, actual current offsets
  are unavailable. A microphone requires the existing explicit permission
  path; no automatic capture on view switch.
- Mic onsets, calibrated onset time and matched reference time are
  broadcast **display-only** to the Tactical view; saved mic records
  keep their original format.
- Event counts are the present session's detected onsets by diagnosis;
  *reference slots / detected / missed* still come directly from
  `TimingSession.gridProgress()`, not guessed from event counts.
- Early means negative offset, late means positive offset; the ±10 ms
  region is a visual categorization threshold, not a guarantee that the
  microphone accurately measures real-world latency. Different browsers
  and microphones need real calibration.
- Guided has a reference grid. Free records raw hit rate, not invented
  Early/Late data. Existing nonstandard operating modes retain their
  source Pattern and Scheduler data.

## Files

- `index.html`: third view selector and self-contained Tactical cockpit.
- `src/tactical-view.js`: view controller, reuse of authentic dial,
  ring/linear hit graphics, real sensor chart and live counters.
- `src/app.js`: source-of-truth view routing and Tactical frame callback.
- `src/mic-ui.js`: display-only microphone/grid events.
- `v2-tactical.css`: new scoped layout, blue grid and bloom.
- `sw.js`: caches the new JS/CSS for offline use.
- `tests/tactical-fusion*.{js,mjs}`: source contracts and browser layout
  checks at 320/390/768/1440 CSS px, including dual-ring visibility.

## QA / remaining questions

1. Real iPhone 13 installed PWA height and WebKit reserved bottom strip
   need on-device validation. A green simulated Chromium viewport does
   not prove real iOS geometry.
2. Metronome still supports up to 20 outer and 20 inner pattern steps
   and different modes. Some complex modes may need a denser lane
   visualization than the initial quarter/subdivision guides.
3. Tactical display should not alter the legacy Circular/Linear
   sequencing, microphone operation or the active 90% default UI scale.
4. More refined on-device animations/bloom are deliberately a separate
   visual polish pass after real microphone capture testing.
5. No automatic merge: evaluate GitHub Pages preview, then explicitly
   approve integration into main.

## RC25.11.1 iPhone follow-up (user-tested visual review)

Real installed iPhone screenshots uncovered a CSS specificity bug when the
microphone was engaged: the older microphone mode's 2-column
`.instrument:not(:has(> #linear:not([hidden])))` rule overrode Tactical's
single full-width cockpit. Scoped `tactical-active.mic-telemetry-on` rules
now override that only within the third view. The legacy mic-only Circular
and Linear layouts retain their original behavior.

- The original two-state `#view` control is no longer visible; the existing
  node remains temporarily for compatibility with legacy handlers. The
  visible Circular, Linear and Tactical selectors are authoritative, and
  the comprehensive browser tests now navigate using those selectors.
- Existing `lcars-menu-build` and `buttonpress` cues are used on the
  three actual view selections. A delegated START/TAP/ENGAGE click does not
  duplicate the sound from its originating Tactical button.
- The Tactical entry now stages the cockpit panel, outer and inner rings,
  blue time lane, plotter and diagnostics. LCARS page re-entry also
  triggers this one-shot view build. A microphone state change does not
  replay it. Reduced-motion preferences remain respected.
- Microphone-on layout is measured in the dedicated 320, 390, 768 and
  1440px browser test. A separate motion-enabled 390px test checks
  computed animation names rather than just verifying the CSS exists.
- Preview build tag is **2.0.0 RC25.11.1** and SW cache key has advanced
  to `paintable-viewport-14-tactical-armed-layout-motion` so iPhone
  installations do not silently serve the prior broken style from cache.

The GitHub Draft PR stays open for user's further iPhone validation.

## RC25.11.2: continuous multibar Tactical timing lane

User feedback from the installed iPhone and Meta Quest browsers:

- Replace the two plotted Early/Late emoji-like arrows with the plain LCARS
  text labels `EARLY` and `LATE`. The adjacent lane guide is now
  `PAST / REFERENCE / HIT / FUTURE`, also without emoji or arrows.
- Instead of drawing only the bar that `scheduler.onGrid` has already
  published, the right-to-left lane now draws the active bar plus four
  projected future bars. It scales to show approximately three bars in
  its future region, while still leaving a history region for mic hits.
- New pure, display-only `src/tactical-timeline.js` reproduces the exact
  bar boundary, queued setting change and `rampTempo()` rules of
  `Scheduler.prepare()/tick()` using the existing rhythm utilities.
  Actual onGrid reports remain authoritative for historical beats.
  Upcoming lines are *projections*, not queued audio.
- Each segment uses its own bar BPM and length for timestamp positioning;
  the lane eases any required visual scale changes at tempo-ramp boundaries.
  It never inserts silent buffers, alters timing, restarts sound, or waits
  for the next bar to draw future references.
- Dense subdivision markers are thinned at sub-5px spacing, keeping
  quarter references. Free mic sensing still paints real detected onsets,
  but never fabricates reference beat lines.
- Added deterministic Node tests for 3+ bar lookahead, forward/back ramp
  tempo, scheduled configuration changes and count-in. Browser coverage
  additionally verifies two future bar IDs and actual movement to the left
  with AudioContext transport running.

Preview build: **RC25.11.2**, offline cache:
`paintable-viewport-15-tactical-multibar-lane`.

Branch and Draft PR #49 remain unmerged pending further iPhone testing.

## RC25.11.3: Beat spacing and count-in continuity

The iPhone RC25.11.2 test revealed that fitting three entire bars into the
295-unit future region made the metronome's reference ticks illegibly dense.
The time band had also dropped its count-in history as soon as the scheduler
reported the first regular bar.

- Every quarter now uses a constant **72 SVG coordinate units**. Only visible
  ticks are painted; future bars are still calculated offscreen so they
  enter smoothly at the right edge. No fake, compressed three-bar overview.
- The x coordinate uses a single continuous **musical quarter-position**
  mapping over historical plus projected bars. Each bar supplies its actual
  BPM for converting AudioContext time into quarter position.
- Tempo Ramp therefore changes the **scroll velocity** according to the
  planned quarter duration without abruptly changing distances between
  quarter notes or shifting an upcoming beat position.
- The live renderer remembers the actual count-in bars, which aren't
  published by the existing Scheduler.onGrid callback. Switching from
  negative count-in bar numbers to the first regular bar (bar 0) no longer
  discards the previous beat origin.
- Starting another transport creates a fresh visual history; actual mic
  data, reference-click audio and source persisted records are untouched.
- Pure regression tests verify a 72-unit spacing at 120 BPM, both sides
  of the count-in boundary, and ramp tempo accuracy. The browser test now
  runs a real one-bar count-in and checks that the first ordinary bar
  crosses the cursor without sudden disappearance.

Version **RC25.11.3**, offline cache
`paintable-viewport-16-tactical-countin-spacing`. Remains a Draft PR.

## RC25.11.5: Tactical Engineering Access / Parameters + Mix Settings

The Tactical cockpit now has three compact configuration triggers beneath
its transport: `PARAMETERS`, `MIX SETTINGS` and `MIC CFG`.

A native, safe-area-constrained `<dialog>` brings up one of three
**original** control surfaces:

1. **Parameters:** the live `#trainingDeck`, including mode-specific
   training fields, swing, count-in, countdown, Mode Info and Control Guide.
2. **Mix Settings:** the same live `#mixer` and Audio Matrix master controls
   (both channels, independent volume/pan, mute/solo and sound choices).
3. **Mic CFG:** the existing `#micConsole`, with its genuine sensor
   settings, calibration, guided/free mode and capture controls.

No settings, media inputs or event listeners are duplicated. The elements
are moved into the modal while it is open, then **restored to their exact
original positions**, preserving operation of the regular Metronome and
Audio Matrix pages. ESC, CLOSE and changing view close the deck.

The closed Tactical display stays compact: parameters/mixer scroll only
inside the modal, without forcing the cockpit or plots offscreen.
The modal uses the current theme colors and has a fixed safe-area-aware
maximum height on iPhone, while remaining available on Meta Quest and
desktop browsers. No new audio engine, state model, persistence schema,
or external dependency is introduced.

Browser tests on 320px / iPhone / tablet / desktop verify that the real
parameter input, mixer, master output and mic configuration are reachable,
that active nodes retain their identity and return to their original
parents, and that the core Tactical display is still functional.

Preview **RC25.11.5**, SW cache
`paintable-viewport-18-tactical-engineering-access`. Draft PR #49
remains unmerged until actual-device signoff.

## RC25.11.6: One-window rule / inline dropdowns

The user tested the RC25.11.5 overlay but rejected the additional modal and
backdrop blur. **Supersedes the preceding RC25.11.5 modal design.**

- Physically move the *original* two LCARS buttons
  `#deckParamsToggle` (PARAMS & SWING) and `#deckMicToggle` (MIC SENSOR)
  below the Tactical Diagnostics panel. Add `MIX SETTINGS` as a third
  sibling in the same LCARS bar, visible only in Tactical.
- Tapping a button expands its corresponding **inline section immediately
  below the bar**. Tapping the same button again collapses it; selecting
  another swaps the currently expanded content. No dialogs, overlays,
  backdrops, blur, second window or redundant configuration header.
- Parameters reuses `#trainingDeck`; Mic Sensor reuses `#micConsole`;
  Mix Settings reuses the real `#mixer`, master levels and Audio Operations
  details. All original event listeners and settings are retained.
- Switching back to Circular/Linear restores the original two buttons to
  their native position; `MIX SETTINGS` is hidden. Switching page
  immediately restores any moved controls, so the original Audio Matrix
  always continues to work.
- The closed Tactical cockpit stays compact; the whole PADD scrolls
  naturally **only when a dropdown is expanded**. There is no nested
  scrolling viewport or layer taking over the touch controls.
- Existing LCARS tactile/click feedback applies to the same physical
  buttons. The dropdown uses a short understated deployment animation,
  with reduced-motion accessibility preserved.
- Dedicated source/browser tests assert a single original control instance
  and verify inline expansion, live edits, mixer mute, collapsing,
  restoration, and the lack of a dialog at 320/390/768/1440px.

Preview version `2.0.0-rc.25.11.6`, offline cache
`paintable-viewport-19-tactical-inline-controls`. PR #49 stays a Draft
until real device testing is approved.
