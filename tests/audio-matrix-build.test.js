import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matrixBuildStart,MATRIX_BUILD_START_MS,MATRIX_SEGMENTS,matrixFraction} from '../src/matrix-faders.js';
import {LCARS_AUDIO_BUILD_DURATION_MS,LCARS_PAGE_BUILD_DURATION_MS,createMotionController} from '../src/motion.js';

test('RC11 stage timing walks through real stereo channels and all four faders',()=>{
 assert.equal(MATRIX_SEGMENTS,24);
 assert.equal(MATRIX_BUILD_START_MS,240);
 const starts=[matrixBuildStart(0,'volume'),matrixBuildStart(0,'pan'),
               matrixBuildStart(1,'volume'),matrixBuildStart(1,'pan')];
 assert.deepEqual(starts,[240,355,380,495]);
 assert.ok(starts.every((v,i)=>i===0||v>starts[i-1]));
 const lastLED=starts[3]+205+(MATRIX_SEGMENTS-1)*9+165;
 assert.ok(lastLED<LCARS_AUDIO_BUILD_DURATION_MS,'last LED must finish before cleanup');
 const lastReadout=starts[3]+580+190;
 assert.ok(lastReadout<LCARS_AUDIO_BUILD_DURATION_MS,'final pan readout must finish');
 assert.ok(LCARS_AUDIO_BUILD_DURATION_MS>LCARS_PAGE_BUILD_DURATION_MS);
 assert.equal(matrixFraction('pan',0),.5,'center pan mapping never changes');
 for(const invalid of [[-1,'pan'],[2,'side'],[0,'foobar'],[1.5,'volume']]){
  assert.throws(()=>matrixBuildStart(...invalid),RangeError);
 }
});

test('RC11 audio-specific lifecycle keeps the other page and main menu durations',()=>{
 const cls=()=>{const s=new Set();return {add:v=>s.add(v),remove:v=>s.delete(v),contains:v=>s.has(v)};};
 const pages=['metronome','audio','settings'].map(id=>({id,hidden:id!=='metronome',offsetWidth:100,classList:cls()}));
 const byId=Object.fromEntries(pages.map(p=>[p.id,p]));
 const shell={classList:cls()};
 const root={querySelectorAll:()=>pages,querySelector:q=>q==='.app-shell'?shell:null,getElementById:id=>byId[id]};
 const previous={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,matchMedia:globalThis.matchMedia};
 let next=0;const timers=new Map();
 try {
  globalThis.setTimeout=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};
  globalThis.clearTimeout=id=>timers.delete(id);
  globalThis.matchMedia=()=>({matches:false});
  const motion=createMotionController(root);
  byId.metronome.hidden=true;byId.audio.hidden=false;
  assert.equal(motion.page('audio'),true);
  assert.deepEqual([...timers.values()].map(x=>x.ms),[LCARS_AUDIO_BUILD_DURATION_MS]);
  assert.equal(shell.classList.contains('lcars-page-building'),false);
  byId.audio.hidden=true;byId.settings.hidden=false;
  assert.equal(motion.page('settings'),true);
  assert.deepEqual([...timers.values()].map(x=>x.ms),[LCARS_PAGE_BUILD_DURATION_MS]);
  assert.equal(byId.audio.classList.contains('lcars-page-enter'),false);
  [...timers.values()][0].fn();
  assert.equal(byId.settings.classList.contains('lcars-page-enter'),false);
 }finally{
  globalThis.setTimeout=previous.setTimeout;globalThis.clearTimeout=previous.clearTimeout;
  if(previous.matchMedia===undefined)delete globalThis.matchMedia;
  else globalThis.matchMedia=previous.matchMedia;
 }
});

test('RC11 animation scopes real mixer parts, master outputs, and preserves reduced motion',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const matrixJS=readFileSync(new URL('../src/matrix-faders.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const block=css.slice(css.indexOf('RC11 · AUDIO MATRIX'));
 assert.ok(block.length>3500);
 for(const selector of [
  '#audio.lcars-page-enter #mixer .matrix-module .matrix-label',
  '#audio.lcars-page-enter #mixer .matrix-module .matrix-titlebar',
  '#audio.lcars-page-enter #mixer .matrix-module .matrix-segment',
  '#audio.lcars-page-enter #mixer .matrix-module .matrix-bracket',
  '#audio.lcars-page-enter #mixer .matrix-module .matrix-fine-row',
  '#audio.lcars-page-enter #mixer .matrix-module .matrix-pan-micro',
  '#audio.lcars-page-enter .master .lcars-pill',
  '#audio.lcars-page-enter .master .lcars-bracket'
 ])assert.ok(block.includes(selector),'missing LCARS mixer stage '+selector);
 assert.match(matrixJS,/--matrix-led-build-delay/);
 assert.match(block,/var\(--matrix-led-build-delay\)/);
 assert.doesNotMatch(block,/(?:translate[XYZ]?|scale[XYZ]?)\(/,'never shift live fader input geometry');
 assert.doesNotMatch(block,/\.app-shell\.lcars-page-enter|\.app-shell\.lcars-page-building/);
 assert.match(block,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(sw,/const CACHE=PREFIX\+'lcars-core-v2-rc\d+-/);
});
