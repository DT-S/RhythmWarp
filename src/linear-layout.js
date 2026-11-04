/**
 * Choose balanced row lengths for a phone-width LCARS linear sequencer.
 * Prefer one row and only wrap when a numbered step would become too narrow.
 * Every produced row is independently stretched to the full available width.
 */
export function linearRowSizes(count, availableWidth, minStepWidth = 30, gap = 4) {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new RangeError('Invalid step count');
  const width = Math.max(1, Number.isFinite(availableWidth) ? availableWidth : 1);
  const capacity = Math.max(1, Math.floor((width + gap) / (minStepWidth + gap)));
  const rows = Math.ceil(count / capacity);
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({length: rows}, (_, i) => base + (i < extra ? 1 : 0));
}

/** Visible viewport height in CSS pixels, independent from browser CSS `zoom`. */
export function mobileFrameHeight(viewportHeight, scale) {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) throw new RangeError('Invalid viewport height');
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('Invalid scale');
  return viewportHeight / scale;
}

/**
 * `screen.height` is deliberately excluded: iOS reports physical screen areas
 * that a standalone PWA cannot lay out into (status and home-indicator zones).
 * Never use a larger dimension than the visible layout/visual viewport.
 */
export function visibleViewportHeight(innerHeight, visualViewportHeight, documentHeight) {
  const candidates=[innerHeight, visualViewportHeight, documentHeight]
    .filter(v=>Number.isFinite(v)&&v>0);
  if(!candidates.length) throw new RangeError('No visible viewport dimensions');
  return Math.min(...candidates);
}

/** Keep the LCARS fascia at pre-keyboard height when visualViewport shrinks. */
export function keyboardSafeViewportHeight(measured,stable,isEditing,threshold=110){
 if(!Number.isFinite(measured)||measured<=0)throw new RangeError('Invalid viewport height');
 return Number.isFinite(stable)&&stable>0&&(isEditing||measured<stable-threshold)?stable:measured;
}

/**
 * Diagnostic only: the physical iPhone screen can include a WebKit-owned strip
 * BELOW the paintable PWA viewport. Do not size DOM elements using screen.height.
 * Return the unreachable gap in CSS px, or null outside supported iPhone portrait
 * standalone contexts. Some OS versions report the correct viewport (gap = 0).
 */
export function standaloneIPhoneViewportGap(layoutHeight,screenWidth,screenHeight,viewportWidth,standaloneIPhone){
 if(!standaloneIPhone)return null;
 if(![layoutHeight,screenWidth,screenHeight,viewportWidth].every(x=>Number.isFinite(x)&&x>0))return null;
 if(screenHeight<=screenWidth||Math.abs(screenWidth-viewportWidth)>4)return null;
 const gap=screenHeight-layoutHeight;
 if(gap < -2||gap > 130)return null;
 return Math.max(0,gap);
}
