// Private device-to-device QR transport. URLs use fragments, not a relay server.
// The QR library is vendored for offline use. All imports require user approval.
import {CATEGORIES,diaryDefaults,validateDiary,validateEntry} from './diary.js';

export const QR_PART_SIZE=950;
export const QR_PART_LIMIT=12;
export const QR_PENDING_KEY='archiveQRIncoming';
const MAX_DECOMPRESSED_BYTES=25_000_000;
const HEADER='D1';
// QR v2 sends practice entries only. Device settings/categories stay local.
const encodeEntry=e=>[
 e.id,e.source==='manual'?1:0,e.start,e.end,e.seconds,e.exercise,
 e.category,e.notes,e.preset,e.reason,e.mode,e.bpm,e.peak,e.clean,e.rating,
 e.history.map(p=>[p.at,p.bpm,p.mode])
];
function decodeEntry(p){
 if(!Array.isArray(p)||p.length!==16||!Array.isArray(p[15]))throw Error('Invalid QR practice entry.');
 return validateEntry({id:p[0],source:p[1]===1?'manual':p[1]===0?'measured':null,
  start:p[2],end:p[3],seconds:p[4],exercise:p[5],category:p[6],notes:p[7],
  preset:p[8],reason:p[9],mode:p[10],bpm:p[11],peak:p[12],clean:p[13],rating:p[14],
  history:p[15].map(row=>{
   if(!Array.isArray(row)||row.length!==3)throw Error('Invalid QR tempo record.');
   return {at:row[0],bpm:row[1],mode:row[2]};
  })
 });
}
function unpackLog(encoded){
 if(!Array.isArray(encoded)||encoded.length>10000)throw Error('Invalid QR practice archive.');
 const entries=encoded.map(decodeEntry);
 const categories=[...new Set([...CATEGORIES,...entries.map(e=>e.category)])];
 return validateDiary({...diaryDefaults(),categories,entries});
}
const b64url=bytes=>{
 let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const unbase64=text=>{
 if(!/^[A-Za-z0-9_-]+$/.test(text))throw Error('Invalid encoded QR data.');
 const binary=atob(text.replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
};
async function gzip(value){
 if(typeof CompressionStream==='undefined')throw Error('QR compression unavailable in this browser. Use JSON export.');
 return new Uint8Array(await new Response(new Blob([value]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
}
async function gunzip(bytes){
 if(typeof DecompressionStream==='undefined')throw Error('QR decompression unavailable. Use JSON file import.');
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const chunks=[];let size=0;
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>MAX_DECOMPRESSED_BYTES)throw Error('QR archive expands beyond the safety limit.');
   chunks.push(value);
  }
 }catch(e){await reader.cancel().catch(()=>{});throw e;}
 const joined=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(joined);
}
async function checksum(bytes){
 if(!globalThis.crypto?.subtle)throw Error('Secure QR verification unavailable.');
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)).slice(0,10)]
  .map(x=>x.toString(16).padStart(2,'0')).join('');
}
function randomId(){
 if(!globalThis.crypto?.getRandomValues)throw Error('Secure QR identifiers unavailable.');
 return [...crypto.getRandomValues(new Uint8Array(8))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function createArchiveTransfer(type,data,appUrl){
 if(!['log','full'].includes(type))throw Error('Invalid archive type.');
 if(typeof appUrl!=='string'||!/^https?:\/\//.test(appUrl))throw Error('Invalid app link.');
 if(type==='log')validateDiary(data);
 const record=type==='log'
  ?{v:2,t:'log',d:validateDiary(data).entries.map(encodeEntry)}
  :{v:1,t:'full',d:data};
 const raw=JSON.stringify(record);
 if(new Blob([raw]).size>MAX_DECOMPRESSED_BYTES)throw Error('Archive is too large for QR transfer. Use JSON export.');
 const packed=await gzip(raw),code=b64url(packed);
 const count=Math.ceil(code.length/QR_PART_SIZE);
 if(count>QR_PART_LIMIT)throw Error('Archive needs '+count+' QR codes. Use JSON export for large databases.');
 const id=randomId(),digest=await checksum(packed),root=appUrl.split('#')[0];
 const parts=Array.from({length:count},(_,i)=>
  root+'#d='+[HEADER,id,i+1,count,digest,code.slice(i*QR_PART_SIZE,(i+1)*QR_PART_SIZE)].join('.'));
 return {type,id,digest,parts,compressedBytes:packed.byteLength,uncompressedBytes:raw.length};
}
export function parseArchivePart(hash){
 if(typeof hash!=='string'||!hash.startsWith('#d='))throw Error('Not a Rhythm PADD archive QR.');
 const match=/^#d=(D1)\.([0-9a-f]{16})\.([1-9]\d*)\.([1-9]\d*)\.([0-9a-f]{20})\.([A-Za-z0-9_-]{1,950})$/.exec(hash);
 if(!match)throw Error('Malformed archive QR.');
 const [,version,id,index,total,digest,part]=match;
 const n=Number(index),count=Number(total);
 if(count>QR_PART_LIMIT||n>count||count<1)throw Error('Invalid QR sequence.');
 if(n<count&&part.length!==QR_PART_SIZE&&part.length!==520)throw Error('Incomplete QR segment.');
 return {version,id,index:n,total:count,digest,part};
}
export function appendArchivePart(existing,item){
 const pending=existing??{
  version:HEADER,id:item.id,digest:item.digest,total:item.total,
  parts:Array(item.total).fill(null),created:Date.now()
 };
 if(pending.version!==HEADER||pending.id!==item.id||pending.digest!==item.digest||
    pending.total!==item.total||!Array.isArray(pending.parts)||pending.parts.length!==item.total)
  throw Error('A different QR transfer is in progress. Clear it before scanning another archive.');
 const previous=pending.parts[item.index-1];
 if(previous!==null&&previous!==item.part)throw Error('Conflicting QR segment.');
 pending.parts[item.index-1]=item.part;
 return {pending,received:pending.parts.filter(Boolean).length,complete:pending.parts.every(Boolean)};
}
export async function decodeArchiveTransfer(pending){
 if(!pending||pending.version!==HEADER||!Array.isArray(pending.parts)||
    pending.total!==pending.parts.length||pending.total<1||pending.total>QR_PART_LIMIT||
    pending.parts.some(p=>typeof p!=='string'||!p.length||p.length>QR_PART_SIZE))
  throw Error('Archive QR sequence is incomplete or invalid.');
 const bytes=unbase64(pending.parts.join(''));
 if(await checksum(bytes)!==pending.digest)throw Error('QR archive integrity check failed.');
 let value;
 try{value=JSON.parse(await gunzip(bytes));}catch(e){throw Error('Corrupt QR archive: '+e.message);}
 if(!value||!['log','full'].includes(value.t)||!value.d||typeof value.d!=='object')
  throw Error('Unsupported QR archive format.');
 if(value.v===2&&value.t==='log')return {type:'log',data:unpackLog(value.d)};
 if(value.v===1&&value.t==='log')return {type:'log',data:validateDiary(value.d)};
 if(value.v===1&&value.t==='full')return {type:'full',data:value.d};
 throw Error('Unsupported QR archive format.');
}
// Identical IDs are the same session. Divergent copies never silently overwrite.
// Quick sync uses the END time, so sessions that cross midnight are included.
export function selectDiaryForTransfer(diary,scope='day',now=Date.now()){
 const source=validateDiary(diary);
 if(!['day','three','week','all'].includes(scope))throw Error('Unknown QR transfer range.');
 let entries=source.entries;
 if(scope==='day')entries=entries.filter(e=>e.end<=now&&e.end>=now-24*60*60*1000);
 if(scope==='week')entries=entries.filter(e=>e.end<=now&&e.end>=now-7*24*60*60*1000);
 if(scope==='three')entries=entries.slice().sort((a,b)=>b.end-a.end).slice(0,3);
 return {...source,entries};
}
export function planLogMerge(local,remote){
 const target=validateDiary(local),incoming=validateDiary(remote);
 const localMap=new Map(target.entries.map(e=>[e.id,e]));
 const newEntries=[];let duplicates=0,conflicts=0;
 for(const entry of incoming.entries){
  const old=localMap.get(entry.id);
  if(!old)newEntries.push(entry);
  else if(JSON.stringify(old)===JSON.stringify(entry))duplicates++;
  else conflicts++;
 }
 const categories=[...new Set([...target.categories,...incoming.categories])];
 if(categories.length>100||target.entries.length+newEntries.length>10000)
  throw Error('Combined practice log exceeds storage limits. Use REPLACE instead.');
 const merged={...target,categories,entries:[...target.entries,...newEntries]};
 validateDiary(merged);
 return {merged,added:newEntries.length,duplicates,conflicts};
}

export function replaceDiaryRecords(local,remote){
 const receiver=validateDiary(local),incoming=validateDiary(remote);
 const categories=[...new Set([...receiver.categories,...incoming.categories])];
 return validateDiary({...receiver,categories,entries:incoming.entries});
}
