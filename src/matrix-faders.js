// Starfleet-style segmented / Vernier faders adapted from the supplied
// Voyager Edition example. The actual source of truth is still the
// existing channel object and its accessible native range input.
// No demo audio synthesis, fake telemetry ticker or navigation replacement.
export const MATRIX_SEGMENTS=24;
export const MATRIX_TICKS=35;
// Visual-only offsets for the four real faders. Source audio values stay intact.
export const MATRIX_BUILD_START_MS=240;
export function matrixBuildStart(index,kind){
 if(!Number.isInteger(index)||index<0||!['volume','pan'].includes(kind))throw RangeError('Invalid mixer build target');
 return MATRIX_BUILD_START_MS+index*140+(kind==='pan'?115:0);
}

export function matrixClamp(value,min,max){
 return Math.max(min,Math.min(max,value));
}
export function matrixValue(kind,normalized){
 if(!Number.isFinite(normalized))throw RangeError('Invalid segment position');
 const n=matrixClamp(normalized,0,1);
 return Math.round((kind==='pan'?2*n-1:n)*100)/100;
}
export function matrixFraction(kind,value){
 const n=Number(value);
 return matrixClamp(kind==='pan'?(n+1)/2:n,0,1);
}
export function matrixFineValue(value,deltaPixels,kind,pxPerStep=3){
 if(!Number.isFinite(value)||!Number.isFinite(deltaPixels)||pxPerStep<=0)throw RangeError('Invalid Vernier drag');
 const min=kind==='pan'?-1:0,max=1;
 return matrixClamp(Math.round((value+Math.round(deltaPixels/pxPerStep)/100)*100)/100,min,max);
}
export function matrixFormat(kind,value){
 const n=Math.round(Number(value)*100);
 if(kind==='pan')return n===0?'CENTER':n<0?`L ${-n}%`:`R ${n}%`;
 return `${String(matrixClamp(n,0,100)).padStart(3,'0')}%`;
}
const palette=Array.from({length:MATRIX_SEGMENTS},(_,i)=>
 i<8?'#f5c967':i<16?'#e59365':'#d4847c');

const elem=(tag,cls='',text)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};

function makeSegments(root){
 const result=[];
 for(let i=0;i<MATRIX_SEGMENTS;i++){
  const segment=elem('span','matrix-segment');
  segment.style.setProperty('--segment-color',palette[i]);
  root.append(segment);result.push(segment);
 }
 return result;
}
function makeTicks(root){
 const result=[];
 for(let i=0;i<MATRIX_TICKS;i++){
  const tick=elem('span','matrix-tick');
  if(i%5===0)tick.classList.add('major');
  root.append(tick);result.push(tick);
 }
 return result;
}
function bindStep(button,step,perform){
 let timer=null,interval=null,handledPointer=false;
 const clear=()=>{clearTimeout(timer);clearInterval(interval);timer=null;interval=null;};
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false)return;
  handledPointer=true;
  perform(step);
  button.setPointerCapture?.(event.pointerId);
  timer=setTimeout(()=>{interval=setInterval(()=>perform(step),90);},340);
 });
 button.addEventListener('pointerup',clear);
 button.addEventListener('pointercancel',clear);
 button.addEventListener('lostpointercapture',clear);
 button.addEventListener('pointerleave',clear);
 button.addEventListener('click',event=>{
  // Pointerdown already applied the step; native keyboard activation does not.
  if(event.detail===0)perform(step);
  else if(!handledPointer)perform(step);
  handledPointer=false;
 });
 return button;
}

/**
 * Creates both LCARS control instruments inside an existing channel panel.
 * onChange(kind,value) MUST modify the existing app state, then call sync().
 */
