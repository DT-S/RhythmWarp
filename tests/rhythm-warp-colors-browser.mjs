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
 voyager:{edge:'133,244,163',active:'179,223,148',bg:'14,23,20',panel:'20,35,28',
  rail:'32,51,40',outline:'53,84,66',inactive:'77,107,85',selected:'40,69,53',
  neutral:'232,221,190',info:'146,203,210',custom:'140,206,180'},
 elite:{edge:'205,155,255',active:'221,186,255',bg:'18,14,30',panel:'33,25,49',
  rail:'52,38,71',outline:'98,76,127',inactive:'102,83,127',selected:'73,52,95',
  neutral:'230,213,236',info:'155,190,248',custom:'200,162,240'},
 redalert:{edge:'255,130,148',active:'255,184,177',bg:'26,14,18',panel:'42,23,30',
  rail:'69,39,50',outline:'120,67,80',inactive:'135,82,92',selected:'99,49,63',
  neutral:'244,221,204',info:'255,197,158',custom:'234,163,175'}
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
     lightBackground:sty('.lcars-start-screen').backgroundColor,
     topRim:sty('.lcars-rail-segments .lcars-seg').borderTopColor,
     innerSeam:sty('.lcars-rail-segments .lcars-seg').borderBottomColor,
     fillerLeft:sty('.lcars-side-filler').borderLeftColor,
     fillerRight:sty('.lcars-side-filler').borderRightColor,
     bottomRim:sty('.lcars-bottom-segments .lcars-seg').borderBottomColor,
     logoStroke:sty('.lcars-start-logo [stroke="#85f4a3"]').stroke,
     selectedTheme:document.documentElement.dataset.appTheme,
     visibleTheme:$('.lcars-start-screen').dataset.theme
    };
   });
   assert.equal(launch.logoFilter,'none','logo should not cast an uncontrolled glow');
   assert.equal(launch.selectedTheme,theme,'saved app theme matches chosen palette');
   assert.equal(launch.visibleTheme,theme,'launch theme matches application theme');
   assert.equal(rgb(launch.logoStroke),themes[theme].edge,'start emblem must follow theme accent');
   assert.equal(rgb(launch.lightBackground),themes[theme].bg,'launch background follows chosen theme');
   for(const edge of ['topRim','fillerLeft','fillerRight','bottomRim'])
     assert.equal(rgb(launch[edge]),themes[theme].edge,edge+' uses same outer rim');
   assert.equal(rgb(launch.innerSeam),themes[theme].outline,'inside separators use theme seam');
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
   assert.equal(rgb(frame.frameBackground),themes[theme].rail,'frame fill follows theme');
   assert.equal(rgb(frame.navActive),themes[theme].selected,'selected navigation color follows theme');
   assert.equal(frame.headerShadow,'none','no random glow on header');
   assert.equal(rgb(frame.panelBackground),themes[theme].panel,'all app panels use theme fill');
   assert.equal(rgb(frame.panelBorder),themes[theme].outline,'panels share theme stroke');
   assert.ok(frame.leftButton.width>(isMobile?40:80),'navigation width unchanged');
   assert.ok(frame.sideRail.width>(isMobile?40:80),'side rail width unchanged');
   const cap=await page.evaluate(()=>{
    const el=document.querySelector('#metronome .lcars-cap-value');
    if(!el)return null;
    const cs=getComputedStyle(el),ps=getComputedStyle(el.parentElement),r=el.getBoundingClientRect();
    return {text:el.textContent,fg:cs.color,bg:cs.backgroundColor,parentBg:ps.backgroundColor,
      display:cs.display,opacity:cs.opacity,visibility:cs.visibility,width:r.width,height:r.height};
   });
   console.log('RW SWING READOUT '+key+' '+JSON.stringify(cap));
   if(cap && cap.width>0){
     assert.notEqual(cap.fg,cap.bg,'swing value must not be invisible against its own background');
     assert.equal(cap.text.trim().length>0,true,'swing value must stay populated');
   }
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
     assert.equal(rgb(settings.custom),themes[theme].custom,'custom upload uses the active palette');
     assert.equal(rgb(settings.offline),themes[theme].neutral,'neutral notice uses the active palette');
     assert.equal(rgb(settings.storage),themes[theme].info,'info status uses the active palette');
     assert.equal(rgb(settings.export),themes[theme].active,'positive export color');
     // Scan ACTUAL computed styles, not just the upload token, across visible
     // Settings elements and their before/after decorations.
     const violets=await page.locator('#settings').evaluate(root=>{
      const result=[];
      function isPurple(s){
       const colors=s.match(/rgba?\([^)]+\)/g)||[];
       return colors.some(c=>{
        const a=(c.match(/[\d.]+/g)||[]).map(Number);
        const [r,g,b]=a;
        const opacity=a.length>3?a[3]:1;
        return opacity>.05 && r>67 && b>67 && b>g*1.13 && r>g*1.10;
       });
      }
      for(const element of [root,...root.querySelectorAll('*')]){
       const box=element.getBoundingClientRect();
       if(box.width<1||box.height<1||getComputedStyle(element).visibility==='hidden')continue;
       for(const pseudo of [null,'::before','::after']){
        const st=getComputedStyle(element,pseudo);
        if(st.display==='none'||st.visibility==='hidden')continue;
        for(const property of ['backgroundColor','borderTopColor','borderRightColor',
          'borderBottomColor','borderLeftColor','outlineColor','color','boxShadow']){
          if(isPurple(st[property]))
            result.push({element:element.id||element.className||element.tagName,
              pseudo,property,value:st[property]});
        }
       }
      }
      return result.slice(0,30);
     });
     if(theme==='voyager') assert.deepEqual(violets,[],key+' Studio Green must contain no purple');

    }
    if(tab==='diary'){
     const d=await page.evaluate(()=>{
      const el=document.querySelector('#diary .diary-minimum-choices button:not([aria-pressed="true"])');
      return getComputedStyle(el).backgroundColor;
     });
     assert.equal(rgb(d),themes[theme].inactive,'duration options follow the active palette');
    }
    if(tab==='analytics'){
     const tiles=await page.locator('#analyticsContent .stat-tile').evaluateAll(items=>
      items.map(el=>getComputedStyle(el).backgroundColor));
     assert.ok(tiles.length>=1,'analytics must render real statistic tiles');
     assert.equal(new Set(tiles).size,1,'analytics tiles must not become a rainbow');
     assert.equal(rgb(tiles[0]),theme==='voyager'?'27,45,36':theme==='elite'?'43,33,63':'54,32,40','analytics neutral housing');
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
