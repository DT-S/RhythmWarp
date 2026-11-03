import {installFeedback,installTapTempo,installSegmentCorners,UI_SCALES,defaultInterfaceScale} from './interface.js';
import {PAN_PRESETS,setChannelPan} from './pan-control.js';
import {mountLcarsSlider,syncLcarsSlider} from './lcars-slider.js';
import {buildMatrixFaders} from './matrix-faders.js';
import {linearRowSizes,mobileFrameHeight,visibleViewportHeight,keyboardSafeViewportHeight,standaloneIPhoneViewportGap} from './linear-layout.js';
import {installUpdateManager} from './update-manager.js';
import {installViewportZoomGuard} from './viewport-zoom-guard.js';
import {installLinearBeatGesture} from './linear-gesture.js';
import {installTempoControl,radialTicks} from './tempo-control.js';
import {createGestureGuide} from './gesture-guide.js';
import {createMotionController,LCARS_BOOT_DURATION_MS} from './motion.js';
import {armLaunchCue} from './launch-cue.js';
import {customSoundUI} from './custom-sounds.js';
import {createDiaryUI} from './diary-ui.js';
import {SOUNDS} from './synth.js';
import {enhanceNumber,syncNumbers} from './number-control.js';
import {renderTraining,syncSwing} from './training-ui.js';
import {fresh,clamp,resize,validate,MODES,presetSettings,loadPreset} from './model.js';
import {applyTheme,normalizeTheme} from './lcars-theme.js';
import {angleDelta} from './rhythm.js';
import {AudioEngine} from './audio.js';
import {Scheduler} from './scheduler.js';
import {read,write,download,listAnalysisSessions,replaceAnalysisSessions,listAnalysisCandidates,readMicCalibration,writeMicCalibration,readMicReferenceDivision,writeMicReferenceDivision} from './storage.js';
import {validateAnalysisSessions,validateInputDelayMs,validateReferenceDivision} from './mic-analysis.js';
import {validateCandidates} from './mic-retention.js';
import {createMicUI} from './mic-ui.js';
import {installAcousticPilot} from './acoustic-pilot-ui.js';
import {createTacticalView} from './tactical-view.js';
import {appShareUrl,encodeSharedPreset,decodeSharedPresetFragment,loadSharedPreset,uniqueSharedPresetName} from './preset-share.js';
import {paintQR,shareActions} from './qr-share-ui.js';
import {installArchiveSharing} from './archive-share-ui.js';
import {planLogMerge,selectDiaryForTransfer,replaceDiaryRecords} from './archive-share.js';
// Prevent browser pinch/gesture zoom before registering any UI interactions.
installViewportZoomGuard(document);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const gestureGuide=createGestureGuide(document);
const motion=createMotionController(document);
const audio=new AudioEngine();let state=fresh(),linear=false,saveTimer,saveChain=Promise.resolve(),wakeLock,noticeTimer,starting=false,restoring=false,activePreset='',sharedPreset=null,sharedShareIndex=-1;
// The first launch uses 90% on phones; existing saved user preferences still win.
state.uiScale=defaultInterfaceScale(matchMedia('(max-width:640px)').matches);
const scheduler=new Scheduler(audio,(message,endTime)=>{stop(message,endTime);notify(message,'Warningsound');});
const micUI=createMicUI({audio,scheduler,unlock,notify,getBpm:()=>state.bpm,
 canEngage:()=>!acousticPilot.isBusy()});
const acousticPilot=installAcousticPilot({audio,unlock,
 canStart:()=>!scheduler.running&&!starting&&!restoring&&!micUI.isCapturing()});
const tactical=createTacticalView({getState:()=>state,audio,scheduler});
const diaryUI=createDiaryUI(()=>state,save,notify,()=>scheduler.running||starting||restoring,
  cue=>audio.ui(cue,state));
