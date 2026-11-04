# RC25.13 Physical pilot checklist | iPhone 13 PWA

**Only run on experimental branch. Do not merge this prototype to main.**
Do not use Bluetooth or headphones. Use the built-in iPhone speaker and
iPhone microphone; the browser cannot prove physical audio output routing.
The test is local, using one continuous worklet with five distinct bounded recording phases (up to 45 seconds each). Paused intervals never record microphone audio. No raw-audio archive.

## Installation/testing
- Temporarily deploy the branch `experiment/rc25-13-acoustic-grid-reference`
  to the existing preview Pages workflow *only when the owner wants to test*.
  Do not silently change the currently deployed main/release branch.
- On the iPhone PWA, navigate to METRONOME > MIC SENSOR >
  SENSOR CALIBRATION // CFG > ACOUSTIC PILOT. Keep the page in the foreground.
- Stop the main metronome, disengage normal mic, disconnect Jabra and other
  Bluetooth audio accessories. Use moderate device playback volume.
- Place the iPhone 20–60 cm from the practice pad; keep its position fixed.
  Avoid speaking/clicking other things during calibration.
- Press START ACOUSTIC TEST **once** and grant microphone permission if asked.
- Strike SOFT four times at any comfortable spacing. The visible counter
  shows how many candidate pad attacks have been recognised.
- After four detected attacks, the display announces MEDIUM. **Do not
  press any more buttons.** A short 2.5-second gap allows you to prepare.
  Play four medium hits after the phase label changes.
- The same transition follows automatically into LOUD. Play four loud hits.
  No metronome is active during SOFT, MEDIUM or LOUD; no fixed BPM is required.
- After LOUD, a short break and a clearly indicated countdown precede
  six reference clicks. Listen only, without playing the pad.
- After another short break and countdown, twelve metronome clicks begin
  for the mixed test. You can listen to the first one or two and join
  from the second or third click. There is no missed-click penalty;
  twelve pad hits are NOT required.
- A single active recording segment has a 45-second safety limit. Waiting
  during brief transitions does not store microphone samples. Keep the
  app foregrounded while testing.
- If the hit counter remains at zero during MEDIUM or LOUD, note the
  currently visible PHASE and STATUS. Do not repeatedly strike harder:
  the sample capture may have stalled rather than your hits being too quiet.
- Wait until test completes its bounded capture. The panel shows:
  - how many clean count-in clicks were detected, and provisional click delay
    and variability;
  - isolated pad transient count;
  - how separable their low/high energy spectra are;
  - how many mixed reference clicks were recognised and which candidate
    strikes were ambiguous.
- NO normal EARLY/GRID/LATE lamp or saved analysis session is changed.

## Useful reported diagnostics
Share only the panel's status/metrics and hardware setup, not raw audio:
1. Count-in heard count, e.g. 6/6 or 0/6.
2. Pilot status and click delay / jitter; "NOT AVAILABLE" is a valid failure.
3. Pad-only onset count, and PAD VS CLICK SPECTRUM.
4. Mixed click count, overlap/uncertain count.
5. Whether music/sound unexpectedly came from a top earpiece, headset,
   or the normal lower speaker.
6. Whether standard metronome volume returns after the pilot stops.

## Known limitations
- 18/18 apparent clicks is not proof that the pad timing is accurate. The
  classifier is research-only and can miss/over-count quiet pad strikes or
  classify strong overlaps as uncertain. Confidence must be validated by
  real hardware and an independent recorder before live feedback.
- Using a different metronome instrument or imported MP3 may require a
  separate template. This pilot deliberately plays a deterministic classic
  click and does not modify the selected rhythm.
- iOS Voice/HFP/audioSession processing may change volume or spectrum.
  A reported device label is not proof of physical source. Bluetooth is
  deliberately outside this pilot.
- Timecode and ultrasonic audio are *not* present.
- No continuous audio stream is archived. Segmented sample capture is capped in
  RAM and disposed of when the run ends.

## CI and release rules
Before hardware testing, Node regressions AND browser smoke (including
`tests/acoustic-pilot-browser.mjs`) must pass. After a successful physical
pilot, add validated spectral overlap separation and CPU benchmark under a
separate follow-up commit. Do not merge into main until an external
physical timing reference has validated the output and user approves.

### Field-test interpretation, 27 Oct 2026

In the first reported iPhone test, all 6 count-in clicks were heard, while
21 pad transient events were detected and only 5/12 mixed clicks matched.
Those are not exact counts of physical strikes, and 0.0ms reported MAD
is below/near display resolution, not a claim of physical zero jitter.
The follow-up code doubles the pad strength window from 6 to 9 seconds,
adds longer attack/re-arm gating, and tests high-pass click matching during
pad overlap. Compare the three strength counts with the physical strikes
you intentionally perform, and do not interpret any mixed candidate as a
real-time calibrated early/late judgment yet.

## Guided five-phase update (27 Oct 2026)

The former 29-second all-in-one test with three-second pad-strength
windows was replaced after iPhone testing showed that it pressured users
and obscured the transition into the mixed click test. Strength samples
are now recorded and completed independently, with four detected attacks
per phase and originally manual next-stage controls (superseded by RC25.13.2). The bounded worklet sends short
volatile progress previews, and the same low-band detector is used for
a conservative counter. No fixed BPM applies to strength demonstrations.

Five short recordings are joined **in memory** into a virtual timeline:
actual silent waiting gaps are discarded, click schedules are re-based
using each segment's captured frame start, and analysis uses explicit
SOFT/MEDIUM/LOUD windows. The acoustic result remains provisional.
The simulator/Node/browser checks cannot prove timing accuracy on the
real iPhone microphone and speaker. Main MIC SENSOR, mixer, metronome,
statistics, and persisted data must remain unchanged.

## RC25.13.2 iPhone continuous-engine fix

The user's physical test found that SOFT detects four hits but pressing START MEDIUM leaves the UI listening without any new detections. Safari/iOS may stop rendering the worklet when the first capture is fully disarmed. The experimental fix keeps exactly **one worklet capture lifecycle** across five consecutive phases. The worklet sends each recorded segment independently, then advances internally after a short 2.5-second no-recording transition. The user presses START only once; pad stages change automatically after the fourth detected transient. The reference clicks and mixed clicks are scheduled after explicit countdowns without stopping and restarting the microphone graph. Worklet output is zero samples with nonzero gain to avoid silent-gain graph optimization while guaranteeing no live mic monitoring. Each phase remains bounded to 45 seconds, all samples remain RAM-only. Browser and synthetic worklet tests cannot certify behavior of the iPhone Safari audio graph; repeat the real iPhone test before declaring the issue resolved. 
