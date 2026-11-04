// Rhythm PADD V2 / P6 – state-triggered visual motion only.
// Never called by the audio frame, scheduler or chart value calculations.
export const LCARS_BOOT_DURATION_MS=1450;
export const LCARS_PAGE_BUILD_DURATION_MS=1200;
// More instruments and LED capsules need slightly longer than other tabs.
export const LCARS_AUDIO_BUILD_DURATION_MS=1550;
export const LCARS_VIEW_BUILD_DURATION_MS=1200;
export const LCARS_LINEAR_BUILD_DURATION_MS=1950;
export function shouldLaunchBoot({reducedMotion=false,metronomeVisible=true}={}){
 return !reducedMotion&&metronomeVisible;
}
export function shouldTransition(previous,next){
 return typeof next==='string'&&next.length>0&&previous!==next;
}
export function createMotionController(root=document){
 const prefersReducedMotion=()=>root.documentElement?.dataset?.lcarsMotion!=='force'&&
   typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const pages=[...root.querySelectorAll('.page')];
 const clear=(node,cssClass)=>node?.classList.remove(cssClass);
 const run=(node,cssClass)=>{
  if(!node)return;
  // Restart on a genuine state change, not on frames or incidental render().
  node.classList.remove(cssClass);
  void node.offsetWidth; // only one layout flush per explicit user transition
  node.classList.add(cssClass);
 };
 // Page build is a staggered multi-element sequence, not a single 210ms
 // animationend. A timer owns cleanup after the FINAL detail comes online.
 const pageTimers=new Map();
 const shell=root.querySelector('.app-shell');
 const finishPage=node=>{
  const timer=pageTimers.get(node);
  if(timer!==undefined){clearTimeout(timer);pageTimers.delete(node);}
  clear(node,'lcars-page-enter');
  // Header, sidebar, top/bottom bars and footer are immutable LCARS chassis.
  // Only the selected .page ever receives a tab-transition class.
 };
 let bootStarted=false,bootTimer=null;
 function finishBoot(){
  if(bootTimer!==null){clearTimeout(bootTimer);bootTimer=null;}
  shell?.classList.remove('lcars-booting');
 }
 // Called after the initial stored state has been validated and rendered.
 // An ordinary page switch or rerender never replays the boot choreography.
 function boot(){
  if(bootStarted)return false;
  bootStarted=true;
  const metronome=root.getElementById('metronome');
  const reduce=prefersReducedMotion();
  if(!shell||!shouldLaunchBoot({reducedMotion:reduce,metronomeVisible:!!metronome&&!metronome.hidden}))return false;
  shell.classList.add('lcars-booting');
  bootTimer=setTimeout(finishBoot,LCARS_BOOT_DURATION_MS);
  return true;
 }
  let lastPage=pages.find(p=>!p.hidden)?.id||'metronome';
 function page(nextId){
  if(!shouldTransition(lastPage,nextId))return false;
  const next=root.getElementById(nextId);
  if(!next||next.hidden)return false;
  lastPage=nextId;
  finishBoot(); // User-initiated navigation cancels any remaining launch choreography.
  finishView(); // No stale view animation when a different page opens.
  for(const item of pages)finishPage(item);
  // Respect OS motion preference for every switch, not only initial boot.
  const reduce=prefersReducedMotion();
  if(!reduce){
   run(next,'lcars-page-enter');
   // A real navigation into an already-selected Linear View must run the
   // SAME element choreography as the Circular -> Linear view button.
   // Outer LCARS chassis remains fixed and all audio/tempo state stays live.
   const linear=nextId==='metronome'?root.getElementById('linear'):null;
   const buildLinear=!!linear&&!linear.hidden;
   if(buildLinear)view(linear);
   // Re-entering Metronome in Tactical mode rebuilds only its live cockpit.
   const tactical=nextId==='metronome'?root.getElementById('tactical'):null;
   const buildTactical=!!tactical&&!tactical.hidden;
   if(buildTactical)view(tactical);
   pageTimers.set(next,setTimeout(()=>finishPage(next),
    nextId==='audio'?LCARS_AUDIO_BUILD_DURATION_MS:
    buildLinear?LCARS_LINEAR_BUILD_DURATION_MS:LCARS_PAGE_BUILD_DURATION_MS));
  }
  return true;
 }
 let activeView=null,viewTimer=null;
 function finishView(){
  if(viewTimer!==null){clearTimeout(viewTimer);viewTimer=null;}
  clear(activeView,'lcars-view-enter');
  activeView=null;
 }
 function view(next){
  // View switches are independent of tab navigation: the persistent panel,
  // mode selection, tempo and transport must never animate again.
  finishView();
  if(!next||next.hidden)return false;
  const reduce=prefersReducedMotion();
  if(reduce)return false;
  activeView=next;
  run(next,'lcars-view-enter');
  // Child beats have different delays, so animationend on the container
  // would clean up too early. Use one bounded timer for the last beat.
  viewTimer=setTimeout(finishView,
   next.id==='linear'?LCARS_LINEAR_BUILD_DURATION_MS:LCARS_VIEW_BUILD_DURATION_MS);
  return true;
 }
 function mode(button){
  if(!button)return;
  button.classList.remove('lcars-mode-ack');
  void button.offsetWidth;
  button.classList.add('lcars-mode-ack');
  const end=e=>{
   if(e.target!==button)return;
   button.classList.remove('lcars-mode-ack');
   button.removeEventListener('animationend',end);
   button.removeEventListener('animationcancel',end);
  };
  button.addEventListener('animationend',end);
  button.addEventListener('animationcancel',end);
 }
 function status(button){
  if(!button)return;
  run(button,'lcars-status-confirm');
  const end=e=>{
   if(e.target!==button)return;
   button.classList.remove('lcars-status-confirm');
   button.removeEventListener('animationend',end);
   button.removeEventListener('animationcancel',end);
  };
  button.addEventListener('animationend',end);
  button.addEventListener('animationcancel',end);
 }
 return {page,view,mode,status,boot,finishBoot};
}