const soundUI=customSoundUI({state:()=>state,audio,unlock,changed,render,notify,running:()=>scheduler.running||starting||restoring});
function notify(message,sound='Acceptsound'){const n=$('#notice');n.textContent=message;n.classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);audio.ui(sound,state);}
async function unlock(){await audio.unlock();audio.mix(state);audio.ctx.onstatechange=()=>{if(scheduler.running&&audio.ctx.state!=='running')stop('Audio interrupted. Restart when ready.');};}
function save(){clearTimeout(saveTimer);$('#saveStatus').textContent='SAVING…';saveTimer=setTimeout(()=>{const snapshot=structuredClone(state);saveChain=saveChain.catch(()=>{}).then(()=>write(snapshot)).then(()=>{$('#saveStatus').textContent='SAVED ON THIS DEVICE';}).catch(()=>{$('#saveStatus').textContent='SAVE FAILED · EXPORT BACKUP';notify('Local save failed. Export a JSON backup.','Warningsound');});},200);}
function changed(){audio.mix(state);scheduler.update(state);save();}
function number(k,v,min,max){if(!Number.isFinite(v))return;state[k]=clamp(Math.round(v),min,max);if(k==='beats')state.outer=resize(state.outer,state.beats);if(k==='subdivisions')state.inner=resize(state.inner,state.subdivisions);render();changed();}
function cycle(channel,i){const key=channel?'inner':'outer';state[key][i]=(state[key][i]+1)%4;renderPatterns();changed();}
const shortModes={standard:'STANDARD',polyrhythm:'POLYRHYTHM',polymeter:'POLYMETER',gap:'GAP CLICK',random:'RANDOM GAP',offbeat:'OFFBEAT',displacement:'DISPLACEMENT',ramp:'TEMPO RAMP'};
for(const [value,label] of Object.entries(shortModes)){
 const b=document.createElement('button');b.type='button';b.dataset.mode=value;b.textContent=label;b.title=MODES[value];b.onclick=()=>{const change=state.mode!==value;state.mode=value;setModeDrawer(false);render();changed();if(change)motion.mode(b);};$('#modeButtons').append(b);
}
// RC25: drawers are a phone presentation layer; existing mode and audio state stay authoritative.
const metronomePage=$('#metronome');
const modeDrawerToggle=$('#modeDrawerToggle');
function setModeDrawer(open){
 metronomePage.classList.toggle('mode-drawer-open',!!open);
 modeDrawerToggle?.setAttribute('aria-expanded',String(!!open));
}
modeDrawerToggle?.addEventListener('click',()=>{
 setModeDrawer(!metronomePage.classList.contains('mode-drawer-open'));
});
function syncMicDeck(){
 const active=metronomePage.classList.contains('mic-telemetry-on');
 const open=active?metronomePage.classList.contains('mic-controls-open'):
   metronomePage.classList.contains('deck-mic-open');
 const button=$('#deckMicToggle');
 button?.setAttribute('aria-expanded',String(open));
 const title=button?.querySelector('span');
 if(title)title.textContent=active?(open?'HIDE MIC CFG':'MIC SETTINGS'):'MIC SENSOR';
}
function setDeck(name,open){
 const isParams=name==='params',target=isParams?'deck-params-open':'deck-mic-open';
 const opposite=isParams?'deck-mic-open':'deck-params-open';
 metronomePage.classList.toggle(target,!!open);
 if(open){
   metronomePage.classList.remove(opposite);
   metronomePage.classList.remove('mic-controls-open');
 }
 $('#deckParamsToggle')?.setAttribute('aria-expanded',
   String(metronomePage.classList.contains('deck-params-open')));
 syncMicDeck();
}
$('#deckParamsToggle')?.addEventListener('click',()=>{
 setDeck('params',!metronomePage.classList.contains('deck-params-open'));
});
$('#deckMicToggle')?.addEventListener('click',()=>{
 if(metronomePage.classList.contains('mic-telemetry-on')){
   // Configuration can be inspected without stopping capture.
   // Mic mode/reference and latency remain locked by the existing analysis contract.
   const open=metronomePage.classList.toggle('mic-controls-open');
   if(open)metronomePage.classList.remove('deck-params-open');
   $('#deckParamsToggle')?.setAttribute('aria-expanded','false');
   syncMicDeck();
   return;
 }
 setDeck('mic',!metronomePage.classList.contains('deck-mic-open'));
});
metronomePage.addEventListener('lcars:mic-state',event=>{
 if(event.detail?.active)metronomePage.classList.add('deck-mic-open');
 else metronomePage.classList.remove('mic-controls-open');
 syncMicDeck();
});
let lastFaderTone=0;
function faderTouchFeedback(){
 if(state.haptic)navigator.vibrate?.(5); // iOS may not expose vibration.
 const now=performance.now();
 if(now-lastFaderTone>95){lastFaderTone=now;audio.ui('hoversound',state);}
}
$('#swing').oninput=e=>{state.swing=Number(e.target.value)/100;syncSwing(state);changed();};
mountLcarsSlider($('#swing'),{kind:'swing',title:'SHUFFLE / SWING',code:'42-S9',onValueChange:faderTouchFeedback});
let heardTempo=null;
function tempoReadout(event=null){
 for(const selector of ['#tempoValue','#linearTempoValue']){
   const button=$(selector);button.textContent=state.bpm;
   button.setAttribute('aria-valuenow',state.bpm);
   button.setAttribute('aria-valuetext',`${state.bpm} beats per minute`);
  }
 if(event)heardTempo=event;
 const ramp=state.mode==='ramp';$('#rampReadout').hidden=!ramp;$('#tempo').classList.toggle('ramp-tempo',ramp);$('#tempoLabel').textContent=ramp?'START / BPM':'QUARTER / MIN';
  $('#linearTempo .linear-tempo-id strong').textContent=ramp?'START TEMPO / BPM':'TEMPO / BPM';
 const active=scheduler.running&&heardTempo,now=active?heardTempo.bpm:state.bpm;
 $('#liveTempo').textContent=`${now} BPM`;
 const base=active&&heardTempo.mode==='ramp'?heardTempo.startBpm:state.bpm;
 const target=active&&heardTempo.mode==='ramp'?heardTempo.targetBpm:state.training.targetBpm;
 $('#rampCurrent').textContent=now;const delta=now-base;$('#rampDelta').textContent=`${delta>=0?'+':''}${delta}`;$('#rampTarget').textContent=target;
}
function trainingChanged(){tempoReadout();changed();}
const names=['double accent','accent','normal','silent'];
// A shallow annular block per beat: the active SVG path remains the pointer target.
// Subdivide angle by the total number of steps so 1...20 never overlap.
export function beatArcPath(radius,index,total){
  const angle=index/total*Math.PI*2-Math.PI/2;
  const half=Math.min(.205, Math.PI/total*.74);
  const outer=radius+17,inner=radius-17;
  const xy=(r,a)=>`${(250+r*Math.cos(a)).toFixed(3)} ${(250+r*Math.sin(a)).toFixed(3)}`;
  return `M ${xy(outer,angle-half)} A ${outer} ${outer} 0 0 1 ${xy(outer,angle+half)} L ${xy(inner,angle+half)} A ${inner} ${inner} 0 0 0 ${xy(inner,angle-half)} Z`;
}
const linearRows=new Map();
function renderPatterns(){
  let svg='<circle class="track" cx="250" cy="250" r="212"/><circle class="track inner-track" cx="250" cy="250" r="149"/>';
  svg+='<g class="dial-ticks" aria-hidden="true">'+radialTicks().map(t=>`<line x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}"/>`).join('')+'</g>';
  for(const [channel,key,r] of [[0,'outer',212],[1,'inner',149]]){
    svg+=`<circle class="hit-ring" data-ring="${channel}" cx="250" cy="250" r="${r}"/>`;
    state[key].forEach((s,i)=>{const a=i/state[key].length*Math.PI*2-Math.PI/2,x=250+Math.cos(a)*r,y=250+Math.sin(a)*r;
      svg+=`<g data-channel="${channel}" data-index="${i}" style="--boot-delay:${560+channel*45+i*19}ms;--view-delay:${240+channel*185+i*24}ms" tabindex="0" role="button" aria-label="${key} ${i+1}: ${names[s]}"><path data-ring="${channel}" class="point beat-arc state${s}" d="${beatArcPath(r,i,state[key].length)}"/><text class="node-label" x="${x}" y="${y}">${s===3?'–':i+1}</text></g>`;
    });
  }
  $('#rings').innerHTML=svg;
  // P5: The row itself owns pointer capture. Do not replace it while the
  // user's finger is held down; re-render only/reuse its beat button children.
  for(const [channel,key,label] of [[0,'outer','OUTER PATTERN'],[1,'inner','INNER PATTERN']]){
    let row=linearRows.get(channel);
    if(!row){
      const title=document.createElement('h3');
      title.textContent=label;
      row=document.createElement('div');
      row.className='pattern-row';
      row.dataset.channel=String(channel);
      $('#linear').append(title,row);
      installLinearBeatGesture(row,{
        channel,getCount:()=>state[key].length,
        onStep:nextCount=>number(channel?'subdivisions':'beats',nextCount,1,20),
        onTap:index=>cycle(channel,index),guide:gestureGuide
      });
      linearRows.set(channel,row);
    }
    const previous=[...row.querySelectorAll('button.step')];
    const buttons=state[key].map((s,i)=>{
      const b=previous[i]||document.createElement('button');
      b.type='button';
      b.className=`step state${s}`;
      b.dataset.channel=String(channel);
      b.dataset.index=String(i);
      // Stable even on phones, where rows wrap into nested pattern-line groups.
      b.style.setProperty('--view-delay',`${820+channel*210+i*24}ms`);
      b.textContent=String(i+1);
      b.setAttribute('aria-label',`${label} ${i+1}: ${names[s]}`);
      return b;
    });
    row.replaceChildren(...buttons);
  }
  layoutLinearPatterns();
}
function layoutLinearPatterns(){
  const mobile=matchMedia('(max-width: 640px)').matches;
  for(const row of document.querySelectorAll('#linear .pattern-row')){
    const buttons=[...row.querySelectorAll('button.step')];
    if(!buttons.length)continue;
    // Desktop retains its existing flex layout without mobile-only wrappers.
    if(!mobile){if(row.firstElementChild?.classList.contains('pattern-line'))row.replaceChildren(...buttons);continue;}
    const well=document.querySelector('#metronome .instrument');
    const width=document.querySelector('#linear').clientWidth || well?.clientWidth || document.querySelector('main').clientWidth;
    const groups=linearRowSizes(buttons.length,width);
    const previous=[...row.children].map(el=>el.classList.contains('pattern-line')?el.childElementCount:1);
    if(previous.length===groups.length && previous.every((n,i)=>n===groups[i]))continue;
    const lines=[];
    let at=0;
    for(const size of groups){
      const line=document.createElement('div');line.className='pattern-line';
      line.style.setProperty('--step-columns',String(size));
      line.append(...buttons.slice(at,at+size));lines.push(line);at+=size;
    }
    row.replaceChildren(...lines);
  }
}
// iOS Safari/standalone PWA can report a viewport smaller than 100dvh,
 // particularly on older iPads with display zoom below 100%.
 let stablePaddViewport=0,stablePaddWidth=0;
