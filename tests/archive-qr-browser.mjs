// End-to-end offline QR sender/receiver; built-in jsQR decodes the generated matrix.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{
 const uri=new URL(req.url,'http://localhost');
 const rel=uri.pathname==='/'?'index.html':decodeURIComponent(uri.pathname).slice(1);
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
 createReadStream(full).pipe(res);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
async function initialize(page){
 await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
 if(await page.locator('#lcarsInitialize').isVisible()){
  await page.locator('#lcarsInitialize').click();
  await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.hidden,null,{timeout:15000});
 }
}
try{
 const sourceContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const sender=await sourceContext.newPage();
 const senderErrors=[];sender.on('pageerror',error=>senderErrors.push(error.message));
 await sender.goto(origin,{waitUntil:'domcontentloaded'});await initialize(sender);
 await sender.evaluate(async()=>{
  const {read,write}=await import('/src/storage.js');
  const {fresh}=await import('/src/model.js');
  const next=await read()??fresh(),now=Date.now();
  next.diary.entries=[{
   id:'qr-quick-sync-1',source:'manual',start:now-60000,end:now,seconds:60,
   exercise:'Rudiment sync',category:'Rudiments',notes:'Private QR note',
   preset:'',reason:'Manual',mode:'standard',bpm:120,peak:130,clean:null,rating:null,history:[]
  }];
  await write(next);
 });
 await sender.reload({waitUntil:'domcontentloaded'});await initialize(sender);
 await sender.locator('[data-tab="diary"]').click();
 await sender.locator('#archiveQR24h').click();
 await sender.locator('#archiveQRImage img').waitFor({state:'visible',timeout:10000});
 const fullscreen=await sender.evaluate(()=>{
  const dialog=document.querySelector('#archiveQRDialog');
  const rect=dialog.getBoundingClientRect(),qr=document.querySelector('#archiveQRImage').getBoundingClientRect();
  return {open:dialog.open,width:rect.width,qrWidth:qr.width};
 });
 assert.ok(fullscreen.open&&fullscreen.width>=390,'sender QR must be in a viewport-sized overlay');
 assert.ok(fullscreen.qrWidth>=320,'sender QR too narrow: '+JSON.stringify(fullscreen));
 const decoded=await sender.evaluate(async()=>{
  const root=document.querySelector('#archiveQRImage');
  const output=root.querySelector('canvas')||root.querySelector('img');
  if(!output)throw Error('No QR code image created');
  if(output.tagName==='IMG'&&!output.complete)await new Promise(resolve=>output.addEventListener('load',resolve,{once:true}));
  const canvas=document.createElement('canvas');
  canvas.width=output.width||360;canvas.height=output.height||360;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(output,0,0,canvas.width,canvas.height);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height);
  return window.jsQR(data.data,canvas.width,canvas.height)?.data;
 });
 const shareUrl=decoded;
 assert.ok(shareUrl.includes('#d=D1.'),'offline decoder must recover the full archive QR payload');
 assert.deepEqual(senderErrors,[],'QR sender must not crash');
 const receiveContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const receiver=await receiveContext.newPage();
 const receiverErrors=[];receiver.on('pageerror',error=>receiverErrors.push(error.message));
 receiver.on('dialog',dialog=>dialog.accept());
 await receiver.goto(origin,{waitUntil:'domcontentloaded'});await initialize(receiver);
 await receiver.locator('[data-tab="diary"]').click();
 await receiver.locator('#archiveQRScan').click();
 await receiver.locator('#archiveQRManual').evaluate(el=>el.open=true);
 await receiver.locator('#archiveQRInput').fill(shareUrl);
 await receiver.locator('#archiveQRReceiveLink').click();
 await receiver.locator('#archiveQRResult').waitFor({state:'visible',timeout:12000});
 assert.match(await receiver.locator('#archiveQRResult').textContent(),/1 neue Session/);
 await receiver.waitForFunction(async()=>{
  const {read}=await import('/src/storage.js');
  return (await read())?.diary?.entries?.some(e=>e.id==='qr-quick-sync-1');
 },null,{timeout:10000});
 const imported=await receiver.evaluate(async()=>{
  const {read}=await import('/src/storage.js');
  return (await read()).diary.entries.find(e=>e.id==='qr-quick-sync-1');
 });
 assert.equal(imported.notes,'Private QR note');
 assert.deepEqual(receiverErrors,[],'QR receiver must not crash');
 await sourceContext.close();await receiveContext.close();
 console.log('PASS: fullscreen 24h QR, jsQR decoder and automatic append-only session merge');
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
