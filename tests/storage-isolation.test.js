import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DB_NAME,db} from '../src/storage.js';
import {appShareUrl,encodeSharedPreset,decodeSharedPresetFragment} from '../src/preset-share.js';
import {fresh} from '../src/model.js';

test('Rhythm Warp uses a distinct IndexedDB and never opens the private LCARS database',async()=>{
 assert.equal(DB_NAME,'rhythm-warp');
 const existing=globalThis.indexedDB;
 const calls=[],stores=[];
 globalThis.indexedDB={open(name,version){
  calls.push([name,version]);
  const request={
   result:{
    objectStoreNames:{contains:()=>false},
    createObjectStore:(name,opts)=>stores.push({name,opts})
   }
  };
  queueMicrotask(()=>{
   request.onupgradeneeded?.();
   request.onsuccess?.();
  });
  return request;
 }};
 try{
  const connection=await db();
  assert.ok(connection);
  assert.deepEqual(calls,[['rhythm-warp',2]]);
  assert.deepEqual(stores.map(x=>x.name),['data','analysisSessions']);
  assert.deepEqual(stores[1].opts,{keyPath:'id'});
  assert.equal(calls.some(x=>x[0]==='lcars-metronome'),false);
 }finally{
  if(existing===undefined)delete globalThis.indexedDB;
  else globalThis.indexedDB=existing;
 }
});

test('separating the database does not change exported presets or shared-QR URLs',()=>{
 const p={name:'Student exercise',settings:fresh()};
 p.settings.bpm=137;
 const encoded=encodeSharedPreset(p);
 assert.ok(encoded.url.startsWith('https://dt-s.github.io/RhythmWarp/#p='));
 assert.equal(appShareUrl(),'https://dt-s.github.io/RhythmWarp/');
 const decoded=decodeSharedPresetFragment(new URL(encoded.url).hash);
 assert.equal(decoded.name,p.name);
 assert.equal(decoded.settings.bpm,137);
 const source=readFileSync(new URL('../src/preset-share.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/indexedDB|DB_NAME/);
});

test('legacy LCARS state remains untouched and user backup import is still available',()=>{
 const source=readFileSync(new URL('../src/storage.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/deleteDatabase|indexedDB\.open\('lcars-metronome'/);
 assert.match(source,/const r=indexedDB\.open\(DB_NAME,2\)/);
 assert.match(app,/restoreBackup/);
 assert.match(app,/#import/);
});
