// Real Chromium check for the mobile layout mistake caught on the studio screenshots.
import {createServer} from 'node:http';
import {createReadStream, existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts/rhythm-warp-rail');
mkdirSync(shots,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript',
 '.webmanifest':'application/manifest+json','.json':'application/json',
 '.svg':'image/svg+xml','.mp3':'audio/mpeg','.png':'image/png'};
const server=createServer((req,res)=>{
 const relative=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,relative==='/'?'index.html':decodeURIComponent(relative).slice(1));
 if(!file.startsWith(root+path.sep)||!existsSync(file)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
 createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true});
let failures=0;
try{
 for(const width of [320,393,768,1280]){
  const phone=width<=640;
  const page=await browser.newPage({
   viewport:{width,height:phone?852:900},
   deviceScaleFactor:phone?3:1,
   isMobile:phone,hasTouch:phone,reducedMotion:'reduce'
  });
  try{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
   const startup=await page.evaluate(()=>{
    const b=document.querySelector('.lcars-side-block');
    const r=document.querySelector('.lcars-side-filler');
    const dims=e=>{const x=e.getBoundingClientRect();return {w:x.width,h:x.height};};
    return {button:dims(b),rail:dims(r)};
   });
   assert.ok(startup.button.w>=66,'launch buttons have to remain readable: '+JSON.stringify(startup));
   assert.ok(startup.button.h>=40,'launch buttons must be finger-sized');
   assert.ok(startup.rail.w<=17,'decorative launch rail still too wide: '+JSON.stringify(startup));
   await page.screenshot({path:path.join(shots,'start-'+width+'.png')});
   await page.locator('#lcarsInitialize').click();
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup').hidden,null,{timeout:15000});
   const layout=await page.evaluate(()=>{
    const nav=document.querySelector('.app-shell > aside nav');
    const buttons=[...nav.querySelectorAll('.nav')];
    const rail=document.querySelector('.app-shell > aside .rail');
    const r=e=>{const x=e.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height};};
    return {buttons:buttons.map(r),rail:r(rail),nav:r(nav),
      columns:getComputedStyle(nav).gridTemplateColumns,
      innerWidth:innerWidth};
   });
   assert.ok(layout.rail.w<=17,'decorative app rail too wide: '+JSON.stringify(layout));
   assert.ok(layout.buttons.every(b=>b.w>=(phone?70:105)),
      'main navigation buttons are squeezed: '+JSON.stringify(layout));
   assert.ok(layout.buttons.every(b=>b.h>=44),
      'main navigation hit targets too small: '+JSON.stringify(layout));
   if(phone){
    assert.ok(layout.buttons[0].y===layout.buttons[1].y,
      'on phones the menu must be a horizontal grid: '+JSON.stringify(layout));
    assert.ok(layout.buttons[3].y>layout.buttons[0].y,
      'on phones the second row must be visible: '+JSON.stringify(layout));
   }
   await page.locator('[data-tab="settings"]').click();
   await page.screenshot({path:path.join(shots,'settings-'+width+'.png')});
   assert.deepEqual(errors,[],width+'px JavaScript exceptions');
   console.log('PASS rail geometry '+width+'px '+JSON.stringify({startup,layout}));
  }catch(e){failures++;console.error('FAIL rail geometry '+width+'px',e);}
  finally{await page.close();}
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures)process.exitCode=1;
