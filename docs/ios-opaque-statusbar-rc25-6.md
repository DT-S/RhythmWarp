# RC25.6 iOS standalone viewport / opaque status-bar trial

## Why
On iPhone 13 with iOS 26.7.1 the installed PWA reports:
- screen 390 × 844 CSS px
- window/layout/visual viewport 390 × 797 px
- safe-area top 47px, bottom 34px
- shell top 0, bottom 797px (90% UI scale)

That 47px delta is exactly the status-bar inset. On affected WebKit
standalone installs, a `black-translucent` status bar leaves an
unpaintable 47px strip **below** the web viewport. This is an OS-level
regression (WebKit bugs 313800 and 301994), not a reason to make the
LCARS shell extend below the paintable viewport.

## What this branch tries
- Change the **main app** HTML status-bar style from `black-translucent`
  to `black`. On a fresh standalone install this asks iOS to reserve
  the status bar **above** the app rather than lay out the app behind it.
- Keep `viewport-fit=cover` and `display:standalone`.
- Use `100dvh` for iPhone `html/body` without applying a fixed root.
- Continue to size the LCARS shell to measured *usable* viewport height,
  not `screen.height`; preserve keyboard and 90% UI-scale compensation.
- Label the diagnostics' screen/layout delta correctly as ambiguous:
  in black status-bar mode it can be reserved **at the top**, which is
  desirable, rather than an inaccessible bottom strip.
- Supply an independent, minimally styled Home Screen PWA
  `tests/ios-statusbar-probe.html` with its own manifest identity. It
  has purple/orange edge bars and shows physical vs paintable metrics.
- Increment the service-worker cache to allow offline upgrades.

## Observed outcome / decision (26 October 2026)
The user has tested RC25.6 and confirmed that the application functions
normally. However, the lower black strip is **not fixed** on the actual
installed iPhone PWA. The opaque-status-bar experiment has therefore **not
proven** an edge-to-edge full-screen solution. The user accepts the remaining
black strip and requested merging the otherwise working RC25.6 update.

**Status: deferred visual issue.** Do not claim the iOS full-height defect is
resolved. Preserve the functioning viewport clamp and keep a future native
WKWebView / iOS WebKit investigation as an optional separate change, not a
blocker for the current metronome release.

## Real-device test (must be an installed Home Screen app)
1. Deploy this branch to GitHub Pages for the test session. Switching
   Pages source changes what the repository site serves; it does not
   delete the already-installed app or its data.
2. On the iPhone open
   `https://dt-s.github.io/LCARSmetronome/tests/ios-statusbar-probe.html`
   in **Safari**, then select Share > Add to Home Screen.
3. Open the newly installed **LCARS Probe** icon, not the old LCARS icon.
   The test probe is intentionally separate from the real app.
4. Check if the orange lower band reaches the *bottom physical edge*
   (home-indicator area) and if the upper purple band starts below the
   system status bar. Screenshot the page and the diagnostic values.
5. Do **not** remove the old LCARS icon while testing. Don't delete the
   app to force new meta settings. Before any later reinstall, export
   important local data to a JSON backup and verify the saved file.

If the probe is good, the same status-bar mode is already applied to
the main app in this branch; test via a **newly installed** Home Screen
instance after backing up important data. iOS sometimes caches
status-bar rendering settings with the installed icon, so just updating
the service worker or refreshing the original icon is not a meaningful
test.

If the probe still shows a 47px bottom strip, it confirms that this
device's WebKit PWA container reserves space the DOM cannot draw into.
Do not add `screen.height-innerHeight` to the app's height: that merely
clips the LCARS rail below the web viewport. A native WKWebView container
is the next option if truly edge-to-edge iOS pixels are essential.

## Test limitations
- Chromium/Firefox CI can validate layout and regressions but **cannot**
  reproduce the physical iOS Home Screen status-bar geometry.
- A successful CI run must not be called a proven iPhone fullscreen fix.
- CSS may move status-bar geometry only in newly installed apps.
- This is an experimental branch, not a merge-ready release until the
  on-device probe is confirmed.

Sources:
- https://bugs.webkit.org/show_bug.cgi?id=313800
- https://bugs.webkit.org/show_bug.cgi?id=301994
- https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html
