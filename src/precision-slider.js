// LCARS precision fader: real native range semantics for keyboard/mouse,
// progressive fine adjustment for touch and pen. All calculations are pure.
export function fineSensitivity(distance){
 const d=Math.max(0,Number.isFinite(distance)?distance:0);
 return Math.max(.08,Math.min(1,32/Math.max(32,d)));
}

export function precisionDelta(value,dx,distance,width,min,max){
 if(![value,dx,width,min,max].every(Number.isFinite)||width<=0||max<=min)throw RangeError('Invalid precision fader bounds');
 const delta=dx / width*(max-min)*fineSensitivity(distance);
 return Math.max(min,Math.min(max,value+delta));
}

export function formatPan(value){
 const n=Number(value);
 if(!Number.isFinite(n))return 'CENTER';
 const percentage=Math.round(Math.abs(n)*100);
 return percentage===0?'CENTER':n<0?`L ${percentage}%`:`R ${percentage}%`;
}

export function formatVolume(value){
 return `${Math.round(Math.max(0,Math.min(1,Number(value)))*100)}%`;
}

/**
 * Enhances a real range input, without removing native input, keyboard,
 * focus or screen-reader behavior. The original oninput handler receives
 * exactly the same input event on each actual value change.
 */
export function installPrecisionSlider(input,{format=formatVolume}={}){
 if(input.dataset.precisionInstalled)return {sync:()=>{}};
 if(input.type!=='range')throw TypeError('Precision control requires a range input');
 const label=input.closest('label');
 if(!label)throw TypeError('Precision control needs a label');
 input.dataset.precisionInstalled='true';
 label.classList.add('precision-slider-label');
 input.classList.add('precision-slider');
 const bubble=document.createElement('output');
 bubble.className='precision-readout';
 bubble.setAttribute('aria-hidden','true');
 label.append(bubble);
 const min=Number(input.min),max=Number(input.max),step=Number(input.step)||.01;
 let gesture=null,mouseDown=false,ignoreClickUntil=0;
 const read=()=>Number(input.value);
 function sync(){
  const n=read(),text=format(n);
  bubble.textContent=text;
  input.setAttribute('aria-valuetext',text);
  const r=input.getBoundingClientRect(),parent=label.getBoundingClientRect();
  if(r.width>0&&parent.width>0){
   const portion=Math.max(0,Math.min(1,(n-min)/(max-min)));
   const horizontal=r.left-parent.left+Math.max(7,Math.min(r.width-7,portion*r.width));
   bubble.style.left=`${Math.max(48,Math.min(parent.width-48,horizontal))}px`;
  }
 }
 function visible(show){
  label.classList.toggle('precision-active',show);
  if(show)sync();
 }
 function set(value){
  const before=read();
  input.value=String(Math.max(min,Math.min(max,Math.round(value/step)*step)));
  if(read()!==before)input.dispatchEvent(new Event('input',{bubbles:true}));
  else sync();
 }
 const onInput=()=>sync();
 input.addEventListener('input',onInput);
 input.addEventListener('change',onInput);
 input.addEventListener('focus',()=>{label.classList.add('precision-focused');sync();});
 input.addEventListener('blur',()=>{label.classList.remove('precision-focused');if(!gesture&&!mouseDown)visible(false);});
 input.addEventListener('pointerdown',event=>{
  if(event.button!==0||gesture)return;
  if(event.pointerType!=='touch'&&event.pointerType!=='pen'){
   mouseDown=true;visible(true);return; // native mouse range dragging
  }
  const rect=input.getBoundingClientRect();
  if(rect.width<=0)return;
  event.preventDefault();
  const usable=Math.max(1,rect.width-18);
  const fraction=Math.max(0,Math.min(1,(event.clientX-rect.left-9)/usable));
  set(min+fraction*(max-min)); // touching the track seeks to that point
  gesture={id:event.pointerId,lastX:event.clientX,startY:event.clientY,
    value:read(),width:usable};
  input.setPointerCapture(event.pointerId);
  visible(true);
 });
 input.addEventListener('pointermove',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  event.preventDefault();
  const dx=event.clientX-gesture.lastX;
  gesture.lastX=event.clientX;
  gesture.value=precisionDelta(gesture.value,dx,
    Math.abs(event.clientY-gesture.startY),gesture.width,min,max);
  set(gesture.value);
 });
 function end(event){
  if(!gesture||gesture.id!==event.pointerId)return;
  gesture=null;
  ignoreClickUntil=performance.now()+600;
  if(input.hasPointerCapture(event.pointerId))input.releasePointerCapture(event.pointerId);
  visible(false);
 }
 input.addEventListener('pointerup',event=>{
  if(gesture)end(event);
  else if(mouseDown){mouseDown=false;visible(false);}
 });
 input.addEventListener('pointercancel',event=>{
  if(gesture)end(event);
  mouseDown=false;visible(false);
 });
 input.addEventListener('lostpointercapture',()=>{
  if(gesture){gesture=null;visible(false);}
 });
 // Safari may synthesize a click on touch release, which otherwise lets the
 // native range jump a second time to the lifted finger's X coordinate.
 input.addEventListener('click',event=>{
  if(performance.now()<ignoreClickUntil){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 input.addEventListener('pointerup',()=>{if(mouseDown){mouseDown=false;visible(false);}});
 sync();
 return {sync};
}
