# Rhythm PADD 2.0.0 RC17 — Original UI Sound Bank

Source: user-supplied `sounds_update21102026.7z` (2026-10-21).
All fifteen MP3s were imported byte-for-byte, without recompression,
renaming, or replacing them with synthesized beeps. Each is decoded into
the existing dedicated UI gain bus and pre-cached for offline PWA use.
Metronome instruments and scheduler are deliberately unchanged.

| Event | New MP3 |
| --- | --- |
| Start/launch sequence (only when browser allows audio) | `launchsound_Staggered_Entrance_Animation.mp3` |
| Changing main navigation page | `menu_or_window_change.mp3` |
| Changing metronome mode / Circular vs Linear | `modechange.mp3` |
| Hover / touch feedback, when enabled | `hovering.mp3` |
| Standard button / Tap Tempo contact | `keypress_standart.mp3` |
| Numeric increase and fader + / ▲ | `keypress_increase.mp3` |
| Numeric decrease and fader − / ▼ | `keypress_decrease.mp3` |
| Disclosures / secondary options / checkboxes | `option_toggle_or_secondary_menu_pops_up.mp3` |
| General caution toast | `caution.mp3` |
| Opening diary delete confirmation | `consolewarning.mp3` |
| Explicitly cancel diary deletion | `denied.mp3` |
| Successfully erase diary entries | `erase_accepted.mp3` |
| Invalid input / rejected import | `invalid_input.mp3` |
| Press update/reload | `update&restart.mp3` |
| Close danger dialog via Escape | `windowcloses.mp3` |

## Known limitations and behavior

- Apple iOS/iPadOS Safari blocks audio autoplay until a user gesture
  allows the AudioContext to run. The cold-start animation is visual-first.
  Its launch sample plays only if sound is unlocked during the animation;
  it is deliberately **not** played long after the startup has completed.
- All fifteen sounds respect existing UI SOUND / UI VOLUME settings.
  Hover/touch samples additionally respect the hover setting.
- Older six UI sounds remain as codec/network fallbacks. The older generic
  success cue `Acceptsound.mp3` is intentionally retained because this pack
  has no equivalent universal positive-confirmation sound.
- The archive includes two pairs of **byte-identical** audio files:
  `update&restart.mp3` / `erase_accepted.mp3`, and
  `windowcloses.mp3` / `menu_or_window_change.mp3`.
  The semantic paths are separate so recordings can be replaced later.
- Original file rights/licensing for public distribution must be confirmed
  by the project owner before a final release.

## Validation

The Node suite checks offline precache entries, per-action cue routing,
source MP3 signatures, SHA-256 of reference originals, fallback audio bus,
and mute. Chromium decodes every uploaded MP3 through real Web Audio,
alongside the full pre-existing PWA/mobile/browser tests.
