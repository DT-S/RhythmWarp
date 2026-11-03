# RC25.13 / Proof A: acoustic reference from the heard metronome click

**Branch:** `experiment/rc25-13-acoustic-grid-reference` based on merged
`main` commit `9f879f0825c259c43704540571082810ca8a6548`.

**State:** pure offline research proof ONLY; no audio playback, mic live processing,
GUI, archive, service worker or scoring change. This does NOT revive the
rejected Bluetooth acoustic auto-calibration of PR #50.

## User hypothesis

The iPhone plays the metronome through its built-in loudspeaker and records
both that audible click and the practice-pad strike on the built-in mic.
A possible secondary nearly inaudible signal could uniquely identify the
beat; an initial dry pad warmup (e.g. soft/medium/loud attacks) could teach
the device how its practice pad sounds. Goal: compare strike against the
**actually heard** click, avoiding false EARLY/LATE from playback latency.

## What works in principle

If both signals are captured by the **same mic and the same audio route**:

- scheduled click at S; audible click reaches phone mic at
  C = S + output/acoustic travel + common input latency + click detection bias;
- physical pad strike at P; recording detects pad at
  H = P + pad acoustic travel + common input latency + pad detector bias;
- observed relative difference H - C **cancels common microphone latency**.
  It does not cancel differing propagation distance and onset-detector bias.

Unlike applying a loopback-measured correction to unverified pad attacks,
this can anchor the timing reference to the loudspeaker event that the
iPhone **actually hears**.

Important difference: this still measures at the PHONE microphone. The
speaker click reaching the player's ears can differ in time from the same
click reaching the phone mic. Spatial geometry must be controlled,
especially when the practice pad is far from the phone (1 m ~2.9 ms).

## Phase A: minimum audible-click proof (implemented)

`src/acoustic-reference-proof.js` exports three PURE research helpers:

1. `matchAcousticClick` matches a known short synthetic metronome click
   template against a bounded segment of a captured signal using
   normalized cross-correlation. It rejects weak/nonmatching candidates
   and ambiguous widely-separated peaks. This uses a simple unchanged
   audible click, **no extra ultrasonic code**.
2. `acousticGridReference` requires 3+ confidently matched, recent
   metronome clicks and small dispersion. Missing click anchors, unstable
   routing or time drift return an invalid reference. This is not an
   audio playback correction; it is only a proof-local transform of the
   observed click timestamps to an expected acoustic grid.
3. `comparePadToHeardGrid` computes H - (S + measured shift), but marks
   attack bias unknown and returns unavailable if the acoustic reference
   is missing/unstable.

Node tests use synthetic microphone mixtures and simulated playback+mic
latency. They test common-latency cancellation, three reference anchors,
false click match from an ordinary pad, missing reference and drift
rejection. Passing synthetic tests proves only the implementation math,
**not iPhone hardware accuracy**.

The proof currently assumes the reference sample provided to its
correlator is the same sample audible through the phone's speaker,
at matching analysis sample rate, with enough SNR and sufficiently
preserved waveform. A later live proof needs measured acoustic template
robustness to room coloration, automatic gain and non-linear devices.

## User's proposed pad warmup: Phase B (NOT implemented yet)

A guided **PAD LEARNING** mode could record four soft, four medium and
four strong isolated pad strikes at natural playing distance. Optionally
20 examples if classification confidence improves. We should not train
a model on arbitrary missed or overlapped clicks.

The short transient features might include:
- low/high-band energy, transient attack envelope and spectral centroid;
- duration, adaptive background noise estimate and volume dependence;
- repeatability of onset detection on soft ghost notes versus loud rimshots.

Compare incoming transients to the pad fingerprint, then match against
the verified acoustic click template. Accumulate only a **small rolling
buffer** in an AudioWorklet, or local ephemeral feature vectors;
do not archive raw microphone waveforms unless the user intentionally
opts in and the storage/backup contract is designed.

Pad onset estimates are still subject to level-dependent threshold/attack
bias, so this cannot be marketed as physical millisecond accuracy without
external reference verification.

## The missing-click hypothesis is NOT evidence of exact timing

An audible click might disappear in a recording because of masking,
automatic gain changes, destructive interference, room acoustics, a
weak phone speaker, or a transient that is louder nearby. **Silence does
not prove simultaneity.** If pad and click overlap, accept a strike only
if a pad onset AND an independent stable audible reference remain
identifiable; otherwise output AMBIGUOUS, not GRID.

When one beat's click is masked, a later phase may interpolate from
confident neighboring click anchors if playback is stable, but must show
confidence and fail closed if anchors vanish or drift.

## Invisible acoustic timecode: Phase C (NOT authorized as first step)

A near-ultrasonic 18–20 kHz pilot *can* be studied experimentally on
some phones, but built-in loudspeakers, microphones, sample rates, DSP
and hearing sensitivity differ. It must not be assumed inaudible to every
person or detectable on every device. A separate continuous tone also
adds energy and can be suppressed by WebKit voice processing.

First test the **existing audible click itself** as its own acoustic
fingerprint. If that fails, consider a short, low-amplitude signature
*embedded in the normal click*, with controlled timbre, validated
detectability and explicit audible change review. Do not continuously
broadcast ultrasonic markers or add a dangerous gain boost.

## CPU and live pipeline gates

The proof intentionally does offline bounded correlation over a small
window at an analysis rate such as 8 kHz; a 40 ms template of ~320
samples searched within ~300 ms entails order 0.8 million multiply-add
comparisons per heard click. This is tractable in principle but needs a
measured iPhone 13 on-device benchmark for worst-case load, thermal impact
and UI interaction. Live AudioWorklet should avoid allocations and long
loops inside a 128-sample render block; use an incremental ring buffer,
bounded analysis work or a worker. Never block audio scheduling or
change the existing live onset processor before proof gates pass.

**Validation gates before modifying production EARLY/GRID/LATE:**
1. Built-in phone speaker and BUILT-IN microphone actually active with
   echo cancellation / noise suppression / AGC disabled where honored.
2. Detect >95% of isolated clicks across realistic iPhone volume,
   tones, positions and room noise, with no unintended pad false matches.
   This target is aspirational, not proven.
3. Validate pad learning from quiet ghost notes through loud strikes,
   including clicks under drum hits and vice versa.
4. Independent stereo or multi-mic external recording of actual acoustic
   click and pad transients to quantify detector bias, distance effect,
   and uncertainty bounds.
5. Verify no regression to Guided/Free mode, all three sequencer views,
   the user-confirmed iOS mic volume fix, offline PWA and privacy.
6. Never show an absolute accuracy score on an unknown route. If reference
   quality fails, show a truthful unavailable/relative result.

**Do not merge this proof until the user tests a small on-device mic/speaker
pilot and we have evidence of reliable simultaneous audible detection.**
