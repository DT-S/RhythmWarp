import {classifyControlCue} from './ui-cues.js';
export const UI_SCALES=[.7,.8,.9,1,1.1];
export const defaultInterfaceScale = isCompactViewport => isCompactViewport ? .9 : 1;

// A segmented LCARS control is a single visual unit: only its exposed corners
// curve. Use actual layout rows, not nth-child assumptions (custom sounds,
// category counts, flex wrapping and mobile zoom all change the row lengths).
const SEGMENT_GROUP_SELECTOR=[
 '.sound-choices','.mixer-buttons','.pan-scale','.scale-buttons','.parameter-buttons',
 '.sound-previews','.preset-actions','.diary-categories',
 '.analytics-filters','.chart-modes'
].join(',');

export function segmentCornerRadii(rects){
 const visible=rects.map((rect,index)=>({rect,index})).filter(({rect})=>rect.width>0&&rect.height>0);
 const radii=rects.map(()=>null);
 if(!visible.length)return radii;
 const tops=visible.map(({rect})=>rect.top);
 const topY=Math.min(...tops),bottomY=Math.max(...tops);
 const topRow=visible.filter(({rect})=>Math.abs(rect.top-topY)<2);
 const bottomRow=visible.filter(({rect})=>Math.abs(rect.top-bottomY)<2);
 const leftmost=row=>row.reduce((a,b)=>b.rect.left<a.rect.left?b:a).index;
 const rightmost=row=>row.reduce((a,b)=>b.rect.right>a.rect.right?b:a).index;
 const tl=leftmost(topRow),tr=rightmost(topRow),bl=leftmost(bottomRow),br=rightmost(bottomRow);
 for(const {rect,index} of visible){
  const r=Math.min(24,Math.floor(rect.height/2))+'px';
  radii[index]=[index===tl?r:'0',index===tr?r:'0',index===br?r:'0',index===bl?r:'0'].join(' ');
 }
 return radii;
}

export function installSegmentCorners(root){
 let scheduled=false;
 const refresh=()=>{
  scheduled=false;
  for(const group of root.querySelectorAll(SEGMENT_GROUP_SELECTOR)){
   const buttons=[...group.children].filter(el=>el.tagName==='BUTTON');
   const radii=segmentCornerRadii(buttons.map(el=>el.getBoundingClientRect()));
   for(let i=0;i<buttons.length;i++){
    if(radii[i]===null)continue; // hidden page, recalculate when it opens
    buttons[i].style.setProperty('--lcars-segment-radius',radii[i]);
    buttons[i].setAttribute('data-lcars-corners','');
   }
   group.classList.add('lcars-segmented');
  }
 };
 const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}};
 const observer=new MutationObserver(schedule);
 // Only watch containers that actually rebuild segmented buttons. Observing
 // the entire app would pick up the 60fps play-status/clock text updates and
 // repeatedly force layout measurements while the audio scheduler is running.
 const dynamicRoots=[
  '#mixer','#trainingFields','#trainingActions','#diaryControls','#diaryList',
  '#diaryEditor','#analyticsContent','#presetList','#scaleButtons','#customSoundList'
 ];
 for(const selector of dynamicRoots){
  const node=root.querySelector(selector);
  if(node)observer.observe(node,{childList:true,subtree:true});
 }
 // A tab opening reveals previously hidden controls; changing zoom also
 // changes the visual grid geometry without a window resize.
 for(const page of root.querySelectorAll('.page')){
  observer.observe(page,{attributes:true,attributeFilter:['hidden']});
 }
 observer.observe(root,{attributes:true,attributeFilter:['style']});
 window.addEventListener('resize',schedule);
 schedule();
 return ()=>{observer.disconnect();window.removeEventListener('resize',schedule);};
}

