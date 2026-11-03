// RC25.10 / Main Engineering layout regression.
// Screenshots validate 320px, iPhone 13, tablet and desktop layouts.
// File upload, JSON imports and Service Worker updates are NOT invoked here.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts','settings-engineering');mkdirSync(shots,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{
 const uri=new URL(req.url,'http://localhost');
 const rel=uri.pathname==='/'?'index.html':decodeURIComponent(uri.pathname).slice(1);
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){
  res.writeHead(404);res.end('Not found');return;
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
 createReadStream(full).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
async function boot(page){
 await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
 if(await page.locator('#lcarsInitialize').isVisible()){
  await page.locator('#lcarsInitialize').click();
  await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.hidden,null,{timeout:15000});
 }
}
let failed=0;
try{
 for(const {width,height} of [{width:320,height:740},{width:390,height:844},
                               {width:768,height:1024},{width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});await boot(page);
   await page.locator('[data-tab="settings"]').click();
   await page.locator('#settings .cards > .panel').first().waitFor({state:'visible'});
   const layout=await page.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const cards=[...document.querySelectorAll('#settings .cards > .panel')];
    const controls=['uiEnabled','hoverEnabled','haptic','launchScreen','forceMotion'].map(id=>rect(q('#'+id).closest('label')));
    const exportB=rect(q('#export')),importB=rect(q('#import').closest('.file-button'));
    const offline=rect(q('#offlineStatus')),storage=rect(q('#storageStatus'));
    const persist=rect(q('#persist')),update=rect(q('#update'));
    const feedback=q('#uiEnabled').closest('.panel'),soundDrop=q('#soundDrop'),upload=q('#soundUpload');
    return {count:cards.length,grid:getComputedStyle(feedback).gridTemplateColumns,
      panels:cards.map(x=>rect(x)),switches:controls,exportB,importB,offline,storage,persist,update,
      sound:rect(soundDrop),upload:rect(upload),
      inputAvailable:!upload.disabled,overflow:q('main').scrollWidth-q('main').clientWidth,
      titles:[...document.querySelectorAll('#settings .cards > .panel > h3')].map(x=>({label:x.textContent,size:parseFloat(getComputedStyle(x).fontSize)})),
      detailsCount:document.querySelectorAll('#settings .cards .lcars-info').length};
   });
   assert.equal(layout.count,8,'existing seven Settings panels plus app-sharing panel should remain');
   assert.ok(layout.detailsCount>=5,'existing help and diagnostics sections must survive');
   assert.ok(layout.overflow<=5,width+'px horizontal overflow '+JSON.stringify(layout));
   assert.equal(layout.inputAvailable,true,'audio upload control disabled unexpectedly');
   if(width<=640){
    assert.equal(layout.grid.trim().split(/\s+/).length,2,'feedback matrix needs two columns');
    assert.ok(Math.abs(layout.switches[0].y-layout.switches[1].y)<3,'UI/HOVER share first row');
    assert.ok(Math.abs(layout.switches[2].y-layout.switches[3].y)<3,'HAPTIC/START share second row');
    assert.ok(layout.switches[4].y>layout.switches[2].y+10,'REDUCED MOTION separate row');
    assert.ok(layout.switches[4].width>=layout.switches[0].width*1.8,'REDUCED MOTION spans deck');
    assert.ok(Math.abs(layout.exportB.y-layout.importB.y)<4,'export/import share a row');
    assert.ok(Math.abs(layout.offline.y-layout.storage.y)<4,'status tiles must share a row');
    assert.ok(Math.abs(layout.persist.y-layout.update.y)<4,'storage actions must share a row');
    assert.ok(layout.sound.height>=39&&layout.sound.height<78,'compact sound transporter height: '+JSON.stringify({sound:layout.sound,upload:layout.upload}));
    assert.ok(layout.upload.width>=layout.sound.width-12,'input still spans sound transporter');
    assert.ok(layout.titles.every(x=>x.size>=(width<=350?16:18)),
      'section titles reduced below established readability standard');
   }
   // One stored-sound fixture is enough to test CSS-only layout without
   // writing dummy audio data into IndexedDB or touching native file dialogs.
   const row=await page.evaluate(()=>{
    const host=document.querySelector('#customSoundList');
    const item=document.createElement('div');item.className='sound-file settings-geometry-fixture';
    const label=document.createElement('span');label.textContent='VERY LONG USER SOUND FILE NAME THAT SHOULD ELLIPSIZE · 4.92 SEC';
    const play=document.createElement('button');play.textContent='PLAY';
    const del=document.createElement('button');del.textContent='DELETE';
    item.append(label,play,del);host.append(item);
    const rects=[...item.children].map(x=>x.getBoundingClientRect());
    const grid=getComputedStyle(item).gridTemplateColumns;
    const maxScroll=item.scrollWidth-item.clientWidth;
    const result={grid,rows:new Set(rects.map(x=>Math.round(x.top))).size,
      overflow:maxScroll,buttonHeights:[rects[1].height,rects[2].height]};
    item.remove();return result;
   });
   if(width<=640){
    assert.equal(row.grid.trim().split(/\s+/).length,3,'sound bank needs three columns');
    assert.equal(row.rows,1,'sound filename, play and delete should share a row');
    assert.ok(row.overflow<=3,'sound bank must not overflow');
    assert.ok(row.buttonHeights.every(h=>h>=33),'sound bank action buttons too small');
   }
   await page.screenshot({path:path.join(shots,'settings-'+width+'.png')});
   const checked=await page.locator('#uiEnabled').isChecked();
   await page.locator('#uiEnabled').evaluate(el=>el.click());
   assert.notEqual(await page.locator('#uiEnabled').isChecked(),checked,'UI feedback toggle disabled by grid');
   await page.locator('#uiEnabled').evaluate(el=>el.click());
   await page.locator('#settings #viewportDiagnostics > summary').click();
   assert.equal(await page.locator('#viewportDiagnostics').evaluate(el=>el.open),true,
     'existing viewport diagnostics not accessible');
   assert.deepEqual(errors,[],width+'px JS errors');
   console.log('PASS Engineering',width,JSON.stringify({overflow:layout.overflow,grid:layout.grid,bank:row.grid}));
  }catch(e){failed++;console.error('FAIL Engineering',width,e);}
  finally{await page.close();}
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failed)process.exitCode=1;
