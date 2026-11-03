import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../v2-layout.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('V2 layout is a separate tablet/desktop stylesheet preserving compact PADD',()=>{
 assert.match(html,/href="\.\/style\.css"/);
 assert.match(html,/href="\.\/v2-layout\.css"/);
 assert.ok(html.indexOf('href="./style.css"')<html.indexOf('href="./v2-layout.css"'));
 assert.match(source,/@media \(min-width:641px\)/);
 assert.doesNotMatch(source,/@media \(max-width:640px\)/);
 assert.ok(worker.includes("'./v2-layout.css'"),'offline cache must contain the V2 layout');
});
test('V2 tablet/desktop layout has fixed frame and scrollable content well',()=>{
 assert.match(source,/grid-template-rows:clamp\(/);
 assert.match(source,/grid-template-columns:var\(--v2-sidebar\) minmax\(0,1fr\)/);
 assert.match(source,/\.app-shell > main\s*\{/);
 assert.match(source,/overflow-y:auto/);
 assert.match(source,/\.app-shell::after\s*\{/);
 assert.match(source,/safe-area-inset-bottom/);
});
test('V2 layout preserves the structural audio and beat controls',()=>{
 for(const selector of ['#modeButtons','#metronome #dial','#metronome #linear','#metronome .transport',
                       '#mixer.cards','#mixer .sound-choices','#mixer .pan-scale']){
  assert.ok(source.includes(selector),`Missing selector ${selector}`);
 }
});
