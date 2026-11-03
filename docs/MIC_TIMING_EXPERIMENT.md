# LCARS Mic Timing Analysis — isolated experimental branch

## Scope of first end-to-end proof
- Keep main and the current GitHub Pages source untouched.
- User-triggered mic capture via getUserMedia + AudioWorklet; disable browser DSP where honored.
- Microphone samples NEVER sent to speakers, never encoded, never persisted.
- Worklet emits only onset timestamp and scalar amplitude. Detection threshold includes a quiet/soft-pad profile.
- Guided mode: match one detected onset to one scheduled quarter-note reference (even if the metronome is silent or in a gap). The scheduler's sample clock, not UI frames, supplies reference times.
- Free mode: report **raw strike rate (hits/min)**, not an inferred quarter-note tempo. Subdivision ambiguity makes the latter unknowable without further inference.
- Experimental live plot and IndexedDB session archive in a separate object store.
- Existing backup JSON optionally carries the new archive; old backups remain valid.

## Reliability warning
The onsets and expected output clicks share AudioContext coordinates, but input buffering, output device latency, acoustic travel time, and transient detector attack delay differ. **Absolute offset in milliseconds is provisional and not calibrated.** Do not label it objective drumming accuracy. No scoring percentages yet.

Use wired headphones for Guided mode. Open speakers can leak into the microphone; do NOT simply blank out windows at the beat, because doing so also erases valid strikes on the grid. AirPods/Bluetooth latency is especially unsuitable until calibrated.

## QA gates before release
1. Run Node unit suite and browser smoke tests for existing app.
2. Test iPhone installed-PWA permissions, audio routing, capture after app switch, and offline worklet loading.
3. Quiet pad, loud pad, drum set, background noise, clicks played on speaker; count false positives/missed strikes.
4. Calibrate round-trip and compare against known externally recorded timing with headphones.
5. Inspect 360–430px phone UI and portrait/landscape tablet + desktop.
6. Verify state/backups, cache update, storage quota, session limits, and no mic playback.
7. Build Tactical View / sensor plots only after measurement stability is verified.

This is deliberately experimental, not a release-quality timing diagnostic.

## Lab 02 — Mobile control hierarchy

- The metronome and transport are the first interactive elements in the iPhone instrument well. START/TAP sit above both circular and linear visualization so transport never depends on scrolling to the microphone.
- The microphone panel follows the pattern controls in DOM order and uses an explicit high flex order on mobile. It therefore cannot leap ahead of the metronome when CSS changes.
- No changes to the audio processor, timing detection, session data model or existing themes. The cache revision forces an offline PWA update.
- Device QA: verify iPhone 13 at 70%, 90%, 100% UI scale; short phones and landscape; both metronome views; mic armed/disarmed; all three themes. On small screens, secondary beat editing may still require scrolling, but START/TAP/BPM and ring must remain accessible at the top.

## Lab 03 — Cross-device grid isolation

- The sensor is a **sibling** of the primary instrument in the responsive layout grid. XL desktop's full-height U-frame and large beat ring stay intact, with the sensor spanning a second grid row.
- iPhone and narrow tablet order the grid as sequencer -> sensor -> training settings, preventing the sensor from obscuring primary click controls.
- Tests assert DOM order and explicit grid/flex ordering. Cache revision is mic-lab-3.

## Lab 04 — Mic offset calibration and unmatched diagnostics
- Observed speaker click +74..125 ms is not proven microphone input latency. A click leaking from the built-in speaker includes output and acoustic delay.
- Positive INPUT DELAY / MS subtracts that value from each detected onset *for matching to the reference grid*. The uncorrected arrival timestamp remains in the event array; the compensated offset is stored per hit, with the correction recorded per session.
- The correction is opt-in, manually set, 0 by default, -500..+500 ms, 0.1 ms increments. It is persisted in the existing local IndexedDB data store and included in JSON backup/import without modifying older backups. The value is frozen while a session is recording.
- No fake "automatic calibration" or accuracy percentages. Use a controlled timing reference and headphones for serious tests.
- EXTR(A) QUARTER HIT indicates a second strike near a quarter already matched, and OUTSIDE QUARTER indicates no unused quarter within the allowed window. Both may be legitimate subdivisions or spurious microphone triggers; neither implies bad drumming.
- Stop clears the live plot/readouts instead of leaving stale values underneath MIC ARMED / PRESS START.

## Lab 05 — Straight subdivision-aware guided timing
- Guided timing previously recognized only quarter-note reference slots. Eighths on a quarter click were therefore frequently labeled unmatched despite correct timing.
- Guided analyzer now offers explicit straight 1x quarter / 2x eighth / 3x triplet / 4x sixteenth reference **independent of audible metronome patterns**. Lookahead uses real scheduler anchors and per-bar BPM, including tempo ramps.
- Each reference slot can match one detected hit; nearest-neighbor gate is less than half one reference period to avoid stealing neighboring slots. Future bar boundary slots are de-duplicated.
- Defaults to x1 for old imported sessions, saved as a separate local IndexedDB preference, included in JSON backup and restore. Analysis archives record the reference factor of each session; no microphone audio is stored.
- Current analysis reference is **straight** and does not claim to follow swing, offbeats, displacement, or polyrhythm voices; UI states this. It must not modify metronome audio, oscillator scheduling or the pre-existing subdivisions setting.
- Neither `EXTRA REFERENCE HIT` nor `OUTSIDE REFERENCE` is a reliable classification of noise. Proper acoustic click rejection and adaptive transient classification remain a separate controlled test.