function refreshMobileFrame(){
 const shell=document.querySelector('.app-shell');
 const phone=matchMedia('(max-width:640px)').matches;
 const tablet=matchMedia('(min-width:641px) and (max-width:1139px)').matches;
 if(!phone&&!tablet){
  shell.style.removeProperty('height');
  shell.classList.remove('ios-standalone-viewport','ios-standalone-full-frame');
  stablePaddViewport=0;stablePaddWidth=0;
  return;
 }
 const vv=window.visualViewport,width=document.documentElement.clientWidth;
 if(Math.abs(width-stablePaddWidth)>35)stablePaddViewport=0;
 stablePaddWidth=width;
 // Safari's visualViewport can remain spuriously short after the keyboard
 // has gone away (especially in an installed, CSS-zoomed PWA). Never collapse
 // the whole LCARS chassis to that stale fraction of the layout viewport.
 const layoutHeight=visibleViewportHeight(window.innerHeight,null,
   document.documentElement.clientHeight);
 const visualHeight=vv?vv.height+Math.max(0,vv.offsetTop||0):null;
 const staleVisualHeight=Number.isFinite(visualHeight)&&
   visualHeight<layoutHeight*.72;
 const measured=staleVisualHeight?layoutHeight:
   visibleViewportHeight(window.innerHeight,visualHeight,
     document.documentElement.clientHeight);
 const active=document.activeElement;
 const editorFocused=!!(active?.closest?.('#diaryEditor')&&active.matches('input,textarea,select'));
 const installedPhone=phone&&/iPhone|iPod/.test(navigator.userAgent)&&
   (navigator.standalone===true||matchMedia('(display-mode: standalone)').matches);
 // On iOS 26 the physical display can contain a WebKit-owned region
 // beyond the PWA's *paintable* viewport. Never extend the shell into it.
 // The delta is diagnostic only, not extra usable height.
 const viewportGap=standaloneIPhoneViewportGap(layoutHeight,
   window.screen.width,window.screen.height,width,installedPhone);
 const height=keyboardSafeViewportHeight(measured,stablePaddViewport,editorFocused);
 shell.classList.toggle('ios-standalone-viewport',viewportGap!==null);
 shell.classList.remove('ios-standalone-full-frame');
 if(height===measured)stablePaddViewport=height;
 shell.style.height=`${mobileFrameHeight(height,state.uiScale)}px`;
}
// On-device measurements make WebKit's unpaintable bottom gap distinguishable
// from a CSS sizing error. The panel is local, optional, and read-only.
function refreshViewportDiagnostics(){
 const target=$('#viewportMetrics');
 if(!target)return;
 const probe=document.createElement('div');
 probe.style.cssText='position:absolute;pointer-events:none;visibility:hidden;'+
   'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
 document.body.append(probe);
 const safe=getComputedStyle(probe);
 const top=parseFloat(safe.paddingTop)||0,bottom=parseFloat(safe.paddingBottom)||0;
 probe.remove();
 const shell=document.querySelector('.app-shell');
 const bounds=shell.getBoundingClientRect();
 const vv=window.visualViewport;
 const layoutHeight=visibleViewportHeight(window.innerHeight,null,document.documentElement.clientHeight);
 const installed=!!(navigator.standalone===true||matchMedia('(display-mode: standalone)').matches);
 const gap=standaloneIPhoneViewportGap(layoutHeight,window.screen.width,
   window.screen.height,document.documentElement.clientWidth,
   installed&&/iPhone|iPod/.test(navigator.userAgent));
 target.textContent=[
   'DISPLAY: '+(installed?'STANDALONE PWA':'BROWSER')+' / '+navigator.platform,
   'STATUS BAR META: '+(document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content||'default')+' (installed mode may be cached by iOS)',
   'SCREEN: '+window.screen.width+' x '+window.screen.height+' CSS px',
   'LAYOUT: '+window.innerWidth+' x '+window.innerHeight+' CSS px',
   'DOCUMENT: '+document.documentElement.clientWidth+' x '+document.documentElement.clientHeight,
   'VISUAL: '+(vv?vv.width.toFixed(1)+' x '+vv.height.toFixed(1)+' / TOP '+vv.offsetTop.toFixed(1):'not available'),
   'SAFE INSETS: TOP '+top+' / BOTTOM '+bottom+' CSS px',
   'UI SCALE: '+Math.round(state.uiScale*100)+'%',
   'SHELL: TOP '+bounds.top.toFixed(1)+' / BOTTOM '+bounds.bottom.toFixed(1),
   'SCREEN MINUS WEB VIEWPORT: '+(gap===null?'n/a':gap+' px (status-bar or WebKit-reserved; position differs by install mode)')
 ].join(String.fromCharCode(10));
}
$('#viewportDiagnostics')?.addEventListener('toggle',event=>{
 if(event.currentTarget.open)refreshViewportDiagnostics();
});
$('#viewportRefresh')?.addEventListener('click',refreshViewportDiagnostics);
window.addEventListener('resize',()=>{refreshMobileFrame();layoutLinearPatterns();},{passive:true});
window.visualViewport?.addEventListener('resize',()=>{refreshMobileFrame();layoutLinearPatterns();},{passive:true});
window.addEventListener('pageshow',refreshMobileFrame);
function applyScale(){
 const shell=document.querySelector('.app-shell');
 shell.style.zoom=state.uiScale;
 // CSS zoom normally shrinks the PADD itself; compensate its logical height
 // so the fixed LCARS frame still covers the full visual viewport.
 shell.style.setProperty('--mobile-zoom-inverse',String(1/state.uiScale));
 refreshMobileFrame();
 layoutLinearPatterns();
 document.querySelectorAll('[data-ui-scale]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.uiScale)===state.uiScale));
 $('#scaleReadout').textContent=Math.round(state.uiScale*100)+'%';
}
for(const scale of UI_SCALES){const b=document.createElement('button');b.type='button';b.dataset.uiScale=scale;b.textContent=Math.round(scale*100)+'%';b.onclick=()=>{state.uiScale=scale;applyScale();save();};$('#scaleButtons').append(b);}
function applyMotionPreference(){
 document.documentElement.dataset.lcarsMotion=state.forceMotion?'force':'system';
 const status=$('#motionInfo');
 if(status){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  status.textContent=state.forceMotion?'MOTION: FULL / DEVICE OVERRIDE':
   reduced?'MOTION: REDUCED BY DEVICE SETTINGS':'MOTION: FULL / ENABLED';
 }
}
function render(){applyTheme(document,state.theme);applyMotionPreference();applyScale();for(const k of ['bpm','beats','subdivisions','countIn','duration','master','uiVolume'])$('#'+k).value=state[k];for(const k of ['uiEnabled','hoverEnabled','haptic','launchScreen','forceMotion'])$('#'+k).checked=state[k];$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));if($('#activeModeLabel'))$('#activeModeLabel').textContent=shortModes[state.mode]||'STANDARD';
  const poly=['polyrhythm','polymeter'].includes(state.mode);
  $('#outerLabel').textContent=poly?'OUTER PATTERN LENGTH':'QUARTERS PER BAR';
  $('#innerLabel').textContent=poly?'INNER PATTERN LENGTH':'SUBDIVISIONS / QUARTER';
  $('#outerLabel').dataset.compact=poly?'OUT':'QTR';$('#innerLabel').dataset.compact=poly?'IN':'SUB';
  $('#meterNote').textContent=state.mode==='polyrhythm'?`Outer ${state.beats} / inner ${state.subdivisions} over ${state.training.cycleQuarters} quarters`:state.mode==='polymeter'?`Outer ${state.beats}/4 · inner ${state.subdivisions}/4`:`${state.beats}/4 · ${state.subdivisions} subdivisions per quarter`;
  tempoReadout();syncNumbers();renderTraining(state,trainingChanged);renderPatterns();renderMixer();renderPresets();diaryUI.render();soundUI.draw();syncLcarsSlider($('#master'));syncLcarsSlider($('#uiVolume'));}
