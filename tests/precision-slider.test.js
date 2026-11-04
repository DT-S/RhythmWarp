import test from 'node:test';
import assert from 'node:assert/strict';
import {fineSensitivity,precisionDelta,formatPan,formatVolume} from '../src/precision-slider.js';

test('LCARS precision gesture gets finer with distance in either direction',()=>{
 assert.equal(fineSensitivity(0),1);
 assert.equal(fineSensitivity(32),1);
 assert.equal(fineSensitivity(64),.5);
 assert.equal(fineSensitivity(128),.25);
 assert.equal(fineSensitivity(800),.08);
 assert.equal(fineSensitivity(-64),1);
 assert.ok(precisionDelta(0,10,0,100,-1,1)>precisionDelta(0,10,130,100,-1,1));
});
test('precision fader respects ranges, accumulates fractional drag and rejects invalid bounds',()=>{
 assert.equal(precisionDelta(0,50,0,100,-1,1),1);
 assert.equal(precisionDelta(-1,-100,0,100,-1,1),-1);
 assert.equal(precisionDelta(.5,10,64,100,0,1),.55);
 const fine=Array.from({length:20}).reduce(value=>precisionDelta(value,1,130,200,0,1),.5);
 assert.ok(fine>.52&&fine<.53);
 assert.throws(()=>precisionDelta(0,10,0,0,-1,1),RangeError);
});
test('panning and volume labels are truthful, center is exact',()=>{
 assert.equal(formatPan(-1),'L 100%');
 assert.equal(formatPan(-.375),'L 38%');
 assert.equal(formatPan(0),'CENTER');
 assert.equal(formatPan(.01),'R 1%');
 assert.equal(formatPan(1),'R 100%');
 assert.equal(formatVolume(.655),'66%');
 assert.equal(formatVolume(0),'0%');
 assert.equal(formatVolume(1),'100%');
});