export function activationSound(control){
 return classifyControlCue(control);
}
export function playControlCue(control,audio,settings,sound=activationSound(control)){
 if((control.dataset?.tab || control.dataset?.tacView || control.id==='view') && sound==='lcars-menu-build'){
  // A short tactile keypress first, then the original window-build cue.
  audio.ui('buttonpress',settings);
  audio.ui(sound,settings,.055);
 }else audio.ui(sound,settings);
}
// Treat Tap Tempo like a percussion pad: touch contact is the beat.
// A following pointer-generated click is ignored, while keyboard activation stays.
export function installTapTempo(button,onTap){
 let pointerActivated=false;
 button.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.isPrimary===false)return;
  pointerActivated=true;
  onTap();
 });
 button.addEventListener('pointercancel',()=>{pointerActivated=false;});
 button.addEventListener('click',()=>{
  if(pointerActivated){pointerActivated=false;return;}
  onTap();
 });
}
export function installFeedback(root,{unlock,audio,state}){
 const selector='button,summary,label.file-button,.sound-drop,input[type=checkbox],label:has(input[type=checkbox]),[role=button]';
 const controlFor=target=>{const c=target.closest?.(selector);if(c?.id==='lcarsInitialize')return null;return c&&!c.disabled&&c.getAttribute('aria-disabled')!=='true'?c:null;};
 let press=null,hoverAt=0,labelClick=null;
 const clear=()=>{press?.control?.classList.remove('touch-pressed');press=null;};
 root.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const c=controlFor(e.target);clear();
  const token={id:e.pointerId,control:c,x:e.clientX,y:e.clientY};press=token;
  if(c&&e.pointerType!=='mouse')c.classList.add('touch-pressed');
  // Tap must beep once on contact: never play its normal hover sound.
  if(c?.id==='tap'){
   unlock().then(()=>audio.loading).then(()=>audio.ui('buttonpress',state())).catch(()=>{});
   if(state().haptic)globalThis.navigator?.vibrate?.(8);
   return;
  }
  // Resume in the original gesture; don't play a late hover after release/scroll.
  unlock().then(()=>audio.loading).then(()=>{if(press===token&&c&&e.pointerType!=='mouse'&&state().hoverEnabled)audio.ui('hoversound',state());}).catch(()=>{});
 },{capture:true});
 root.addEventListener('pointerup',clear,{capture:true});root.addEventListener('pointercancel',clear,{capture:true});
 root.addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12)clear();},{passive:true});
 root.addEventListener('pointerover',e=>{const c=controlFor(e.target);if(e.pointerType==='mouse'&&c?.id!=='tap'&&c&&!c.contains(e.relatedTarget)&&state().hoverEnabled&&performance.now()-hoverAt>100){hoverAt=performance.now();audio.ui('hoversound',state());}});
 // Arrow keys on native numeric inputs are real +/- operations, unlike
 // clicking a slider surface. Do not disturb its drag/beat audio timing.
 let lastArrow=0;
 root.addEventListener('keydown',e=>{
  if(e.repeat&&performance.now()-lastArrow<85)return;
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
  if(!e.target?.matches?.('input[type=number],button[role=spinbutton]'))return;
  lastArrow=performance.now();
  unlock().then(()=>audio.loading).then(()=>
    audio.ui(e.key==='ArrowUp'?'keypress-increase':'keypress-decrease',state())
  ).catch(()=>{});
 });
 root.addEventListener('click',e=>{
  const c=controlFor(e.target);if(!c)return;
  if(c.id==='tap'&&e.detail>0)return; // Already sounded on pointerdown.
  // Tactical buttons already sound on the originating user gesture. Their
  // forwarded clicks must not generate a second UI cue.
  if(!e.isTrusted&&['start','tap','micArm'].includes(c.id)&&root.querySelector?.('#metronome')?.classList?.contains('tactical-active'))return;
  // Labels generate another click on their input; sound only once.
  if(c.tagName==='LABEL'){if(e.target.tagName==='INPUT'&&labelClick?.control===c&&performance.now()-labelClick.time<80){labelClick=null;return;}if(e.target.tagName!=='INPUT')labelClick={control:c,time:performance.now()};}
  if(c.tagName==='LABEL'&&c.querySelector('input[type=checkbox]'))return;
  if(c.closest('.sound-choices'))return; // These buttons already preview the instrument.
  const sound=activationSound(c); // Snapshot before navigation mutates the active tab.
  unlock().then(()=>audio.loading).then(()=>playControlCue(c,audio,state(),sound)).catch(()=>{});
  if(state().haptic)globalThis.navigator?.vibrate?.(8);
 },{capture:true});
 return {clear};
}
