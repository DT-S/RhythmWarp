import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LCARS_LED_COUNT,LCARS_TICK_COUNT,lcarsFraction,lcarsSnap,lcarsLedCount} from '../src/lcars-slider.js';
import {matrixValue,matrixFraction,MATRIX_SEGMENTS,matrixFineValue} from '../src/matrix-faders.js';
import {fresh,validate} from '../src/model.js';

test('reference swing endpoints, midpoint and triplet preset map to 24 LED capsules',()=>{
 assert.equal(LCARS_LED_COUNT,24);
 assert.equal(LCARS_TICK_COUNT,41);
 assert.equal(lcarsFraction(50,50,75),0);
 assert.equal(lcarsFraction(60,50,75),.4);
 assert.equal(lcarsFraction(67,50,75),.68);
 assert.equal(lcarsFraction(75,50,75),1);
 assert.equal(lcarsLedCount(50,50,75),0);
 assert.equal(lcarsLedCount(67,50,75),16);
 assert.equal(lcarsLedCount(75,50,75),24);
});
test('one-percent Swing controls clamp and never leave 50:50–75:25',()=>{
 assert.equal(lcarsSnap(49,50,75,1),50);
 assert.equal(lcarsSnap(76,50,75,1),75);
 assert.equal(lcarsSnap(66.7,50,75,1),67);
 assert.equal(lcarsSnap(.376,0,1,.01),.38);
 assert.equal(lcarsSnap(1.2,0,1,.01),1);
 assert.throws(()=>lcarsFraction(50,50,50),RangeError);
 assert.throws(()=>lcarsSnap(60,50,75,0),RangeError);
});
test('real audio and pan source values remain independent of visual animation',()=>{
 const s=fresh();s.swing=.67;s.channels[0].volume=.38;s.channels[0].pan=-.35;
 assert.deepEqual(validate(JSON.parse(JSON.stringify(s))),s);
 assert.equal(matrixValue('pan',.5),0);
 assert.equal(matrixFraction('pan',0),.5);
 assert.equal(matrixValue('volume',.38),.38);
 assert.equal(matrixFineValue(0,15,'pan'),.05);
 assert.equal(MATRIX_SEGMENTS,24);
});
test('RC4 new slider controls are wired to existing inputs and are precached offline',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/lcars-slider.js',import.meta.url),'utf8');
 const training=readFileSync(new URL('../src/training-ui.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(app,/mountLcarsSlider\(\$\('#swing'\)/);
 assert.match(app,/mountLcarsSlider\(input,\{kind:'volume'/);
 assert.match(training,/syncLcarsSlider\(\$\('swing'\)\)/);
 assert.match(js,/input\.dispatchEvent\(new Event\('input',\{bubbles:true\}\)\)/);
 assert.match(js,/input\.setAttribute\('aria-valuetext'/);
 assert.match(sw,/\.\/src\/lcars-slider\.js/);
 assert.match(sw,/\.\/v2-lcars-slider\.css/);
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 const expectedRelease=pkg.version.replace('-rc.',' RC');
 assert.ok(index.includes('Rhythm core '+expectedRelease),'UI release label must match package version');
});
test('RC4 LED animations honor reduced motion without introducing synthetic audio',()=>{
 const css=readFileSync(new URL('../v2-lcars-slider.css',import.meta.url),'utf8');
 const matrixCSS=readFileSync(new URL('../v2-matrix.css',import.meta.url),'utf8');
 const slider=readFileSync(new URL('../src/lcars-slider.js',import.meta.url),'utf8');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(matrixCSS,/matrix-capsule-scan/);
 assert.match(css,/lcars-bracket/);
 assert.doesNotMatch(slider,/createOscillator|setInterval|setTimeout/);
});
