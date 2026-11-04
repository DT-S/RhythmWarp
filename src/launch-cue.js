// Fire the original launch cue during the opening chassis animation.
// Some browsers deny AudioContext.resume() without a user gesture. A later
// gesture must get its own synchronous resume attempt, even when the first
// promise is still pending.
export function armLaunchCue({root,audio,unlock,getState,isBooting,bootDurationMs}){
 let played=false,closed=false,timer;
 function stop(){
  if(closed)return;
  closed=true;
  clearTimeout(timer);
  root.removeEventListener('pointerdown',attempt,true);
  root.removeEventListener('keydown',attempt,true);
 }
 function attempt(){
  if(closed||played||!isBooting()||!getState().uiEnabled)return;
  let opening;
  try{opening=unlock();}catch{return;}
  Promise.resolve(opening).then(()=>audio.launchReady).then(()=>{
   if(closed||played||!isBooting()||!getState().uiEnabled||
      audio.ctx?.state!=='running'||!audio.buffers.has('lcars-launch'))return;
   played=true;
   audio.ui('lcars-launch',getState());
   stop();
  }).catch(()=>{}); // Retry if policy blocks the unprompted startup attempt.
 }
 root.addEventListener('pointerdown',attempt,true);
 root.addEventListener('keydown',attempt,true);
 timer=setTimeout(stop,bootDurationMs);
 attempt();
 return stop;
}