function renderMixer(){
  $('#mixer').replaceChildren();state.channels.forEach((c,i)=>{
    const panel=document.createElement('div');panel.className='panel';
    panel.classList.add('matrix-channel');
    panel.innerHTML=`<span class="eyebrow">CHANNEL 0${i+1}</span><h3>${i?'INNER CHANNEL':'OUTER CHANNEL'}</h3>`;
    let panButtons=[];
    // The source demo only supplies the look/interaction, not a new audio bus.
    const matrix=buildMatrixFaders(i,c,{onChange:(kind,value,{gesture=false}={})=>{
      if(kind==='pan')setChannelPan(c,value,matrix.inputs.pan,panButtons);
      else c.volume=value;
      matrix.sync();changed();
      if(gesture)faderTouchFeedback();
    }});
    panel.append(matrix.root);
    const panGroup=document.createElement('div');
    panGroup.className='pan-scale';panGroup.setAttribute('role','group');
    panGroup.setAttribute('aria-label',`Channel ${i+1} panorama presets`);
    for(const {label,value} of PAN_PRESETS){
      const button=document.createElement('button');button.type='button';
      button.dataset.pan=String(value);button.textContent=label;panGroup.append(button);
    }
    panButtons=[...panGroup.querySelectorAll('button')];
    setChannelPan(c,c.pan,matrix.inputs.pan,panButtons);
    for(const kind of ['volume','pan']){
      const input=matrix.inputs[kind];
      input.addEventListener('input',()=>{
        if(kind==='pan')setChannelPan(c,input.value,input,panButtons);
        else c.volume=Number(input.value);
        matrix.sync();changed();
      });
    }
    panButtons.forEach(button=>button.onclick=()=>{
      setChannelPan(c,button.dataset.pan,matrix.inputs.pan,panButtons);
      matrix.sync();changed();
    });
    panel.append(panGroup);
    const muteSolo=document.createElement('div');muteSolo.className='mixer-buttons';
    for(const field of ['mute','solo']){
      const button=document.createElement('button');button.type='button';
      button.dataset.field=field;button.textContent=field.toUpperCase();
      button.className='outline'+(c[field]?' toggled':'');
      button.setAttribute('aria-pressed',String(c[field]));
      button.onclick=()=>{
        c[field]=!c[field];button.setAttribute('aria-pressed',String(c[field]));
        button.classList.toggle('toggled',c[field]);changed();
      };
      muteSolo.append(button);
    }
    panel.append(muteSolo);
    ['DOUBLE ACCENT','ACCENT','NORMAL'].forEach((title,clickState)=>{
      const row=document.createElement('div');row.className='accent-sound-row';const label=document.createElement('h4');label.textContent=title;row.append(label);
      const group=document.createElement('div');group.className='sound-choices';group.setAttribute('role','group');group.setAttribute('aria-label',`Channel ${i+1} ${title}`);
      for(const [value,name] of [...Object.entries(SOUNDS).filter(([value])=>value!=='auto'),...state.customSounds.map(s=>[s.id,s.name])]){
        const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',state.channels[i].sounds[clickState]===value);
        b.onclick=async()=>{state.channels[i].sounds[clickState]=value;for(const peer of group.children)peer.setAttribute('aria-pressed',peer===b);changed();
          if(!scheduler.running)try{await unlock();await audio.loading;await audio.loadCustom(state.customSounds);audio.click({channel:i,state:clickState,sound:value},audio.ctx.currentTime+.01);}catch{notify('Could not preview sound.','invalidsound');}
        };group.append(b);
      }
      row.append(group);panel.append(row);
    });
    $('#mixer').append(panel);
  });
}
function renderPresets(){
 const list=$('#presetList');list.replaceChildren();
 if(!state.presets.length){const p=document.createElement('p');p.className='system-field';p.textContent='PRESET MEMORY EMPTY · SAVE A RHYTHM ABOVE';list.append(p);}
 state.presets.forEach((preset,i)=>{
  const box=document.createElement('article');box.className='panel';
  const h=document.createElement('h3');h.textContent=preset.name;
  const p=document.createElement('p');p.className='preset-data';
  p.textContent=`${MODES[preset.settings.mode]} · ${preset.settings.bpm} BPM · outer ${preset.settings.beats} / inner ${preset.settings.subdivisions}`;
  const actions=document.createElement('div');actions.className='preset-actions';
  const controls=[
   ['LOAD',()=>{state=loadPreset(state,preset);activePreset=preset.name;render();changed();notify('Preset loaded.');}],
   ['RENAME',()=>{const name=prompt('Preset name',preset.name);if(name?.trim()){preset.name=name.trim().slice(0,80);renderPresets();save();}}],
   ['DUPLICATE',()=>{if(state.presets.length>=100)return notify('Maximum 100 presets.','invalidsound');state.presets.push({...structuredClone(preset),name:(preset.name+' copy').slice(0,80)});renderPresets();save();}],
   ['DELETE',()=>{if(confirm(`Delete preset “${preset.name}”?`)){state.presets.splice(i,1);sharedShareIndex=-1;renderPresets();save();}}],
   ['SHARE',()=>{sharedShareIndex=sharedShareIndex===i?-1:i;renderPresets();}]
  ];
  for(const [label,fn] of controls){
   const b=document.createElement('button');b.className='outline';b.type='button';
   b.textContent=label;b.onclick=fn;actions.append(b);
  }
  box.append(h,p,actions);
  if(sharedShareIndex===i){
   const shareBox=document.createElement('div');shareBox.className='share-deck';
   const heading=document.createElement('h3');heading.textContent='SHARE PRESET / '+preset.name;
   const qr=document.createElement('div');qr.className='share-qr';qr.setAttribute('aria-label','QR code for '+preset.name);
   const warning=document.createElement('p');warning.className='share-warning';
   const link=document.createElement('input');link.className='share-url';link.readOnly=true;link.setAttribute('aria-label','Shared preset link');
   const buttons=document.createElement('div');buttons.className='share-actions';
   const copy=document.createElement('button');copy.type='button';copy.textContent='COPY LINK';copy.className='outline';
   const nativeShare=document.createElement('button');nativeShare.type='button';nativeShare.textContent='SHARE';nativeShare.className='outline';
   buttons.append(copy,nativeShare);shareBox.append(heading,qr,warning,link,buttons);box.append(shareBox);
   try{
    const {url,hadCustom}=encodeSharedPreset(preset);
    paintQR(qr,url);warning.hidden=!hadCustom;
    warning.textContent='Custom samples are not transferred. A standard click replaces them in this shared copy.';
    shareActions({url,copyButton:copy,shareButton:nativeShare,linkInput:link,notify});
   }catch(err){qr.textContent='QR CODE UNAVAILABLE';warning.hidden=false;warning.textContent=err.message;buttons.hidden=true;}
  }
  list.append(box);
 });
}
function showSharedPreview(){
 const panel=$('#sharedPresetPreview');panel.hidden=!sharedPreset;
 if(!sharedPreset)return;
 $('#sharedPresetName').textContent=sharedPreset.name;
 const s=sharedPreset.settings;
 $('#sharedPresetDetails').textContent=`${MODES[s.mode]} · ${s.bpm} BPM · outer ${s.beats} / inner ${s.subdivisions} · swing ${Math.round(s.swing*100)}%`;
 $('#sharedPresetWarning').hidden=!sharedPreset.hadCustom;
}
function dismissSharedPreview(){sharedPreset=null;showSharedPreview();}
$('#sharedPresetDismiss').onclick=dismissSharedPreview;
$('#sharedPresetLoad').onclick=()=>{
 if(!sharedPreset)return;
 if(scheduler.running||starting||restoring||soundUI.isBusy()||acousticPilot.isBusy())
  return notify('Stop playback before loading a shared preset.','Warningsound');
 state=loadSharedPreset(state,sharedPreset);activePreset=sharedPreset.name;
 dismissSharedPreview();render();changed();notify('Shared rhythm loaded once. Your saved presets are unchanged.');
};
$('#sharedPresetSave').onclick=()=>{
 if(!sharedPreset)return;
 if(state.presets.length>=100)return notify('Maximum 100 presets.','invalidsound');
 const name=uniqueSharedPresetName(sharedPreset.name,state.presets);
 state.presets.push({name,settings:structuredClone(sharedPreset.settings)});
 dismissSharedPreview();renderPresets();save();notify('Shared rhythm saved to preset memory.');
};
function initAppSharing(){
 const url=appShareUrl();
 try{paintQR($('#appShareQr'),url);}
 catch(err){$('#appShareQr').textContent='QR CODE UNAVAILABLE';}
 shareActions({url,copyButton:$('#copyAppShare'),shareButton:$('#nativeAppShare'),
  linkInput:$('#appShareLink'),notify});
}

