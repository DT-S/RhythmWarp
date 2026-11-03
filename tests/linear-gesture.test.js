import test from 'node:test';
import assert from 'node:assert/strict';
import {linearDragSteps} from '../src/linear-gesture.js';

const start=()=>({startX:0,startY:0,lastY:0,mode:'pending',accumulator:0});
test('a tap stays pending and cannot accidentally change the beat count',()=>{
 const g=start();
 assert.deepEqual(linearDragSteps(g,1,-6),{mode:'pending',steps:0});
 assert.equal(g.mode,'pending');
});
test('crossing vertical threshold arms drag but does not immediately jump',()=>{
 const g=start();
 assert.deepEqual(linearDragSteps(g,0,-9),{mode:'drag',steps:0});
 assert.deepEqual(linearDragSteps(g,0,-22),{mode:'drag',steps:1});
 assert.deepEqual(linearDragSteps(g,0,-35),{mode:'drag',steps:1});
 assert.deepEqual(linearDragSteps(g,0,-22),{mode:'drag',steps:-1});
});
test('fractional displacement accumulates across pointer moves and reversals',()=>{
 const g=start();
 linearDragSteps(g,0,-10);
 assert.equal(linearDragSteps(g,0,-16).steps,0);
 assert.equal(linearDragSteps(g,0,-24).steps,1);
 assert.equal(linearDragSteps(g,0,-30).steps,0);
 assert.equal(linearDragSteps(g,0,-4).steps,-1);
 assert.ok(g.accumulator<0,'fractional reverse movement must carry to next event');
});
test('horizontal swipes do not change beat count or trigger a tap',()=>{
 const g=start();
 assert.deepEqual(linearDragSteps(g,15,1),{mode:'ignore',steps:0});
 assert.deepEqual(linearDragSteps(g,40,-90),{mode:'ignore',steps:0});
});
