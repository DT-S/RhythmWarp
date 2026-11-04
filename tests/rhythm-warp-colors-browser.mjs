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
 {width:393,height:852,theme:'elite'}, {width:1440,height:900,theme:'elite'},
 {width:393,height:852,theme:'redalert'}, {width:1440,height:900,theme:'redalert'}];
const rgb=s=>{
 const value=String(s??'').trim();
 if(/^#[0-9a-f]{6}$/i.test(value)){
  const nums=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
  return nums.join(',');
 }
 return value.match(/\d+/g)?.slice(0,3).map(Number).join(',')||'';
};
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
     visibleTheme:$('.lcars-start-screen').dataset.theme,
     startButton:getComputedStyle($('#lcarsInitialize')).backgroundColor,
     consoleRim:getComputedStyle($('.lcars-start-console')).borderLeftColor
    };
   });
   assert.equal(launch.logoFilter,'none','logo should not cast an uncontrolled glow');
   // The actual launch menu must use the SAME narrow fascia as the main UI.
   // All four theme/BPM controls remain separate, readable, touch-sized buttons.
   const launchLayout=await page.evaluate(()=>{
     const $=s=>document.querySelector(s);
     const width=s=>$(s).getBoundingClientRect().width;
     const buttons=[...document.querySelectorAll('.lcars-side-block')];
     return {
       top:width('.lcars-elbow-top'),
       body:width('.lcars-left-column'),
       bottom:width('.lcars-elbow-bottom'),
       filler:width('.lcars-side-filler'),
       fullWidth:document.querySelector('.lcars-start-screen').getBoundingClientRect().width,
       buttons:buttons.map(e=>({
         w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,
         radius:getComputedStyle(e).borderTopLeftRadius,
         label:e.querySelector('span')?.textContent?.trim()||'',
         overflows:e.querySelector('span')?.scrollWidth>e.querySelector('span')?.clientWidth+1
       }))
     };
   });
   const maxWidth=isMobile?44:width<=900?61:86;
   assert.ok(launchLayout.body<=maxWidth+1,'launch sidebar too wide: '+JSON.stringify(launchLayout));
   assert.ok(launchLayout.body>=35,'launch sidebar became unusably narrow');
   for(const item of ['top','bottom','filler'])
     assert.ok(Math.abs(launchLayout[item]-launchLayout.body)<2,
       item+' must align with the same slim launch rail');
   const joints=await page.evaluate(()=>{
     const $=s=>document.querySelector(s);
     const rect=s=>{const r=$(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};};
     const gap=s=>parseFloat(getComputedStyle($(s)).columnGap);
     const pseudo=(selector,part,key)=>getComputedStyle($(selector),part)[key];
     const border=(selector,edge)=>getComputedStyle($(selector))['border'+edge+'Color'];
     return {
       top:rect('.lcars-start-top'),bottom:rect('.lcars-start-bottom-wrap'),
       topElbow:rect('.lcars-elbow-top'),bottomElbow:rect('.lcars-elbow-bottom'),
       topSegments:rect('.lcars-rail-segments'),bottomSegments:rect('.lcars-bottom-segments'),
       lastTop:rect('.lcars-rail-segments .lcars-seg.s5'),
       lastBottom:rect('.lcars-bottom-segments .lcars-seg.s-b4'),
       filler:rect('.lcars-side-filler'),
       gaps:[gap('.lcars-start-top'),gap('.lcars-start-body'),gap('.lcars-start-bottom-wrap')],
       topRight:pseudo('.lcars-elbow-top','::after','right'),
       bottomRight:pseudo('.lcars-elbow-bottom','::after','right'),
       cutouts:[parseFloat(pseudo('.lcars-elbow-top','::after','width')),parseFloat(pseudo('.lcars-elbow-bottom','::after','width'))],
       joinWidths:[parseFloat(pseudo('.lcars-start-top','::before','width')),parseFloat(pseudo('.lcars-start-bottom-wrap','::before','width'))],
       strokes:[
         border('.lcars-rail-segments .lcars-seg','Top'),
         border('.lcars-bottom-segments .lcars-seg','Bottom'),
         border('.lcars-rail-segments .lcars-seg.s5','Right'),
         border('.lcars-bottom-segments .lcars-seg.s-b4','Right')
       ]
     };
   });
   const eps=1.2;
   assert.ok(joints.gaps.every(v=>Math.abs(v-joints.gaps[0])<.2),'launch top/body/bottom gaps must match');
   assert.equal(joints.topRight,'0px','top inner elbow must stay inside its parent');
   assert.equal(joints.bottomRight,'0px','bottom inner elbow must stay inside its parent');
   assert.ok(joints.cutouts[0]<=joints.topElbow.w&&joints.cutouts[1]<=joints.bottomElbow.w,
     'both corner cutouts must fit inside their respective elbows');
   assert.ok(joints.joinWidths.every(w=>Math.abs(w-joints.gaps[0])<.5),
     'connection strip width must equal shared gap');
   assert.ok(Math.abs(joints.topSegments.x-joints.topElbow.right-joints.gaps[0])<eps,
     'upper rail must start precisely one gap after elbow');
   assert.ok(Math.abs(joints.bottomSegments.x-joints.bottomElbow.right-joints.gaps[0])<eps,
     'lower rail must start precisely one gap after elbow');
   assert.ok(Math.abs(joints.filler.x-joints.topElbow.x)<eps&&
     Math.abs(joints.filler.x-joints.bottomElbow.x)<eps,
     'the full-height side filler must align with both elbows');
   assert.ok(joints.lastTop.right<=joints.top.right+eps,'upper cap cannot overshoot');
   assert.ok(joints.lastBottom.right<=joints.bottom.right+eps,'lower cap cannot overshoot');
   for(const color of joints.strokes)
     assert.equal(rgb(color),themes[theme].edge,'all outer frame rims use selected theme color');
   assert.equal(launchLayout.buttons.length,4,'all launch controls remain available');
   for(const item of launchLayout.buttons){
     assert.ok(Math.abs(item.w-launchLayout.body)<2,'launch button follows sidebar width');
     assert.ok(item.h>=40,'launch button stays finger-sized');
     assert.equal(item.radius,'0px','launch button must be square');
     assert.ok(item.label.length>0,'launch button has its visible full label');
     assert.equal(item.overflows,false,'launch label must not clip');
   }

   assert.equal(launch.selectedTheme,theme,'saved app theme matches chosen palette');
   assert.equal(launch.visibleTheme,theme,'launch theme matches application theme');
   assert.equal(rgb(launch.logoStroke),themes[theme].edge,'start emblem must follow theme accent');
   assert.equal(rgb(launch.lightBackground),themes[theme].bg,'launch background follows chosen theme');
   assert.equal(rgb(launch.startButton),themes[theme].active,'launch CTA must not remain green in other themes');
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
      railEndDisplay:style('.app-shell > aside .rail-end').display,
      activeButtonRadius:style('.app-shell > aside nav .nav.active').borderTopLeftRadius,
      navText:style('.app-shell > aside nav .nav.active','::after').content,
      sidebarWidth:rect('.app-shell > aside').width,
      elbowWidth:rect('.app-shell > header .elbow').width,
      elbowComputedWidth:parseFloat(style('.app-shell > header .elbow').width),
      busLeft:parseFloat(style('.app-shell > header','::after').left),
      busLeftBorder:style('.app-shell > header','::after').borderLeftColor,
      elbowCutoutRight:style('.app-shell > header .elbow','::after').right,
      elbowCutoutBottom:style('.app-shell > header .elbow','::after').bottom,
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
   assert.equal(frame.railEndDisplay,'none','detached lower decoration must be removed');
   assert.equal(frame.activeButtonRadius,'0px','navigation corners must be square');
   assert.ok(frame.navText.includes('METRO'),'short labels must stay visible');
   assert.ok(frame.leftButton.height>=44,'sidebar buttons must keep tall touch targets');
   assert.ok(frame.leftButton.width<=(isMobile?46:90),'sidebar should actually be slimmer');
   assert.ok(frame.leftButton.width>=(isMobile?20:50),'sidebar must not collapse after compact-screen zoom: '+JSON.stringify(frame));
   assert.ok(Math.abs(frame.sideRail.width-frame.leftButton.width)<2,'filler must fit the same column as buttons');
   assert.ok(Math.abs(frame.elbowComputedWidth-frame.busLeft)<1.5,
     'header elbow must terminate at actual bus start: '+JSON.stringify(frame));
   assert.equal(frame.elbowCutoutRight,'0px','the main header cutout must stay flush');
   assert.equal(frame.elbowCutoutBottom,'-2px','main header closes the 2px inner seam');
   assert.equal(rgb(frame.busLeftBorder),themes[theme].outline,'header bus starts with muted inner seam');
   // Verify the actual empty preset, not the generic system-field selector.
   await page.locator('[data-tab="presets"]').click();
   const emptyPreset=await page.locator('#presetList .system-field')
     .evaluate(el=>getComputedStyle(el).backgroundColor);
   const presetSurfaces={voyager:'27,45,36',elite:'43,33,63',redalert:'54,32,40'};
   assert.equal(rgb(emptyPreset),presetSurfaces[theme],'empty preset tile must use its theme, not legacy blue');
   // Render a legitimate synthetic history *inside the test only* to verify
   // SVG path colors, gradients, chart grid, AND live recoloring without redraw.
   const plotted=await page.evaluate(async ()=>{
    const {sessionChart}=await import('./src/charts.js');
    const root=document.createElement('div');
    root.id='rw-test-chart-host';
    root.style.cssText='position:absolute;left:-9999px;top:0;width:550px;';
    document.body.append(root);
    try{
      root.append(sessionChart({seconds:20,history:[{at:0,bpm:100},{at:10,bpm:125}]}));
      const line=root.querySelector('.chart-line.rw-plot-1');
      const grid=root.querySelector('.chart-grid-line');
      const gradient=root.querySelector('stop.rw-plot-1');
      if(!line||!grid||!gradient)throw new Error('Theme-aware SVG chart missing');
      const before=getComputedStyle(line).stroke;
      const beforeStop=getComputedStyle(gradient).stopColor;
      const gridStroke=getComputedStyle(grid).stroke;
      const original=document.documentElement.dataset.appTheme;
      document.documentElement.dataset.appTheme=original==='elite'?'redalert':'elite';
      const switched=getComputedStyle(line).stroke;
      document.documentElement.dataset.appTheme=original;
      return {before,beforeStop,gridStroke,switched};
    }finally{root.remove();}
   });
   assert.equal(rgb(plotted.before),themes[theme].active,'plot line must use theme primary');
   assert.equal(rgb(plotted.beforeStop),themes[theme].active,'plot gradient must use theme primary');
   assert.equal(rgb(plotted.gridStroke),themes[theme].outline,'plot grid must use theme outline');
   assert.notEqual(plotted.switched,plotted.before,'plot must recolor live when palette changes');
   // Tactical and microphone plot CSS variables must resolve to the same theme.
   const sensors=await page.evaluate(()=>{
    const tactical=document.querySelector('#tactical');
    const css=getComputedStyle(tactical);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('class','mic-sensor-grid');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.append(line);
    document.querySelector('#micVisual').append(svg);
    const stroke=getComputedStyle(line).stroke;
    svg.remove();
    return {grid:stroke,tacticalGrid:css.getPropertyValue('--tac-grid').trim(),
      tacticalBg:css.getPropertyValue('--tac-space').trim()};
   });
   assert.equal(rgb(sensors.grid),themes[theme].outline,'microphone grid must follow theme outline');
   assert.equal(rgb(sensors.tacticalGrid),themes[theme].info,'tactical hits must follow theme information color');
   assert.equal(rgb(sensors.tacticalBg),themes[theme].bg==='14,23,20'?'8,16,13':theme==='elite'?'11,8,21':'18,8,11','tactical canvas inherits theme dark background');
   const status=await page.locator('#trainingFields .system-field').evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.equal(rgb(status),themes[theme].info,'metronome status must use theme info color');
   // Check the REAL precision ladder after dragging tempo. This morph lives
   // under document.body and does not inherit scoped page-local CSS.
   await page.locator('[data-tab="metronome"]').click();
   const drag=page.locator('#tempoValue');
   await drag.scrollIntoViewIfNeeded();
   const bbox=await drag.boundingBox();
   assert.ok(bbox&&bbox.width>0&&bbox.height>0,'tempo drag source visible');
   const px=bbox.x+bbox.width/2,py=bbox.y+bbox.height/2;
   await page.mouse.move(px,py);
   await page.mouse.down();
   await page.mouse.move(px+22,py+6,{steps:4});
   await page.waitForFunction(()=>document.querySelector('.gesture-guide')?.classList.contains('is-visible'),null,{timeout:4000});
   const ladder=await page.evaluate(()=>{
    const get=s=>getComputedStyle(document.querySelector(s));
    return {
     background:get('.gesture-guide.is-visible').backgroundColor,
     edge:get('.gesture-guide.is-visible').borderTopColor,
     heading:get('.gesture-guide-heading').color,
     value:get('.gesture-guide-value').backgroundColor,
     ink:get('.gesture-guide-value').color,
     selected:get('.gesture-guide-rung.is-current').backgroundColor,
     tick:get('.gesture-guide-rung.is-current .gesture-guide-tick').backgroundColor
    };
   });
   assert.equal(rgb(ladder.background),themes[theme].panel,'drag ladder housing must be themed');
   assert.equal(rgb(ladder.edge),themes[theme].edge,'drag ladder neon rim must be themed');
   assert.equal(rgb(ladder.heading),themes[theme].info,'drag ladder heading must be themed');
   assert.equal(rgb(ladder.value),themes[theme].active,'drag ladder central value must be themed');
   assert.equal(rgb(ladder.selected),themes[theme].selected,'drag ladder selected row must be themed');
   assert.equal(rgb(ladder.tick),themes[theme].active,'drag ladder active tick must be themed');
   await page.screenshot({path:path.join(output,'precision-'+key+'.png')});
   await page.mouse.up();
   // The small slider bubble is a separate opt-in component, not mounted
   // in the default app. Mount a real native range input in a temporary label.
   const fader=await page.evaluate(async()=>{
    const {installPrecisionSlider}=await import('./src/precision-slider.js');
    const label=document.createElement('label');
    label.style.cssText='position:fixed;left:0;top:0;width:180px;height:60px;';
    const input=document.createElement('input');
    input.type='range';input.min='0';input.max='1';input.step='.01';input.value='.5';
    label.append(input);document.body.append(label);
    try {
     installPrecisionSlider(input);
     const e=label.querySelector('.precision-readout');
     const st=getComputedStyle(e),stem=getComputedStyle(e,'::after');
     return {background:st.backgroundColor,ink:st.color,edge:st.borderLeftColor,stem:stem.backgroundColor};
    }finally{label.remove();}
   });
   assert.equal(rgb(fader.background),themes[theme].active,'native fader bubble follows theme primary');
   assert.equal(rgb(fader.edge),themes[theme].edge,'native fader bubble left edge follows theme rim');
   assert.equal(rgb(fader.stem),themes[theme].active,'native fader bubble pointer follows theme primary');

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
