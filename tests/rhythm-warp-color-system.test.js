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
 assert.match(css,/--matrix-led-band-1:linear-gradient\(#b3df94,#7cbb94,#4d6b55\)/);
 assert.match(css,/#analyticsContent \.stat-tile:nth-child\(n\)/);
 assert.match(css,/#settings #soundDrop/);
 assert.match(css,/\.lcars-cap-readout > \.lcars-cap-value/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/#rings \.point\.state3:not\(\.playing\)/);
});
