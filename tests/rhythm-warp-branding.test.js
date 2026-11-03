import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('student branding in HTML and PWA manifest',()=>{
 const html=read('index.html'),m=JSON.parse(read('manifest.webmanifest'));
 assert.equal(m.name,'Rhythm Warp');assert.equal(m.short_name,'Rhythm Warp');
 assert.match(html,/<title>Rhythm Warp<\/title>/);
 assert.match(html,/START RHYTHM WARP/);
 assert.doesNotMatch(html,/(?:USS VOYAGER|ELITE FORCE|RED ALERT|STARFLEET|INITIALIZE LCARS|RHYTHM PADD)/);
});
test('offline shell includes latest theme and isolated cache prefix',()=>{
 assert.match(read('sw.js'),/\.\/rhythm-warp\.css/);
 assert.match(read('index.html'),/href="\.\/rhythm-warp\.css"/);
 assert.match(read('sw.js'),/const PREFIX='rhythm-warp-/);
});
test('the new launch emblem is not a delta triangle',()=>{
 const html=read('index.html');
 assert.match(html,/Rhythm Warp timing emblem/);
 assert.doesNotMatch(html,/M 120 34 L 166 176/);
});