export function buildMatrixFaders(index,channel,{onChange}){
 const root=elem('div','matrix-faders');
 const native={};const views={};
 for(const kind of ['volume','pan']){
  const isPan=kind==='pan';
  const module=elem('div',`matrix-module matrix-${kind}`);
  module.dataset.matrixKind=kind;
  const buildStart=matrixBuildStart(index,kind);
  module.style.setProperty('--matrix-build-start',`${buildStart}ms`);
  const label=elem('div','matrix-label');
  label.append(elem('span','matrix-code',isPan?'AZIM-02':'GAIN-01'),elem('strong','',isPan?'PAN':'VOLUME'));
  const housing=elem('div','matrix-housing');
  const titleBar=elem('div','matrix-titlebar');
  const title=elem('span','matrix-caption');
  title.append(elem('span','matrix-beacon'),document.createTextNode('PRECISION CONTROL'));
  const readout=elem('output','matrix-readout');
  titleBar.append(title,readout);
  const coarse=elem('div','matrix-coarse');
  coarse.setAttribute('aria-label',`Channel ${index+1} ${isPan?'pan':'volume'} segmented scrub`);
  // The coarse touch instrument carries the same lit capsule rail, calibration
  // rulers and orange LCARS bracket as the Swing controller. Fine Vernier stays.
  const instrument=elem('div','matrix-led-instrument');
  const topRuler=elem('div','matrix-led-ruler'),bottomRuler=elem('div','matrix-led-ruler matrix-led-ruler-bottom');
  const ledTicks=[];
  for(let i=0;i<41;i++){
   const style=i%8===0?' major':i%4===0?' medium':'';
   const first=elem('span','matrix-led-tick'+style),second=elem('span','matrix-led-tick'+style);
   topRuler.append(first);bottomRuler.append(second);ledTicks.push([first,second]);
  }
  const segments=elem('div','matrix-segments');
  const segmentNodes=makeSegments(segments);
  for(const [step,led] of segmentNodes.entries()){
   led.style.setProperty('--matrix-led-build-delay',`${buildStart+205+step*9}ms`);
  }
  const bracket=elem('div','matrix-bracket');
  const bracketBox=elem('div','matrix-bracket-box');
  bracketBox.append(elem('span','matrix-bracket-lip'),elem('span','matrix-bracket-core','◀ ▮ ▶'),elem('span','matrix-bracket-lip matrix-bracket-bottom'));
  bracket.append(bracketBox,elem('span','matrix-bracket-micro','◂ ▮▮▮▮ ▸'));
  segments.append(bracket);
  instrument.append(topRuler,segments,bottomRuler);
  if(isPan){
   coarse.classList.add('matrix-pan-coarse');
   const quickLeft=elem('button','matrix-quick matrix-quick-left','−');
   const quickRight=elem('button','matrix-quick matrix-quick-right','+');
   quickLeft.type=quickRight.type='button';
   coarse.append(quickLeft,instrument,quickRight);
  }else coarse.append(instrument);
  const fineRow=elem('div','matrix-fine-row');
  const fineMinus=elem('button','matrix-step matrix-step-down',isPan?'L <':'< FINE');
  const finePlus=elem('button','matrix-step matrix-step-up',isPan?'> R':'FINE >');
  for(const button of [fineMinus,finePlus])button.type='button';
  const vernier=elem('div','matrix-vernier');
  vernier.setAttribute('aria-label',`Channel ${index+1} ${isPan?'pan':'volume'} fine scrub`);
  const ticks=elem('div','matrix-ticks');
  const tickNodes=makeTicks(ticks);
  const vernierLaser=elem('span','matrix-vernier-laser');
  vernier.append(ticks,vernierLaser);
  fineRow.append(fineMinus,vernier,finePlus);
  housing.append(titleBar,coarse,fineRow);
  let fineMicro=null;
  if(isPan){
   fineMicro=elem('div','matrix-pan-micro');
   const minus=elem('button','matrix-micro-step matrix-micro-left','FINE ADJ L');
   const plus=elem('button','matrix-micro-step matrix-micro-right','FINE ADJ R');
   minus.type=plus.type='button';
   const coords=elem('output','matrix-pan-coords','OFFSET +000');
   fineMicro.append(minus,coords,plus);
   housing.append(fineMicro);
  }
  const nativeLabel=elem('label','matrix-accessible-label');
  const input=elem('input','matrix-native');
  input.type='range';input.min=isPan?'-1':'0';input.max='1';input.step='.01';
  input.value=String(channel[kind]);input.dataset.field=kind;
  input.setAttribute('aria-label',`Channel ${index+1} ${kind}`);
  nativeLabel.append(input);
  housing.append(nativeLabel);
  module.append(label,housing);
  root.append(module);
  native[kind]=input;
  views[kind]={module,housing,readout,bracket,ledTicks,vernierLaser,segments:segmentNodes,ticks:tickNodes,coarse,vernier,coords:fineMicro?.querySelector('output')};
  const set=(v,gesture=false)=>{
   const next=matrixClamp(Math.round(v*100)/100,isPan?-1:0,1);
   if(next===Number(native[kind].value))return;
   onChange(kind,next,{gesture});
  };
  for(const [button,step] of [[fineMinus,isPan?-.05:-.01],[finePlus,isPan?.05:.01]])
   bindStep(button,step,delta=>set(Number(native[kind].value)+delta));
  if(isPan){
   bindStep(coarse.querySelector('.matrix-quick-left'),-.05,delta=>set(Number(input.value)+delta));
   bindStep(coarse.querySelector('.matrix-quick-right'),.05,delta=>set(Number(input.value)+delta));
   bindStep(fineMicro.querySelector('.matrix-micro-left'),-.01,delta=>set(Number(input.value)+delta));
   bindStep(fineMicro.querySelector('.matrix-micro-right'),.01,delta=>set(Number(input.value)+delta));
  }
  function bindScrub(surface,fine){
   let pointer=null;
   const stop=event=>{
    if(!pointer||event.pointerId!==pointer.id)return;
    pointer=null;
    housing.classList.remove('matrix-active');
    if(surface.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId);
   };
   surface.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false||pointer||event.target.closest?.('button'))return;
    const rect=(fine?surface:instrument).getBoundingClientRect();
    if(rect.width<=0)return;
    event.preventDefault();
    pointer={id:event.pointerId,x:event.clientX,startX:event.clientX,
      startValue:Number(native[kind].value)};
    surface.setPointerCapture(event.pointerId);
    housing.classList.add('matrix-active');
    input.focus({preventScroll:true});
    if(!fine)set(matrixValue(kind,(event.clientX-rect.left)/rect.width),true);
   });
   surface.addEventListener('pointermove',event=>{
    if(!pointer||event.pointerId!==pointer.id)return;
    event.preventDefault();
    if(fine)set(matrixFineValue(pointer.startValue,event.clientX-pointer.startX,kind),true);
    else {
     const rect=(fine?surface:instrument).getBoundingClientRect();
     set(matrixValue(kind,(event.clientX-rect.left)/rect.width),true);
    }
   });
   surface.addEventListener('pointerup',stop);
   surface.addEventListener('pointercancel',stop);
   surface.addEventListener('lostpointercapture',()=>{
    pointer=null;housing.classList.remove('matrix-active');
   });
  }
  bindScrub(coarse,false);
  bindScrub(vernier,true);
 }
 function sync(){
  for(const kind of ['volume','pan']){
   const view=views[kind],input=native[kind],value=channel[kind];
   input.value=String(value);
   const text=matrixFormat(kind,value),fraction=matrixFraction(kind,value);
   input.setAttribute('aria-valuetext',text);
   view.readout.textContent=text;
   if(kind==='pan'){const n=Math.round(value*100);view.coords.textContent=`OFFSET ${n<0?'-':'+'}${String(Math.abs(n)).padStart(3,'0')}`;}
   view.bracket.style.left=`${7+fraction*86}%`;
   view.vernierLaser.style.left=`${fraction*100}%`;
   const rulerIndex=Math.round(fraction*40);
   view.ledTicks.forEach(([top,bottom],i)=>{
    for(const tick of [top,bottom]){
     tick.classList.toggle('lit',i<=rulerIndex);
     tick.classList.toggle('at-cursor',i===rulerIndex);
    }
   });
   const activeIndex=Math.min(MATRIX_SEGMENTS-1,Math.floor(fraction*MATRIX_SEGMENTS));
   view.segments.forEach((segment,i)=>{
    const lit=kind==='volume'?value>0&&i<=activeIndex:
      value>=0?i>=MATRIX_SEGMENTS/2&&i<=activeIndex:i<MATRIX_SEGMENTS/2&&i>=activeIndex;
    segment.classList.toggle('lit',lit);
    segment.classList.toggle('wave-peak',i===activeIndex&&(kind==='pan'||value>0));
    segment.classList.toggle('wave-near',Math.abs(i-activeIndex)===1);
   });
   view.ticks.forEach((tick,i)=>{
    const distance=Math.abs(i/(MATRIX_TICKS-1)-fraction);
    tick.classList.toggle('peak',distance<.03);
    tick.classList.toggle('near',distance>=.03&&distance<.09);
    tick.classList.toggle('medium',distance>=.09&&distance<.16);
   });
  }
 }
 sync();
 return {root,inputs:native,views,sync};
}