async function releaseWake(){try{await wakeLock?.release();}catch{}wakeLock=null;}
function stop(message='READY',endTime=audio.ctx?.currentTime){
 if(scheduler.settings?.duration)endTime=Math.min(endTime,scheduler.trainingStart+scheduler.settings.duration);
 const entry=scheduler.recorder.end(endTime,crypto.randomUUID());
 if(entry){entry.reason=message==='READY'?'Stopped':message;if(state.diary.entries.length<10000){state.diary.entries.push(entry);save();diaryUI.render();}else notify('Diary full. Export and remove old entries.','Warningsound');}
 micUI.transportStop(endTime);scheduler.stop();releaseWake();$('#start').textContent='START';motion.status($('#start'));$('#playStatus').textContent=message;heardTempo=null;tempoReadout();$('#dial').classList.remove('gap-phase');$$('.playing').forEach(n=>n.classList.remove('playing'));}
$('#start').onclick=async()=>{if(starting||restoring)return;
 if(acousticPilot.isBusy())return notify('Acoustic test in progress. Abort test first.','Warningsound');if(soundUI.isBusy())return notify('Wait for sound import to finish.','Warningsound');if(scheduler.running){stop();return;}if(!micUI.canTransportStart())return notify('Disengage FREE SENSOR before starting the metronome.','Warningsound');starting=true;$('#start').disabled=true;try{await unlock();await audio.loading;await audio.loadCustom(state.customSounds);audio.mix(state);micUI.transportStart();scheduler.start(state,state.diary.enabled?{exercise:state.diary.exercise,category:state.diary.category,preset:activePreset,minAutoLogSeconds:state.diary.minAutoLogSeconds}:null);$('#start').textContent='STOP';motion.status($('#start'));$('#playStatus').textContent='PLAYING';if(navigator.wakeLock)try{wakeLock=await navigator.wakeLock.request('screen');}catch{}}catch{micUI.transportStop(audio.ctx?.currentTime);notify('Audio could not start. Tap Start again.','invalidsound');}finally{starting=false;$('#start').disabled=false;}};
