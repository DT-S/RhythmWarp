import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionSeries} from '../src/charts.js';
const js=readFileSync(new URL('../src/charts.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../v2-astrometrics.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
test('Plotters use real practice measurements and preserve missing data gaps',()=>{
 assert.deepEqual(sessionSeries({seconds:20,history:[{at:0,bpm:120},{at:10,bpm:145}]}).map(p=>p.y),
 [120,120,145,145]);
 for(const token of ["class:'chart-grid chart-grid-line'","class:'chart-area'",
 "class:'chart-line-pulse'","node('div',undefined,'xy-plot-stage')","const chartStatic=points.length>120"])
  assert.ok(js.includes(token),token);
 assert.match(js,/if\(p.y===null\)\{finishArea\(\);connected=false;continue;\}/);
 assert.match(js,/if\(run.length>1\)/);
 assert.doesNotMatch(js,/chart-lock-reticle|lineReticle|setPointerCapture/);
 assert.doesNotMatch(js,/AudioContext|createOscillator|playTelemetryBeep/);
});
test('All Astrometrics effects avoid floating reticles, work offline and respect accessibility',()=>{
 for(const name of ['lcars-astrometrics-sweep','lcars-grid-calibrate','lcars-astrometrics-trace',
 'lcars-chart-area-fade','lcars-chart-energy-flow','lcars-astrometrics-bar',
 'lcars-astrometrics-point','lcars-probe-scan','lcars-target-pulse'])
  assert.ok(css.includes(name),name);
 assert.doesNotMatch(css,/chart-lock-reticle|lcars-reticle-spin/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/chart-motion-static/);
 assert.match(css,/lcars-chart-energy-flow 1850ms linear 600ms 2 both/);
 assert.match(html,/href="\.\/v2-astrometrics\.css"/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-studio-green-colors-v\d+'/);
 assert.match(sw,/'\.\/v2-astrometrics\.css'/);
});
