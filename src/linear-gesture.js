// P5: Linear View beat-count gestures. The persistent row, never a
// regenerated beat button, owns pointer capture through every render().
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

/**
 * Incremental vertical steps. Crossing 8px arms the drag; each additional
 * 13px contributes one beat. Sideways movement cancels an accidental tap
 * instead of silently changing its accent.
 */
export function linearDragSteps(gesture,x,y,threshold=8,pixelsPerStep=13){
 const dx=x-gesture.startX,dy=y-gesture.startY;
 if(gesture.mode==='pending'){
  if(Math.hypot(dx,dy)<threshold)return {mode:'pending',steps:0};
  gesture.mode=Math.abs(dy)>Math.abs(dx)*1.15?'drag':'ignore';
  gesture.lastY=y;
  return {mode:gesture.mode,steps:0};
 }
 if(gesture.mode!=='drag')return {mode:gesture.mode,steps:0};
 gesture.accumulator+=(gesture.lastY-y)/pixelsPerStep;
 gesture.lastY=y;
 const steps=Math.trunc(gesture.accumulator);
 gesture.accumulator-=steps;
 return {mode:'drag',steps};
}

/**
 * Pointer targets are ephemeral, but the row is stable. Only clicks with
 * event.detail === 0 (keyboard/AT/programmatic) use the click delegate:
 * touch/mouse taps are handled on pointerup, exactly once.
 */
export function installLinearBeatGesture(row,{channel,getCount,onStep,onTap,guide=null}){
 let active=null;
 const marker=channel===0?'OUTER BEATS':'SUBDIVISIONS';
 const clear=()=>{
  const gesture=active;active=null;
  guide?.hide();
  row.classList.remove('linear-dragging');
  if(gesture&&row.hasPointerCapture(gesture.id))row.releasePointerCapture(gesture.id);
 };
 const cancel=()=>{
  if(!active)return;
  const original=active.startingCount;
  const wasDrag=active.mode==='drag';
  clear();
  // A system-level interruption reverts a partial gesture; it never
  // produces an accent tap, even when the browser steals capture.
  if(wasDrag&&getCount()!==original)onStep(original);
 };
 row.addEventListener('pointerdown',event=>{
  const button=event.target.closest?.('button.step');
  if(!button||!row.contains(button)||active||event.button!==0||event.isPrimary===false)return;
  event.preventDefault();
  active={id:event.pointerId,index:Number(button.dataset.index),button,
   startX:event.clientX,startY:event.clientY,lastY:event.clientY,
   mode:'pending',accumulator:0,startingCount:getCount()};
  row.setPointerCapture(event.pointerId);
 });
 row.addEventListener('pointermove',event=>{
  if(!active||event.pointerId!==active.id)return;
  const prev=active.mode;
  const {mode,steps}=linearDragSteps(active,event.clientX,event.clientY);
  if(mode==='drag'&&prev==='pending'){
   row.classList.add('linear-dragging');
   guide?.show(active.button,getCount(),1,20,marker);
  }
  if(mode!=='drag')return;
  event.preventDefault();
  if(steps){
   const before=getCount(),after=clamp(before+steps,1,20);
   if(after!==before)onStep(after);
  }
  guide?.update(getCount());
 });
 row.addEventListener('pointerup',event=>{
  if(!active||event.pointerId!==active.id)return;
  const {mode,index}=active;
  clear();
  if(mode==='pending')onTap(index);
 });
 row.addEventListener('pointercancel',event=>{
  if(active&&active.id===event.pointerId)cancel();
 });
 row.addEventListener('lostpointercapture',()=>{if(active)cancel();});
 row.addEventListener('click',event=>{
  if(event.detail!==0)return;
  const button=event.target.closest?.('button.step');
  if(!button||!row.contains(button))return;
  const index=Number(button.dataset.index);
  const preserveFocus=document.activeElement===button;
  onTap(index);
  if(preserveFocus){
   row.querySelector(`button.step[data-index="${index}"]`)?.focus({preventScroll:true});
  }
 });
 return {cancel};
}
