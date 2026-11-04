// Simple click offset monitor stays in the single-window sensor CFG.
import {createServer} from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{
 const rel=new URL(req.url,'http://localhost').pathname==='/'?'index.html':
   decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1));
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
 createReadStream(full).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:'+server.address().port;
try{
 for(const [width,height] of [[320,740],[390,844],[768,1024],[1440,900]]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
     await page.goto(url,{waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
     if(await page.locator('#lcarsInitialize').isVisible()){
       await page.locator('#lcarsInitialize').click();
       await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.hidden===true,null,{timeout:15000});
     }
     await page.waitForFunction(()=>!!document.querySelector('#acousticPilot'));
     assert.equal(await page.locator('#acousticPilot').count(),1);
     assert.equal(await page.locator('#acousticPilotStart').count(),1);
     assert.equal(await page.locator('#acousticPilotProgress').count(),1);
     assert.match(await page.locator('#acousticPilot').textContent(),/six clicks/i);
     assert.equal(await page.locator('#acousticPilotAbort').isDisabled(),true);
     assert.equal(await page.locator('#acousticPilotMetrics').count(),0);
     assert.equal(await page.locator('dialog#acousticPilot').count(),0);
     await page.locator('#acousticPilot').evaluate(el=>{el.open=true;});
     const normal=await page.evaluate(()=>{
       const panel=document.querySelector('#acousticPilot');
       const config=panel.closest('.mic-cfg-body');
       return {embedded:!!config,hasBtn:!!panel.querySelector('#acousticPilotStart'),
         scroll:document.documentElement.scrollWidth-document.documentElement.clientWidth};
     });
     assert.ok(normal.embedded&&normal.hasBtn);
     assert.ok(normal.scroll<18,'horizontal scroll regression: '+JSON.stringify(normal));
     await page.locator('#tacticalViewSwitch [data-tac-view="tactical"]').click();
     await page.locator('#deckMicToggle').click();
     assert.equal(await page.locator('#tacticalSettingsBody #micConsole #acousticPilot').count(),1);
     assert.equal(await page.locator('#acousticPilotStart').count(),1);
     assert.equal(errors.length,0,'browser runtime errors: '+errors.join(' | '));
     console.log('manual click monitor panel okay at '+width+'px');
   }finally{await page.close();}
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
