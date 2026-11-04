import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installUpdateManager,waitForActivation,waitForInstallation} from '../src/update-manager.js';

function emitter(base={}){
 const events=new Map();
 return Object.assign(base,{
  addEventListener(name,listener){const list=events.get(name)||[];list.push(listener);events.set(name,list);},
  removeEventListener(name,listener){events.set(name,(events.get(name)||[]).filter(x=>x!==listener));},
  emit(name){for(const fn of events.get(name)||[])fn();}
 });
}
function fixture({waiting=null,online=true,busy=false,controlled=true}={}){
 let reloads=0,updates=0;
 const notice=[],button={hidden:true,disabled:false,textContent:''},status={textContent:''};
 const reg=emitter({waiting,installing:null,update:async()=>{updates++;}});
 const sw=emitter({controller:controlled?{}:null,ready:Promise.resolve(reg),register:async()=>reg,getRegistration:async()=>reg});
 const manager=installUpdateManager({
  serviceWorker:sw,button,status,notify:(...args)=>notice.push(args),
  isBusy:()=>busy,reload:()=>reloads++,online:()=>online
 });
 return {reg,sw,button,status,notice,manager,reloads:()=>reloads,updates:()=>updates};
}

test('explicit update checks never reload the installed version when no update exists',async()=>{
 const f=fixture();await f.manager.ready;
 assert.equal(f.button.hidden,false);
 assert.equal(f.button.textContent,'CHECK FOR UPDATES');
 await f.button.onclick();
 assert.equal(f.reloads(),0);
 assert.ok(f.updates()>=2); // Startup + explicit update check
});
test('waiting worker activates and reloads just once',async()=>{
 const worker=emitter({state:'installed',postMessage(message){
  assert.equal(message,'ACTIVATE');this.state='activated';this.emit('statechange');
 }});
 const f=fixture({waiting:worker});await f.manager.ready;
 assert.equal(f.button.textContent,'INSTALL UPDATE & RELOAD');
 await f.button.onclick();
 assert.equal(f.reloads(),1);
});
test('background activation never interrupts the current page; reload is explicit',async()=>{
 const f=fixture();await f.manager.ready;
 f.sw.emit('controllerchange');
 assert.equal(f.reloads(),0);
 assert.equal(f.button.textContent,'RELOAD TO APPLY');
 await f.button.onclick();
 assert.equal(f.reloads(),1);
});
test('first-time service worker claim does not masquerade as an update',async()=>{
 const f=fixture({controlled:false});await f.manager.ready;
 f.sw.controller={};f.sw.emit('controllerchange');
 assert.equal(f.button.textContent,'CHECK FOR UPDATES');
 await f.button.onclick();
 assert.equal(f.reloads(),0);
});

test('waiting release wins over a stale reload flag after controllerchange',async()=>{
 const worker=emitter({state:'installed',postMessage(message){
  assert.equal(message,'ACTIVATE');
  this.state='activated';this.emit('statechange');
 }});
 const f=fixture({waiting:worker});await f.manager.ready;
 f.sw.emit('controllerchange'); // prior worker already claimed the tab
 assert.equal(f.button.textContent,'INSTALL UPDATE & RELOAD');
 await f.button.onclick();
 assert.equal(f.reloads(),1);
});

test('update checks report offline and busy states without reloading',async()=>{
 const a=fixture({online:false});await a.manager.ready;
 await a.button.onclick();assert.equal(a.reloads(),0);
 assert.match(a.notice.at(-1)[0],/internet/i);
 const b=fixture({busy:true});await b.manager.ready;
 await b.button.onclick();assert.equal(b.reloads(),0);
 assert.match(b.notice.at(-1)[0],/Stop playback/i);
});
test('waitForActivation resolves when worker activates',async()=>{
 const worker=emitter({state:'installed'});
 const awaited=waitForActivation(worker,1000);
 worker.state='activated';worker.emit('statechange');
 assert.equal(await awaited,true);
});
test('offline shell is cache-first and no longer mutates active JS or CSS',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const fetch=sw.slice(sw.indexOf("self.addEventListener('fetch'"));
 assert.match(sw,/\.\/src\/update-manager\.js/);
 assert.match(sw,/cache:'reload'/);
 assert.match(sw,/if\(!self\.registration\.active\)await self\.skipWaiting\(\)/);
 assert.match(sw,/await caches.delete\(CACHE\)/);
 assert.ok(fetch.indexOf('if(cached)return cached')<fetch.indexOf('await fetch(e.request)'));
 assert.doesNotMatch(fetch,/\.put\(|cache:'no-store'/);
});
test('new worker waits for installation and explicit activation',async()=>{
 const worker=emitter({state:'installing'});
 const pending=waitForInstallation(worker,1000);
 worker.state='installed';worker.emit('statechange');
 assert.equal(await pending,true);
});
