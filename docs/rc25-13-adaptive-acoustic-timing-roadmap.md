# RC25.13 Roadmap | Adaptive Acoustic Timing, iPhone speaker and microphone

**Status:** an isolated research branch. Never auto-merge this branch, overwrite
normal Guided/Free output, or claim certified EARLY/GRID/LATE timing without
independent hardware validation. Source of truth: latest merged main, including
the iPhone audio-session volume fix.

## Product objective

Use the iPhone's **internal speaker** and **internal microphone** to hear the
metronome and a practice-pad strike in the same microphone capture, so input
capture latency cancels in their relative timestamps. Avoid Bluetooth, invisible
ultrasonic audio, separate sweep calibration and cloud services. Fully offline,
no stored microphone audio, no subscription or changes to Circular/Linear/Tactical
features. Preserve one-window LCARS navigation and the existing Manual Input
Delay option as a legacy experimental tool.

### Critical epistemic rules

- The scheduled click timestamp is NOT the timestamp the listener heard it.
  Measure acoustic click onset from the mic; estimate reference delay over
  multiple known clicks with a jitter and confidence gate.
- Same microphone path cancels much capture latency, but differences in air
  travel (player's ear vs mic, speaker vs pad) and attack threshold depend
  on geometry, sample loudness, device audio-session/DSP, and acoustics.
- A missing/masked click does NOT prove a perfectly on-grid pad strike.
  Mark masked/unmatched events uncertain. The network of neighboring
  successfully detected clicks can allow conservative, bounded interpolation.
- A low-frequency pad is not always low-pass-only, and a high-frequency click
  can overlap the pad. Spectral bands and learned onset envelope jointly
  classify, not a fixed frequency cutoff.
- Browser AudioContext `currentFrame` and AudioWorklet samples are a shared
  *nominal* timeline, not automatically verified device latency.
- A value shown as +3 ms requires calibration evidence and uncertainty bound,
  not simply a formula with many decimals.

## Architecture / contracts

1. **Proof A (implemented):** pure click matched filter and acoustic reference
   with tests. `src/acoustic-reference-proof.js` is intentionally unconnected
   to the live mic and scheduler.
2. **Proof B (next implementation):** built-in-device `ACOUSTIC PILOT`
   session in the existing MIC CFG drawer. It runs only when normal mic
   is disengaged and transport stopped; mic permission remains explicit.
   After ~6 click-only beats, a short pad-only learning window and ~12
   mixed click+pad beats, a separate bounded AudioWorklet sends a mono,
   decimated, ephemeral buffer for *post-session* analysis. UI shows
   input device label, detected references, isolated pad strikes,
   ambiguities and provisional timing only if coverage is sufficient.
   No raw samples persisted or uploaded.
3. **Proof C:** adaptive acoustic click learner. Extract waveform and
   spectral envelope from the first 6 click-only beats. Match subsequent
   clicks, monitor drift, suppress false positives and preserve explicit
   unknown status in heavy pad overlap.
4. **Proof D:** pad learning from 4 quiet, 4 medium, 4 loud isolated
   strikes, optionally 20 taps if necessary; derive bounded feature
   statistics for onset and band energies. User-controlled sensitivity,
   no secret classifications. Test soft ghost notes/strong strikes and
   overlap with click.
5. **Proof E:** click+pad source separation via bounded spectral subtraction,
   band-energy novelty and residual transient detection, initially as
   post-session batch algorithm. Prove correct treatment of zero-lag
   combined transients, early, late, missed strikes, and multiple hits.
6. **Proof F:** optimized incremental AudioWorklet or Worker pipeline,
   fixed ring buffers, no long per-render callbacks, benchmark on iPhone 13
   Safari PWA. Use same learned classifier and confidence rules as batch
   reference. Evolve into real-time UI only after device evidence.
7. **Proof G:** external ground-truth microphone/recorder comparison
   (speaker click vs physical pad onset) across different iPhone positions,
   acoustic distance, volume, reverberant rooms, pad strength and session
   interruptions. Establish uncertainty and maximum allowed bias.
8. **Production gate:** user-approved, route-scoped opt-in, feature flags;
   route mismatch invalidates classification, no fake accuracy and no
   change to existing archive schema until expressly versioned.

## First iPhone on-device acceptance gates

- All outputs: NORMAL/BT/DSP UNKNOWN; warn if a Bluetooth input is reported.
  No claim that Safari exposes every true hardware routing state.
- In click-only window: >=5/6 clicks matched with plausible acoustic
  delay, median absolute deviation <=8ms (provisional tuning target).
- In pad-only window: >=10/12 manually played learning taps detected
  at representative strengths with no need to place phone against pad.
  False triggers when pad idle need explicit testing.
- In mixed window: at least 10 audible reference opportunities and
  separate pad onset estimates, with masked-click / unsplittable cases
  explicitly `UNCERTAIN`.
- Independent external reference before enabling any calibrated GRID
  lamp or precise EARLY/LATE training diagnostics.
- Ordinary metronome, audio mixer, PWA offline, storage backup, existing
  microphone GUIDED/FREE, Tactical/Linear/Circular, iOS route fix pass CI
  with no side effects.

## Why no ultrasonic / inaudible timecode now?

Inaudibility and capture of 18–20 kHz content are NOT portable across
iPhone speakers, microphones, noise filters, Bluetooth, people or dogs.
Additional sound may also reduce perceived audio fidelity and defeat
privacy assumptions. A learnt *existing* audible click supplies a stronger,
cheaper first hypothesis. Explore altered click with bounded embedded
signature only after physical pilot results justify it, with user's
approval.

## CPU and privacy budget

At 8 kHz mono, 29 seconds are ~232k float samples (~928 KB); cap all
recordings to a fixed number of frames. Process one short template
against bounded expected click windows, not all-pairs continuous
correlation. Compute features off the AudioWorklet render callback,
ideally in a Worker for the actual real-time stage. No audio storage,
logs, telemetry upload, persistent device labels or permission bypass.
Stop streams and disconnect nodes on abort, page hide or interruption.

## Delivery discipline

Draft PR with CI. Do not merge without a physical iPhone test and
specific evidence of correct click/pad separation. Continue from this
branch rather than restarting the original failed Bluetooth auto-sweep.

## 27 October 2026 / iPhone field-test findings and RC25.13 iteration

First real iPhone PWA screenshot: reported input `iPhone Microphone`, 6/6
count-in clicks, estimated common-route click delay 80.5 ms, reported MAD
0.0 ms, 21 isolated pad transients (13/5/3 soft/medium/loud), mixed clicks
5/12, 8 mixed pad candidates and one uncertain overlap. Frequency-separation
status: PROVISIONAL. The user needed a second test to understand the rapid
stages. The 0.0 ms MAD is not certified precision: 8kHz processing limits
resolution to 0.125ms/sample, and systematic error remains unknown.

Actions implemented:
- Extend pilot to 29 seconds with 2.5 seconds before the first click, six
  spaced clicks, nine seconds of pad learning (3s per strength) and 12 spaced
  combined clicks. Prominent stage countdowns. Ensure the **worklet itself**
  captures all 29 seconds; previously the finish limit was hard-coded as 18s.
- Improve pad transient gating (3ms attack, 25ms quiet re-arm and 240ms
  minimum spacing during learning) and preserve *uncertainty* for all mixed
  timing candidates. Transient counts do not prove actual pad-hit counts.
- Add observed count-in time range alongside the MAD, and explicitly warn
  that very low observed jitter is not a validated absolute clock.
- Learn a two-stage high-frequency click carrier from the user's own count-in
  and retry mixed clicks when normal waveform correlation fails. The simpler
  high-band implementation failed an adversarial synthetic overlap test; the
  two-stage filter passed it. Need new iPhone test before trusting this.
- Preserve the same no-auto-correction, no-audio-persistence requirements.

Acceptance target for next pilot: 6/6 count-in, near twelve isolated detected
pad attacks with a balanced 4/4/4 split, a higher mixed-click match rate,
zero invented `GRID` scores, and stable operation after reconnecting no
Bluetooth device. These are *experimental targets*, not guaranteed accuracy.
