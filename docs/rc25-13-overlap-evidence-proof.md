# RC25.13.3 | Acoustic overlap evidence, fail-closed proof

## Scope

This is the next research-only step after the successful RC25.13.2 real
iPhone calibration flow. Do not alter or merge the stable guided flow,
the microphone capture lifecycle, metronome transport, manual calibration,
standard MIC SENSOR, backup format or audio routing.

The field result showed 4/4/4 isolated pad attacks, 6/6 clean reference
clicks, 11/12 matched mixed clicks, and 11 near-click pad candidates marked
uncertain. Most near-click events were inside the former ±65 ms overlap
window. That number is an ambiguity report, not a count of failed strokes.

## Research hypothesis

The iPhone microphone hears speaker and pad together. Clean clicks in the
same session serve as negative controls. The isolated soft/medium/loud
pad attacks serve as positive controls. A mixed click may carry excess
low-band energy, beyond the clean-click distribution, which is compatible
with a coincident pad transient.

src/acoustic-overlap-proof.js works on ephemeral 8 kHz mono samples and
the existing deterministic low-pass decomposition. For each clean click,
pad-only attack and mixed matched click, it measures the low-to-high energy
ratio in a bounded [-55, +85] ms window around the observed onset.
The classifier requires:

1. Four clean, unclipped click controls and four pad controls;
2. A stable click spectrum (max/min clean ratio <= 1.65);
3. Spectral separation (median pad ratio > 2.4x maximum click ratio);
4. A confirmed mixed click, with a plausible high-band carrier level;
5. No clipping at or above 0.98;
6. Ratio > 1.8x the maximum click-only ratio AND excess low-band
   energy larger than 15% of the quietest isolated pad-control event.

If any gate fails, return UNAVAILABLE or UNCERTAIN. A negative result
does not mean the player missed the pad. A positive result means
pad-like energy is present, not that a particular physical hit was
identified. External sounds, changing playback routes, reverberation and
microphone processing can still mimic a pad.

The existing mixedPadCandidates, uncertain, pilotHealthSummary,
routeAccuracy: UNVERIFIED, and all UI/transport calibration states
remain unchanged. No EARLY / GRID / LATE, pad-onset timestamp, millisecond
offset, latency compensation or audio archive is produced. The new
overlapEvidence result is diagnostic only, and explicitly sets
timingCertified: false, onsetTime: null, offsetMs: null.

## Required negative and adversarial cases

Node regressions test:

- clean click-only mixed phase despite pad-only learning: zero invented pad;
- strong pad exactly at the heard click: extra pad-like energy detected,
  still no timing offset or GRID;
- no clean click / no pad-only calibration: UNAVAILABLE, not guessed;
- existing high-band click matching and legacy synthetic proof;
- real worklet lifecycle across SOFT/MEDIUM/LOUD/COUNT/MIXED, unchanged.

Before promoting this beyond research, test on real iPhone speaker/mic
with all other speakers off, including any PC loudspeakers, and vary pad
strength and distances. PC playback was present during the field test that
reported a 240.7 ms heard-click delay; this figure is not a verified
iPhone speaker delay. Prior internal-speaker measurements around ~80 ms
are also provisional acoustic estimates, not independent hardware
validation.

## Next work, deliberately not claimed done

We still need distinct onset reconstruction or externally measured
ground truth for fully coincident mixed transients, and a false-positive
benchmark with varying real rooms, volume, click spectrum, mic route and
physical pad. The mono microphone source-separation problem is not
uniquely soluble without constraints. Until physical validation the
system must keep reporting ambiguous near-click timing.