## Lab 06 — Fixed-geometry status lamps
- Numeric signed millisecond reading plus fixed LCARS LEDs EARLY / GRID / LATE / EXTRA / OUT replaces rapidly resizing variable text.
- The two metric tiles now have fixed equal-width grid columns and a fixed-height readout/lamp rail, so frequent different statuses cannot push the plotter down.
- No changes to session archive schema, audio permission, or theme selection.

## Lab 07 — Conservative double-trigger protection
- Worklet is re-armed only after the input envelope falls below 55% of its trigger threshold for 2ms, not by merely waiting for the 55ms old lockout. Sustained muffled pad resonances can no longer retrigger indefinitely without an envelope release.
- A reference-dependent input lockout lasts up to 54% of one selected grid slot (clamped 18–95ms). It is refreshed at each bar when tempo ramp changes, so 300BPM sixteenths remain theoretically detectable. This is an experimental **anti-echo heuristic**, not an identified source separation model.
- The worklet still streams only timestamps and scalar envelope strength, never audio, and the scheduler's audible click path is unchanged.
- Test with ghost notes, rolls, subtle/soft pads and varying tempos: overly strong suppression could remove legitimate fast hits. The original sensitivity presets remain unchanged.

- UI indication only: GRID lamp lights inside ±10 ms of the compensated reference. Raw signed milliseconds remain unchanged. This is an arbitrary training-display tolerance, NOT measured hardware accuracy.

## Lab 09 — Closed reference windows (not a performance grade)
- Guided mode now counts only elapsed and closed *reference windows* as GRID SLOTS, DETECTED or NO HIT. A newly queued future slot is never classified as missed. A compensated input delay is respected when closing the window.
- A low-frequency UI timer refreshes the figures during silence without changing the audio clock/scheduler. No microphone samples or new audio buffers are stored. This tracks coverage of microphone-detected transients, not whether the drummer actually intended to play each beat; a gap/intentional rest or microphone false negative can count as NO HIT.
- On stop, finalize only windows whose tolerance has elapsed and persist a tiny `gridStats` object in the local analysis record. Even a no-hit session with completed windows is archived. Old sessions import with `gridStats: null` (unknown, never fabricated zero).
- Archive validation checks nonnegative integer bounds, consistency between evaluated/detected/missed, and detected never exceeding number of matched hit events. Existing event format remains compatible.
- The free sensor has no reference and therefore has no grid-window counters.

- Lookahead caution: `Scheduler.prepare()` is called before the next bar begins. Never use an incoming bar's future anchor as the present time for determining missed slots. Only actual AudioContext currentTime (or real hit arrival, or stop time) may close a slot. Regression test covers 300 BPM x4.

## Lab 11 — LCARS sensor plot directly under metronome
- Sensor visualization moves from microphone controls to its own responsive plot panel after the sequencer and before microphone settings. It appears only when capture is armed. Transport is always above the ring.
- Active capture shrinks circular ring from 236px to 210px on narrow phones, never while mic is off.
- Tabs: TIMING, HIT RATE, DISTRIBUTION. In Free only HIT RATE is allowed. Pure plots read max 72 latest events, histogram max 128; no fitted Gaussian, no raw audio.
- Guided HIT RATE compares detected strikes/min to *current* quarter BPM multiplied by selected grid subdivision; it is not inferred musical BPM.
- Pale blue-violet astronomical grid and standard LCARS colors. This is functional first pass, visual refinement remains separate.

- Repaint scheduling is coalesced to one `requestAnimationFrame` at a time: multiple microphone attacks within a screen frame do not produce multiple full SVG redraws. AudioWorklet timing and event recording still process every hit.

## Lab 13 — Automatic selective retention
- Retain complete events only for **best qualified Guided session all time**, **best and worst qualified Guided sessions in trailing 7 x 24 hours**, plus **the three most recent sessions**. Duplicated categories refer to one physical record (maximum six distinct).
- A rolling seven-day candidate index stores compact per-session metadata and at most 96 evenly sampled hit events, not full raw hit logs; this permits legitimate promotion when the previous weekly winner expires. The index is bounded to 1000 candidates. Entries older than 7 days are pruned automatically.
- Qualification: >=20s, >=30 matched hits, >=60 evaluated reference slots, >=60% detected slots, valid selected straight grid. Free sessions have no timed grade and can appear only in RECENT. Rank lower-is-better normalized average absolute offset / target hit interval plus a penalty for missing detected slots. This is a **heuristic sensor benchmark**, not a musician performance grade; microphone latency and intended rests remain caveats.
- A promoted candidate may have a *sampled* plot (96 points) rather than complete hit history. Its original whole-session timing metrics are preserved separately as `benchmarkSummary` and must be labeled as full-session statistics.
- The existing IndexedDB version and keys remain compatible. Archive and index update in one transaction; import/export includes both the selected sessions and the rolling index. Old backups without the index are accepted and pruned on restore.
- Important: the very first automatic retention pass prunes older experimental microphone sessions. Export the prior archive first if long-term preservation matters.

- UI retention category controls compare exact session identifiers (not localized timestamps), so simultaneous sessions cannot highlight the wrong record.
