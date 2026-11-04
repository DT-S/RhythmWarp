// RC25.11: display-only Tactical View. AudioContext and Scheduler remain authoritative.
import {renderLiveSensor} from './mic-live-plots.js';
import {projectTacticalBars,tacticalBeatPosition,TACTICAL_BEAT_SPACING,TACTICAL_NOW_X} from './tactical-timeline.js';

const NS='http://www.w3.org/2000/svg';
const COLOR={early:'var(--tac-early,#75baff)',grid:'var(--tac-grid,#d5a6ff)',
  late:'var(--tac-late,#ffb566)',extra:'var(--tac-extra,#ff786e)',
  outside:'var(--tac-out,#f26b88)'};
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function svg(parent,tag,attrs={}){
 const n=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
 parent.append(n);return n;
}
function text(parent,x,y,s,cls){
 const n=svg(parent,'text',{x,y,class:cls});n.textContent=String(s);return n;
}
function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function category(hit){
 if(hit.reason==='ADDITIONAL STRIKE')return 'extra';
 if(hit.reason==='OUTSIDE REFERENCE GRID')return 'outside';
 if(!finite(hit.offsetMs))return 'outside';
 return Math.abs(hit.offsetMs)<=10?'grid':hit.offsetMs<0?'early':'late';
}
export function createTacticalView({getState,audio,scheduler}){
 const page=$('metronome'),dock=$('tacticalRingDock'),dial=$('dial'),linear=$('linear'),
       instrument=page.querySelector('.instrument'),plot=$('tacticalPlot');
 const overlay=$('tacticalRingOverlay'),lane=$('tacticalLane');
 // Additional SVGs share the same recorded events, never a second sensor.
 const plotShell=plot.parentElement;
 plotShell.classList.add('tac-plot-grid');
 const plotNodes={timing:plot};
 for(const kind of ['rate','distribution']){
  const panel=document.createElement('div');
  panel.className='tac-plot-cell';
  const heading=document.createElement('span');
  heading.className='tac-plot-cell-label';
  heading.textContent=kind==='rate'?'HIT RATE':'DISTRIBUTION';
  const chart=document.createElementNS(NS,'svg');
  chart.classList.add('tac-plot-chart');
  chart.setAttribute('preserveAspectRatio','none');
  panel.append(heading,chart);
  plotShell.append(panel);
  plotNodes[kind]=chart;
 }
 plot.setAttribute('preserveAspectRatio','none');
 let view='circular',micOn=false,micMode='guided',micDivision=1;
 let selected='timing',hits=[],bars=[],painting=false,lastUi=0,transportWasRunning=false;
 let modeState='standby';
 const state=()=>getState();
 const now=()=>audio.ctx?.currentTime??0;
 const active=()=>view==='tactical'&&!$('tactical').hidden;
 const event=(name,fn)=>page.addEventListener(name,fn);
 const plotButtons=[...document.querySelectorAll('#tacticalPlotButtons [data-tac-plot]')];
 const viewButtons=[...document.querySelectorAll('#tacticalViewSwitch [data-tac-view]')];

 // One-window Tactical config: reuse the ORIGINAL two LCARS deck buttons,
 // plus MIX SETTINGS. No dialog, backdrop or replacement state handlers.
 // Existing input/mixer/recorder nodes are relocated, never cloned.
 const deckBar=page.querySelector('.lcars-deck-bar');
 const deckHome=document.createComment('LCARS deck original instrument position');
 deckBar.before(deckHome);
 const deckMount=$('tacticalDeckBarMount'),settingsBody=$('tacticalSettingsBody');
 const mixButton=$('tacticalMix'),paramsButton=$('deckParamsToggle'),micButton=$('deckMicToggle');
 let mounted=[],openPanel=null;
 const panelNodes={
  params:()=>[$('trainingDeck')],
  mix:()=>[$('mixer'),document.querySelector('#audio > .master'),
          document.querySelector('#audio > details.lcars-info')],
  mic:()=>[$('micConsole')]
 };
 function restoreSettings(){
  for(const {node,placeholder} of mounted.reverse())placeholder.replaceWith(node);
  mounted=[];openPanel=null;
  settingsBody.replaceChildren();
  settingsBody.hidden=true;
  paramsButton.setAttribute('aria-expanded','false');
  micButton.setAttribute('aria-expanded','false');
  mixButton.setAttribute('aria-expanded','false');
 }
 function closeSettings(){if(mounted.length||openPanel)restoreSettings();}
 function selectSettings(name){
  if(!['params','mix','mic'].includes(name))return;
  if(openPanel===name){closeSettings();return;}
  closeSettings();
  const nodes=panelNodes[name]();
  if(nodes.some(node=>!node?.parentNode))return;
  for(const node of nodes){
   const placeholder=document.createComment('Tactical live settings original location');
   node.parentNode.insertBefore(placeholder,node);
   settingsBody.append(node);
   mounted.push({node,placeholder});
  }
  openPanel=name;
  settingsBody.hidden=false;
  paramsButton.setAttribute('aria-expanded',String(name==='params'));
  micButton.setAttribute('aria-expanded',String(name==='mic'));
  mixButton.setAttribute('aria-expanded',String(name==='mix'));
 }
 // Capture before the existing Circular/Linear button handlers run.
 // Only Tactical reroutes the buttons to its inline drawer; once back in
 // their original place their original click handlers work normally.
 deckMount.addEventListener('click',e=>{
  const button=e.target.closest?.('#deckParamsToggle,#deckMicToggle,#tacticalMix');
  if(!button||!deckMount.contains(button))return;
  e.preventDefault();
  e.stopPropagation();
  selectSettings(button===paramsButton?'params':button===micButton?'mic':'mix');
 },true);
 // When navigating to AUDIO the real mixer is back immediately. Returning
 // to METRO leaves the selected Tactical view and its footer available.
 document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-tab]'))closeSettings();
 },{capture:true});

 function setView(next){
  if(!['circular','linear','tactical'].includes(next))return;
  if(next!=='tactical'){
   closeSettings();
   if(deckBar.parentNode===deckMount)deckHome.after(deckBar);
   mixButton.hidden=true;
  }else{
   deckMount.append(deckBar);
   mixButton.hidden=false;
  }
  const was=active();view=next;
  page.classList.toggle('tactical-active',next==='tactical');
  // Moving the existing REAL sequencer preserves both pattern rings, beat
  // click/edit handlers and BPM controls. There is never a duplicate dial.
  if(next==='tactical')dock.prepend(dial);
  else instrument.insertBefore(dial,linear);
  dial.hidden=next==='linear';
  linear.hidden=next!=='linear';
  $('tactical').hidden=next!=='tactical';
  viewButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tacView===next)));
  // #view remains the legacy toggle for release-gate/browser compatibility.
  $('view').textContent=next==='linear'?'CIRCULAR VIEW':'LINEAR VIEW';
  if(next==='linear')window.dispatchEvent(new Event('resize'));
  page.dispatchEvent(new CustomEvent('lcars:tactical-view',{detail:{view:next}}));
  if(next==='tactical'){
   const grid=scheduler.running&&finite(scheduler.anchor)&&finite(scheduler.bpm)?
     {anchor:scheduler.anchor,bpm:scheduler.bpm,length:scheduler.length,bar:scheduler.bar}:null;
   if(grid&&grid.bar>=0)onGrid(grid);
   sync();paint();
  }else if(was){
   overlay.replaceChildren();
  }
 }
 viewButtons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.tacView)));
 $('tacticalStart').addEventListener('click',()=>$('start').click());
 $('tacticalTap').addEventListener('click',()=>$('tap').click());
 $('tacticalMic').addEventListener('click',()=>$('micArm').click());
 // All Tactical settings now expand below Diagnostics in the same page.
 plotButtons.forEach(b=>b.addEventListener('click',()=>{
  if(micMode==='free'&&b.dataset.tacPlot!=='rate')return;
  selected=b.dataset.tacPlot;sync();drawPlot();
 }));
 event('lcars:mic-state',e=>{
  micOn=!!e.detail?.active;micMode=e.detail?.mode==='free'?'free':'guided';
  micDivision=e.detail?.division||1;
  modeState=e.detail?.session?'tracking':micOn?'armed':'standby';
  if(micMode==='free')selected='rate';
  if(!micOn){hits=[];if(!scheduler.running)bars=[];}
  sync();drawPlot();
 });
 event('lcars:mic-session',()=>{hits=[];bars=[];sync();drawPlot();});
 event('lcars:bar-grid',e=>onGrid(e.detail));
 event('lcars:mic-hit',e=>{
  const h=e.detail;
  if(!h||!finite(h.time))return;
  hits.push({...h,type:category(h)});
  if(hits.length>256)hits.splice(0,hits.length-256);
  sync();drawPlot();
 });
 function onGrid(bar){
  if(!bar||!finite(bar.anchor)||!finite(bar.bpm)||!finite(bar.length)||
      bar.bpm<=0||bar.length<=0)return;
  // A new transport run starts at bar zero; discard timestamps from the
  // previous run, otherwise the lane could show stale click references.
  if(bar.bar===0&&bars.length&&bars.at(-1).bar>=0&&bars.at(-1).anchor<bar.anchor-.01)bars=[];
  if(!bars.some(b=>Math.abs(b.anchor-bar.anchor)<.0001)){
   bars.push({anchor:bar.anchor,bpm:bar.bpm,length:bar.length,bar:bar.bar??0});
   if(bars.length>16)bars.shift();
  }
 }
 function barFor(t){
  for(let i=bars.length-1;i>=0;i--){
   const b=bars[i],duration=b.length*60/b.bpm;
   if(t>=b.anchor-.22&&t<b.anchor+duration+.22)return b;
  }
  return null;
 }
 function drawRing(time){
  // The playhead represents *running* metronome transport, not microphone
  // capture. Never show a moving or frozen reference needle after STOP,
  // even if mic sensing remains engaged and retains historical bars.
  if(!scheduler.running){overlay.replaceChildren();return;}
  overlay.replaceChildren();
  const b=barFor(time)||bars.at(-1),s=state();
  if(!b&&!scheduler.running)return;
  let start=b?.anchor??scheduler.anchor,
      length=b?.length??s.beats,bpm=b?.bpm??s.bpm;
  const phase=((((time-start)/(length*60/bpm))%1)+1)%1;
  const angle=-Math.PI/2+phase*2*Math.PI;
  const cx=250,cy=250,inner=16,outer=182;
  const x=cx+Math.cos(angle)*outer,y=cy+Math.sin(angle)*outer;
  svg(overlay,'line',{x1:cx+Math.cos(angle)*inner,y1:cy+Math.sin(angle)*inner,
    x2:x,y2:y,class:'tac-ring-needle'});
  svg(overlay,'circle',{cx:x,cy:y,r:7,class:'tac-ring-playhead'});
  for(const h of hits.slice(-48)){
   const elapsed=time-h.time;
   if(elapsed<0||elapsed>2.7)continue;
   const source=barFor(finite(h.referenceTime)?h.referenceTime:h.time);
   if(!source)continue;
   const actual=finite(h.correctedTime)?h.correctedTime:h.time;
   const duration=source.length*60/source.bpm;
   const hitPhase=((((actual-source.anchor)/duration)%1)+1)%1;
   const a=-Math.PI/2+hitPhase*Math.PI*2;
   const radius=182,opacity=clamp(1-elapsed/2.7,0,1);
   svg(overlay,'circle',{cx:250+Math.cos(a)*radius,cy:250+Math.sin(a)*radius,
     r:7,fill:COLOR[h.type],class:'tac-ring-hit',opacity:opacity.toFixed(3)});
  }
 }
 function drawLane(time){
  lane.replaceChildren();
  const h=110,rect=lane.getBoundingClientRect();
  // Match the SVG coordinate aspect ratio to its rendered viewport.
  // This preserves true circles and stroke proportions at any Quest/desktop width.
  const w=rect.width>0&&rect.height>0?
   clamp(h*rect.width/rect.height,150,2400):420;
  lane.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const nowX=TACTICAL_NOW_X,s=state();
  svg(lane,'rect',{x:0,y:0,width:w,height:h,class:'tac-lane-base'});
  for(let i=0;i<=Math.ceil(w/30);i++){
   const x=i*30;
   svg(lane,'line',{x1:x,y1:13,x2:x,y2:103,class:'tac-lane-grid'});
  }
  svg(lane,'line',{x1:0,y1:59,x2:w,y2:59,class:'tac-lane-zero'});
  svg(lane,'line',{x1:nowX,y1:6,x2:nowX,y2:106,class:'tac-lane-now'});
  // Four future bars stay CALCULATED, but only the beat ticks within the
  // viewport are drawn. This restores readable distances instead of fitting
  // twelve quarter notes into a single tiny lane. Timeline coordinates use
  // musical quarter units, with a separate real tempo for each bar. During
  // tempo ramp the cursor scrolls faster/slower; no reference is teleported.
  const future=projectTacticalBars(scheduler,4);
  const minHistoryTime=time-4*Math.max(1,s.beats)*60/Math.max(1,s.bpm);
  const realHistory=bars.filter(bar=>
    (!future.length||bar.anchor<future[0].anchor-.0001)&&
    bar.anchor+bar.length*60/bar.bpm>=minHistoryTime);
  const visible=[...realHistory,...future];
  // When monitoring in free mode, there is no fictional beat grid. A raw
  // microphone hit is nevertheless displayed on a stable local time scale.
  const quarterSeconds=60/Math.max(1,scheduler.running?scheduler.bpm:s.bpm);
  const beatAtNow=tacticalBeatPosition(time,visible);
  const xAt=when=>nowX+(beatAtNow===null?
    (when-time)/quarterSeconds:
    tacticalBeatPosition(when,visible)-beatAtNow)*TACTICAL_BEAT_SPACING;
  for(const bar of visible){
   const divisions=Math.min(20,Math.max(1,bar.settings?.subdivisions??s.subdivisions));
   const barBeats=Math.max(1,bar.settings?.beats??s.beats);
   const count=Math.min(400,Math.ceil(bar.length*divisions));
   const subPixels=TACTICAL_BEAT_SPACING/divisions;
   // On extreme 20×20 patterns tiny subdivision markers become visual
   // noise. Skip some, but always keep major quarter references intact.
   const skip=Math.max(1,Math.ceil(5/Math.max(.001,subPixels)));
   for(let i=0;i<=count;i++){
    const major=i%divisions===0;
    if(!major&&i%skip!==0)continue;
    const when=bar.anchor+i*60/(bar.bpm*divisions);
    const x=xAt(when);
    if(x<-4||x>w+4)continue;
    svg(lane,'line',{x1:x,y1:major?9:30,x2:x,y2:major?101:88,
      class:major?(i===0?'tac-lane-quarter tac-lane-bar':'tac-lane-quarter'):'tac-lane-sub',
      'data-tac-bar':bar.bar,'data-tac-projected':bar.projected?'true':'false'});
    if(major){
     const beat=(Math.floor(i/divisions)%barBeats)+1;
     text(lane,clamp(x+3,3,w-19),13,beat,'tac-lane-label');
    }
   }
  }
  for(const hit of hits.slice(-96)){
   const actual=finite(hit.correctedTime)?hit.correctedTime:hit.time;
   const x=xAt(actual);
   if(x<-5||x>w+5)continue;
   const offset=finite(hit.offsetMs)?hit.offsetMs:0;
   const y=clamp(59-offset*.43,23,96);
   svg(lane,'line',{x1:x,y1:59,x2:x,y2:y,stroke:COLOR[hit.type],class:'tac-hit-stem'});
   svg(lane,'circle',{cx:x,cy:y,r:5.5,fill:COLOR[hit.type],class:'tac-hit-head'});
  }
 }
 function drawPlot(){
  if(!active())return;
  const kind=micMode==='free'?'rate':selected;
  const s=state();
  const data=hits.map(h=>[h.elapsedMs,h.offsetMs,
      Math.round(clamp(h.level??0,0,1)*1000),h.rateBpm??null]);
  const bpm=scheduler.running&&finite(scheduler.bpm)?scheduler.bpm:s.bpm;
  renderLiveSensor(plot,data,{kind:'timing',mode:micMode,bpm,division:micDivision});
  // Wide cockpit: three simultaneous plots. Narrow cockpit: one selected plot.
  for(const [type,chart] of Object.entries(plotNodes)){
   if(type!=='timing')renderLiveSensor(chart,data,{kind:type,mode:micMode,bpm,division:micDivision});
  }
  plotShell.dataset.selected=kind;
  plotShell.dataset.mode=micMode;
  $('tacticalPlotInfo').textContent=!micOn?'SENSOR STANDBY':
   kind==='rate'?'RAW INPUT / HITS PER MIN':
   kind==='distribution'?'OFFSET DISTRIBUTION':'LIVE OFFSET / ±10 MS GRID';
 }
 function sync(){
  if(!active())return;
  const s=state();
  $('tacticalBpm').textContent=String(s.bpm);
  $('tacticalQuarter').textContent=String(s.beats);
  $('tacticalSub').textContent=String(s.subdivisions);
  $('tacticalStart').textContent=scheduler.running?'STOP':'START';
  $('tacticalMic').textContent=micOn?'DISENGAGE':'ENGAGE';
  $('tacticalMic').setAttribute('aria-pressed',String(micOn));
  $('tacticalSensorState').textContent=micOn?modeState==='tracking'?'SENSOR TRACKING':'SENSOR ARMED':'SENSOR STANDBY';
  $('tacticalOffset').textContent=micOn?$('micOffset').textContent:'—';
  $('tacticalHitRate').textContent=micOn?$('micRate').textContent:'—';
  for(const k of ['early','grid','late','extra','outside']){
   const count=hits.filter(h=>h.type===k).length;
   const n=document.querySelector('#tacticalDiagnostics [data-tac-count="'+k+'"]');
   if(n){n.querySelector('strong').textContent=String(count);n.dataset.lit=String(hits.at(-1)?.type===k);}
  }
  for(const [from,to] of [['micSlots','tacticalSlots'],['micDetected','tacticalDetected'],['micMissed','tacticalMissed']]){
   $(to).textContent=micOn?$(from).textContent:'0';
  }
  plotButtons.forEach(b=>{
   b.disabled=micMode==='free'&&b.dataset.tacPlot!=='rate';
   b.setAttribute('aria-pressed',String(b.dataset.tacPlot===(micMode==='free'?'rate':selected)));
  });
 }
 function paint(){
  if(!active())return;
  // Start a new visual timeline for each transport run. Observe even
  // negative count-in bars (Scheduler.onGrid publishes only bar >= 0).
  if(scheduler.running){
   if(!transportWasRunning)bars=[];
   if(finite(scheduler.anchor)&&finite(scheduler.bpm)&&finite(scheduler.length))
    onGrid({anchor:scheduler.anchor,bpm:scheduler.bpm,length:scheduler.length,bar:scheduler.bar});
  }
  transportWasRunning=scheduler.running;
  const t=now(),time=finite(t)?t:0;
  if(scheduler.running)drawRing(time);
  else overlay.replaceChildren();
  // The mic's independent raw-input lane may remain active after STOP;
  // it must never keep the metronome's circular playhead alive.
  drawLane(scheduler.running||micOn?time:0);
  // Rate limiting only for DOM text: SVG animation remains synchronized with
  // the animation frame, no new audio or timing intervals are installed.
  if(performance.now()-lastUi>150){lastUi=performance.now();sync();}
 }
 function frame(){if(active())paint();}
 return {setView,frame,view:()=>view,onGrid};
}
