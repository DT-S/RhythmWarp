// P7 release candidate E2E: actual SW cache, offline restart, IndexedDB,
// downloadable JSON, restore, explicit update and cross-engine boot checks.
// Run with: node tests/v2-release-gates.mjs (Playwright installed in CI).
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const screenshots=path.join(root,'artifacts','v2-release');
mkdirSync(screenshots,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html',
 '.json':'application/json','.webmanifest':'application/manifest+json',
 '.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
let serveOldWorker=false,fail=0;
const oldWorker="const KEY='lcars-core-/-old-p7-release';self.addEventListener('install',e=>e.waitUntil(caches.open(KEY)));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));";
const server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/sw.js'&&serveOldWorker){
  res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
  res.end(oldWorker);return;
 }
 const rel=decodeURIComponent(pathname)==='/'?'index.html':decodeURIComponent(pathname).slice(1);
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream',
  'Cache-Control':pathname==='/sw.js'?'no-store':'no-cache'});
 createReadStream(full).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const output=(label,fn)=>fn().then(()=>console.log('PASS P7 '+label)).catch(err=>{
 fail++;console.error('FAIL P7 '+label,err);
});
async function initializeLCARS(page){
 await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',{timeout:20000});
 if(await page.locator('#lcarsInitialize').isVisible()){
  await page.locator('#lcarsInitialize').click();
  await page.waitForFunction(()=>document.querySelector('#lcarsStartup').hidden,{timeout:15000});
 }
}
const waitReady=async page=>{
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),{timeout:20000});
 await page.waitForFunction(()=>document.querySelector('#rings [data-index]')!==null,{timeout:20000});
};
let browser;
try{
 browser=await chromium.launch({headless:true});
 await output('Chromium persistence, export/restore and offline PWA restart',async()=>{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(base,{waitUntil:'networkidle'});
   await initializeLCARS(page);
   await waitReady(page);
   const cached=await page.evaluate(async()=>{
    const reg=await navigator.serviceWorker.ready;
    const keys=await caches.keys();
    const cache=await caches.open(keys.find(k=>k.startsWith('lcars-core-')&&k.includes('v2-')&&k!=='lcars-core-/-old-p7-release'));
    return {scope:reg.scope,keys,html:Boolean(await cache.match('./index.html')),
      module: Boolean(await cache.match('./src/app.js')),
      styles: Boolean(await cache.match('./v2-motion.css')),
      audio: Boolean(await cache.match('./assets/audio/ui/Acceptsound.mp3'))};
   });
   assert.ok(cached.scope.startsWith(base));
   assert.ok(cached.html&&cached.module&&cached.styles&&cached.audio,'offline cache incomplete');
   assert.equal(await page.locator('#tempoValue').textContent(),'120');
   await page.locator('#plus').click();await page.locator('#plus').click();
   assert.equal(await page.locator('#tempoValue').textContent(),'122');
   await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='SAVED ON THIS DEVICE');
   await page.locator('[data-tab="settings"]').click();
   const downloadPromise=page.waitForEvent('download');
   await page.locator('#export').click();
   const download=await downloadPromise;
   assert.match(download.suggestedFilename(),/^lcars-backup-\d{4}-\d\d-\d\d\.json$/);
   const downloadPath=await download.path();
   const {readFile}=await import('node:fs/promises');
   const buffer=await readFile(downloadPath);
   const backup=JSON.parse(buffer.toString());
   assert.equal(backup.version,5);
   assert.equal(backup.bpm,122);
   assert.equal(backup.channels.length,2);
   assert.ok(Array.isArray(backup.customSounds)&&Array.isArray(backup.diary.entries));
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await initializeLCARS(page);
   await waitReady(page);
   assert.equal(await page.locator('#tempoValue').textContent(),'122');
   for(const tab of ['audio','presets','diary','analytics','settings','metronome']){
    await page.locator('[data-tab="'+tab+'"]').click();
    assert.equal(await page.locator('#'+tab).isVisible(),true,'offline '+tab+' inaccessible');
   }
   await page.screenshot({path:path.join(screenshots,'p7-chromium-offline.png')});
   await page.close();
   const restarted=await context.newPage();
   await restarted.goto(base,{waitUntil:'domcontentloaded'});
   await initializeLCARS(restarted);
   await waitReady(restarted);
   assert.equal(await restarted.locator('#tempoValue').textContent(),'122','new tab lost IndexedDB');
   await context.setOffline(false);
   await restarted.locator('#minus').click();
   assert.equal(await restarted.locator('#tempoValue').textContent(),'121');
   await restarted.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='SAVED ON THIS DEVICE');
   await restarted.locator('[data-tab="settings"]').click();
   restarted.on('dialog',dialog=>dialog.accept());
   await restarted.locator('#import').setInputFiles({name:'rhythm-padd-backup.json',
    mimeType:'application/json',buffer});
   await restarted.waitForFunction(()=>document.querySelector('#tempoValue').textContent==='122',{timeout:20000});
   await restarted.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='SAVED ON THIS DEVICE');
   await restarted.reload({waitUntil:'domcontentloaded'});
   await initializeLCARS(restarted);
   assert.equal(await restarted.locator('#tempoValue').textContent(),'122','backup did not persist after reload');
   assert.deepEqual(errors,[]);
   await restarted.close();
  }finally{await context.close();}
 });
 await output('Chromium production service-worker replacement',async()=>{
  serveOldWorker=true;
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(base,{waitUntil:'networkidle'});
   await initializeLCARS(page);
   await waitReady(page);
   assert.ok(await page.evaluate(async()=> (await caches.keys()).includes('lcars-core-/-old-p7-release')));
   // Updating a controlled offline PWA stages a waiting worker. The
   // original cache stays intact until SYSTEM ACCESS explicitly activates it.
   serveOldWorker=false;
   await page.evaluate(async()=>{
    const reg=await navigator.serviceWorker.getRegistration();
    await reg.update();
   });
   await page.waitForFunction(async()=>{
    const reg=await navigator.serviceWorker.getRegistration();
    const keys=await caches.keys();
    return !!reg?.waiting&&keys.some(k=>k.includes('v2-'))&&keys.includes('lcars-core-/-old-p7-release');
   },null,{timeout:20000});
   await page.locator('[data-tab="settings"]').click();
   const update=page.locator('#update');
   assert.equal(await update.isVisible(),true);
   // This test stages the worker externally via registration.update(). The UI
   // may still say CHECK FOR UPDATES until the user presses the button, which
   // must discover and activate the real waiting worker. Offline restart below
   // is the functional gate, not the transient button label.
   assert.match(await update.textContent(),/^(CHECK FOR UPDATES|INSTALL UPDATE & RELOAD|RELOAD TO APPLY)$/);
   await update.click();
   await page.waitForSelector('#rings [data-index]',{timeout:20000});
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await initializeLCARS(page);
   assert.ok(await page.locator('#rings [data-index]').count()>0);
   assert.deepEqual(errors,[]);
  }finally{serveOldWorker=false;await context.close();}
 });
 await output('Chromium live transport, channel pan and mute/solo regression',async()=>{
  const context=await browser.newContext({viewport:{width:1024,height:768}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(base,{waitUntil:'networkidle'});
   await initializeLCARS(page);
   await page.waitForSelector('#rings [data-index]');
   await page.locator('#start').click();
   await page.waitForFunction(()=>document.querySelector('#start').textContent==='STOP',
     null,{timeout:15000});
   assert.equal(await page.locator('#playStatus').textContent(),'PLAYING');
   await page.locator('[data-tab="audio"]').click();
   const firstPan=page.locator('#mixer input[data-field="pan"]').first();
   const panButtons=page.locator('#mixer .pan-scale').first().locator('button');
   await panButtons.first().click();
   assert.equal(await firstPan.inputValue(),'-1');
   await panButtons.last().click();
   assert.equal(await firstPan.inputValue(),'1');
   await panButtons.nth(1).click();
   assert.equal(await firstPan.inputValue(),'0');
   const outer=page.locator('#mixer .panel').first();
   await outer.locator('button[data-field="mute"]').click();
   assert.equal(await outer.locator('button[data-field="mute"]').getAttribute('aria-pressed'),'true');
   await outer.locator('button[data-field="mute"]').click();
   await outer.locator('button[data-field="solo"]').click();
   assert.equal(await outer.locator('button[data-field="solo"]').getAttribute('aria-pressed'),'true');
   await outer.locator('button[data-field="solo"]').click();
   await page.locator('[data-tab="metronome"]').click();
   await page.locator('#start').click();
   await page.waitForFunction(()=>document.querySelector('#start').textContent==='START',null,{timeout:10000});
   assert.equal(await page.locator('#playStatus').textContent(),'READY');
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 });
 await browser.close();browser=null;
 // Firefox is an independent browser-engine check, not a claim of having
 // personally tested Arch Linux or iOS Safari hardware.
 browser=await firefox.launch({headless:true});
 await output('Firefox engine responsive navigation and persistence',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(base,{waitUntil:'networkidle'});
   await initializeLCARS(page);
   await page.waitForSelector('#rings [data-index]',{timeout:20000});
   assert.equal(await page.locator('#modeButtons button').count(),8);
   await page.locator('#plus').click();
   assert.equal(await page.locator('#tempoValue').textContent(),'121');
   await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='SAVED ON THIS DEVICE');
   for(const tab of ['audio','presets','diary','analytics','settings','metronome']){
    await page.locator('[data-tab="'+tab+'"]').click();
    assert.equal(await page.locator('#'+tab).isVisible(),true);
   }
   await page.reload({waitUntil:'domcontentloaded'});
   await initializeLCARS(page);
   await page.waitForSelector('#rings [data-index]');
   assert.equal(await page.locator('#tempoValue').textContent(),'121');
   await page.screenshot({path:path.join(screenshots,'p7-firefox-desktop.png')});
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 });
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(fail)process.exitCode=1;
