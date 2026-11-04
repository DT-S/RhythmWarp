// RC25.1 real browser visual contract, without requesting a microphone.
// The capture flag is simulated ONLY to exercise responsive presentation.
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts','v2-smoke');
mkdirSync(shots,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const rel=pathname==='/'?'index.html':decodeURIComponent(pathname).slice(1);
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
 createReadStream(full).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
let failures=0;
try{
 for(const [width,height] of [[390,844],[320,740]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,
   reducedMotion:'reduce'});
  try{
   const errors=[];page.on('pageerror',err=>{errors.push(err.message);console.error('PAGE ERROR '+width,err.message);});
   page.on('response',response=>{if(response.status()>=400)console.error('HTTP '+response.status()+' '+response.url());});
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',
    null,{timeout:20000});
   if(await page.locator('#lcarsInitialize').isVisible())await page.locator('#lcarsInitialize').click();
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup').hidden,null,{timeout:15000});
   await page.waitForSelector('#rings .beat-arc');
   assert.equal(await page.locator('#tacticalViewSwitch').isVisible(),true);
   assert.equal(await page.locator('#dial').isVisible(),true);
   assert.ok(await page.locator('#rings .beat-arc').count()>=6);
   // RC25.3: check what the user actually saw: NORMAL metronome, mic OFF.
   // This intentionally runs BEFORE selecting or simulating the mic sensor.
   const normal=await page.evaluate(()=>{
    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();
     return {x:r.left,y:r.top,width:r.width,height:r.height,bottom:r.bottom};};
    return {micOff:!document.querySelector('#metronome').classList.contains('mic-telemetry-on'),
     dial:box('#dial'),transport:box('#metronome .transport'),
     tap:box('#tap'),start:box('#start'),
     patterns:box('#metronome .pattern-counts'),
     outer:box('#metronome .pattern-counts label:first-child'),
     inner:box('#metronome .pattern-counts label:nth-child(2)'),
     status:box('#metronome .play-status')};
   });
   assert.equal(normal.micOff,true,'normal layout test requires MIC OFF');
   assert.ok(normal.transport.width>normal.patterns.width*1.75,
    'NORMAL mobile Start/Tap must span the full stage: '+JSON.stringify(normal));
   assert.ok(normal.transport.y>=normal.dial.bottom-3 &&
     normal.patterns.y>=normal.transport.bottom-3,
    'NORMAL mobile transport must be above secondary beat inputs: '+JSON.stringify(normal));
   assert.ok(Math.abs(normal.status.y-normal.patterns.y)<=8,
    'Status and typed beat inputs must share a row: '+JSON.stringify(normal));
   assert.ok(normal.tap.width>normal.outer.width*1.8 &&
     normal.start.width>normal.inner.width*1.8,
    'Primary buttons must be visibly larger than beat inputs: '+JSON.stringify(normal));
   assert.ok(normal.tap.height>=normal.outer.height*1.3 &&
     normal.start.height>=normal.inner.height*1.3,
    'Normal transport buttons must be taller than the secondary inputs: '+JSON.stringify(normal));
   const shell=await page.evaluate(()=>{
    const r=document.querySelector('.app-shell').getBoundingClientRect();
    return {height:r.height,visualHeight:window.visualViewport?.height,
     layoutHeight:window.innerHeight,width:r.width};
   });
   assert.ok(shell.height>=shell.layoutHeight*.85,
    'Mobile app shell must fill the iPhone viewport instead of collapsing to the top third: '+JSON.stringify(shell));
   console.log('PASS RC25.3 NORMAL mobile main screen hierarchy '+width+' '+JSON.stringify(normal));
   await page.screenshot({path:path.join(shots,'rc25-3-normal-'+width+'.png')});
   await page.locator('[data-tab="audio"]').click();
   assert.equal(await page.locator('#audio').isVisible(),true);
   assert.equal(await page.locator('#mixer .matrix-channel').count(),2);
   // Return to Metronome without affecting the underlying user settings.
   await page.locator('[data-tab="metronome"]').click();
   await page.locator('#deckMicToggle').click();
   assert.equal(await page.locator('#micArm').isVisible(),true);
   // UI-only active sensor fixture: no recording, audio device, or fake timing results.
   await page.evaluate(()=>{
    const page=document.querySelector('#metronome');
    page.classList.add('mic-telemetry-on');
    document.querySelector('#micConsole').classList.add('mic-active');
    document.querySelector('#micVisual').hidden=false;
    document.querySelector('#micActiveHelp').hidden=false;
    document.querySelector('#micArm').textContent='DISENGAGE MIC // END SESSION';
    page.dispatchEvent(new CustomEvent('lcars:mic-state',{detail:{active:true}}));
   });
   const geo=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();
     return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
    return {dial:rect('#dial'),rings:rect('#rings'),view:rect('#tacticalViewSwitch'),main:rect('main'),
     arm:rect('#micArm'),label:parseFloat(getComputedStyle(document.querySelector('#rings .node-label')).fontSize),
     beatCount:document.querySelectorAll('#rings .beat-arc').length,
     viewDisplay:getComputedStyle(document.querySelector('#tacticalViewSwitch')).display};
   });
   assert.equal(await page.locator('#tacticalViewSwitch').isVisible(),true,
    'Circular / Linear / Tactical selectors must remain available while mic is active');
   assert.ok(geo.dial.width>=170&&geo.dial.width<=220,JSON.stringify(geo));
   assert.ok(geo.dial.height>=170&&geo.rings.height>=170,JSON.stringify(geo));
   assert.ok(geo.beatCount>=6&&geo.label>=20,JSON.stringify(geo));
   assert.ok(geo.view.width>=90&&geo.view.bottom<=geo.main.bottom,JSON.stringify(geo));
   assert.ok(geo.arm.height>=38,JSON.stringify(geo));
   // Tactical hierarchy: Tap/Start span the full instrument, typed
   // outer/inner counts share the smaller left half with status on the right.
   const tactical=await page.evaluate(()=>{
    const box=id=>{const r=document.querySelector(id).getBoundingClientRect();
     return {x:r.left,y:r.top,width:r.width,height:r.height,bottom:r.bottom};};
    return {transport:box('#metronome .transport'),
     patterns:box('#metronome .pattern-counts'),
     status:box('#metronome .play-status'),
     tap:box('#tap'),start:box('#start'),
     outer:box('#metronome .pattern-counts label:first-child'),
     inner:box('#metronome .pattern-counts label:nth-child(2)')};
   });
   assert.ok(tactical.transport.width>tactical.patterns.width*1.75,
    'Start/Tap must occupy the full row: '+JSON.stringify(tactical));
   assert.ok(tactical.transport.y<tactical.patterns.y &&
     tactical.patterns.y>=tactical.transport.bottom-2,
    'Optional beat inputs must follow transport: '+JSON.stringify(tactical));
   assert.ok(Math.abs(tactical.patterns.y-tactical.status.y)<8,
    'Optional beat inputs and play status must share a row: '+JSON.stringify(tactical));
   assert.ok(tactical.tap.width>tactical.outer.width*1.8 &&
     tactical.start.width>tactical.inner.width*1.8,
    'Tap and Start need much larger targets than typed beat inputs: '+JSON.stringify(tactical));
   assert.ok(tactical.tap.height>=tactical.outer.height*1.3 &&
     tactical.start.height>=tactical.inner.height*1.3,
    'Primary tactical controls must remain taller than optional number editors: '+JSON.stringify(tactical));
   assert.equal(await page.locator('#micActiveHelp').isVisible(),true);
   assert.equal(await page.locator('#deckMicToggle').textContent().then(t=>t.includes('MIC SETTINGS')),true);
   await page.locator('#deckMicToggle').click();
   assert.equal(await page.locator('#metronome').evaluate(el=>el.classList.contains('mic-controls-open')),true);
   assert.equal(await page.locator('#micConsole .mic-cfg-drawer').isVisible(),true);
   assert.equal(await page.locator('#metronome').evaluate(el=>el.classList.contains('mic-telemetry-on')),true);
   await page.locator('#deckMicToggle').click();
   assert.equal(await page.locator('#micConsole .mic-cfg-drawer').isVisible(),false);
   await page.locator('#tacticalViewSwitch [data-tac-view="linear"]').click();
   assert.equal(await page.locator('#linear').isVisible(),true);
   assert.equal(await page.locator('#dial').isVisible(),false);
   assert.equal(await page.locator('#tacticalViewSwitch').isVisible(),true);
   await page.locator('#tacticalViewSwitch [data-tac-view="circular"]').click();
   assert.equal(await page.locator('#linear').isVisible(),false);
   assert.equal(await page.locator('#dial').isVisible(),true);
   await page.screenshot({path:path.join(shots,'rc25-1-tactical-'+width+'.png')});
   assert.deepEqual(errors,[]);
   console.log('PASS RC25.1 tactical view, mic settings and readable beats at '+width+'px '+JSON.stringify(geo));
  }catch(error){
   console.error('RC25.1 diagnostic '+width,JSON.stringify(await page.evaluate(()=>({
    ready:document.querySelector('#lcarsStartup')?.dataset.ready,
    startup:document.querySelector('#lcarsStartup')?.hidden,
    rings:document.querySelectorAll('#rings .beat-arc').length,
    body:document.body?.innerText?.slice(0,350),
    script:document.querySelector('script[type=module]')?.src,
    notice:document.querySelector('#notice')?.textContent
   })).catch(e=>({error:e.message}))));
   failures++;console.error('FAIL RC25.1 tactical '+width,error);
   await page.screenshot({path:path.join(shots,'rc25-1-failure-'+width+'.png')}).catch(()=>{});
  }finally{await page.close();}
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures)process.exitCode=1;
