// RC25.9 Stats HUD: live seeded history, actual plots and responsive controls.
// Simulated browsers cannot certify the iOS Home Screen reserved viewport strip.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts','stats-telemetry');mkdirSync(shots,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
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
let failed=0;
async function boot(page){
 await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
 if(await page.locator('#lcarsInitialize').isVisible()){
  await page.locator('#lcarsInitialize').click();
  await page.waitForFunction(()=>document.querySelector('#lcarsStartup').hidden,null,{timeout:15000});
 }
}
try {
 for(const {width,height} of [{width:320,height:740},{width:390,height:844},
                               {width:768,height:1024},{width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});await boot(page);
   await page.evaluate(async()=>{
    const {read,write}=await import('/src/storage.js');
    const {fresh}=await import('/src/model.js');
    const state=await read()||fresh(),now=new Date();
    now.setHours(12,0,0,0);
    const make=(id,days,exercise,source,bpm)=>{
     const start=now.getTime()-days*86400000;
     return {id,start,end:start+12*60000,seconds:720,
      exercise,source,category:days%2?'Grooves':'Timing',notes:'',
      rating:null,clean:null,preset:'',reason:'Stopped',mode:'standard',
      bpm,peak:bpm+12,history:[]};
    };
    state.diary.entries=[
     make('telemetry-1',0,'Ghost Notes','manual',112),
     make('telemetry-2',1,'Triplet Rudiments','measured',120),
     make('telemetry-3',3,'Timing Precision','manual',136),
     make('telemetry-4',8,'Sixteenth Notes','measured',104)
    ];
    await write(state);
   });
   await page.reload({waitUntil:'domcontentloaded'});await boot(page);
   await page.locator('[data-tab="analytics"]').click();
   await page.locator('#analyticsContent .stat-grid .stat-tile').first().waitFor();
   await page.locator('#analyticsContent .xy-plot-stage').first().waitFor({state:'visible'});
   await page.locator('#micAnalytics > h3').waitFor();
   const info=await page.evaluate(()=>{
    const q=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};};
    const well=q('main'),deck=q('.analytics-filter-deck'),kpis=q('#analyticsContent .stat-grid'),
          plot=q('#analyticsContent .xy-plot-stage'),mic=q('#micAnalytics'),toggle=q('.analytics-filter-toggle');
    const tiles=[...kpis.children].map(x=>({name:x.querySelector('span')?.textContent,rect:rect(x)}));
    return {deck:rect(deck),deckOpen:!q('#analyticsFilterBody').hidden,
      toggleExpanded:toggle.getAttribute('aria-expanded'),
      kpis:rect(kpis),tiles,plot:rect(plot),mic:rect(mic),
      scrollOverflow:well.scrollWidth-well.clientWidth,
      grid:getComputedStyle(kpis).gridTemplateColumns};
   });
   assert.equal(info.deckOpen,width>640,'mobile filters collapsed by default');
   assert.equal(info.toggleExpanded,String(info.deckOpen));
   assert.deepEqual(info.tiles.map(x=>x.name),['PRACTICE / MIN','SESSIONS','ACTIVE DAYS','PEAK / BPM','CLEAN / SELF-REPORTED']);
   assert.ok(info.scrollOverflow<=5,width+'px stats scroll overflows: '+JSON.stringify(info));
   if(width<=640){
    assert.equal(info.grid.trim().split(/\s+/).length,6,'KPI 6-column CSS underpinning 2+3');
    assert.ok(Math.abs(info.tiles[0].rect.top-info.tiles[1].rect.top)<3,'primary stats in first row');
    assert.ok(Math.abs(info.tiles[2].rect.top-info.tiles[4].rect.top)<3,'secondary stats in second row');
    assert.ok(info.plot.top<height,'main plot should appear without scrolling on a phone');
   }
   await page.screenshot({path:path.join(shots,'stats-'+width+'.png')});
   const chooser=await page.evaluate(()=>{
    const stats=document.querySelector('#micAnalytics'),sample=document.createElement('div');
    sample.className='mic-session-chooser stats-telemetry-test-fixture';
    for(const txt of ['BEST / ALL TIME','BEST / 7 DAYS','WORST / 7 DAYS','LATEST 1','LATEST 2','LATEST 3']){
     const b=document.createElement('button');b.textContent=txt;sample.append(b);
    }
    stats.append(sample);
    const box=sample.getBoundingClientRect();
    const y=[...sample.children].map(b=>b.getBoundingClientRect().top);
    const count=getComputedStyle(sample).gridTemplateColumns.trim().split(/\s+/).length;
    const overflow=sample.scrollWidth-sample.clientWidth;
    sample.remove();
    return {count,rows:new Set(y.map(y=>Math.round(y))).size,overflow,width:box.width};
   });
   assert.equal(chooser.count,3,'mic archive highlighters need 3 columns');
   assert.equal(chooser.rows,2,'mic archive six highlighters need 2 rows');
   assert.ok(chooser.overflow<=3,'mic chooser must not scroll');
   await page.locator('#analyticsContent .analytics-filter-toggle').click();
   assert.equal(await page.locator('#analyticsFilterBody').isVisible(),width<=640);
   if(width<=640){
    const periods=page.locator('#analyticsContent .analytics-periods button');
    const sources=page.locator('#analyticsContent .analytics-sources button');
    const filters=await page.evaluate(()=>{
     const cols=s=>getComputedStyle(document.querySelector(s)).gridTemplateColumns.trim().split(/\s+/).length;
     return {periods:cols('.analytics-periods'),sources:cols('.analytics-sources'),
             categories:cols('.analytics-categories')};
    });
    assert.deepEqual(filters,{periods:4,sources:3,categories:3});
    await periods.first().click();
    assert.equal(await page.locator('#analyticsFilterBody').isVisible(),true,'filter state lost during redraw');
    assert.equal(await page.locator('#analyticsContent .analytics-filter-toggle').getAttribute('aria-expanded'),'true');
    await page.screenshot({path:path.join(shots,'stats-filters-'+width+'.png')});
   }else{
    assert.equal(await page.locator('#analyticsFilterBody').isVisible(),false,'desktop filters should toggle closed');
   }
   await page.locator('#analyticsContent .chart-modes button[data-kind="minutes"]').click();
   assert.equal(await page.locator('#analyticsContent .chart-modes button[data-kind="minutes"]').getAttribute('aria-pressed'),'true');
   assert.ok(await page.locator('#analyticsContent .xy-plot-stage svg').count()>0);
   assert.deepEqual(errors,[],width+'px browser exceptions');
   console.log('PASS Voyager telemetry',width,JSON.stringify({plotTop:info.plot.top,overflow:info.scrollOverflow,chooser}));
  }catch(e){failed++;console.error('FAIL Voyager telemetry',width,e);}
  finally{await page.close();}
 }
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
if(failed)process.exitCode=1;
