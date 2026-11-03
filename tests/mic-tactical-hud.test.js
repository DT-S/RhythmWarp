import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderLiveSensor} from '../src/mic-live-plots.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../v2-mic.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');

function fakeSvg(){
 const doc={createElementNS(_ns,tag){
  return {tag,attrs:{},setAttribute(name,value){this.attrs[name]=String(value);}};
 }};
 return {ownerDocument:doc,children:[],attrs:{},
  setAttribute(name,value){this.attrs[name]=String(value);},
  replaceChildren(){this.children=[];},
  append(child){this.children.push(child);}
 };
}

test('mobile LCARS controls preserve unique production IDs and native transport wiring',()=>{
 const ids=['modeDrawerToggle','activeModeLabel','modeButtons','deckParamsToggle',
  'deckMicToggle','trainingDeck','micConsole','micArm','micOffset','micHitLeds',
  'micGridDivision','micInputDelay','micDelayReset','micLivePlot'];
 for(const id of ids)assert.equal(html.split('id="'+id+'"').length-1,1,id);
 assert.match(html,/id="modeDrawerToggle"[^>]*aria-controls="modeButtons"/);
 assert.match(html,/id="deckMicToggle"[^>]*aria-controls="micConsole"/);
 assert.match(html,/<details class="lcars-info mic-cfg-drawer">/);
 assert.ok(html.indexOf('id="micArm"')>html.indexOf('id="micSlotStrip"'));
 assert.match(app,/function setModeDrawer\(open\)/);
 assert.match(app,/setModeDrawer\(false\);render\(\)/);
 assert.match(ui,/CustomEvent\('lcars:mic-state'/);
 assert.match(ui,/pulseTargetLock\(lamp\)/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/#metronome:not\(\.mode-drawer-open\) #modeButtons\{display:none!important;\}/);
 assert.match(css,/#metronome\.mic-telemetry-on #micConsole\.mic-active/);
});

test('timing view draws mathematically scaled 10ms tolerance and one stem per detected hit',()=>{
 const svg=fakeSvg();
 const result=renderLiveSensor(svg,[[1000,-8,1,80],[2000,14,1,90],[2200,null,1,95]],
  {kind:'timing',mode:'guided',bpm:120,division:2});
 assert.equal(result.count,2);
 const band=svg.children.filter(x=>x.attrs.class==='mic-tolerance-corridor');
 assert.equal(band.length,1);
 const tolerancePixels=Number(band[0].attrs.height);
 assert.ok(Math.abs(tolerancePixels-9.6)<1e-8);
 assert.equal(svg.children.filter(x=>x.attrs.class==='mic-sensor-stem').length,2);
 assert.equal(svg.children.filter(x=>x.attrs.class==='mic-sensor-dot').length,2);
 assert.equal(svg.children.filter(x=>x.attrs.class==='mic-sensor-reference').length,1);
});

test('rate and distribution panels never claim an offset tolerance corridor',()=>{
 for(const kind of ['rate','distribution']){
  const svg=fakeSvg();
  renderLiveSensor(svg,[[1000,-6,1,80],[2000,9,1,120]],
   {kind,mode:'guided',bpm:120,division:1});
  assert.equal(svg.children.filter(x=>x.attrs.class==='mic-tolerance-corridor').length,0);
  assert.equal(svg.children.filter(x=>x.attrs.class==='mic-sensor-stem').length,0);
 }
});

test('startup mode rendering uses the array selector, never one DOM element as an array',()=>{
 assert.match(app,/\$\$\('\[data-mode\]'\)\.forEach/);
 assert.doesNotMatch(app,/(?<!\$)\$\('\[data-mode\]'\)\.forEach/);
});
test('armed microphone leaves view controls and setup discoverable, with readable circular steps',()=>{
 assert.match(css,/#metronome\.mic-telemetry-on \.section-heading\{[\s\S]*?display:flex!important/);
 assert.match(css,/#metronome\.mic-telemetry-on \.section-heading #view\{/);
 assert.match(css,/width:min\(100%,216px\)!important/);
 assert.match(css,/#metronome\.mic-telemetry-on #rings \.node-label\{font-size:23px;/);
 assert.match(css,/\.mic-controls-open #micConsole\.mic-active > \.mic-cfg-drawer/);
 assert.match(app,/metronomePage\.classList\.toggle\('mic-controls-open'\)/);
 assert.match(ui,/DISENGAGE MIC \/\/ END SESSION/);
 assert.match(html,/id="micActiveHelp"/);
});