for(const [k,min,max] of [['beats',1,20],['subdivisions',1,20],['countIn',0,8],['duration',0,3600]])$('#'+k).onchange=e=>number(k,Number(e.target.value),min,max);
for(const id of ['beats','subdivisions','countIn','duration'])enhanceNumber($('#'+id),gestureGuide);
for(const id of ['minus','linearTempoMinus'])$('#'+id).onclick=()=>number('bpm',state.bpm-1,20,400);
for(const id of ['plus','linearTempoPlus'])$('#'+id).onclick=()=>number('bpm',state.bpm+1,20,400);
let taps=[];installTapTempo($('#tap'),()=>{const t=performance.now();if(t-(taps.at(-1)||0)>3000)taps=[];taps.push(t);taps=taps.slice(-7);if(taps.length>=2)number('bpm',60000/((t-taps[0])/(taps.length-1)),20,400);$('#playStatus').textContent=taps.length<2?'TAP AGAIN':`TAPPED ${state.bpm} BPM`;});
$('#metronome').addEventListener('lcars:tactical-view',event=>{
 const next=event.detail?.view;
 linear=next==='linear';
 if(linear)layoutLinearPatterns();
 // The original Circular/Linear entrance contract remains unchanged.
 motion.view(next==='linear'?$('#linear'):next==='tactical'?$('#tactical'):$('#dial'));
});
$('#view').onclick=()=>tactical.setView(tactical.view()==='linear'?'circular':'linear');

for(const k of ['master','uiVolume']){
 const input=$('#'+k);
 input.oninput=e=>{state[k]=Number(e.target.value);changed();};
 mountLcarsSlider(input,{kind:'volume',title:k==='master'?'MASTER / OUTPUT':'UI / VOLUME',
   code:k==='master'?'GAIN-M':'GAIN-UI',onValueChange:faderTouchFeedback});
}
$('#openLaunchConsole').onclick=()=>showLaunchConsole();
for(const k of ['uiEnabled','hoverEnabled','haptic','launchScreen','forceMotion'])$('#'+k).onchange=e=>{state[k]=e.target.checked;if(k==='forceMotion')applyMotionPreference();changed();};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==b.dataset.tab);document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n===b));if(b.dataset.tab==='diary'||b.dataset.tab==='analytics')diaryUI.render();if(b.dataset.tab==='analytics')micUI.renderArchive().catch(()=>notify('Could not read microphone archive.','Warningsound'));$('main').scrollTop=0;motion.page(b.dataset.tab);});
$('#presetForm').onsubmit=e=>{e.preventDefault();const name=$('#presetName').value.trim();if(!name)return;if(state.presets.length>=100)return notify('Maximum 100 presets.','invalidsound');const existing=state.presets.find(p=>p.name===name);if(existing&&!confirm('Replace this preset with the current settings?'))return;const settings=presetSettings(state);if(existing)existing.settings=settings;else state.presets.push({name,settings});save();renderPresets();$('#presetName').value='';notify('Preset saved.');};

