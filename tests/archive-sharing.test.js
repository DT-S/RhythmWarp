import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh} from '../src/model.js';
import {
 createArchiveTransfer,parseArchivePart,appendArchivePart,decodeArchiveTransfer,
 planLogMerge,replaceDiaryRecords,selectDiaryForTransfer,QR_PART_LIMIT
} from '../src/archive-share.js';

const origin='https://example.org/RhythmPADD/';
const entry=(id,end)=>({
 id,source:'manual',start:end-60000,end,seconds:60,exercise:'Paradiddle',
 category:'Rudiments',notes:'Home practice',preset:'',reason:'Manual',mode:'standard',
 bpm:120,peak:120,clean:null,rating:null,history:[]
});
const fixture=(now=1_780_000_000_000)=>{
 const d=fresh().diary;
 d.entries=[entry('old',now-8*86400000),entry('week',now-2*86400000),
  entry('day',now-60*60000),entry('fresh',now-3000)];
 return d;
};
test('select recent practice sessions, not the whole database',()=>{
 const now=1_780_000_000_000,d=fixture(now);
 assert.deepEqual(selectDiaryForTransfer(d,'day',now).entries.map(e=>e.id),['day','fresh']);
 assert.deepEqual(selectDiaryForTransfer(d,'three',now).entries.map(e=>e.id),['fresh','day','week']);
 assert.deepEqual(selectDiaryForTransfer(d,'week',now).entries.map(e=>e.id),['week','day','fresh']);
 assert.equal(selectDiaryForTransfer(d,'all',now).entries.length,4);
 assert.equal(d.entries.length,4,'source diary must not be mutated');
 assert.throws(()=>selectDiaryForTransfer(d,'invalid',now));
});
test('QR compressed 24h log roundtrip, multi-part reassembly and integrity',async()=>{
 const diary=selectDiaryForTransfer(fixture(), 'day',1_780_000_000_000);
 const outgoing=await createArchiveTransfer('log',diary,origin);
 assert.ok(outgoing.parts.length>=1);
 assert.ok(outgoing.parts.length<=QR_PART_LIMIT);
 let incoming=null;
 for(const url of [...outgoing.parts].reverse()){
  const item=parseArchivePart(new URL(url).hash);
  const result=appendArchivePart(incoming,item);
  incoming=result.pending;
 }
 const done=await decodeArchiveTransfer(incoming);
 assert.equal(done.type,'log');
 assert.deepEqual(done.data.entries,diary.entries);
 assert.equal(done.data.categories.length,diary.categories.length);
 assert.ok(outgoing.parts.every(url=>url.startsWith(origin+'#d=D1.')));
});
test('normal 24-hour sync uses a single compact QR even with private notes',async()=>{
 const diary=selectDiaryForTransfer(fixture(), 'day',1_780_000_000_000);
 diary.entries[0].notes='Triplet pattern and timing practice'; 
 const encoded=await createArchiveTransfer('log',diary,origin);
 assert.equal(encoded.parts.length,1,'24-hour sample should need only one screen');
 const part=parseArchivePart(new URL(encoded.parts[0]).hash);
 const decoded=await decodeArchiveTransfer(appendArchivePart(null,part).pending);
 assert.deepEqual(decoded.data.entries,diary.entries);
 assert.equal(decoded.data.enabled,true);
});
test('more data creates several QR segments, allowing out-of-order scan and repeat',async()=>{
 const d=fixture();
 for(let i=0;i<20;i++){
  const e=entry('part-'+i,1_780_000_000_000-i*60000);
  e.notes=Array.from({length:90},(_,n)=>((i*17+n*41)%1000).toString(36)).join('-');
  d.entries.push(e);
 }
 const outbound=await createArchiveTransfer('log',d,origin);
 assert.ok(outbound.parts.length>1,'test data should require multiple QR parts');
 let acc=null;
 const segments=outbound.parts.map(p=>parseArchivePart(new URL(p).hash)).reverse();
 for(const part of segments)acc=appendArchivePart(acc,part).pending;
 assert.deepEqual((await decodeArchiveTransfer(acc)).data.entries,d.entries);
 assert.equal(appendArchivePart(acc,segments[0]).complete,true);
 const other=await createArchiveTransfer('log',fixture(),origin);
 assert.throws(()=>appendArchivePart(acc,parseArchivePart(new URL(other.parts[0]).hash)),/different QR transfer/);
});
test('reject incomplete, altered, and fake QR data',async()=>{
 const out=await createArchiveTransfer('log',fixture(),origin);
 const x=parseArchivePart(new URL(out.parts[0]).hash);
 assert.throws(()=>parseArchivePart('#d=not-an-archive'));
 assert.throws(()=>parseArchivePart('#d=D1.'+'a'.repeat(10000)));
 let first=appendArchivePart(null,x).pending;
 if(out.parts.length>1)await assert.rejects(()=>decodeArchiveTransfer(first),/incomplete/);
 const all=out.parts.map(p=>parseArchivePart(new URL(p).hash));
 let assembled=null;
 for(const part of all)assembled=appendArchivePart(assembled,part).pending;
 const tampered={...assembled,parts:[...assembled.parts]};
 tampered.parts[0]=(tampered.parts[0][0]==='A'?'B':'A')+tampered.parts[0].slice(1);
 await assert.rejects(()=>decodeArchiveTransfer(tampered),/integrity|Corrupt|encoded/);
});
test('merge never silently overwrites edited sessions and never imports duplicates',()=>{
 const local=fixture();
 const remote=structuredClone(local);
 remote.entries=[structuredClone(local.entries[0]),structuredClone(local.entries[1]),entry('new',1_780_000_000_000)];
 remote.entries[1].notes='Changed on Quest';
 const plan=planLogMerge(local,remote);
 assert.equal(plan.added,1);
 assert.equal(plan.duplicates,1);
 assert.equal(plan.conflicts,1);
 assert.equal(plan.merged.entries.length,5);
 assert.equal(plan.merged.entries.find(x=>x.id==='week').notes,'Home practice');
 assert.equal(local.entries.length,4,'original records must remain untouched');
});
test('record replacement keeps receiver practice preferences instead of importing sender settings',()=>{
 const receiver=fixture(),sender=fixture();
 receiver.enabled=false;receiver.minAutoLogSeconds=30;receiver.exercise='Keep local exercise';
 sender.enabled=true;sender.exercise='Remote exercise';sender.entries=[entry('sender-session',1_780_000_000_000)];
 const next=replaceDiaryRecords(receiver,sender);
 assert.deepEqual(next.entries,sender.entries);
 assert.equal(next.enabled,false);
 assert.equal(next.minAutoLogSeconds,30);
 assert.equal(next.exercise,'Keep local exercise');
 assert.equal(receiver.entries.length,4);
});
test('full backup QR payload can be restored without changing its format',async()=>{
 const model=fresh();model.bpm=153;
 const out=await createArchiveTransfer('full',model,origin);
 let parts=null;
 for(const link of out.parts)parts=appendArchivePart(parts,parseArchivePart(new URL(link).hash)).pending;
 const data=await decodeArchiveTransfer(parts);
 assert.equal(data.type,'full');
 assert.deepEqual(data.data,model);
});
test('QR archives, decoder, and camera scanner are included in the offline app shell',()=>{
 const root=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const sw=root('sw.js'),html=root('index.html'),app=root('src/app.js'),ui=root('src/archive-share-ui.js');
 for(const file of ['./vendor/jsQR.js','./src/archive-share.js','./src/archive-share-ui.js','./src/archive-qr-scanner.js'])
  assert.ok(sw.includes("'"+file+"'"),'missing offline cache '+file);
 assert.match(html,/vendor\/jsQR\.js/);
 assert.match(app,/selectDiaryForTransfer/);
 assert.match(ui,/archiveQR24h/);
 assert.match(ui,/archiveQRScan/);
 assert.match(ui,/archiveQRReceiveLink/);
 assert.match(root('src/archive-qr-scanner.js'),/getUserMedia/);
 assert.match(root('vendor/jsQR.js'),/webpackUniversalModuleDefinition/);
});
