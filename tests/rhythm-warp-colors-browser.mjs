// Chromium verifies computed visual colors, contrast roles, stable geometry,
// and generates screenshots of the real Rhythm Warp UI. No mock screenshots.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream, existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const output=path.join(root,'artifacts','rhythm-warp-colors');
mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.webmanifest':'application/manifest+json','.json':'application/json',
 '.svg':'image/svg+xml','.mp3':'audio/mpeg','.png':'image/png'};
const server=createServer((req,res)=>{
 const uri=new URL(req.url,'http://localhost');
 const rel=uri.pathname==='/'?'index.html':decodeURIComponent(uri.pathname.slice(1));
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!existsSync(full)){
  res.writeHead(404);res.end('Not Found');return;
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
 createReadStream(full).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
let failures=0;
const cases=[{width:320,height:740,theme:'voyager'}, {width:393,height:852,theme:'voyager'},
 {width:768,height:1024,theme:'voyager'}, {width:1440,height:900,theme:'voyager'},
 {width:393,height:852,theme:'elite'}, {width:1440,height:900,theme:'redalert'}];
const rgb=s=>s.match(/\d+/g)?.slice(0,3).map(Number).join(',')||'';
const themes={
 voyager:{edge:'133,244,163',active:'179,223,148'},
 elite:{edge:'134,206,211',active:'169,217,207'},
 redalert:{edge:'165,223,138',active:'185,220,163'}
};
try{
 for(const {width,height,theme} of cases){
  const key=width+'-'+theme;
  const isMobile=width<=640;
  const page=await browser.newPage({viewport:{width,height},
   deviceScaleFactor:isMobile?2:1,isMobile,hasTouch:isMobile,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:25000});
   if(theme!=='voyager') await page.locator('[data-set-theme="'+theme+'"]').click();
   const launch=await page.evaluate(()=>{
    const $=s=>document.querySelector(s),sty=(e,ps)=>getComputedStyle($(e),ps);
    return {
     edge:getComputedStyle($('.lcars-start-screen')).getPropertyValue('--rw-edge').trim(),
     logoFilter:sty('.lcars-emblem-wrap').filter,
     lightBackground:sty('.lcars-start-screen').backgroundColor
    };
   });
   assert.equal(launch.logoFilter,'none','logo should not cast an uncontrolled glow');
   await page.screenshot({path:path.join(output,'launch-'+key+'.png')});
   await page.locator('#lcarsInitialize').click();
   await page.waitForFunction(()=>document.querySelector('#lcarsStartup').hidden,null,{timeout:20000});
   const frame=await page.evaluate(()=>{
    const $=s=>document.querySelector(s),style=(s,p)=>getComputedStyle($(s),p);
    const rect=s=>{const r=$(s).getBoundingClientRect();return {width:r.width,height:r.height};};
    return {
      headerEdge:style('.app-shell > header .elbow').borderTopColor,
      sideEdge:style('.app-shell > aside .rail').borderLeftColor,
      titleColor:style('.app-shell > header .heading h1 .mobile-title').color,
      frameBackground:style('.app-shell > aside .rail').backgroundColor,
      panelBackground:style('.app-shell .panel').backgroundColor,
      panelBorder:style('.app-shell .panel').borderTopColor,
      navInactive:style('.app-shell > aside nav .nav:not(.active)').backgroundColor,
      navActive:style('.app-shell > aside nav .nav.active').backgroundColor,
      leftButton:rect('.app-shell > aside nav .nav'),
      sideRail:rect('.app-shell > aside .rail'),
      headerShadow:style('.app-shell > header .elbow').boxShadow
    };
   });
   assert.equal(rgb(frame.headerEdge),themes[theme].edge,'top border semantic accent');
   assert.equal(rgb(frame.sideEdge),themes[theme].edge,'left border must match top border');
   assert.equal(frame.headerShadow,'none','no random glow on header');
   assert.equal(rgb(frame.panelBackground),'20,35,28','all app panels share same fill');
   assert.equal(rgb(frame.panelBorder),'53,84,66','panels share same stroke');
   assert.ok(frame.leftButton.width>(isMobile?40:80),'navigation width unchanged');
   assert.ok(frame.sideRail.width>(isMobile?40:80),'side rail width unchanged');
   for(const tab of ['metronome','diary','analytics','settings']){
    await page.locator('[data-tab="'+tab+'"]').click();
    const pageTitle=await page.locator('#'+tab).isVisible();
    assert.equal(pageTitle,true,tab+' is visible');
    if(tab==='settings'){
     const settings=await page.evaluate(()=>{
      const color=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
      return {custom:color('#settings #soundDrop'),
       offline:color('#settings #offlineStatus'),
       storage:color('#settings #storageStatus'),
       export:color('#settings #export')};
     });
     assert.equal(rgb(settings.custom),'196,163,213','custom upload color');
     assert.equal(rgb(settings.offline),'232,221,190','neutral storage note color');
     assert.equal(rgb(settings.storage),'146,203,210','info status color');
     assert.equal(rgb(settings.export),themes[theme].active,'positive export color');
    }
    if(tab==='analytics'){
     const tiles=await page.locator('#analyticsContent .stat-tile').evaluateAll(items=>
      items.map(el=>getComputedStyle(el).backgroundColor));
     assert.ok(tiles.length>=1,'analytics must render real statistic tiles');
     assert.equal(new Set(tiles).size,1,'analytics tiles must not become a rainbow');
     assert.equal(rgb(tiles[0]),'27,45,36','analytics neutral housing');
    }
    await page.screenshot({path:path.join(output,tab+'-'+key+'.png')});
   }
   assert.deepEqual(errors,[],key+' page JavaScript errors');
   console.log('PASS RW color '+key+' '+JSON.stringify({launch,frame}));
  }catch(e){failures++;console.error('FAIL RW color '+key,e);}
  finally{await page.close();}
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures)process.exitCode=1;
