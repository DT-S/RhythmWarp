import test from 'node:test';
import assert from 'node:assert/strict';
import {linearRowSizes,mobileFrameHeight,visibleViewportHeight,keyboardSafeViewportHeight} from '../src/linear-layout.js';

test('3 vs 5 and 3 vs 7 remain single, full-width rows on iPhone',()=>{
  assert.deepEqual(linearRowSizes(3,275),[3]);
  assert.deepEqual(linearRowSizes(5,275),[5]);
  assert.deepEqual(linearRowSizes(7,275),[7]);
  assert.deepEqual(linearRowSizes(7,254),[7]);
});
test('more beats wrap into balanced rows, with no orphans',()=>{
  assert.deepEqual(linearRowSizes(8,265),[4,4]);
  assert.deepEqual(linearRowSizes(13,265),[7,6]);
  assert.deepEqual(linearRowSizes(20,265),[7,7,6]);
  for(let count=1;count<=20;count++){
    const rows=linearRowSizes(count,265);
    assert.equal(rows.reduce((a,b)=>a+b,0),count);
    assert.ok(Math.max(...rows)-Math.min(...rows)<=1);
  }
});
test('viewport compensation preserves rendered height at every supported scale',()=>{
  for(const scale of [.7,.8,.9,1,1.1]){
    assert.ok(Math.abs(mobileFrameHeight(844,scale)*scale-844)<1e-10);
  }
  assert.throws(()=>mobileFrameHeight(844,0));
  assert.throws(()=>linearRowSizes(0,270));
});

test('iOS standalone viewport is limited by actual visible region, not screen.height',()=>{
  // 844px screen includes system UI, but the PWA may only expose 760px.
  assert.equal(visibleViewportHeight(760,760,760),760);
  assert.equal(visibleViewportHeight(844,760,844),760);
  assert.equal(visibleViewportHeight(844,null,810),810);
  assert.equal(visibleViewportHeight(844,844,844),844);
  assert.equal(mobileFrameHeight(visibleViewportHeight(844,760,844),.9)*.9,760);
  assert.throws(()=>visibleViewportHeight(0,null,0));
});

test('opening the iOS keyboard never collapses the LCARS outer frame',()=>{
 assert.equal(keyboardSafeViewportHeight(410,760,true),760);
 assert.equal(keyboardSafeViewportHeight(410,760,false),760);
 assert.equal(keyboardSafeViewportHeight(750,760,false),750);
 assert.equal(keyboardSafeViewportHeight(840,760,false),840);
 assert.equal(keyboardSafeViewportHeight(760,760,false),760);
 assert.equal(keyboardSafeViewportHeight(760,0,true),760);
 assert.throws(()=>keyboardSafeViewportHeight(0,760,true));
});
