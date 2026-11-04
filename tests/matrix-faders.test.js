import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MATRIX_SEGMENTS,MATRIX_TICKS,matrixClamp,matrixValue,matrixFraction,matrixFineValue,matrixFormat} from '../src/matrix-faders.js';

test('source-derived segmented control has 24 LED bands and 35 fine ticks',()=>{
 assert.equal(MATRIX_SEGMENTS,24);
 assert.equal(MATRIX_TICKS,35);
});
test('scrub absolute positions map exactly to the real channels',()=>{
 assert.equal(matrixValue('volume',0),0);
 assert.equal(matrixValue('volume',.45),.45);
 assert.equal(matrixValue('volume',1),1);
 assert.equal(matrixValue('pan',0),-1);
 assert.equal(matrixValue('pan',.5),0);
 assert.equal(matrixValue('pan',.59),.18);
 assert.equal(matrixValue('pan',1),1);
 assert.equal(matrixValue('pan',2),1);
 assert.equal(matrixFraction('pan',0),.5);
 assert.equal(matrixFraction('pan',-.38),.31);
});
test('3 px per percent fine relative scrubbing keeps boundaries and precision',()=>{
 assert.equal(matrixFineValue(.5,30,'volume'),.6);
 assert.equal(matrixFineValue(.5,-30,'volume'),.4);
 assert.equal(matrixFineValue(0,27,'pan'),.09);
 assert.equal(matrixFineValue(-1,-50,'pan'),-1);
 assert.equal(matrixFineValue(1,40,'volume'),1);
 assert.equal(matrixClamp(-5,-1,1),-1);
 assert.throws(()=>matrixFineValue(.2,5,'volume',0),RangeError);
});
test('embedded display is accurate, no floating PAN badge',()=>{
 assert.equal(matrixFormat('volume',.45),'045%');
 assert.equal(matrixFormat('pan',.18),'R 18%');
 assert.equal(matrixFormat('pan',-.99),'L 99%');
 assert.equal(matrixFormat('pan',0),'CENTER');
});

test('Voyager UI ships no scanline mask, animated SYS nodes or fake telemetry',()=>{
 const css=readFileSync(new URL('../v2-matrix.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/matrix-faders.js',import.meta.url),'utf8');
 assert.doesNotMatch(css,/\.padd-frame::after|\.sidebar-node|nodeBlink/);
 assert.doesNotMatch(js,/telemetryStream|Math\.random\(|createOscillator\(/);
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.match(js,/matrix-pan-micro/);
});
