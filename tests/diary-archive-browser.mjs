// RC25.8 Voyager Diary: real browser layout and interaction checks.
// Browser simulation cannot reproduce the iOS Home Screen viewport bug.
import test from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts','diary-archive');
mkdirSync(shots,{recursive:true});
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
let failures=0;
async function initialize(page){
 await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
 if(await page.locator('#lcarsInitialize').isVisible()){
  await page.locator('#lcarsInitialize').click();
  await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.hidden,null,{timeout:15000});
 }
}
try{
 for(const size of [{width:390,height:844,cols:3},{width:320,height:740,cols:2},{width:768,height:1024,cols:3},{width:1440,height:900,cols:3}]){
  const page=await browser.newPage({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});await initialize(page);
   await page.evaluate(async()=>{
    const {read,write}=await import('/src/storage.js');
    const {fresh}=await import('/src/model.js');
    const state=await read()||fresh(),now=Date.now();
    const make=(id,offset,exercise,source)=>{
     const start=now-offset,end=start+12*60000;
     return {id,source,start,end,seconds:720,exercise,category:'Timing',notes:'',
       rating:null,clean:null,preset:'',reason:'Stopped',mode:'standard',
       bpm:120,peak:136,history:[]};
    };
    state.diary.entries=[
     make('layout-test-a',7200000,'Ghost Note Independence','manual'),
     make('layout-test-b',15000000,'Single Stroke Roll','measured'),
     make('layout-test-c',23000000,'Sixteenth Triplet Grid','manual')
    ];
    await write(state);
   });
   await page.reload({waitUntil:'domcontentloaded'});await initialize(page);
   await page.locator('[data-tab="diary"]').click();
   await page.locator('#diaryList .log-entry').first().waitFor();
   const info=await page.evaluate(()=>{
    const setup=document.querySelector('#diarySetup'),card=document.querySelector('#diaryList .log-entry');
    const grid=card.querySelector('.session-data'),well=document.querySelector('main');
    const rect=el=>{const a=el.getBoundingClientRect();return {top:a.top,bottom:a.bottom,width:a.width,height:a.height};};
    return {setupOpen:setup.open,grid:getComputedStyle(grid).gridTemplateColumns,
      first:rect(card),well:rect(well),overflow:well.scrollWidth-well.clientWidth,
      metricCount:grid.children.length,
      order:[...grid.querySelectorAll('.stat-tile > span')].map(x=>x.textContent),
      visibleActions:[...document.querySelectorAll('#diary .diary-actions button')].every(x=>x.getBoundingClientRect().width>0)};
   });
   test.equal(info.setupOpen,size.width>640,'mobile setup must default closed; desktop open');
   test.equal(info.metricCount,6);
   test.deepEqual(info.order,['START','DURATION','TEMPO','CATEGORY','MODE','SOURCE']);
   test.equal(info.grid.trim().split(/\s+/).length,size.cols,
     size.width+'px telemetry grid: '+info.grid);
   test.ok(info.overflow<6,'horizontal overflow in Diary: '+JSON.stringify(info));
   test.ok(info.visibleActions,'manual/CSV action rail hidden');
   if(size.width<=640){
    test.ok(info.first.height<(size.width<=360?260:240),'too tall log card: '+JSON.stringify(info));
    test.ok(info.first.top<info.well.bottom,'log card not visible without scrolling: '+JSON.stringify(info));
   }
   await page.screenshot({path:path.join(shots,'diary-'+size.width+'.png')});
   await page.locator('#diaryList .log-actions button').first().click();
   await page.locator('#diaryEditor .diary-form').waitFor({state:'visible'});
   const editor=await page.evaluate(()=>{
    const form=document.querySelector('#diaryEditor .diary-form');
    const dt=form.querySelector('input[type="datetime-local"]');
    const notes=form.querySelector('textarea');
    return {columns:getComputedStyle(form).gridTemplateColumns,
     dateWidth:dt?.closest('.diary-field').getBoundingClientRect().width??null,
     notesWidth:notes.closest('.diary-field').getBoundingClientRect().width,
     formWidth:form.getBoundingClientRect().width,
     focusedEditor:form.contains(document.activeElement)};
   });
   const editorColumns=editor.columns.trim().split(/\s+/).length;
   if(size.width<=640 || size.width>=1140)
    test.equal(editorColumns,2,'phone and desktop editors should have two columns: '+JSON.stringify(editor));
   else test.ok(editorColumns>=1,'tablet editor must stay accessible: '+JSON.stringify(editor));
   test.ok(editor.notesWidth>=editor.formWidth-6,'notes must span both columns');
   if(size.width<=640)test.equal(editor.focusedEditor,false,'no autofocus iOS keyboard');
   await page.screenshot({path:path.join(shots,'diary-editor-'+size.width+'.png')});
   await page.locator('#diaryEditor .preset-actions button').last().click();
   test.equal(await page.locator('#diaryEditor').isVisible(),false,'cancel closes editor');
   if(size.width<=640){
    await page.locator('#diarySetup > summary').click();
    test.equal(await page.locator('#diarySetup').evaluate(x=>x.open),true);
    test.equal(await page.locator('#diaryControls .diary-minimum-choices button').count(),4);
    test.ok(await page.locator('#diaryControls .category-form input').isVisible());
    await page.screenshot({path:path.join(shots,'diary-setup-'+size.width+'.png')});
   }
   test.deepEqual(errors,[],'browser exceptions');
   console.log('PASS archive '+size.width+'px',JSON.stringify({info,editor}));
  }catch(err){failures++;console.error('FAIL archive '+size.width+'px',err);}
  finally{await page.close();}
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures)process.exitCode=1;
