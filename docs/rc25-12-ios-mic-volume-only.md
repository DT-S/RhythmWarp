# RC25.12 | Retain iOS microphone volume routing fix only

Scope: preserve the working iOS microphone audio-session workaround from the
abandoned acoustic auto-calibration experiment (former draft PR #50).

## Evidence from user testing
- Activating the microphone originally reduced **all metronome/app output**
  volume on iPhone, regardless of calibration sweep gain.
- Following the iOS-only AudioSession workaround, the user confirmed the
  output had become **significantly louder** with microphone active.
- Approximately 20 subsequent acoustic auto-calibration attempts using
  Jabra Elite 75t Bluetooth headphones were unreliable, even with a
  stronger/shorter test impulse, varied mic input devices and positioning.
- The diagnostic screenshot reported Jabra Elite 75t microphone, **1 of 16**
  valid probes and +207.3ms median from that one probe. That cannot certify
  audio or drumming latency. The experimental algorithm was explicitly
  declined and remains **unmerged**.

## This branch
- Adds only `src/mic-audio-session.js` for WebKit/iOS:
  - `audioSession.type='auto'` before `getUserMedia()`;
  - `audioSession.type='play-and-record'` once acquired;
  - `audioSession.type='playback'` then `'auto'` after releasing tracks.
- Applies it to ordinary `MicCapture` only, preserving existing Guided/Free
  capture, onset detection, UI, storage, scheduler and manual input delay.
- Non-iOS and browsers without the audioSession API are no-ops.
- Unit tests cover the route lifecycle and error cases.
- Updates the offline PWA cache to precache the new module.

## Deliberately absent
There is **no** new automatic calibration, chirp, recorder, signal analysis,
Bluetooth-input selector, correction profile, or change to training offsets.
Those features were experimental and are dropped from the release plan.
Existing manual `INPUT DELAY / MS` remains available, but an arbitrary
manual value is not proof of absolute physical onset timing. Mic timing
and EARLY/GRID/LATE labels should remain clearly experimental.

This branch is limited to a user-confirmed **volume** improvement and does
not claim that Bluetooth latency was corrected or that iOS chooses a
particular physical microphone.
