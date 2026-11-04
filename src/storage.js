// Rhythm Warp and LCARS Metronome are separate PWAs on the same GitHub Pages
// origin. IndexedDB is origin-scoped (not path-scoped): never reuse the LCARS DB.
// A fresh Rhythm Warp database intentionally does NOT import the legacy LCARS DB.
// Preset QR links and JSON backup import/export are unaffected.
export const DB_NAME='rhythm-warp';
let connection;
export async function db() {
 if(connection)return connection;
 connection=await new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB_NAME,2);
  r.onupgradeneeded=()=>{
   if(!r.result.objectStoreNames.contains('data'))r.result.createObjectStore('data');
   if(!r.result.objectStoreNames.contains('analysisSessions'))r.result.createObjectStore('analysisSessions',{keyPath:'id'});
  };
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error);
 });
 return connection;
}
export async function read(){const d=await db();return new Promise((resolve,reject)=>{
 const r=d.transaction('data').objectStore('data').get('state');
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});}
export async function write(value){const d=await db();return new Promise((resolve,reject)=>{
 const t=d.transaction('data','readwrite');
 t.objectStore('data').put(structuredClone(value),'state');
 t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
});}
export async function readMicCalibration(){
 const d=await db();return new Promise((resolve,reject)=>{
  const r=d.transaction('data').objectStore('data').get('micCalibrationMs');
  r.onsuccess=()=>resolve(r.result??0);r.onerror=()=>reject(r.error);
 });
}
export async function writeMicCalibration(value){
 const {validateInputDelayMs}=await import('./mic-analysis.js');
 const checked=validateInputDelayMs(value);
 const d=await db();return new Promise((resolve,reject)=>{
  const t=d.transaction('data','readwrite');
  t.objectStore('data').put(checked,'micCalibrationMs');
  t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
 });
}
export async function readMicReferenceDivision(){
 const d=await db();return new Promise((resolve,reject)=>{
  const r=d.transaction('data').objectStore('data').get('micReferenceDivision');
  r.onsuccess=()=>resolve(r.result??1);r.onerror=()=>reject(r.error);
 });
}
export async function writeMicReferenceDivision(value){
 const {validateReferenceDivision}=await import('./mic-analysis.js');
 const checked=validateReferenceDivision(value),d=await db();
 return new Promise((resolve,reject)=>{
  const t=d.transaction('data','readwrite');
  t.objectStore('data').put(checked,'micReferenceDivision');
  t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
 });
}
// Retention and rolling comparison metadata commit in one IndexedDB transaction.
// No remote requests, audio files, additional object stores, or database migration.
async function reconcileAnalysis(incoming=[],replace=false,importedCandidates=[]){
 const {validateAnalysisSessions}=await import('./mic-analysis.js');
 const {retainArchive,validateCandidates}=await import('./mic-retention.js');
 const fresh=validateAnalysisSessions(incoming);
 if(fresh.some(s=>JSON.stringify(s).length>3000000))throw Error('Analysis session exceeds 3 MB.');
 if(replace&&fresh.length>250)throw Error('Backup exceeds legacy 250-session import limit.');
 if(replace)validateCandidates(importedCandidates);
 const d=await db();
 return new Promise((resolve,reject)=>{
  const tx=d.transaction(['data','analysisSessions'],'readwrite');
  const records=tx.objectStore('analysisSessions'),data=tx.objectStore('data');
  let existing=null,index=replace?importedCandidates:null,result=null;
  const tryCommit=()=>{
   if(!existing||index===null)return;
   try{
    // Prior to the first pruning, keep all legacy records long enough to
    // discover the genuine all-time best instead of deleting them blindly.
    const checked=replace?[]:validateAnalysisSessions(existing);
    const merged=replace?fresh:[...checked,...fresh];
    const computed=retainArchive(merged,validateCandidates(index),Date.now());
    records.clear();
    for(const record of computed.records)records.put(record);
    data.put(computed.candidates,'analysisCandidateIndex');
    result=computed;
   }catch(err){try{tx.abort();}catch{};reject(err);}
  };
  if(replace){existing=[];tryCommit();}
  else{
   const recordReq=records.getAll(),indexReq=data.get('analysisCandidateIndex');
   recordReq.onsuccess=()=>{existing=recordReq.result;tryCommit();};
   indexReq.onsuccess=()=>{index=indexReq.result??[];tryCommit();};
  }
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error??Error('Analysis archive write failed.'));
  tx.onabort=()=>reject(tx.error??Error('Analysis archive transaction aborted.'));
 });
}
export async function listAnalysisSessions(){
 return (await reconcileAnalysis()).records;
}
export async function listAnalysisCandidates(){
 await reconcileAnalysis();
 const d=await db();
 return new Promise((resolve,reject)=>{
  const r=d.transaction('data').objectStore('data').get('analysisCandidateIndex');
  r.onsuccess=()=>resolve(r.result??[]);r.onerror=()=>reject(r.error);
 });
}
export async function saveAnalysisSession(record){
 return reconcileAnalysis([record]);
}
export async function replaceAnalysisSessions(records,candidates=[]){
 return reconcileAnalysis(records,true,candidates);
}
export function download(name,content,type='application/json'){
 const u=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=u;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(u),1000);
}
