import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('launch fascia matches the narrow app nav, at desktop, tablet and mobile sizes',()=>{
 const s=read('rhythm-warp-layout.css');
 assert.match(s,/--rw-launch-sidebar:clamp\(54px,5\.8vw,86px\)/);
 assert.match(s,/--rw-launch-sidebar:clamp\(52px,6\.3vw,60px\)/);
 assert.match(s,/--rw-launch-sidebar:clamp\(36px,10vw,44px\)/);
 assert.match(s,/--elbow-w:var\(--rw-launch-sidebar\)!important/);
 assert.match(s,/\.lcars-start-screen \.lcars-side-block > span/);
 assert.match(s,/border-radius:0!important/);
});
test('launch theme buttons keep full names, menu widths do not alter base metronome',()=>{
 const html=read('index.html'),s=read('rhythm-warp-layout.css');
 for(const name of ['STUDIO GREEN','VIOLET PULSE','RED SHIFT'])assert.ok(html.includes(name));
 assert.match(s,/\.lcars-start-screen \.lcars-side-block small \{/);
 assert.match(s,/\.app-shell \{\s*--v2-sidebar:clamp\(54px,5\.8vw,86px\)/);
});
