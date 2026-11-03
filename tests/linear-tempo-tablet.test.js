import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileFrameHeight,visibleViewportHeight,keyboardSafeViewportHeight} from '../src/linear-layout.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../v2-layout.css',import.meta.url),'utf8');

test('Linear BPM uses the same gesture controller and common tempo state, never a second BPM model',()=>{
 for(const id of ['linearTempo','linearTempoValue','linearBpm','linearTempoPlus','linearTempoMinus'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/installTempoControl\(\$\('#linearTempo'\),\$\('#linearTempoValue'\),\$\('#linearBpm'\)/);
 assert.match(app,/v=>number\('bpm',v,20,400\),gestureGuide/);
 assert.match(app,/\['#tempoValue','#linearTempoValue'\]/);
 assert.match(app,/\['plus','linearTempoPlus'\]/);
 assert.match(app,/\['minus','linearTempoMinus'\]/);
 assert.match(html,/aria-valuemin="20" aria-valuemax="400"/);
 assert.match(css,/#metronome #linear \.linear-tempo-console/);
 assert.match(css,/#metronome #linear #linearTempoValue/);
});

test('iPad visible viewport governs zoom-correct frame height, including keyboard stability',()=>{
 const viewport=768;
 for(const zoom of [.7,.8,.9,1,1.1])
  assert.ok(Math.abs(mobileFrameHeight(viewport,zoom)*zoom-viewport)<1e-8);
 assert.equal(visibleViewportHeight(820,760,810),760);
 assert.equal(keyboardSafeViewportHeight(540,768,true),768);
 assert.match(app,/min-width:641px\) and \(max-width:1139px/);
 assert.match(app,/shell\.style\.height=\x60\$\{mobileFrameHeight\(height,state\.uiScale\)\}px\x60/);
 const i=css.lastIndexOf('Tablet ergonomics:');
 assert.ok(i>=0);
 const tablet=css.slice(i);
 assert.match(tablet,/max-width:1139px/);
 assert.match(tablet,/#metronome #dial:not\(\[hidden\]\)/);
 assert.match(tablet,/43dvh,420px/);
 assert.match(tablet,/#metronome \.transport\s*\{\s*order:0;/);
});
