import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {armLaunchCue} from '../src/launch-cue.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({unlock=()=>Promise.resolve(),ready=Promise.resolve(),initiallyEnabled=true}={}){
 const handlers=new Map(),played=[];
 const root={
  addEventListener:(name,callback)=>{const entries=handlers.get(name)||new Set();entries.add(callback);handlers.set(name,entries);},
  removeEventListener:(name,callback)=>handlers.get(name)?.delete(callback)
 };
 let booting=true,enabled=initiallyEnabled;
 const audio={ctx:{state:'running'},launchReady:ready,buffers:new Map([['lcars-launch',{}]]),
  ui:(name,state)=>played.push({name,state})};
 const stop=armLaunchCue({root,audio,unlock,getState:()=>({uiEnabled:enabled}),
  isBooting:()=>booting,bootDurationMs:1450});
 return {played,stop,fire:name=>{for(const handler of handlers.get(name)||[])handler();},
  setBooting:value=>{booting=value;},setEnabled:value=>{enabled=value;},
  listeners:name=>handlers.get(name)?.size||0};
}

test('LCARS launch starts without waiting for the first tap when autoplay is allowed',async()=>{
 let unlocks=0;
 const h=harness({unlock:()=>{unlocks++;return Promise.resolve();}});
 try{
  await tick();
  assert.equal(unlocks,1);
  assert.deepEqual(h.played.map(p=>p.name),['lcars-launch']);
  h.fire('pointerdown');h.fire('keydown');
  await tick();
  assert.equal(h.played.length,1,'launch must play only once');
  assert.equal(h.listeners('pointerdown'),0,'gesture listeners cleaned after playback');
 }finally{h.stop();}
});

test('a blocked cold launch can recover on a trusted gesture during the build',async()=>{
 let unlocks=0;
 const never=new Promise(()=>{});
 const h=harness({unlock:()=>++unlocks===1?never:Promise.resolve()});
 try{
  await tick();
  assert.equal(h.played.length,0);
  h.fire('pointerdown');
  await tick();
  assert.equal(unlocks,2);
  assert.deepEqual(h.played.map(p=>p.name),['lcars-launch']);
  h.fire('keydown');
  await tick();
  assert.equal(h.played.length,1);
 }finally{h.stop();}
});

test('decoding after the animation and muted UI settings cannot trigger the intro',async()=>{
 let resolveReady;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const h=harness({ready});
 try{
  h.fire('pointerdown');
  h.setBooting(false);
  resolveReady();
  await tick();
  assert.equal(h.played.length,0,'never play a surprise intro after the animation');
 }finally{h.stop();}
 let unlocks=0;
 const muted=harness({initiallyEnabled:false,unlock:()=>{unlocks++;return Promise.resolve();}});
 try{
  await tick();muted.fire('pointerdown');await tick();
  assert.equal(unlocks,0);
  assert.equal(muted.played.length,0,'obey UI sound mute preference');
 }finally{muted.stop();}
});

test('launch wiring includes independent decoding and service-worker offline precache',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const audio=readFileSync(new URL('../src/audio.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(app,/if\(isLaunching\)armLaunchCue\(/);
 assert.match(app,/bootDurationMs:LCARS_BOOT_DURATION_MS/);
 assert.match(audio,/if\(key==='lcars-launch'\)this\.launchReady=task/);
 assert.match(sw,/\.\/src\/launch-cue\.js/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-studio-green-v0-1'/);
});
