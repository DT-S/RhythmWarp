import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('worklet detects two quiet pad transients without mistaking background noise for a hit',()=>{
 const code=readFileSync(new URL('../src/mic-worklet.js',import.meta.url),'utf8');
 let Registered;
 const sandbox={
  sampleRate:48000,currentFrame:0,
  AudioWorkletProcessor:class {
   constructor(){this.messages=[];this.port={onmessage:null,postMessage:value=>this.messages.push(value)};}
  },
  registerProcessor:(name,klass)=>{assert.equal(name,'lcars-onset');Registered=klass;}
 };
 runInNewContext(code,sandbox);
 const processor=new Registered();
 processor.port.onmessage({data:{sensitivity:'soft'}});
 const total=16000; // 333 ms
 for(let frame=0;frame<total;frame+=128){
  const samples=new Float32Array(128);
  for(let i=0;i<128;i++){
   const at=frame+i;
   // Two 5 ms muted practice-pad thumps, each only 0.005 full-scale.
   samples[i]=((at>=3000&&at<3240)||(at>=9000&&at<9240)) ? .005 : .00015;
  }
  sandbox.currentFrame=frame;
  processor.process([[samples]]);
 }
 assert.equal(processor.messages.length,2);
 assert.ok(Math.abs(processor.messages[0].time-3000/48000)<.003);
 assert.ok(Math.abs(processor.messages[1].time-9000/48000)<.003);
 for(const hit of processor.messages)assert.ok(hit.level>0&&Number.isFinite(hit.time));
});

test('worklet emits no microphone audio into its output path',()=>{
 const code=readFileSync(new URL('../src/mic-worklet.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/outputs\s*\[|output\s*\[/);
 assert.match(code,/registerProcessor\('lcars-onset'/);
});

test('adaptive retrigger guard rejects a quiet secondary thump but preserves sixteenths',()=>{
 const code=readFileSync(new URL('../src/mic-worklet.js',import.meta.url),'utf8');
 let Processor,frame=0;
 const messages=[];
 const sandbox={
  sampleRate:48000,currentFrame:0,
  AudioWorkletProcessor:class{
   constructor(){this.port={onmessage:null,postMessage:value=>messages.push(value)};}
  },
  registerProcessor:(_name,type)=>{Processor=type;}
 };
 runInNewContext(code,sandbox);
 const p=new Processor();
 p.port.onmessage({data:{sensitivity:'soft'}});
 p.port.onmessage({data:{reference:{mode:'guided',bpm:120,division:4}}});
 assert.ok(p.refractory/sandbox.sampleRate>.065&&p.refractory/sandbox.sampleRate<.07);
 const hits=[3000,9000,15000,21000]; // 125ms sixteenths at 120 BPM
 const echoes=hits.map(t=>t+Math.round(.062*48000));
 for(frame=0;frame<29000;frame+=128){
  const input=new Float32Array(128);
  for(let i=0;i<128;i++){
   const n=frame+i;
   input[i]=hits.some(t=>n>=t&&n<t+240)?.006:
      echoes.some(t=>n>=t&&n<t+200)?.0025:.00008;
  }
  sandbox.currentFrame=frame;p.process([[input]]);
 }
 assert.equal(messages.length,4,'short echo must not become extra hit');
 for(let i=0;i<4;i++)assert.ok(Math.abs(messages[i].time-hits[i]/48000)<.004);
});
test('fast sixteen-note grid lowers retrigger time rather than swallowing real hits',()=>{
 const code=readFileSync(new URL('../src/mic-worklet.js',import.meta.url),'utf8');
 let Processor;
 const messages=[];
 const sandbox={
  sampleRate:48000,currentFrame:0,
  AudioWorkletProcessor:class{constructor(){this.port={onmessage:null,postMessage:v=>messages.push(v)};}},
  registerProcessor:(_n,klass)=>{Processor=klass;}
 };
 runInNewContext(code,sandbox);
 const p=new Processor();
 p.port.onmessage({data:{sensitivity:'normal'}});
 p.port.onmessage({data:{reference:{mode:'guided',bpm:300,division:4}}});
 assert.ok(p.refractory/sandbox.sampleRate<.028);
 const hits=[2500,4900,7300,9700,12100];
 for(let frame=0;frame<15000;frame+=128){
  const input=new Float32Array(128);
  for(let i=0;i<128;i++){
   const n=frame+i;
   input[i]=hits.some(t=>n>=t&&n<t+240)?.02:.0001;
  }
  sandbox.currentFrame=frame;p.process([[input]]);
 }
 assert.equal(messages.length,hits.length);
});
test('microphone processor uses quiet rearming and separate control messages',()=>{
 const source=readFileSync(new URL('../src/mic-worklet.js',import.meta.url),'utf8');
 assert.match(source,/this\.armed=false/);
 assert.match(source,/this\.quietFrames/);
 assert.match(source,/this\.refractory/);
 assert.doesNotMatch(source,/outputs\s*\[|output\s*\[/);
});
