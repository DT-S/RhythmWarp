// RC25.11 live-app Tactical regression. No microphone or audio access required.
// Synthetic events exercise display only; never enter IndexedDB or recorder.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const shots=path.join(root,'artifacts','tactical-fusion');mkdirSync(shots,{recursive:true});
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
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:'+server.address().port;
let failures=0;
async function boot(page){
 await page.waitForFunction(()=>document.querySelector('#lcarsStartup')?.dataset.ready==='true',null,{timeout:20000});
 if(await page.locator('#lcarsInitialize').isVisible()){
  await page.locator('#lcarsInitialize').click();
  await page.waitForFunction(()=>document.querySelector('#lcarsStartup').hidden,null,{timeout:15000});
 }
}
try{
 for(const [width,height] of [[320,740],[390,844],[768,1024],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});await boot(page);
   await page.waitForSelector('#rings .point.beat-arc');
   const startCount=await page.locator('#rings .point.beat-arc').count();
   await page.locator('#tacticalViewSwitch [data-tac-view="tactical"]').click();
   assert.equal(await page.locator('#tactical').isVisible(),true);
   assert.equal(await page.locator('#dial').isVisible(),true,'real Circular should be visible in Tactical');
   const layout=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
    const ring=document.querySelector('#rings'),dock=document.querySelector('#tacticalRingDock');
    const outer=ring.querySelector('circle.track'),inner=ring.querySelector('circle.track.inner-track');
    const lanes=document.querySelector('#tacticalLane');
    const main=document.querySelector('main');
    return {dial:rect(document.querySelector('#dial')),dock:rect(dock),ring:rect(ring),
      overlay:rect(document.querySelector('#tacticalRingOverlay')),lane:rect(lanes),
      chart:rect(document.querySelector('#tacticalPlot')),sidebar:rect(document.querySelector('.app-shell > aside')),
      n:document.querySelectorAll('#rings .point.beat-arc').length,
      outer:outer?.getAttribute('r'),inner:inner?.getAttribute('r'),
      controls:['tacticalStart','tacticalTap','tacticalMic'].map(id=>rect(document.getElementById(id))),
      overflow:main.scrollWidth-main.clientWidth,
      grid:getComputedStyle(document.querySelector('.tac-fusion')).gridTemplateColumns};
   });
   assert.equal(layout.n,startCount,'Tactical must retain full outer+inner pattern');
   assert.equal(layout.outer,'212','authentic outer ring not reused');
   assert.equal(layout.inner,'149','authentic subdivision ring not reused');
   assert.ok(layout.dial.width>55&&layout.dial.height>55,'Circular hidden: '+JSON.stringify(layout));
   assert.ok(layout.ring.width>48&&layout.ring.height>48,'SVG ring hidden: '+JSON.stringify(layout));
   assert.ok(layout.lane.width>40&&layout.chart.height>50,'main Tactical visuals missing');
   assert.ok(layout.sidebar.width>0,'LCARS navigation disappeared');
   assert.ok(layout.controls.every(c=>c.width>15&&c.height>=30),'transport/mic buttons vanished');
   assert.ok(layout.overflow<=12,'unwanted horizontal overflow: '+JSON.stringify(layout));
   assert.equal(await page.locator('#view').isVisible(),false,'redundant binary toggle is still visible');
   // Same-window policy: original two LCARS subsystem buttons move
   // below Tactical Diagnostics. The genuine mixer and settings appear
   // directly below the buttons without dialog, backdrop or clone.
   assert.equal(await page.locator('#tacticalSettingsDialog').count(),0,
    'a new modal is forbidden by the one-window policy');
   assert.equal(await page.locator('#tacticalDeckBarMount > .lcars-deck-bar').count(),1);
   assert.equal(await page.locator('#deckParamsToggle').isVisible(),true);
   assert.equal(await page.locator('#deckMicToggle').isVisible(),true);
   assert.equal(await page.locator('#tacticalMix').isVisible(),true);
   assert.equal(await page.locator('#tacticalSettingsBody').isVisible(),false);
   const beforeCount=await page.locator('#countIn').inputValue();
   await page.locator('#deckParamsToggle').click();
   assert.equal(await page.locator('#tacticalSettingsBody').isVisible(),true);
   assert.equal(await page.locator('#tacticalSettingsBody > #trainingDeck').count(),1);
   assert.equal(await page.locator('#deckParamsToggle').getAttribute('aria-expanded'),'true');
   assert.equal(await page.locator('#countIn').locator('..').locator('button.value-dial').isVisible(),true);
   await page.locator('#countIn').locator('..').locator('button.value-dial').click();
   await page.locator('#countIn').fill('2');
   await page.locator('#countIn').press('Enter');
   assert.equal(await page.locator('#countIn').inputValue(),'2','real count-in setter unavailable');
   await page.locator('#tacticalMix').click();
   assert.equal(await page.locator('#tacticalSettingsBody #trainingDeck').count(),0);
   assert.equal(await page.locator('#metronome .instrument-layout > #trainingDeck').count(),1);
   assert.equal(await page.locator('#tacticalSettingsBody > #mixer').count(),1);
   assert.equal(await page.locator('#mixer .matrix-channel').count(),2);
   assert.equal(await page.locator('#tacticalSettingsBody #master').count(),1);
   assert.equal(await page.locator('#tacticalMix').getAttribute('aria-expanded'),'true');
   const mute=page.locator('#mixer .matrix-channel').first().locator('button[data-field="mute"]');
   const originalMute=await mute.getAttribute('aria-pressed');
   await mute.click();
   assert.notEqual(await mute.getAttribute('aria-pressed'),originalMute,
    'real mixer control not functional in inline Tactical settings');
   await mute.click();
   assert.equal(await mute.getAttribute('aria-pressed'),originalMute);
   await page.screenshot({path:path.join(shots,'tactical-inline-mixer-'+width+'.png')});
   await page.locator('#deckMicToggle').click();
   assert.equal(await page.locator('#tacticalSettingsBody > #micConsole').count(),1);
   assert.equal(await page.locator('#micGridDivision').count(),1);
   await page.locator('#deckParamsToggle').click();
   assert.equal(await page.locator('#countIn').inputValue(),'2','live params did not persist');
   await page.locator('#countIn').locator('..').locator('button.value-dial').press('Home');
   assert.equal(await page.locator('#countIn').inputValue(),beforeCount);
   // The same button collapses its own drawer, without an extra close button.
   await page.locator('#deckParamsToggle').click();
   assert.equal(await page.locator('#tacticalSettingsBody').isVisible(),false);
   assert.equal(await page.locator('#tacticalSettingsBody').locator('*').count(),0);
   assert.equal(await page.locator('#metronome .instrument-layout > #trainingDeck').count(),1);
   assert.equal(await page.locator('#metronome .instrument-layout > #micConsole').count(),1);
   assert.equal(await page.locator('#audio > #mixer').count(),1);
   assert.equal(await page.locator('#audio > .master').count(),1);
   assert.equal(await page.locator('#countIn').inputValue(),beforeCount);
   assert.ok(await page.locator('#tacticalDeckHost').evaluate(n=>
     n.getBoundingClientRect().top>=document.querySelector('#tacticalDiagnostics').getBoundingClientRect().top),
     'settings buttons should stay below Diagnostics');
   // Switching back to the original views restores the same physical deck
   // and retains their original click behavior. Audio remains unmodified.
   await page.locator('#tacticalMix').click();
   await page.locator('#tacticalViewSwitch [data-tac-view="circular"]').click();
   assert.equal(await page.locator('#metronome .instrument > .lcars-deck-bar').count(),1);
   assert.equal(await page.locator('#tacticalMix').isVisible(),false);
   assert.equal(await page.locator('#audio > #mixer').count(),1);
   await page.locator('#tacticalViewSwitch [data-tac-view="tactical"]').click();
   assert.equal(await page.locator('#tacticalDeckBarMount > .lcars-deck-bar').count(),1);
   assert.equal(await page.locator('#tacticalSettingsBody').isVisible(),false);

   await page.screenshot({path:path.join(shots,'tactical-'+width+'.png')});
   // Simulate the normal display events without touching MediaDevices or stored data.
   await page.evaluate(()=>{
     const p=document.querySelector('#metronome');
     // Mirror the real mic UI refresh: class toggle is the CSS regression
     // that previously collapsed the entire Tactical panel to half-width.
     p.classList.add('mic-telemetry-on');
     document.querySelector('#micConsole').classList.add('mic-active');
     document.querySelector('#micVisual').hidden=false;
     p.dispatchEvent(new CustomEvent('lcars:mic-state',{detail:{active:true,mode:'guided',division:2,session:true}}));
     p.dispatchEvent(new CustomEvent('lcars:mic-session',{detail:{mode:'guided',division:2}}));
     p.dispatchEvent(new CustomEvent('lcars:bar-grid',{detail:{anchor:0,bpm:120,length:4,bar:0}}));
     p.dispatchEvent(new CustomEvent('lcars:mic-hit',{detail:{
       time:0,correctedTime:0,referenceTime:0,offsetMs:-8,elapsedMs:0,
       level:0.6,rateBpm:120,reason:'MATCHED'}}));
   });
   const micGeometry=await page.evaluate(()=>{
      const box=q=>{const r=document.querySelector(q).getBoundingClientRect();return {width:r.width,x:r.x};};
      const panel=box('#tactical'),root=box('#metronome .instrument-layout > .instrument');
      return {panel,root,grid:getComputedStyle(document.querySelector('#metronome .instrument-layout > .instrument')).gridTemplateColumns};
   });
   assert.ok(micGeometry.panel.width>=layout.dock.width*1.9,
    'armed Tactical unexpectedly narrow: '+JSON.stringify({layout,micGeometry}));
   assert.ok(micGeometry.panel.width>=layout.chart.width*.94,
    'armed Tactical no longer full width: '+JSON.stringify({layout,micGeometry}));
   assert.ok(micGeometry.root.width>=layout.chart.width*.94,
    'armed instrument retained classic mic half-width grid: '+JSON.stringify(micGeometry));
   assert.equal(micGeometry.grid,'none','armed Tactical must not use classic 2-column instrument grid');
   // STOP deliberately hides the entire circular playhead, regardless of
   // mic capture. The synthetic hit's fixed t=0 is no longer guaranteed
   // visible on a scrolling lane after modal interaction delays.
   await page.waitForFunction(()=>
     document.querySelector('#tacticalDiagnostics [data-tac-count="grid"] strong')?.textContent==='1',
     null,{timeout:3500});
   assert.equal(await page.locator('#tacticalRingOverlay .tac-ring-needle').count(),0,
     'metronome cursor must not reappear merely because mic sensing is engaged');
   assert.equal(await page.locator('#tacticalDiagnostics [data-tac-count="grid"] strong').textContent(),'1');
   assert.ok(await page.locator('#tacticalPlot .mic-sensor-dot').count()>=1,'plot missing actual synthetic event');
   await page.screenshot({path:path.join(shots,'tactical-hit-'+width+'.png')});
   await page.locator('#tacticalPlotButtons [data-tac-plot="distribution"]').click();
   assert.equal(await page.locator('#tacticalPlotButtons [data-tac-plot="distribution"]').getAttribute('aria-pressed'),'true');
   await page.locator('#tacticalViewSwitch [data-tac-view="linear"]').click();
   assert.equal(await page.locator('#linear').isVisible(),true,'Linear must survive Tactical');
   await page.locator('#tacticalViewSwitch [data-tac-view="circular"]').click();
   assert.equal(await page.locator('#dial').isVisible(),true,'legacy Circular toggle must still work');
   assert.equal(await page.locator('#rings .point.beat-arc').count(),startCount);
   assert.deepEqual(errors,[],width+'px browser errors');
   console.log('PASS RC25.11 Tactical',width,JSON.stringify({ring:layout.ring,grid:layout.grid,overflow:layout.overflow}));
  }catch(e){failures++;console.error('FAIL RC25.11 Tactical',width,e);}
  finally{await page.close();}
 }
 // Motion-enabled browser is separate from geometry tests, which deliberately
 // disable animations to measure stable element boxes.
 const motionPage=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
  await motionPage.goto(origin,{waitUntil:'domcontentloaded'});await boot(motionPage);
  await motionPage.waitForFunction(()=>!document.querySelector('.app-shell').classList.contains('lcars-booting'),null,{timeout:3500});
  await motionPage.locator('#tacticalViewSwitch [data-tac-view="tactical"]').click();
  const entry=await motionPage.evaluate(()=>{
   const q=s=>document.querySelector(s),animated=s=>getComputedStyle(q(s)).animationName;
   return {enter:q('#tactical').classList.contains('lcars-view-enter'),
     cockpit:animated('#tactical .tac-cockpit'),
     ring:animated('#tacticalRingDock'),
     lane:animated('#tactical .tac-lane-shell'),
     plot:animated('#tactical .tac-plot-shell'),
     diagnostics:animated('#tactical .tac-diagnostic-row')};
  });
  assert.equal(entry.enter,true,'view activation failed to start Tactical choreography');
  assert.match(entry.cockpit,/tactical-rail-on/);
  assert.match(entry.ring,/tactical-lattice-on/);
  assert.match(entry.lane,/tactical-core-online/);
  assert.match(entry.plot,/tactical-lattice-on/);
  assert.match(entry.diagnostics,/tactical-node-on/);
  await motionPage.screenshot({path:path.join(shots,'tactical-build-390.png')});
  // Engaging the microphone must not repeat the view-opening animation.
  await motionPage.waitForFunction(()=>!document.querySelector('#tactical').classList.contains('lcars-view-enter'),
    null,{timeout:2500});
  await motionPage.evaluate(()=>{
   const p=document.querySelector('#metronome');
   p.classList.add('mic-telemetry-on');
   p.dispatchEvent(new CustomEvent('lcars:mic-state',{detail:{active:true,mode:'guided',division:2,session:true}}));
  });
  assert.equal(await motionPage.locator('#tactical').evaluate(n=>n.classList.contains('lcars-view-enter')),false,
    'mic engage must not replay Tactical view construction');
  // Real AudioContext transport with a one-bar count-in. Projection must
  // keep the first played bar continuous without compressing all future
  // quarter notes into 295 SVG units.
  await motionPage.locator('#countIn').evaluate(input=>{
   input.value='1';
   input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await motionPage.locator('#tacticalStart').click();
  await motionPage.waitForFunction(()=>
    document.querySelector('#tacticalStart').textContent.trim()==='STOP',
    null,{timeout:16000});
  await motionPage.waitForFunction(()=>
    document.querySelectorAll('#tacticalLane .tac-lane-quarter[data-tac-bar="-1"]').length>=3,
    null,{timeout:6000});
  const spaced=await motionPage.evaluate(()=>{
   const refs=[...document.querySelectorAll('#tacticalLane .tac-lane-quarter[data-tac-bar="-1"]')]
      .map(n=>Number(n.getAttribute('x1'))).sort((a,b)=>a-b);
   return {refs,differences:refs.slice(1).map((x,i)=>x-refs[i])};
  });
  assert.ok(spaced.differences.some(d=>d>=65&&d<=78),
    'Count-in beat spacing should remain readable: '+JSON.stringify(spaced));
  // Near bar zero's crossing the real scheduler will prefetch its first
  // click. The projected bar-zero position must not jump or disappear.
  await motionPage.waitForFunction(()=>{
   const b=document.querySelector('#tacticalLane .tac-lane-quarter[data-tac-bar="0"]');
   if(!b)return false;
   const x=Number(b.getAttribute('x1'));
   return x>=132&&x<=190;
  },null,{timeout:8500});
  const barZeroX=()=>motionPage.evaluate(()=>{
   const b=document.querySelector('#tacticalLane .tac-lane-quarter[data-tac-bar="0"]');
   return b?Number(b.getAttribute('x1')):null;
  });
  const beforeLane=await barZeroX();
  await motionPage.waitForTimeout(210);
  const afterLane=await barZeroX();
  assert.ok(beforeLane!==null&&afterLane!==null&&afterLane<beforeLane-9&&
    afterLane>beforeLane-48,
    'bar zero should cross count-in smoothly: '+JSON.stringify({beforeLane,afterLane}));
  await motionPage.screenshot({path:path.join(shots,'tactical-count-in-390.png')});
  // Regression: the microphone can keep listening after STOP, but the
  // circular metronome playhead has no meaning without a running clock.
  // It must disappear immediately, even though onGrid history is retained.
  await motionPage.locator('#tacticalStart').click();
  await motionPage.waitForFunction(()=>{
    const start=document.querySelector('#tacticalStart');
    const ring=document.querySelector('#tacticalRingOverlay');
    return start.textContent.trim()==='START' &&
      !ring.querySelector('.tac-ring-needle,.tac-ring-playhead');
  },null,{timeout:3500});
  assert.equal(await motionPage.locator('#tacticalMic').textContent(),'DISENGAGE',
    'mic should remain independently engaged when metronome stops');
  assert.equal(await motionPage.locator('#tacticalRingOverlay .tac-ring-playhead').count(),0);
  // Restart while the microphone is still engaged. The playhead returns
  // exclusively for a running transport.
  await motionPage.locator('#tacticalStart').click();
  await motionPage.waitForFunction(()=>document.querySelector('#tacticalRingOverlay .tac-ring-needle')&&
    document.querySelector('#tacticalStart').textContent.trim()==='STOP',null,{timeout:3500});
  await motionPage.locator('#tacticalStart').click();
  await motionPage.waitForFunction(()=>!document.querySelector('#tacticalRingOverlay .tac-ring-needle')&&
    document.querySelector('#tacticalStart').textContent.trim()==='START',null,{timeout:3500});
  // The stopped/off-mic state must be identical. Sensor arm/disarm must
  // not control a metronome needle or force the microphone to stop on STOP.
  await motionPage.evaluate(()=>{
    const p=document.querySelector('#metronome');
    p.classList.remove('mic-telemetry-on');
    p.dispatchEvent(new CustomEvent('lcars:mic-state',{detail:{active:false}}));
  });
  await motionPage.waitForFunction(()=>document.querySelector('#tacticalMic').textContent.trim()==='ENGAGE',null,{timeout:2500});
  assert.equal(await motionPage.locator('#tacticalRingOverlay .tac-ring-needle').count(),0,
    'needle was resurrected when the microphone disengaged');
  await motionPage.locator('#tacticalStart').click();
  await motionPage.waitForFunction(()=>document.querySelector('#tacticalRingOverlay .tac-ring-needle'),null,{timeout:3500});
  await motionPage.locator('#tacticalStart').click();
  await motionPage.waitForFunction(()=>!document.querySelector('#tacticalRingOverlay .tac-ring-needle'),null,{timeout:3500});
  console.log('PASS RC25.11 Tactical STOP removes circular needle with mic ON and OFF');
  console.log('PASS RC25.11 Tactical fixed-spacing count-in to first bar',
    JSON.stringify({spaced,beforeLane,afterLane}));
  console.log('PASS RC25.11 Tactical staged animation');
 }catch(e){failures++;console.error('FAIL RC25.11 Tactical animation',e);}
 finally{await motionPage.close();}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failures)process.exitCode=1;
