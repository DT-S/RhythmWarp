import test from 'node:test';
import assert from 'node:assert/strict';
import {ladderSteps,ladderMorphGeometry} from '../src/gesture-guide.js';

test('P4 ladder shows 13 one-unit rungs and an active step',()=>{
 const steps=ladderSteps(120,20,400);
 assert.equal(steps.length,13);
 assert.deepEqual(steps.map(x=>x.value),Array.from({length:13},(_,i)=>126-i));
 assert.equal(steps.filter(x=>x.active).length,1);
 assert.equal(steps.find(x=>x.active).value,120);
 assert.equal(steps.find(x=>x.value===125).major,true);
});
test('P4 ladder hides out-of-range marks without moving the active rung',()=>{
 assert.equal(ladderSteps(1,1,20).filter(x=>x.available).length,7);
 assert.equal(ladderSteps(400,20,400).filter(x=>x.available).length,7);
 assert.equal(ladderSteps(1,1,20).findIndex(x=>x.active),6);
});
test('P4 morph begins at exact button bounds and expands beneath its center',()=>{
 const rect={left:120,top:240,width:80,height:50};
 const g=ladderMorphGeometry(rect,390,844);
 assert.deepEqual(g.from,rect);
 assert.deepEqual(g.to,{left:108,top:135,width:104,height:260});
 assert.equal(g.to.left+g.to.width/2,rect.left+rect.width/2);
 assert.equal(g.to.top+g.to.height/2,rect.top+rect.height/2);
});
test('P4 morph stays on screen at bottom and both horizontal edges',()=>{
 const left=ladderMorphGeometry({left:5,top:720,width:45,height:45},390,844);
 assert.equal(left.to.left,8);
 assert.equal(left.to.top,576);
 const right=ladderMorphGeometry({left:344,top:5,width:50,height:45},390,844);
 assert.equal(right.to.left,278);
 assert.equal(right.to.top,8);
 const small=ladderMorphGeometry({left:10,top:10,width:50,height:45},320,280);
 assert.ok(small.to.left>=8&&small.to.top>=8);
});

test('upper-bound value slots preserve the center rung (16–20)',()=>{
 for(const n of [1,2,15,16,17,18,19,20]){
  const steps=ladderSteps(n,1,20);
  assert.equal(steps.length,13);
  assert.equal(steps.findIndex(step=>step.active),6);
  assert.equal(steps[6].value,n);
  assert.equal(steps[6].available,true);
  assert.equal(steps.filter(step=>step.available).length,
   Math.min(20,n+6)-Math.max(1,n-6)+1);
 }
 assert.equal(ladderSteps(20,1,20).filter(step=>!step.available).length,6);
});
