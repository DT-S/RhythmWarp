import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../v2-polish.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/diary-ui.js',import.meta.url),'utf8');
const chart=readFileSync(new URL('../src/charts.js',import.meta.url),'utf8');
const block=css.slice(css.indexOf('RC16 · READABILITY SYSTEM'));
test('RC16 defines dark readable section-heading ink across all LCARS panels',()=>{
 assert.ok(block.startsWith('RC16 · READABILITY SYSTEM'));
 assert.match(block,/:is\(#metronome,#audio,#presets,#diary,#analytics,#settings\) \.panel > :is\(h3,\.eyebrow\)/);
 assert.match(block,/color:#111019/);
 assert.match(block,/font-size:clamp\(17px,1\.35vw,21px\)/);
 assert.match(block,/@media \(max-width:640px\)[\s\S]*font-size:18px/);
 assert.match(block,/overflow-wrap:anywhere/);
 assert.match(block,/#analyticsContent \.panel \.field-name/);
 assert.match(app,/DATA FILTERS/);
 assert.match(app,/EXERCISE FILTER/);
});
test('RC16 makes the scatter-chart explanatory strip dark on pastel blue, no other UX changes',()=>{
 assert.match(chart,/EACH POINT = ONE SESSION · SELECT TO OPEN ITS RECORD/);
 assert.match(block,/:is\(#metronome,#audio,#presets,#diary,#analytics,#settings\) \.system-field/);
 assert.match(block,/#analyticsContent \.chart-readout/);
 assert.match(block,/text-shadow:none/);
 assert.doesNotMatch(block,/animation\s*:/);
 assert.doesNotMatch(block,/display\s*:/);
 assert.doesNotMatch(block,/background\s*:/);
 assert.doesNotMatch(block,/position\s*:/);
});