async function collectBackup(){
 const analysisSessions=await listAnalysisSessions();
 const analysisCandidates=await listAnalysisCandidates();
 const micCalibrationMs=validateInputDelayMs(await readMicCalibration());
 const micReferenceDivision=validateReferenceDivision(await readMicReferenceDivision());
 return {...structuredClone(state),analysisSessions,analysisCandidates,micCalibrationMs,micReferenceDivision};
}
async function restoreBackup(raw){
 const next=validate(raw);
 const analysisSessions=raw.analysisSessions===undefined?null:validateAnalysisSessions(raw.analysisSessions);
 const analysisCandidates=raw.analysisCandidates===undefined?[]:validateCandidates(raw.analysisCandidates);
 const micCalibrationMs=raw.micCalibrationMs===undefined?null:validateInputDelayMs(raw.micCalibrationMs);
 const micReferenceDivision=raw.micReferenceDivision===undefined?null:validateReferenceDivision(raw.micReferenceDivision);
 if(analysisSessions?.length>250)throw Error('Microphone archive exceeds 250 sessions.');
 if(soundUI.isBusy()||restoring||starting||acousticPilot.isBusy()||scheduler.running||micUI.isCapturing())
  throw Error('Stop playback and sensor operations before importing.');
 if(!confirm('Replace settings, presets, practice entries and custom sounds with this backup?'))return false;
 stop();micUI.disarm();restoring=true;
 try{
  await unlock();await audio.loading;
  const prepared=await audio.prepareCustom(next.customSounds);
  if(analysisSessions!==null)await replaceAnalysisSessions(analysisSessions,analysisCandidates);
  if(micCalibrationMs!==null){
   await writeMicCalibration(micCalibrationMs);
   await micUI.restoreCalibration(micCalibrationMs);
  }
  if(micReferenceDivision!==null){
   await writeMicReferenceDivision(micReferenceDivision);
   await micUI.restoreReferenceDivision(micReferenceDivision);
  }
  clearTimeout(saveTimer);await saveChain;await write(next);
  for(const key of audio.buffers.keys())if(key.startsWith('user-'))audio.buffers.delete(key);
  for(const [key,buffer] of prepared)audio.buffers.set(key,buffer);
  state=next;activePreset='';diaryUI.closeEditor();render();changed();
  return true;
 }finally{restoring=false;}
}
async function importQRLog(remote,mode){
 if(scheduler.running||starting||restoring||soundUI.isBusy()||acousticPilot.isBusy()||micUI.isCapturing())
  throw Error('Stop playback and sensor operations before importing.');
 const next=structuredClone(state);
 let question,plan=null;
 if(mode==='replace'){
  next.diary=replaceDiaryRecords(state.diary,remote);
  question='Replace ONLY the practice records on this device with '+remote.entries.length+' incoming sessions? Presets and logging preferences are kept.';
 }else{
  plan=planLogMerge(state.diary,remote);
  next.diary=plan.merged;
  question='Merge '+plan.added+' new practice sessions? '+plan.duplicates+' duplicates are skipped and '+plan.conflicts+' modified-ID conflicts keep the local version.';
 }
 validate(next);
 // QR quick-sync only appends new records; no extra confirmation needed.
 if(mode!=='auto'&&!confirm(question))return false;
 clearTimeout(saveTimer);await saveChain;await write(next);
 state=next;diaryUI.closeEditor();render();$('#saveStatus').textContent='SAVED ON THIS DEVICE';
 return plan?{added:plan.added,duplicates:plan.duplicates,conflicts:plan.conflicts}:true;
}
$('#export').onclick=async()=>{
 try{
  const backup=await collectBackup();
  download('rhythm-warp-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(backup,null,2));
  notify('Backup exported including microphone analysis.');
 }catch(err){notify('Backup export failed: '+err.message,'Warningsound');}
};
$('#import').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 e.target.disabled=true;
 try{
  if(f.size>25e6)throw Error('Backup is too large.');
  const restored=await restoreBackup(JSON.parse(await f.text()));
  if(restored)notify('Backup restored.');
 }catch(err){notify('Import rejected: '+err.message,'invalidsound');}
 finally{e.target.disabled=false;e.target.value='';}
};
// Pointer capture stays on a persistent ancestor while ring SVG nodes rerender.
function gesture(el,isTempo=false){let g=null,suppressClick=false;
  el.addEventListener('pointerdown',e=>{if(e.button!==0||g)return;if(isTempo&&e.target.closest('button,input'))return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let ring;
    if(!isTempo){const p=e.target.closest('[data-channel]');ring=p?Number(p.dataset.channel):Number(e.target.dataset.ring);if(!Number.isFinite(ring))return;}
    g={id:e.pointerId,x:e.clientX,y:e.clientY,cx,cy,a:Math.atan2(e.clientY-cy,e.clientX-cx),sum:0,moved:false,ring,point:e.target.closest('[data-index]')?.dataset.index};el.setPointerCapture(e.pointerId);e.preventDefault();});
  el.addEventListener('pointermove',e=>{if(!g||g.id!==e.pointerId)return;const a=Math.atan2(e.clientY-g.cy,e.clientX-g.cx);g.sum+=angleDelta(g.a,a);g.a=a;if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>7)g.moved=true;if(!g.moved)return;const threshold=isTempo?.055:.23;const steps=Math.trunc(g.sum/threshold);if(steps){g.sum-=steps*threshold;const k=isTempo?'bpm':g.ring?'subdivisions':'beats';number(k,state[k]+steps,isTempo?20:1,isTempo?400:20);}});
  const end=(e,cancel=false)=>{if(!g||g.id!==e.pointerId)return;const prev=g;g=null;if(!cancel&&!prev.moved&&!isTempo&&prev.point!==undefined)cycle(prev.ring,Number(prev.point));suppressClick=true;if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);};
  el.addEventListener('pointerup',e=>end(e));el.addEventListener('pointercancel',e=>end(e,true));el.addEventListener('lostpointercapture',()=>{g=null;});
  el.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}if(isTempo)return;const p=e.target.closest('[data-index]');if(p)cycle(Number(p.dataset.channel),Number(p.dataset.index));});
}
gesture($('#rings'));
installTempoControl($('#tempo'),$('#tempoValue'),$('#bpm'),()=>state.bpm,
 v=>number('bpm',v,20,400),gestureGuide);
installTempoControl($('#linearTempo'),$('#linearTempoValue'),$('#linearBpm'),()=>state.bpm,
 v=>number('bpm',v,20,400),gestureGuide);
