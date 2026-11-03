# RC25.8 Preview — Voyager Personal Log / Archive Subsystem

This is an **isolated, unmerged design branch** based on `main` at RC25.7.
It implements the user-provided Diary/Practice Log design proposal without
altering journal data, timing analysis, validation, export, backups or audio.

## Scope
- `v2-diary-archive.css`: a final-loaded and `#diary`-scoped presentation
  stylesheet so the other five LCARS pages stay unchanged.
- `#entryCount`: a compact telemetry capsule beside the Practice Log header.
- `#diarySetup`: native `details/summary` setup drawer; initially **closed
  only on phones** (up to 640px), open on tablet/desktop. Opens normally
  through keyboard/VoiceOver; user state is not forcibly reset by re-rendering.
- Auto-log, four minimum-duration presets, category chooser, category creation
  and Recording Info remain editable within the setup drawer.
- Manual Session and CSV export: compact two-segment action rail.
- Journal entries: dense three-column, two-row LCARS telemetry with the order
  START / DURATION / TEMPO, CATEGORY / MODE / SOURCE. The narrowest devices
  (<=360px) use two columns rather than truncating values.
- The mobile manual-session editor retains paired fields (including numeric
  controls); local time and notes span both columns. Existing iOS keyboard
  and scrolling workaround remains in place.
- Colors use current `--padd-*` variables for Voyager / Elite Force / Red
  Alert. No hard-coded changes to the existing theme selection.
- Preview version `2.0.0-rc.25.8` and bumped offline cache namespace.

## Test contract
`npm test` validates that legacy ID wiring, renderer operations and offline
assets remain in place. GitHub Actions additionally runs
`tests/diary-archive-browser.mjs`, seeding sample practice records in
IndexedDB, checking the native setup drawer, column counts, scroll
visibility and editor layout at 320px / 390px / 768px / 1440px. It writes
screenshots to `artifacts/diary-archive` and attaches them to CI.

## Testing on GitHub Pages
The branch must be selected as the GitHub Pages source for the preview.
Switching Pages to this branch changes what the site serves but **does not
merge or update** the `main` code branch.

Important: Live user browser storage is retained across site revisions.
Export a JSON backup before changing Pages branches or experimenting with
restores; do not remove an installed PWA or clear Safari website data.

## Explicitly not changed
- No changes to automatic-recording threshold logic or saved practice entries
- No replacement of DOM IDs, record validation, CSV export or JSON backups
- No changes to the separate microphone statistics page
- No fix attempted for the deferred iOS PWA black bottom strip
