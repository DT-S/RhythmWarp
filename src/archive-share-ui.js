// Minimal Quest -> iPhone practice-log sync. Two controls, one full-screen dialog.
// Works offline; scanner and QR encoder are shipped with the app.
import {createArchiveTransfer,parseArchivePart,appendArchivePart,decodeArchiveTransfer,QR_PENDING_KEY} from './archive-share.js';
import {appShareUrl} from './preset-share.js';
import {paintQR} from './qr-share-ui.js';
import {db} from './storage.js';
import {createArchiveScanner} from './archive-qr-scanner.js';

async function pendingQR(value){
 const database=await db();
 return new Promise((resolve,reject)=>{
  const tx=database.transaction('data',value===undefined?'readonly':'readwrite');
  const store=tx.objectStore('data');
  const req=value===undefined?store.get(QR_PENDING_KEY):
   value===null?store.delete(QR_PENDING_KEY):store.put(value,QR_PENDING_KEY);
  if(value===undefined){req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);}
  else{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);}
 });
}
export function installArchiveSharing({getLog,onLog,notify,isBusy}){
 const controls=document.querySelector('#diary .diary-actions');
 if(!controls)throw Error('Practice Log actions missing.');
 const send=document.createElement('button'),scan=document.createElement('button');
 send.type=scan.type='button';
 send.id='archiveQR24h';scan.id='archiveQRScan';
 send.className='outline';scan.className='outline';
 send.textContent='24H ALS QR';scan.textContent='QR SCANNEN';
 controls.append(send,scan);
 const dialog=document.createElement('dialog');
 dialog.id='archiveQRDialog';dialog.className='archive-sync-dialog';
 dialog.setAttribute('aria-labelledby','archiveQRTitle');
 dialog.innerHTML=`
  <div class="archive-sync-shell">
   <header class="archive-sync-head">
    <h2 id="archiveQRTitle">PRACTICE LOG / QR</h2>
    <button id="archiveQRClose" type="button" aria-label="QR transfer schließen">SCHLIESSEN</button>
   </header>
   <section id="archiveQRSendPane" class="archive-sync-pane" hidden>
    <p id="archiveQRCount" class="archive-sync-count"></p>
    <div id="archiveQRImage" class="archive-sync-qr" role="img" aria-label="QR Code zum Übertragen der letzten 24 Stunden"></div>
    <p id="archiveQRSteps" class="archive-sync-info"></p>
    <div id="archiveQRPartActions" class="archive-sync-actions" hidden>
     <button id="archiveQRPrevious" type="button" class="outline">ZURÜCK</button>
     <button id="archiveQRNext" type="button" class="primary">NÄCHSTER QR</button>
    </div>
   </section>
   <section id="archiveQRScanPane" class="archive-sync-pane" hidden>
    <p id="archiveQRScanStatus" class="archive-sync-info" role="status" aria-live="polite"></p>
    <video id="archiveQRVideo" class="archive-sync-video" autoplay muted playsinline hidden></video>
    <details id="archiveQRManual" class="archive-sync-manual">
      <summary>SCANNER NICHT VERFÜGBAR? QR-LINK EINFÜGEN</summary>
      <input id="archiveQRInput" class="share-url" type="url" aria-label="QR-Link" placeholder="https://..." autocomplete="off">
      <button id="archiveQRReceiveLink" type="button" class="outline">LINK EINLESEN</button>
    </details>
   </section>
   <section id="archiveQRDonePane" class="archive-sync-pane" hidden>
    <p id="archiveQRResult" class="archive-sync-result" role="status" aria-live="polite"></p>
    <button id="archiveQRDone" class="primary" type="button">FERTIG</button>
   </section>
  </div>
 `;
 document.body.append(dialog);
 const $=selector=>dialog.querySelector(selector);
 let outgoing=null,partIndex=0,receiving=false;
 const scanner=createArchiveScanner({
  video:$('#archiveQRVideo'),notify,
  onScan:text=>receiveLink(text),
  onStatus:text=>{
   if($('#archiveQRScanPane').hidden)return;
   if(text==='SCANNER STOPPED')return;
   $('#archiveQRScanStatus').textContent='Kamera aktiv. QR-Code auf der Quest oder dem Monitor anvisieren.';
  }
 });
 async function close(){
  await scanner.stop();
  if(dialog.open)dialog.close();
  outgoing=null;
 }
 $('#archiveQRClose').onclick=close;
 $('#archiveQRDone').onclick=close;
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 function openPane(kind){
  if(!dialog.open)dialog.showModal();
  $('#archiveQRSendPane').hidden=kind!=='send';
  $('#archiveQRScanPane').hidden=kind!=='scan';
  $('#archiveQRDonePane').hidden=kind!=='done';
  $('#archiveQRTitle').textContent=kind==='send'?'LETZTE 24 STUNDEN / QR':
   kind==='scan'?'PRACTICE LOG / SCANNEN':'SYNCHRONISATION';
 }
 function renderPart(){
  const total=outgoing.parts.length,qr=$('#archiveQRImage');
  $('#archiveQRCount').textContent='QR '+(partIndex+1)+' / '+total;
  $('#archiveQRSteps').textContent=total===1?'Mit dem iPhone scannen.':
   'Alle '+total+' QR-Codes nacheinander mit dem iPhone scannen.';
  $('#archiveQRPartActions').hidden=total===1;
  $('#archiveQRPrevious').disabled=partIndex===0;
  $('#archiveQRNext').disabled=partIndex===total-1;
  // Render at high resolution, even when the headset/browser is landscape.
  paintQR(qr,outgoing.parts[partIndex],768);
 }
 async function showSend(){
  if(isBusy())return notify('Bitte zuerst Metronom und Mikrofon stoppen.','Warningsound');
  send.disabled=true;
  try{
   const log=getLog('day');
   if(!log.entries.length)return notify('Keine Sessions in den letzten 24 Stunden.','Warningsound');
   outgoing=await createArchiveTransfer('log',log,appShareUrl());
   partIndex=0;openPane('send');renderPart();
  }catch(e){notify('QR-Code konnte nicht erstellt werden: '+e.message,'Warningsound');}
  finally{send.disabled=false;}
 }
 async function showScan(){
  if(isBusy())return notify('Bitte zuerst Metronom und Mikrofon stoppen.','Warningsound');
  openPane('scan');
  $('#archiveQRScanStatus').textContent='Kamera wird gestartet…';
  try{await scanner.start();}
  catch(e){
   $('#archiveQRScanStatus').textContent='Kamera nicht verfügbar. '+e.message;
   $('#archiveQRManual').open=true;
  }
 }
 send.onclick=showSend;scan.onclick=showScan;
 $('#archiveQRPrevious').onclick=()=>{if(partIndex>0){partIndex--;renderPart();}};
 $('#archiveQRNext').onclick=()=>{if(partIndex<outgoing.parts.length-1){partIndex++;renderPart();}};
 function showResult(message){
  openPane('done');
  $('#archiveQRResult').textContent=message;
 }
 async function receiveLink(text){
  if(receiving)return false;
  receiving=true;
  try{
   const hash=text.startsWith('#d=')?text:(()=>{
    const url=new URL(text),app=new URL(appShareUrl());
    if(url.origin!==app.origin||url.pathname!==app.pathname)
     throw Error('Kein Rhythm-PADD-QR-Code.');
    return url.hash;
   })();
   const part=parseArchivePart(hash);
   let previous=await pendingQR();
   // A new transfer replaces abandoned incomplete parts, not practice data.
   if(previous&&(previous.id!==part.id||previous.digest!==part.digest))previous=null;
   const result=appendArchivePart(previous,part);
   await pendingQR(result.pending);
   if(!result.complete){
    openPane('scan');
    $('#archiveQRScanStatus').textContent='QR '+result.received+' / '+part.total+' erkannt. Nächsten QR-Code scannen.';
    return false;
   }
   const decoded=await decodeArchiveTransfer(result.pending);
   if(decoded.type!=='log')throw Error('Dieser QR-Code enthält kein Practice Log.');
   if(isBusy())throw Error('Metronom und Mikrofon stoppen, bevor Daten gespeichert werden.');
   // Only appends new records; never replaces existing sessions or settings.
   const outcome=await onLog(decoded.data,'auto');
   if(outcome===false)throw Error('Sessions konnten nicht gespeichert werden.');
   await pendingQR(null);
   await scanner.stop();
   const {added=0,duplicates=0,conflicts=0}=outcome||{};
   showResult(added+' neue Session'+(added===1?'':'s')+' hinzugefügt.'+
    (duplicates?' '+duplicates+' bereits vorhanden.':'')+
    (conflicts?' '+conflicts+' vorhandene Einträge unverändert gelassen.':''));
   return true;
  }catch(e){
   $('#archiveQRScanStatus').textContent='QR nicht übernommen: '+e.message;
   notify('QR Sync: '+e.message,'Warningsound');
   return false;
  }finally{receiving=false;}
 }
 $('#archiveQRReceiveLink').onclick=async()=>{
  const value=$('#archiveQRInput').value.trim();
  if(!value)return;
  await receiveLink(value);
  $('#archiveQRInput').value='';
 };
 async function receiveHash(){
  if(!location.hash.startsWith('#d='))return;
  const value=location.hash;
  history.replaceState(null,'',location.pathname+location.search);
  openPane('scan');
  $('#archiveQRScanStatus').textContent='QR-Link wird eingelesen…';
  await receiveLink(value);
 }
 addEventListener('hashchange',()=>receiveHash().catch(e=>notify(e.message,'Warningsound')));
 // Direct links also work when an external camera app opens the browser.
 receiveHash().catch(e=>notify('QR Sync: '+e.message,'Warningsound'));
 return {receiveHash,close};
}
