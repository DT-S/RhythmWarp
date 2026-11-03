# RC25.10 / Voyager Main Engineering / System Access

Isolated mobile-only Settings redesign based on the supplied proposal.
Feature branch: `feature/rc25-10-voyager-main-engineering`.
Base: `main`, RC25.9. This preview is **not merged**.

## Visual contract

The complete responsive design is appended to `v2-theme.css` and
scoped to `#settings` under 640 CSS pixels. The seven existing panels
and all controls retain their original HTML and JavaScript wiring:

1. Theme selector: condensed launch button, redundant explanatory hint
   hidden on phones only.
2. Interface size: compact scale choices, existing display information.
3. Interface feedback: 2×2 matrix for UI sounds, hover, haptic, start
   screen; full-width reduced-motion override below.
4. Custom sound memory: 44px drag-and-tap upload deck with full-size
   invisible input; loaded sounds in a single row (name, play, delete).
5. Backup and restore: side-by-side JSON export and import buttons,
   backup-help disclosure after the actions in visual order.
6. Offline and storage: a paired status readout over a pair of genuine
   persistent-storage/update actions. Variable status may wrap rather
   than being clipped.
7. Build telemetry: compact build and motion readouts. Viewport diagnostics
   and capability disclosures remain accessible.

The proposal used 8–11px labels and 13px headings in several places.
Those have been raised where necessary to respect established RC16
readability and 14px backup control tests. Button touch surfaces remain
generally 38–44px tall. The outcome should be evaluated on a real
iPhone and with all three palettes; the claimed "50% less scrolling"
is a design aspiration, **not** a measured or guaranteed result.

## Safety / behavior

- `src/custom-sounds.js` remains untouched. File limits still 16 items,
  2 MB and 5 seconds each.
- No changes to actual backup import/export, IndexedDB data, offline
  update logic, theme persistence, interface settings, or audio.
- No change to any other page's layout, or the deferred iOS PWA
  reserved bottom strip.
- HTML changes are limited to visible build/version labels RC25.10.
- Service Worker cache bumps to namespace `...12-settings-engineering`;
  `v2-theme.css` was already a cached offline asset.

## Validation

Run `npm test` and
`node tests/settings-engineering-browser.mjs` (Playwright installed
in CI). The latter checks grid and bounding box geometry at
320px, 390px, 768px and 1440px, tests native checkbox interaction,
the untouched diagnostic disclosure, invisible file-input hit area,
and a temporary sound-row fixture without affecting saved audio.
The preview screenshots upload to GitHub Actions under
`artifacts/settings-engineering`.

For iPhone preview temporarily select the feature branch in
GitHub Settings → Pages. This alters the live Pages source without
merging `main`; keep a JSON backup and do not clear PWA storage.
