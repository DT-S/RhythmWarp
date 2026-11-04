import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/acoustic-pilot-worklet.js',import.meta.url),'utf8');
test('click-only AudioWorklet produces one silent bounded sample capture',()=>{
 let Recorder;
 const messages=[];
 const env={sampleRate:48000,currentFrame:0,Float32Array,Math,
   AudioWorkletProcessor:class{constructor(){
     this.port={onmessage:null,postMessage:message=>messages.push(message)};
   }},
   registerProcessor:(name,cls)=>{
     assert.equal(name,'lcars-acoustic-pilot');Recorder=cls;
   }};
 runInNewContext(source,env);
 const node=new Recorder();
 node.port.onmessage({data:{kind:'start',clickOnly:true}});
 for(let step=0;step<300;step++){
   const input=new Float32Array(128),output=new Float32Array(128);
   input[0]=.1;
   node.process([[input]],[[output]]);
   assert.ok(output.every(v=>v===0),'microphone must never leak to speaker');
   env.currentFrame+=128;
 }
 const arm=messages.find(x=>x.kind==='armed');
 assert.equal(arm.phase,4);
 node.port.onmessage({data:{kind:'finish',phase:4}});
 const result=messages.find(x=>x.kind==='segment');
 assert.ok(result?.samples instanceof Float32Array);
 assert.equal(result.phase,4);
 assert.equal(result.limited,false);
 assert.ok(result.samples.length>500);
 assert.equal(node.samples,null,'no microphone samples retained after finish');
 assert.equal(node.mode,'idle');
});
