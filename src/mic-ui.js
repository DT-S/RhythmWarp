import {TimingSession,validateInputDelayMs,validateReferenceDivision} from './mic-analysis.js';
import {MicCapture} from './mic-capture.js';
import {renderLiveSensor} from './mic-live-plots.js';
import {benchmarkScore,classifyArchive} from './mic-retention.js';
import {listAnalysisSessions,listAnalysisCandidates,saveAnalysisSession,readMicCalibration,writeMicCalibration,readMicReferenceDivision,writeMicReferenceDivision} from './storage.js';
const $=s=>document.querySelector(s);
const ns='http://www.w3.org/2000/svg';
function svg(tag,attributes={},text){
 const el=document.createElementNS(ns,tag);
 for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));
 if(text!==undefined)el.textContent=text;
 return el;
}
function drawPlot(host,hits,kind='timing'){
 if(!host)return;
 host.replaceChildren();
 host.setAttribute('viewBox','0 0 480 168');
 host.setAttribute('role','img');
 host.setAttribute('aria-label',kind==='timing'?'Detected strike offsets in milliseconds':'Detected strike rate in hits per minute');
 for(let i=0;i<5;i++){
   const y=17+i*31;
   host.append(svg('line',{x1:30,y1:y,x2:470,y2:y,class:'mic-grid'}));
 }
 const points=hits.slice(-72).filter(h=>kind==='timing'?h[1]!==null:h[3]!==null);
 if(!points.length){host.append(svg('text',{x:240,y:82,'text-anchor':'middle',class:'mic-axis'},'AWAITING SENSOR DATA'));return;}
 const values=points.map(h=>kind==='timing'?h[1]:h[3]);
 const bound=kind==='timing'?Math.max(25,Math.ceil(Math.max(...values.map(Math.abs))/25)*25):null;
 const lo=kind==='timing'?-bound:Math.max(0,Math.floor(Math.min(...values)*.88));
 const hi=kind==='timing'?bound:Math.max(lo+5,Math.ceil(Math.max(...values)*1.12));
 const lastIndex=Math.max(1,points.length-1);
 const coord=(v,i)=>[30+(i/lastIndex)*440,141-((v-lo)/(hi-lo))*124];
 if(kind==='timing')host.append(svg('line',{x1:30,y1:79,x2:470,y2:79,class:'mic-zero'}));
 const pairs=values.map((v,i)=>coord(v,i));
 if(pairs.length>1)host.append(svg('polyline',{points:pairs.map(p=>p.join(',')).join(' '),class:'mic-trace'}));
 for(const [x,y] of pairs)host.append(svg('circle',{cx:x,cy:y,r:2.9,class:'mic-hit'}));
 host.append(svg('text',{x:33,y:13,class:'mic-axis'},kind==='timing'?'LATE +'+bound+' ms':Math.round(hi)+' HITS/MIN'));
 host.append(svg('text',{x:33,y:161,class:'mic-axis'},kind==='timing'?'EARLY -'+bound+' ms':Math.round(lo)+' HITS/MIN'));
}
function format(v,unit=''){
 return v===null||v===undefined?'—':String(v)+unit;
}
function metric(name,value){
 const tile=document.createElement('div');tile.className='mic-metric';
 const caption=document.createElement('span');caption.textContent=name;
 const figure=document.createElement('strong');figure.textContent=value;
 tile.append(caption,figure);return tile;
}
function drawHistogram(host,hits){
 host.replaceChildren();host.setAttribute('viewBox','0 0 480 160');
 host.setAttribute('role','img');host.setAttribute('aria-label','Distribution of measured strike offsets in milliseconds');
 const errors=hits.map(h=>h[1]).filter(v=>v!==null);
 if(!errors.length){host.append(svg('text',{x:240,y:80,'text-anchor':'middle',class:'mic-axis'},'NO GRID MATCHES'));return;}
 const max=Math.max(25,Math.ceil(Math.max(...errors.map(Math.abs))/25)*25);
 const buckets=Array(15).fill(0);
 for(const v of errors){const bucket=Math.max(0,Math.min(14,Math.floor((v+max)/(max*2)*15)));buckets[bucket]++;}
 const largest=Math.max(1,...buckets);
 host.append(svg('line',{x1:240,y1:16,x2:240,y2:134,class:'mic-zero'}));
 buckets.forEach((count,i)=>{
  const height=count/largest*110;
  host.append(svg('rect',{x:28+i*29.5,y:133-height,width:23,height,class:'mic-hist-bar'}));
 });
 host.append(svg('text',{x:20,y:152,class:'mic-axis'},'-'+max+' ms'));
 host.append(svg('text',{x:460,y:152,'text-anchor':'end',class:'mic-axis'},'+'+max+' ms'));
}
export function createMicUI({audio,scheduler,unlock,notify,getBpm,canEngage=()=>true}){
 const arm=$('#micArm'),free=$('#micFree'),guided=$('#micGuided'),status=$('#micStatus');
 const sensitivity=$('#micSensitivity'),offset=$('#micOffset'),rate=$('#micRate');
 const plot=$('#micLivePlot'),stats=$('#micAnalytics'),delay=$('#micInputDelay'),delayReset=$('#micDelayReset');
 const visual=$('#micVisual'),plotButtons=[...document.querySelectorAll('[data-mic-plot]')];
 const plotInfo=$('#micVisualInfo'),plotCaption=$('#micVisualCaption');
 const gridDivision=$('#micGridDivision'),leds=$('#micHitLeds');
 const slotStrip=$('#micSlotStrip'),slotCount=$('#micSlots'),detectedCount=$('#micDetected'),missedCount=$('#micMissed');
 function updateHitReadout(label='—',state='waiting'){
   offset.textContent=label;
   leds.dataset.state=state;
   for(const led of leds.querySelectorAll('[data-led]')){
     const active=led.dataset.led===state;
     led.classList.toggle('is-lit',active);
     led.setAttribute('aria-current',active?'true':'false');
   }
 }
 let mode='guided',capture=null,session=null,arming=false,selectedId=null,archive=[],inputDelayMs=0,referenceDivision=1;
 let plotKind='timing';
 const plotDescriptions={
   timing:'Offset dots are measured relative to the selected grid; ±125ms display range.',
   rate:'Measured hit rate over time. Dashed line = current reference hits/min, not quarter-note BPM.',
   distribution:'Actual offset histogram, last 128 detected events. No fitted or estimated Gaussian.'
 };
 function redrawLivePlot(){
   const selected=mode==='free'?'rate':plotKind;
   const liveBpm=scheduler.running&&Number.isFinite(scheduler.bpm)?scheduler.bpm:getBpm();
   const data=renderLiveSensor(plot,session?.hits??[],{
     kind:selected,mode,bpm:liveBpm,division:referenceDivision
   });
   if(selected==='rate'){
     plotInfo.textContent=data.reference!==null?'REF '+data.reference+' HITS/MIN':'FREE / HITS/MIN';
   }else if(selected==='distribution'){
     plotInfo.textContent=data.count+' MATCHES'+
       (data.meanMs===null?'':' / MEAN '+(data.meanMs>0?'+':'')+data.meanMs+' MS');
   }else plotInfo.textContent=data.count+' MATCHED HITS';
   plotCaption.textContent=plotDescriptions[selected];
 }
 // Coalesce rapid hits into at most one sensor repaint per display frame.
 let sensorPaintPending=false;
 function queueLivePlot(){
   if(sensorPaintPending)return;
   sensorPaintPending=true;
   requestAnimationFrame(()=>{
     sensorPaintPending=false;
     if(!visual.hidden)redrawLivePlot();
   });
 }
 function selectLivePlot(kind){
   if(!['timing','rate','distribution'].includes(kind)||mode==='free'&&kind!=='rate')return;
   plotKind=kind;
   plotButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.micPlot===kind)));
   redrawLivePlot();
 }
 plotButtons.forEach(b=>b.addEventListener('click',()=>selectLivePlot(b.dataset.micPlot)));
 let progressTimer=null;
 function stopProgressTimer(){if(progressTimer!==null){clearInterval(progressTimer);progressTimer=null;}}
 function updateGridStats(){
   const progress=session?.mode==='guided'?session.progress(audio.ctx.currentTime):null;
   if(!progress)return;
   slotCount.textContent=String(progress.evaluated);
   detectedCount.textContent=String(progress.detected);
   missedCount.textContent=String(progress.missed);
 }
 function resetGridStats(){
   slotCount.textContent='0';detectedCount.textContent='0';missedCount.textContent='0';
 }
 let divisionDirty=false;
 const divisionLoaded=readMicReferenceDivision().then(value=>{
   if(!divisionDirty){referenceDivision=validateReferenceDivision(value);gridDivision.value=String(referenceDivision);}
 }).catch(()=>notify('Reference setting unavailable. Using quarter grid.','Warningsound'));
 async function restoreReferenceDivision(value){
   await divisionLoaded;referenceDivision=validateReferenceDivision(value);
   divisionDirty=true;gridDivision.value=String(referenceDivision);refresh();
 }
 async function changeReferenceDivision(value){
   if(session)return;
   const next=validateReferenceDivision(Number(value));
   await divisionLoaded;
   divisionDirty=true;referenceDivision=next;gridDivision.value=String(next);
   try{await writeMicReferenceDivision(next);}
   catch{notify('Reference grid could not be saved locally.','Warningsound');}
   refresh();
 }
 let loadCompleted=false,dirty=false;
 const loadCalibration=readMicCalibration().then(v=>{
   if(!dirty){inputDelayMs=validateInputDelayMs(v);delay.value=String(inputDelayMs);}
   loadCompleted=true;
 }).catch(()=>{loadCompleted=true;notify('Input delay could not be loaded. Defaulting to 0 ms.','Warningsound');});
 async function restoreCalibration(value){
   await loadCalibration;
   inputDelayMs=validateInputDelayMs(value);
   dirty=true;
   delay.value=String(inputDelayMs);
   refresh();
 }
 async function setCalibration(value){
   if(session)return;
   let next;
   try{next=validateInputDelayMs(value);}catch{
     delay.value=String(inputDelayMs);
     notify('Input delay must be -500 to +500 ms in 0.1 ms steps.','Warningsound');return;
   }
   dirty=true;inputDelayMs=next;delay.value=String(next);
   try{await writeMicCalibration(next);}catch{
     notify('Calibration could not be saved on this device.','Warningsound');
   }
   refresh();
 }
  function refresh(){
   const active=!!capture?.active;
   $('#micConsole').classList.toggle('mic-active',active);
   $('#metronome').classList.toggle('mic-telemetry-on',active);
   visual.hidden=!active;
   $('#metronome').dispatchEvent(new CustomEvent('lcars:mic-state',{detail:{active,mode,division:referenceDivision,session:!!session}}));
   plotButtons.forEach(b=>{
     b.disabled=mode==='free'&&b.dataset.micPlot!=='rate';
     b.setAttribute('aria-pressed',String(b.dataset.micPlot===(mode==='free'?'rate':plotKind)));
   });
   slotStrip.hidden=!active||mode!=='guided';
   arm.textContent=active?'DISENGAGE MIC // END SESSION':'ENGAGE MICROPHONE';
   const help=$('#micActiveHelp');
   if(help)help.hidden=!active;
   arm.setAttribute('aria-pressed',String(active));
   guided.setAttribute('aria-pressed',String(mode==='guided'));
   free.setAttribute('aria-pressed',String(mode==='free'));
   guided.disabled=active||arming;free.disabled=active||arming;
   arm.disabled=arming;
   sensitivity.disabled=active;
   delay.disabled=!!session||arming;delayReset.disabled=!!session||arming;
   gridDivision.disabled=!!session||arming||mode==='free';
   if(!active)status.textContent='MIC OFF // NO AUDIO RECORDED';
   else if(mode==='free'&&session)status.textContent='FREE SENSOR // RAW HIT RATE';
   else if(session)status.textContent='GRID TRACKING // OFFSET EXPERIMENTAL';
   else status.textContent='MIC ARMED // PRESS START';
 }
 function begin(){
   stopProgressTimer();
   capture?.reference(mode,getBpm(),referenceDivision);
   session=new TimingSession({mode,at:audio.ctx.currentTime,bpm:getBpm(),inputDelayMs,referenceDivision});
   $('#metronome').dispatchEvent(new CustomEvent('lcars:mic-session',{detail:{mode,division:referenceDivision}}));
   resetGridStats();
   if(mode==='guided')progressTimer=setInterval(updateGridStats,180);
   refresh();
   updateHitReadout();rate.textContent='—';
   redrawLivePlot();
 }
 // Cosmetic SVG feedback is intentionally kept outside the AudioContext/worklet path.
 let targetPulseTimer=null;
 function pulseTargetLock(kind){
   const rings=document.querySelectorAll('#rings .point.playing');
   for(const arc of rings){
     arc.classList.remove('lock-grid','lock-early','lock-late');
     arc.classList.add('lock-'+kind);
   }
   if(targetPulseTimer!==null)clearTimeout(targetPulseTimer);
   targetPulseTimer=setTimeout(()=>{
     for(const arc of rings)arc.classList.remove('lock-grid','lock-early','lock-late');
     targetPulseTimer=null;
   },240);
 }
 function hit(time,level){
   if(!session)return;
   const result=session.hit(time,level);
   if(!result)return;
   updateGridStats();
   // No variable-length text ever changes metric dimensions.
   if(mode==='free')updateHitReadout('—','waiting');
   else if(result.offsetMs!==null){
     const value=result.offsetMs;
     // Display-only ±10ms "GRID" band. Raw signed offset is preserved unchanged.
     const lamp=Math.abs(value)<=10?'grid':value<0?'early':'late';
     updateHitReadout((value>0?'+':'')+value.toFixed(1),lamp);
     pulseTargetLock(lamp);
   }else updateHitReadout('—',result.reason==='ADDITIONAL STRIKE'?'extra':
      result.reason==='NO REFERENCE'?'waiting':'outside');
   // Display-only event. The original MicSession result and persisted hit
   // format remain unchanged; reference/arrival timestamps use AudioContext.
   const correctedTime=time-inputDelayMs/1000;
   $('#metronome').dispatchEvent(new CustomEvent('lcars:mic-hit',{detail:{
     time,correctedTime,
     referenceTime:Number.isFinite(result.offsetMs)?correctedTime-result.offsetMs/1000:null,
     elapsedMs:result.elapsedMs,offsetMs:result.offsetMs,rateBpm:result.rateBpm,
     reason:result.reason,level
   }}));
   rate.textContent=format(result.rateBpm,' HITS/MIN');
   queueLivePlot();
 }
 async function finish(endTime=audio.ctx?.currentTime){
   stopProgressTimer();
   if(!session)return;
   const ending=session;session=null;
   const record=ending.snapshot(Math.max(ending.at,endTime||ending.at),crypto.randomUUID());
   // Never present a previous run as a live reading while status says ARMED.
   updateHitReadout();rate.textContent='—';
   resetGridStats();
   redrawLivePlot();
   refresh();
   // Even an otherwise silent session has valuable missing-slot data.
   if(!record.hits.length&&!(record.gridStats?.evaluated>0))return;
   try{await saveAnalysisSession(record);await renderArchive(); }
   catch(err){notify('Analysis archive save failed: '+err.message,'Warningsound');}
 }
 function disarm(){
   capture?.stop();capture=null;
   void finish();
   refresh();
 }
 async function engage(){
   if(arming)return;
   if(!canEngage()){notify('Acoustic pilot active. Abort it before using the normal mic.','Warningsound');return;}
   if(capture?.active){disarm();return;}
   if(scheduler.running){notify('Stop the metronome before arming the microphone.','Warningsound');return;}
   arming=true;refresh();
   try{
     await unlock();await divisionLoaded;
     capture=new MicCapture(audio.ctx,hit,()=>{
       capture=null;void finish();refresh();notify('Microphone input was interrupted.','Warningsound');
     });
     await capture.start(sensitivity.value);
     capture.reference(mode,getBpm(),referenceDivision);
     if(mode==='free')begin();
     status.textContent='MIC READY // HEADPHONES RECOMMENDED';
   }catch(err){
     capture?.stop();capture=null;
     status.textContent='MIC UNAVAILABLE // '+err.message;
     notify('Microphone unavailable: '+err.message,'Warningsound');
   }finally{arming=false;refresh();redrawLivePlot();}
 }
 gridDivision.addEventListener('change',()=>{void changeReferenceDivision(gridDivision.value);});
 delay.addEventListener('change',()=>{void setCalibration(Number(delay.value));});
 delayReset.addEventListener('click',()=>{void setCalibration(0);});
 arm.addEventListener('click',engage);
 guided.addEventListener('click',()=>{if(capture?.active)return;mode='guided';plotKind='timing';refresh();redrawLivePlot();});
 free.addEventListener('click',()=>{if(capture?.active)return;mode='free';plotKind='rate';refresh();redrawLivePlot();});
 function transportStart(){
   if(capture?.active&&mode==='guided')begin();
 }
 function transportStop(endTime){
   if(session?.mode==='guided')void finish(endTime);
 }
 scheduler.onGrid=grid=>{
   $('#metronome').dispatchEvent(new CustomEvent('lcars:bar-grid',{detail:grid}));
   if(session?.mode==='guided'){
     session.addGrid(grid);
     updateGridStats();
     capture?.reference('guided',grid.bpm,referenceDivision);
     if(plotKind==='rate')redrawLivePlot();
   }
 };
 async function renderArchive(){
   archive=await listAnalysisSessions();
   const candidates=await listAnalysisCandidates();
   const retained=classifyArchive(archive,candidates,Date.now());
   archive=retained.selected;
   stats.replaceChildren();
   const title=document.createElement('h3');title.textContent='MICROPHONE SENSOR RECORDS';stats.append(title);
   const note=document.createElement('p');note.className='hint';
   note.textContent='Up to six highlighted sessions are retained: best all time, best/worst last seven days and the three latest. A compact seven-day index supports rollover. Lower sensor index means smaller relative timing error, with a missed-slot penalty. This is not a certified performance grade.';
   // Compact but discoverable explanation. Unlike display:none, native
   // details keeps the scoring caveat available to keyboard/VoiceOver users.
   const info=document.createElement('details');info.className='mic-archive-info';
   const infoHead=document.createElement('summary');infoHead.textContent='SENSOR ARCHIVE INFO';
   info.append(infoHead,note);stats.append(info);
   if(!archive.length){stats.append(metric('RETAINED SESSIONS','0'));return;}
   const choices=[
     ['BEST / ALL TIME',retained.slots.bestAll],
     ['BEST / 7 DAYS',retained.slots.bestWeek],
     ['WORST / 7 DAYS',retained.slots.worstWeek],
     ...retained.slots.recent.map((id,i)=>['LATEST '+(i+1),id])
   ];
   const chooser=document.createElement('div');chooser.className='mic-session-chooser';
   for(const [label,id] of choices){
     const button=document.createElement('button');button.type='button';
     const record=archive.find(s=>s.id===id);
     button.textContent=label;
     if(record)button.dataset.sessionId=id;
     button.disabled=!record;
     button.title=record?new Date(record.started).toLocaleString('de-DE'):'No qualified session yet';
     const active=(selectedId??choices.find(([,key])=>key)?.[1])===id&&!!record;
     button.setAttribute('aria-pressed',String(active));
     if(record)button.addEventListener('click',()=>{selectedId=id;void renderArchive();});
     chooser.append(button);
   }
   stats.append(chooser);
   const target=archive.find(s=>s.id===selectedId)||
     archive.find(s=>s.id===choices.find(([,id])=>id)?.[1])||archive[0];
   selectedId=target.id;
   for(const button of chooser.children)
     button.setAttribute('aria-pressed',String(!button.disabled&&button.dataset.sessionId===target.id));
   const detail=document.createElement('p');detail.className='hint';
   detail.textContent=new Date(target.started).toLocaleString('de-DE')+
     ' // '+target.mode.toUpperCase()+' // '+target.seconds+' SECONDS'+
     (target.compact?' // COMPACT PLOT SAMPLE':' // FULL HIT DATA');
   stats.append(detail);
   const summary=target.benchmarkSummary??target.summary;
   const relative=benchmarkScore(target);
   const m=document.createElement('div');m.className='mic-metrics';
   m.append(metric('DETECTED HITS',String(summary.count)),
     metric('GRID MATCHES',String(summary.matched)),
     metric('MEAN OFFSET',format(summary.meanMs,' ms')),
     metric('MEAN ABS ERROR',format(summary.meanAbsMs,' ms')),
     metric('SPREAD',format(summary.spreadMs,' ms')),
     metric('LAST HIT RATE',format(summary.hitRateBpm,' hits/min')),
     metric('INPUT DELAY',format(target.inputDelayMs??0,' ms')),
     metric('REFERENCE',target.mode==='guided'?
       ({1:'QUARTER',2:'EIGHTH',3:'TRIPLET',4:'SIXTEENTH'}[target.referenceDivision??1]):'FREE'));
   if(target.mode==='guided'){
     m.append(metric('GRID SLOTS',format(target.gridStats?.evaluated)),
       metric('DETECTED SLOTS',format(target.gridStats?.detected)),
       metric('NO HIT DETECTED',format(target.gridStats?.missed)),
       metric('SENSOR INDEX',relative===null?'NOT RANKED':relative.toFixed(2)));
   }
   stats.append(m);
   for(const [plotName,kind] of [['TIMING OFFSET','timing'],['HIT RATE','rate'],['OFFSET DISTRIBUTION','histogram']]){
     const wrap=document.createElement('div');wrap.className='mic-archive-plot';
     const caption=document.createElement('h4');caption.textContent=plotName;
     const visual=svg('svg',{class:'mic-chart'});
     if(kind==='histogram')drawHistogram(visual,target.hits);
     else drawPlot(visual,target.hits,kind);
     wrap.append(caption,visual);stats.append(wrap);
   }
 }

 function shutdown(){if(targetPulseTimer!==null)clearTimeout(targetPulseTimer);stopProgressTimer();capture?.stop();capture=null;void finish();refresh();}
 updateHitReadout();resetGridStats();refresh();redrawLivePlot();
 return {transportStart,transportStop,disarm,shutdown,renderArchive,restoreCalibration,restoreReferenceDivision,
    canTransportStart:()=>!(capture?.active&&mode==='free'),
    isCapturing:()=>!!(capture?.active||arming)};
}
