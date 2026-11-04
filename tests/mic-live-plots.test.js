import test from 'node:test';
import assert from 'node:assert/strict';
import {SENSOR_WINDOW,DISTRIBUTION_WINDOW,liveOffsets,liveHitRates,liveHistogram,liveTargetRate} from '../src/mic-live-plots.js';
test('live timing retains event timestamps, ignores unmatched hits and limits work',()=>{
 const hits=Array.from({length:300},(_,i)=>[i*20,i%4===0?null:i-150,500,120+i]);
 const points=liveOffsets(hits);
 assert.equal(points.length,SENSOR_WINDOW-Math.floor((SENSOR_WINDOW-1)/4)-1);
 assert.equal(points.at(-1).ms,299*20);
 assert.ok(points.every(p=>Number.isFinite(p.value)));
});
test('live histogram is a measured bounded histogram, not invented gaussian',()=>{
 const hits=[[0,-200,1,120],[10,-10,1,120],[20,0,1,120],[30,10,1,120],
   [40,200,1,120],[50,null,1,120]];
 const h=liveHistogram(hits);
 assert.equal(h.count,5);assert.equal(h.counts.reduce((a,b)=>a+b,0),5);
 assert.equal(h.counts[0],1);assert.equal(h.counts.at(-1),1);
 assert.equal(h.meanMs,0);
 assert.equal(liveHistogram(hits.filter(x=>x[1]===null)).count,0);
 assert.equal(liveHistogram(Array.from({length:500},(_,i)=>[i,0,1,60])).count,DISTRIBUTION_WINDOW);
});
test('tempo plot uses raw hits/min and explicit subdivision reference, never imagined beat tempo',()=>{
 assert.equal(liveTargetRate('guided',120,4),480);
 assert.equal(liveTargetRate('guided',120,3),360);
 assert.equal(liveTargetRate('free',120,4),null);
 assert.equal(liveTargetRate('guided',120,0),null);
 assert.deepEqual(liveHitRates([[0,null,1,null],[100,null,1,240],[200,null,1,Infinity]]),
  [{ms:100,value:240}]);
});
