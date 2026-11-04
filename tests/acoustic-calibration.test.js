import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TimingSession} from '../src/mic-analysis.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('manual input delay remains the sole correction in guided sessions',()=>{
 const s=new TimingSession({mode:'guided',at:0,bpm:120,inputDelayMs:80.7});
 s.addGrid({anchor:0,bpm:120,length:4});
 assert.equal(s.hit(.5807,.9).offsetMs,0);
 assert.equal(s.snapshot(1,'manual').inputDelayMs,80.7);
});
test('simple six-click monitor never saves or applies an offset',()=>{
 const ui=read('../src/acoustic-pilot-ui.js'),app=read('../src/app.js');
 assert.match(ui,/measureClickOffset/);
 assert.match(ui,/clickOnly:true/);
 assert.doesNotMatch(ui,/PAD LEARN|onApplyCalibration|writeMicCalibration|acousticInputDelayCandidate/);
 assert.doesNotMatch(app,/onApplyCalibration/);
 assert.match(read('../index.html'),/Manual offset/);
 assert.match(read('../sw.js'),/\.\/src\/click-offset-analysis\.js/);
});
