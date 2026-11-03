// Reproduce iOS 26 Home Screen viewport clipping. Chromium can fake metrics,
// but cannot emulate WebKit's reserved strip outside the paintable viewport.
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts','v2-smoke');
mkdirSync(shots,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{
 const rel=new URL(req.url,'http://localhost').pathname;
 const filename=rel==='/'?'index.html':decodeURIComponent(rel).slice(1);
 const full=path.resolve(root,filename);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){
  res.writeHead(404);res.end('Not found');return;
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
 createReadStream(full).pipe(res);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
let failures=0;
try{
 for(const scenario of [
  {name:'ios-pwa-reserved-81px',height:763,standalone:true,expectedGap:81},
  {name:'ios-pwa-full-viewport',height:844,standalone:true,expectedGap:0},
  {name:'safari-tab',height:763,standalone:false,expectedGap:null}
 ]){
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
   reducedMotion:'reduce'
  });
  try{
   const errs=[];page.on('pageerror',e=>errs.push(e.message));
   await page.addInitScript(({height,standalone})=>{
    Object.defineProperty(navigator,'standalone',{configurable:true,value:standalone});
    Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>height});
   },scenario);
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',
    null,{timeout:20000});
   await page.locator('#lcarsInitialize').click();
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup').hidden);
   await page.waitForSelector('#rings .beat-arc');
   const dims=await page.evaluate(()=>{
    const box=id=>{const r=document.querySelector(id).getBoundingClientRect();
     return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    return {
     shell:box('.app-shell'),footer:box('.app-shell > main > footer'),
     dial:box('#dial'),start:box('#start'),tap:box('#tap'),
     classOn:document.querySelector('.app-shell').classList.contains('ios-standalone-viewport'),
     mainInset:getComputedStyle(document.querySelector('main')).paddingBottom,
     sideBar:box('.app-shell > aside .rail-end')
    };
   });
   assert.equal(dims.classOn,scenario.standalone,JSON.stringify(dims));
   assert.ok(Math.abs(dims.shell.height-scenario.height)<3,JSON.stringify(dims));
   assert.ok(dims.shell.bottom<=scenario.height+3,
    'Footer may never be laid out under WebKit-owned bottom strip: '+JSON.stringify(dims));
   assert.ok(dims.sideBar.bottom<dims.shell.bottom,JSON.stringify(dims));
   assert.ok(dims.start.width>105&&dims.tap.width>105,
    'Primary controls must retain their normal dimensions');
   await page.locator('[data-tab="settings"]').click();
   await page.locator('#viewportDiagnostics summary').click();
   // The <details> toggle event is dispatched after the click; wait for the
   // actual readout rather than racing its initial 'OPEN TO MEASURE' label.
   await page.waitForFunction(()=>document.querySelector('#viewportMetrics')?.textContent?.includes('SCREEN MINUS WEB VIEWPORT:'),null,{timeout:5000});
   const diagnostic=await page.locator('#viewportMetrics').textContent();
   assert.match(diagnostic,/SCREEN MINUS WEB VIEWPORT:/);
   assert.match(diagnostic,/LAYOUT:/);
   assert.match(diagnostic,/SAFE INSETS:/);
   if(scenario.expectedGap!==null)assert.ok(
    diagnostic.includes('SCREEN MINUS WEB VIEWPORT: '+scenario.expectedGap+' px'),
    diagnostic);
   assert.deepEqual(errs,[]);
   await page.screenshot({path:path.join(shots,'rc25-5-'+scenario.name+'.png')});
   console.log('PASS RC25.5 '+scenario.name+' '+JSON.stringify(dims));
  }catch(error){failures++;console.error('FAIL RC25.5 '+scenario.name,error);}
  finally{await page.close();}
 }
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
if(failures)process.exitCode=1;
