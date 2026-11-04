// RC25 · Phone Signal Matrix / Preset Databank browser regression.
// Touch target tests use offsetHeight: the app intentionally sets CSS zoom
// (default 90% on phones), so DOMRects are smaller than CSS layout pixels.
// Chromium geometry checks are not a substitute for iOS Safari PWA testing.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts','mobile-signal-databank');
mkdirSync(shots,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.webmanifest':'application/manifest+json',
 '.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
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
const targets=[
 {width:320,height:740,cols:2,theme:'voyager'},
 {width:390,height:844,cols:3,theme:'elite'},
 {width:430,height:932,cols:4,theme:'redalert'},
 {width:768,height:1024,cols:4,theme:'voyager'}
];
let failed=0;
try {
 for(const {width,height,cols,theme} of targets){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
   if(theme!=='voyager')await page.locator('[data-set-theme="'+theme+'"]').click();
   await page.locator('#lcarsInitialize').click();
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.hidden,null,{timeout:15000});
   await page.locator('[data-tab="audio"]').click();
   await page.locator('#mixer .matrix-channel').first().waitFor({state:'visible'});
   const audio=await page.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const first=q('#mixer .matrix-channel'),choices=q('#mixer .sound-choices');
    const rows=[...first.querySelectorAll('.accent-sound-row')];
    return {
      theme:document.documentElement.dataset.appTheme,
      channels:document.querySelectorAll('#mixer .matrix-channel').length,
      faders:document.querySelectorAll('#mixer .matrix-module').length,
      sounds:choices.children.length,
      columns:getComputedStyle(choices).gridTemplateColumns.trim().split(/\s+/).length,
      header:[box(first.querySelector('.eyebrow')),box(first.querySelector('h3'))],
      rows:rows.length,
      selected:document.querySelectorAll('#mixer .sound-choices button[aria-pressed=true]').length,
      buttonHeights:[...first.querySelectorAll('.sound-choices button')].map(b=>b.offsetHeight),
      routing:[...first.querySelectorAll('.pan-scale button,.mixer-buttons button')].map(b=>b.offsetHeight),
      overflow:Math.max(0,q('#mixer').scrollWidth-q('#mixer').clientWidth)
    };
   });
   assert.equal(audio.theme,theme,'theme applied to real app');
   assert.equal(audio.channels,2,'both channels retained');
   assert.equal(audio.faders,4,'volume/pan faders still exist for both channels');
   assert.equal(audio.rows,3,'all three accent types retained');
   assert.equal(audio.selected,6,'each channel and accent retains selected sound');
   assert.ok(audio.sounds>=8,'built-in sounds still present');
   assert.ok(audio.overflow<=5,'audio content overflow: '+JSON.stringify(audio));
   /* Compare real painted channel capsules and brackets with the
      master slider on the SAME live page. No static CSS-token guesses. */
   const palette=await page.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const css=e=>getComputedStyle(e);
    const master=q('#audio .panel.master');
    const modules=[...document.querySelectorAll('#mixer .matrix-module')];
    const bands=[1,9,17].map(n=>q('#mixer .matrix-volume .matrix-segment:nth-child('+n+')'));
    // Master might be below 65%; briefly light existing DOM pills solely
    // for paint sampling. This does not touch audio/state/storage.
    const examples=['led-gold','led-peach','led-salmon'].map(cls=>
      master.querySelector('.lcars-pill.'+cls));
    const masterBands=examples.map(pill=>{
      if(!pill)return null;
      const wasLit=pill.classList.contains('lit');
      pill.classList.add('lit');
      const painted=css(pill).backgroundImage;
      if(!wasLit)pill.classList.remove('lit');
      return painted;
    });
    return {
      bands:bands.map(e=>({lit:e.classList.contains('lit'),gradient:css(e).backgroundImage})),
      masterBands,
      brackets:modules.map(e=>css(e.querySelector('.matrix-bracket-core')).backgroundImage),
      masterBracket:css(master.querySelector('.lcars-bracket-core')).backgroundImage,
      channelTicks:modules.map(e=>css(e.querySelector('.matrix-led-tick.lit')).backgroundColor),
      masterTick:css(master.querySelector('.lcars-tick.lit')).backgroundColor,
      channelRims:modules.map(e=>css(e.querySelector('.matrix-bracket-lip')).borderTopColor),
      masterRim:css(master.querySelector('.lcars-bracket-lip')).borderTopColor
    };
   });
   if(theme!=='voyager'){
     assert.ok(palette.bands.every(b=>b.lit),'test fixture must show 100% channel volume');
     assert.deepEqual(palette.bands.map(b=>b.gradient),palette.masterBands,
       theme+' channel capsule LED bands must match master meter');
     assert.ok(palette.brackets.every(g=>g===palette.masterBracket),
       theme+' all four channel brackets must match master slider');
     assert.ok(palette.channelTicks.every(v=>v===palette.masterTick),
       theme+' all four channel ruler LEDs must match master slider');
     assert.ok(palette.channelRims.every(v=>v===palette.masterRim),
       theme+' all four bracket outlines must match master slider');
   }
   if(width<=640){
    assert.equal(audio.columns,cols,'responsive sound columns: '+JSON.stringify(audio));
    assert.ok(Math.abs(audio.header[0].y-audio.header[1].y)<3,'channel header must share a row');
    assert.ok(audio.buttonHeights.every(h=>h>=43.5),'sound button too small');
    assert.ok(audio.routing.every(h=>h>=43.5),'pan/mute/solo button too small');
   }

   // Twelve additional CSS-only choices exercise the wrapping needed for
   // imported audio files, without touching device storage or sound decoding.
   const dynamic=await page.evaluate(()=>{
    const bank=document.querySelector('#mixer .sound-choices');
    for(let i=0;i<12;i++){
     const b=document.createElement('button');b.type='button';
     b.textContent='USER SOUND '+(i+1)+' LONG ORIGINAL NAME';
     b.setAttribute('aria-pressed','false');bank.append(b);
    }
    const result={count:bank.children.length,overflow:bank.scrollWidth-bank.clientWidth,
      lastHeight:bank.lastElementChild.offsetHeight,
      lastText:bank.lastElementChild.textContent};
    for(let i=0;i<12;i++)bank.lastElementChild.remove();
    return result;
   });
   assert.equal(dynamic.count,audio.sounds+12,'dynamic sound choice count');
   assert.ok(dynamic.overflow<=5,'custom sound bank overflows its channel');
   assert.ok(dynamic.lastHeight>=43.5,'imported sound tap target collapsed');
   await page.screenshot({path:path.join(shots,'audio-'+width+'-'+theme+'.png')});

   await page.locator('[data-tab="presets"]').click();
   await page.locator('#presetName').fill('RC25 MOBILE DATA BANK');
   await page.locator('#presetForm button.primary').click();
   await page.locator('#presetList article.panel').first().waitFor({state:'visible'});
   const presets=await page.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const card=q('#presetList article.panel'),actions=[...card.querySelectorAll('.preset-actions button')];
    const rect=e=>{const r=e.getBoundingClientRect();return {y:r.y,width:r.width,height:r.height};};
    const name=q('#presetName');
    return {formCols:getComputedStyle(q('#presetForm')).gridTemplateColumns.trim().split(/\s+/).length,
      inputSize:parseFloat(getComputedStyle(name).fontSize),
      count:actions.length,labels:actions.map(b=>b.textContent),
      heights:actions.map(b=>b.offsetHeight),tops:actions.map(b=>rect(b).y),
      cardHeight:rect(card).height,
      overflow:Math.max(0,q('#presetList').scrollWidth-q('#presetList').clientWidth)};
   });
   assert.deepEqual(presets.labels,['LOAD','RENAME','DUPLICATE','DELETE','SHARE']);
   assert.equal(presets.count,5,'all preset actions, including QR sharing, preserved');
   assert.ok(presets.overflow<=5,'preset cards overflow: '+JSON.stringify(presets));
   if(width<=640){
    assert.equal(presets.formCols,2,'preset input and label share a line');
    assert.ok(presets.inputSize>=16,'iOS input autozoom regression');
    assert.ok(presets.heights.every(h=>h>=43.5),'preset action tap targets too small');
    assert.ok(Math.max(...presets.tops)-Math.min(...presets.tops)<3,'preset commands must share a row');
   }
   await page.screenshot({path:path.join(shots,'presets-'+width+'-'+theme+'.png')});
   assert.deepEqual(errors,[],'browser errors');
   console.log('PASS Mobile Signal Databank',width,theme,
     JSON.stringify({audio:audio.columns,customSounds:dynamic.count,cardHeight:presets.cardHeight}));
  }catch(e){failed++;console.error('FAIL Mobile Signal Databank',width,theme,e);}
  finally{await page.close();}
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failed)process.exitCode=1;