$('#rings').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const p=e.target.closest('[data-index]');if(p){e.preventDefault();const channel=p.dataset.channel,index=p.dataset.index;cycle(Number(channel),Number(index));$(`#rings [data-channel="${channel}"][data-index="${index}"]`)?.focus();}}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.target.closest('input,button,select,textarea,[role=button],dialog')){e.preventDefault();$('#start').click();}});
installFeedback(document,{unlock,audio,state:()=>state});
installSegmentCorners(document.querySelector('.app-shell'));
async function storageStatus(){const yes=await navigator.storage?.persisted?.();$('#storageStatus').textContent=yes?'Persistent storage granted. Keep exporting backups.':'Best-effort storage. Export regular backups.';}
$('#persist').onclick=async()=>{try{const ok=await navigator.storage?.persist?.();await storageStatus();notify(ok?'Persistent storage granted.':'Browser did not grant persistent storage.','Warningsound');}catch{notify('Storage request unavailable.','Warningsound');}};
const connection=()=>$('#connection').textContent=navigator.onLine?'LOCAL SYSTEM':'OFFLINE SYSTEM';addEventListener('online',connection);addEventListener('offline',connection);connection();
addEventListener('pagehide',()=>{acousticPilot.stop();micUI.shutdown();if(scheduler.running){stop('Page closed');clearTimeout(saveTimer);const snapshot=structuredClone(state);saveChain=saveChain.catch(()=>{}).then(()=>write(snapshot));}});
installUpdateManager({
 serviceWorker:navigator.serviceWorker,
 button:$('#update'),status:$('#offlineStatus'),notify,
 isBusy:()=>scheduler.running||starting||restoring||soundUI.isBusy()||acousticPilot.isBusy(),
 reload:()=>location.reload(),online:()=>navigator.onLine
});
function frame(){if(scheduler.running){for(const event of scheduler.position()){$$(`[data-channel="${event.channel}"] .playing, .step.playing[data-channel="${event.channel}"]`).forEach(n=>n.classList.remove('playing'));$$(`[data-channel="${event.channel}"][data-index="${event.index}"]`).forEach(n=>(n.querySelector('.point')||n).classList.add('playing'));$('#playStatus').textContent=event.count?`COUNT-IN · ${-event.bar}`:`${event.mode==='polyrhythm'?'CYCLE':'BAR'} ${event.bar+1} · ${event.phase}`;tempoReadout(event);$('#dial').classList.toggle('gap-phase',event.phase==='GAP');}const elapsed=Math.max(0,audio.ctx.currentTime-scheduler.trainingStart);const seconds=Math.floor(scheduler.settings.duration?Math.max(0,scheduler.settings.duration-elapsed):elapsed);$('#clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('#tacticalClock').textContent=$('#clock').textContent;}tactical.frame();requestAnimationFrame(frame);}
try{const saved=await read();if(saved)state=validate(saved);$('#saveStatus').textContent='LOCAL STORAGE READY';}catch{notify('Saved data could not be read. Export before making changes.','Warningsound');$('#saveStatus').textContent='STORAGE ERROR';}render();
initAppSharing();
installArchiveSharing({
 getLog:scope=>selectDiaryForTransfer(state.diary,scope),
 onLog:importQRLog,notify,
 isBusy:()=>scheduler.running||starting||restoring||soundUI.isBusy()||acousticPilot.isBusy()||micUI.isCapturing()
});
// Read links only after local storage restoration. Preview is inline; nothing
// modifies the device until LOAD ONCE or SAVE PRESET is deliberately pressed.
if(location.hash.startsWith('#p=')){
 try{
  sharedPreset=decodeSharedPresetFragment(location.hash);
  showSharedPreview();
  document.querySelector('[data-tab="presets"]').click();
 }catch(err){
  notify('Shared preset rejected: '+err.message,'Warningsound');
 }
 // Never keep re-importing on each reload or update.
 history.replaceState(null,'',location.pathname+location.search);
}
const startup=$('#lcarsStartup'),initialize=$('#lcarsInitialize');
const shell=$('.app-shell'),paletteButtons=[...startup.querySelectorAll('[data-set-theme]')];
const bpmPreview=$('#bpmPreviewToggle'),bpmLabel=$('#bpmPreviewLabel');
// Decorative tempo preview. Never modifies the sequencer tempo or transport.
let previewIndex=0,previewTempos=[];
function previewPulse(){
 const bpm=previewTempos[previewIndex]??state.bpm;
 startup.style.setProperty('--bpm-duration',(60/bpm).toFixed(3)+'s');
 bpmLabel.textContent=bpm+' BPM';
}
for(const button of paletteButtons){
 button.addEventListener('click',()=>{
  state.theme=normalizeTheme(button.dataset.setTheme);
  applyTheme(document,state.theme);
  save();
 });
}
bpmPreview.addEventListener('click',()=>{
 previewIndex=(previewIndex+1)%previewTempos.length;
 previewPulse();
});
function bootDirect(){
 const isLaunching=motion.boot();
 if(isLaunching)armLaunchCue({
  root:document,audio,unlock,getState:()=>state,
  isBooting:()=>document.querySelector('.app-shell')?.classList.contains('lcars-booting'),
  bootDurationMs:LCARS_BOOT_DURATION_MS
 });
}
// A previously initialized shell can revisit its launch console without
// resetting BPM, patterns, saved sessions or the app's underlying audio engine.
let firstEntry=state.launchScreen;
function showLaunchConsole(){
 if(!startup.hidden)return;
 if(scheduler.running||starting||restoring||soundUI.isBusy()){
  notify('Stop playback or finish the current operation before opening Rhythm Warp.','Warningsound');
  return;
 }
 applyTheme(document,state.theme);
 previewTempos=[state.bpm,120,90,160].filter((v,i,a)=>a.indexOf(v)===i);
 previewIndex=0;
 previewPulse();
 initialize.disabled=false;
 shell.inert=true;
 startup.hidden=false;
 initialize.focus({preventScroll:true});
}
initialize.onclick=()=>{
 if(initialize.disabled||startup.hidden)return;
 initialize.disabled=true;
 const originalBoot=firstEntry;
 firstEntry=false;
 // iOS/Firefox require unlocking audio inside the actual Initialize click.
 let opening=Promise.resolve();
 if(originalBoot&&state.uiEnabled){
  try{opening=Promise.resolve(unlock());}catch{opening=Promise.resolve();}
 }
 startup.hidden=true;
 shell.inert=false;
 const launched=motion.boot();
 // Re-entering from Settings is a palette operation, not a second
 // music transport startup or a duplicate full launch cue.
 if(!originalBoot||!state.uiEnabled)return;
 let played=false;
 const playCue=()=>{
  if(played||!state.uiEnabled||audio.ctx?.state!=='running'||
     !audio.buffers.has('lcars-launch'))return;
  if(launched&&!shell.classList.contains('lcars-booting'))return;
  played=true;
  audio.mix(state);
  audio.ui('lcars-launch',state);
 };
 playCue();
 Promise.resolve(opening).then(()=>audio.launchReady).then(playCue).catch(()=>{});
};
if(state.launchScreen){showLaunchConsole();}
else bootDirect();
startup.dataset.ready='true';
storageStatus().catch(()=>{});frame();
