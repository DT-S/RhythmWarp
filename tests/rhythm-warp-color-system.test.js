import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('one semantic palette loaded LAST and cached offline',()=>{
 const html=read('index.html'),sw=read('sw.js'),css=read('rhythm-warp-colors.css');
 assert.ok(html.indexOf('rhythm-warp-colors.css')>html.indexOf('rhythm-warp.css'));
 assert.match(sw,/\.\/rhythm-warp-colors\.css/);
 assert.match(css,/--rw-bg-0:#08100d/);
 assert.match(css,/--rw-edge:#85f4a3/);
 for(const token of ['--rw-active','--rw-info','--rw-neutral','--rw-custom','--rw-warning','--rw-danger'])
  assert.match(css,new RegExp(token+':#[0-9a-f]{6}'));
});
test('equal structural edges, no random frame glow, shape geometry unchanged',()=>{
 const css=read('rhythm-warp-colors.css');
 for(const selector of ['.app-shell > header .elbow','.app-shell > aside .rail','.app-shell::after','.lcars-start-screen .lcars-side-filler'])
  assert.ok(css.includes(selector),'missing frame edge '+selector);
 assert.match(css,/border-left-color:var\(--rw-edge\)!important/);
 assert.match(css,/box-shadow:none!important/);
 assert.doesNotMatch(css,/grid-template-columns|grid-template-rows|min-height:\d+px|width:\d+px|padding:\d+px/);
});
test('all three UI themes share semantics and matrix LEDs no longer use orange',()=>{
 const css=read('rhythm-warp-colors.css');
 assert.match(css,/html\[data-app-theme="elite"\]/);
 assert.match(css,/html\[data-app-theme="redalert"\]/);
 assert.match(css,/--matrix-led-band-1:linear-gradient\(var\(--rw-active\),var\(--rw-matrix-led-mid\),var\(--rw-inactive\)\)/);
 assert.match(css,/#analyticsContent \.stat-tile:nth-child\(n\)/);
 assert.match(css,/#settings #soundDrop/);
 assert.match(css,/\.lcars-cap-readout > \.lcars-cap-value/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/#rings \.point\.state3:not\(\.playing\)/);
});

test('start frame edge continuity and violet control cleanup',()=>{
 const css=read('rhythm-warp-colors.css');
 for(const name of ['.lcars-start-screen .lcars-rail-segments .lcars-seg',
 '.lcars-start-screen .lcars-bottom-segments .lcars-seg',
 '.lcars-start-screen .lcars-side-filler',
 '#diary .diary-minimum-choices button',
 '#settings .panel label:has(input[type="checkbox"]):not(:has(input:checked))'])
 assert.ok(css.includes(name),'missing '+name);
 assert.match(css,/border-right-color:var\(--rw-edge\)!important/);
});

test('custom sound upload uses Studio Green teal and no deliberate purple palette token',()=>{
 const css=read('rhythm-warp-colors.css');
 assert.match(css,/--rw-custom:#8cceb4/);
 assert.doesNotMatch(css,/--rw-custom:#c4a3d5/);
 assert.match(css,/#settings #soundDrop:focus-within/);
});

test('three complete semantic themes, distinct colors, unchanged compatibility IDs',()=>{
 const css=read('rhythm-warp-colors.css'), html=read('index.html');
 for(const [id,heading,edge,bg] of [
  ['elite','VIOLET PULSE','#cd9bff','#120e1e'],
  ['redalert','RED SHIFT','#ff8294','#1a0e12']]){
  assert.match(html,new RegExp('<span>'+heading+'</span>'));
  const marker='.lcars-start-screen[data-theme="'+id+'"]';
  assert.ok(css.includes(marker),'missing launch palette '+id);
  assert.ok(css.includes('--rw-edge:'+edge));
  assert.ok(css.includes('--rw-bg-1:'+bg));
 }
 assert.match(html,/STUDIO GREEN/);
 assert.match(read('src/lcars-theme.js'),/THEMES=Object.freeze\(\['voyager','elite','redalert'\]\)/);
});
test('palette tokens drive faders, ring strokes and startup SVG',()=>{
 const css=read('rhythm-warp-colors.css');
 assert.match(css,/--matrix-led-band-1:linear-gradient\(var\(--rw-active\)/);
 assert.match(css,/#rings \.track\{stroke:var\(--rw-ring-track\)!important;\}/);
 assert.match(css,/\.lcars-start-screen \.lcars-start-logo \[stroke="#85f4a3"\]/);
});

test('launch CTA, status labels and input colors inherit theme semantic roles',()=>{
 const css=read('rhythm-warp-colors.css');
 assert.match(css,/--ice:var\(--rw-info\)!important/);
 assert.match(css,/--cream:var\(--rw-neutral\)!important/);
 assert.match(css,/html\[data-app-theme\] \.lcars-start-screen \.lcars-activate-wrap \.lcars-start-activate/);
 assert.match(css,/#trainingFields \.system-field/);
});
