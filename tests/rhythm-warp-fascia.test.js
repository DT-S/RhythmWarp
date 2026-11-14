import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('the sidebar-only layout loads after all color themes and is fully precached',()=>{
 const html=read('index.html'),sw=read('sw.js');
 assert.ok(html.indexOf('rhythm-warp-layout.css')>html.indexOf('rhythm-warp-colors.css'));
 assert.match(sw,/\.\/rhythm-warp-layout\.css/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-palettes-v12'/);
});
test('buttons have square corners, rail extends, and detached end is hidden',()=>{
 const css=read('rhythm-warp-layout.css');
 assert.match(css,/border-radius:0!important/);
 assert.match(css,/\.app-shell > aside \.rail-end \{\s*display:none!important/);
 assert.match(css,/\.app-shell > aside \.rail \{[\s\S]*?flex:1 1 auto!important/);
 assert.match(css,/mask-image:none!important/);
});
test('mobile header elbow uses the same anchor as its slimmer sidebar',()=>{
 const css=read('rhythm-warp-layout.css');
 assert.match(css,/--rw-mobile-sidebar:clamp\(36px,10vw,44px\)/);
 assert.match(css,/--lcars-bus-start:calc\(var\(--rw-mobile-sidebar\) \+ 30px\)/);
 assert.match(css,/grid-template-columns:var\(--rw-mobile-sidebar\) minmax\(0,1fr\)!important/);
 assert.match(css,/width:calc\(var\(--rw-mobile-sidebar\) \+ 30px\)!important/);
});
test('this patch does not contain theme-specific color literals',()=>{
 const css=read('rhythm-warp-layout.css');
 assert.doesNotMatch(css,/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i);
});

test('HUD frame preserves launch tracks and removes decorative inner cutouts',()=>{
 const css=read('rhythm-warp-layout.css');
 assert.ok(css.includes('grid-template-columns:var(--elbow-w) minmax(0,1fr)!important'));
 assert.ok(css.includes('--rw-launch-gap:clamp(5px,.7vw,8px)'));
 assert.ok(css.includes('--rw-corner:2px 14px 2px 14px'));
 assert.ok(css.includes('.app-shell > header .elbow::after,'));
 assert.ok(css.includes('content:none!important'));
 assert.ok(!css.includes('clip-path:'));
 assert.ok(!css.includes('--rw-launch-cutout'));
});

test('frame uses one set of semantic border widths and no large arcs',()=>{
 const css=read('rhythm-warp-layout.css');
 assert.equal((css.match(/--rw-frame-edge-w:/g)||[]).length,1);
 assert.ok(css.includes('border-top:2px solid var(--rw-edge)!important'));
 assert.ok(css.includes('border-bottom:2px solid var(--rw-edge)!important'));
 assert.ok(!css.includes('border-radius:28px'));
});
