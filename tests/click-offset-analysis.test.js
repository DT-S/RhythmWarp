import test from 'node:test';
import assert from 'node:assert/strict';
import {measureClickOffset,CLICK_COUNT,CLICK_SPACING_SECONDS} from '../src/click-offset-analysis.js';
function recording(delay=.0807,missing=[]){
 const hz=8000,base=20,samples=new Float32Array(hz*9);
 const scheduled=Array.from({length:CLICK_COUNT},(_,i)=>base+1.8+i*CLICK_SPACING_SECONDS);
 for(let i=0;i<scheduled.length;i++){
   if(missing.includes(i))continue;
   const origin=Math.round((scheduled[i]+delay-base)*hz);
   for(let k=0;k<270;k++){
     const t=k/hz;
     samples[origin+k]+=.22*Math.sin(2*Math.PI*900*t)*
       Math.exp(-155*t)*Math.min(1,t/.0007);
   }
 }
 return {samples,firstFrame:base*48000,sampleRate:48000,stride:6,scheduled};
}
test('click-only test measures microphone arrival without changing manual sensor offset',()=>{
 for(const delay of [.0807,.207]){
   const r=measureClickOffset(recording(delay));
   assert.equal(r.count,6,JSON.stringify(r));
   assert.ok(r.stable,JSON.stringify(r));
   assert.ok(Math.abs(r.offsetMs-delay*1000)<4,JSON.stringify(r));
 }
});
test('unheard clicks yield no fabricated stable result',()=>{
 const r=measureClickOffset(recording(.08,[0,1,2,3]));
 assert.equal(r.stable,false);
 assert.equal(r.offsetMs,null);
});
test('invalid recordings are rejected',()=>{
 assert.throws(()=>measureClickOffset({...recording(),stride:0}),/Invalid/);
 assert.throws(()=>measureClickOffset({...recording(),scheduled:[1]}),/Invalid/);
});
