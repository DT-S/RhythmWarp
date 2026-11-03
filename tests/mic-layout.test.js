import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../v2-mic.css',import.meta.url),'utf8');
test('sensor console lives below every primary instrument control',()=>{
 const body=html.slice(html.indexOf('<section id="metronome"'),html.indexOf('<section id="audio"'));
 for(const id of ['id="dial"','id="linear"','id="start"','id="tap"','id="beats"','id="subdivisions"']){
   assert.ok(body.indexOf(id)>=0 && body.indexOf(id)<body.indexOf('id="micConsole"'),id);
 }
 assert.equal((html.match(/id="micConsole"/g)||[]).length,1);
 assert.ok(body.indexOf('id="micConsole"')<body.indexOf('class="side-controls"'));
 assert.ok(body.indexOf('id="micConsole"')>body.indexOf('class="instrument"'));
});
test('phone transport is first; sensor is ordered last',()=>{
 assert.match(css,/#metronome \.instrument > \.transport\s*{\s*order:0;/);
 assert.match(css,/#metronome \.instrument-layout > #micVisual\s*\{order:1;/);
 assert.match(css,/#metronome \.instrument-layout > #micConsole\s*\{order:2;/);
 assert.match(css,/#metronome \.instrument-layout > \.side-controls\s*\{order:3;/);
 assert.match(css,/#metronome \.instrument > #dial,[\s\S]*?#metronome \.instrument > #linear\s*{\s*order:1;/);
});

test('calibration controls are present and backup code includes mic calibration',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(html,/id="micInputDelay"/);
 assert.match(html,/id="micDelayReset"/);
 assert.match(app,/micCalibrationMs/);
 assert.match(css,/#micConsole \.mic-calibration-row/);
});

test('guided reference selector is independent of metronome sound scheduler',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');
 const scheduler=readFileSync(new URL('../src/scheduler.js',import.meta.url),'utf8');
 assert.match(html,/id="micGridDivision"/);
 assert.match(html,/value="3">TRIPLETS/);
 assert.match(ui,/gridDivision\.disabled=!!session/);
 assert.doesNotMatch(scheduler,/micGridDivision|micReferenceDivision/);
});

test('mic status uses fixed-geometry LCARS LEDs, not resizing text labels',()=>{
 const ui=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');
 assert.match(html,/id="micHitLeds"/);
 for(const v of ['early','grid','late','extra','outside'])assert.ok(html.includes('data-led="'+v+'"'));
 assert.match(css,/#micOffset\s*\{[^}]*height:1\.5em/);
 assert.match(css,/#micHitLeds\s*\{[^}]*height:20px/);
 assert.match(css,/#micConsole \.mic-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(ui,/updateHitReadout/);
 assert.doesNotMatch(ui,/EXTRA REFERENCE HIT/);
});

test('grid lamp has a small display-only tolerance without altering offset values',()=>{
 const ui=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');
 assert.match(ui,/Math\.abs\(value\)<=10\?'grid'/);
 assert.match(ui,/value\.toFixed\(1\)/);
});

test('progress counters are visible only during guided capture and do not rewrite scheduler',()=>{
 const ui=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');
 const analysis=readFileSync(new URL('../src/mic-analysis.js',import.meta.url),'utf8');
 for(const id of ['micSlots','micDetected','micMissed','micSlotStrip'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(css,/#micSlotStrip\s*\{display:grid/);
 assert.match(ui,/slotStrip.hidden=!active\|\|mode!=='guided'/);
 assert.match(ui,/session\.progress\(audio\.ctx\.currentTime\)/);
 assert.match(ui,/stopProgressTimer\(\)/);
 assert.match(analysis,/this\.closedSlots/);
});

test('plot mode controls appear between sequencer and microphone settings',()=>{
 const source=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');
 const start=html.indexOf('id="metronome"');
 const dial=html.indexOf('id="dial"',start);
 const visual=html.indexOf('id="micVisual"',start);
 const console=html.indexOf('id="micConsole"',start);
 const settings=html.indexOf('id="micInputDelay"',start);
 assert.ok(dial<visual&&visual<console&&console<settings);
 assert.equal((html.match(/id="micLivePlot"/g)||[]).length,1);
 for(const kind of ['timing','rate','distribution'])
   assert.match(html,new RegExp('data-mic-plot="'+kind+'"'));
 assert.match(source,/import \{renderLiveSensor\}/);
 assert.match(source,/b\.addEventListener\('click',\(\)=>selectLivePlot/);
 assert.match(source,/visual\.hidden=!active/);
 assert.match(source,/mode==='free'&&b\.dataset\.micPlot!=='rate'/);
 assert.match(css,/#metronome #micVisual\[hidden\]\{display:none!important;\}/);
 assert.match(css,/#metronome\.mic-telemetry-on #dial\{width:min\(100%,210px\)/);
});

test('live plot updates coalesce in a single animation frame under fast mic input',()=>{
 const ui=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');
 assert.match(ui,/let sensorPaintPending=false/);
 assert.match(ui,/if\(sensorPaintPending\)return/);
 assert.match(ui,/requestAnimationFrame\(\(\)=>\{/);
 assert.match(ui,/rate\.textContent=format\(result\.rateBpm,' HITS\/MIN'\);\s*queueLivePlot\(\)/);
});

test('highlight selector uses stable record IDs rather than date-title comparisons',()=>{
 const ui=readFileSync(new URL('../src/mic-ui.js',import.meta.url),'utf8');
 assert.match(ui,/button\.dataset\.sessionId=id/);
 assert.match(ui,/button\.dataset\.sessionId===target\.id/);
 assert.match(ui,/BEST \/ ALL TIME/);
 assert.match(ui,/WORST \/ 7 DAYS/);
 assert.match(ui,/LATEST /);
});
test('backup exports a compact weekly index and restores old backups without one',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const store=readFileSync(new URL('../src/storage.js',import.meta.url),'utf8');
 assert.match(app,/const analysisCandidates=await listAnalysisCandidates\(\)/);
 assert.match(app,/raw\.analysisCandidates===undefined\?\[\]:validateCandidates/);
 assert.match(app,/replaceAnalysisSessions\(analysisSessions,analysisCandidates\)/);
 assert.match(store,/transaction\(\['data','analysisSessions'\],'readwrite'\)/);
 assert.match(store,/retainArchive\(merged,validateCandidates\(index\),Date\.now\(\)\)/);
 assert.match(store,/data\.put\(computed\.candidates,'analysisCandidateIndex'\)/);
});
