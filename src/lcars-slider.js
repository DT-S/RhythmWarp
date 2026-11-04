// Shared LCARS ratio and output faders. The existing native input remains the
// source of truth: these parts are visual/interaction shells, never a new audio bus.
export const LCARS_LED_COUNT=24;
export const LCARS_TICK_COUNT=41;

export function lcarsFraction(value,min,max){
 if(![value,min,max].every(Number.isFinite)||max<=min)throw RangeError('Invalid slider range');
 return Math.min(1,Math.max(0,(value-min)/(max-min)));
}
export function lcarsSnap(value,min,max,step){
 if(![value,min,max,step].every(Number.isFinite)||max<=min||step<=0)throw RangeError('Invalid slider step');
 return Math.min(max,Math.max(min,Math.round((value-min)/step)*step+min));
}
export function lcarsLedCount(value,min,max){
 return Math.round(lcarsFraction(value,min,max)*LCARS_LED_COUNT);
}

const node=(tag,className='',text)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
};
const PRESET_SWING=[
 {value:50,label:'50:50'},
 {value:60,label:'60:40'},
 {value:67,label:'67:33',hint:'TRIPLET'},
 {value:75,label:'75:25'}
];
const PRESET_VOLUME=[
 {value:0,label:'0%'},
 {value:.5,label:'50%'},
 {value:1,label:'100%'}
];
export function createLcarsSlider(input,{kind='volume',title='',code='',onValueChange=null}={}){
 if(input.type!=='range')throw TypeError('LCARS slider needs a native range input');
 if(input.dataset.lcarsMounted==='true')return null;
 const min=Number(input.min),max=Number(input.max),step=Number(input.step)||1;
 if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min)throw RangeError('Invalid input bounds');
 input.dataset.lcarsMounted='true';
 const host=input.parentElement;
 const oldOutput=kind==='swing'?host.querySelector('#swingValue'):null;
 const presets=kind==='swing'?PRESET_SWING:PRESET_VOLUME;
 const display=v=>kind==='swing'?Math.round(v)+':'+(100-Math.round(v)):Math.round(v*100)+'%';
 const root=node('section','lcars-slide lcars-slide-'+kind);
 const markers=node('div','lcars-calibration');
 markers.append(node('span','lcars-calibration-spacer'));
 const scale=node('div','lcars-calibration-scale');
 const presetButtons=[];
 for(const [index,preset] of presets.entries()){
  const b=node('button','lcars-preset');
  b.type='button';
  b.dataset.value=String(preset.value);
  const fraction=lcarsFraction(preset.value,min,max);
  b.style.left=(fraction*100)+'%';
  if(index===0)b.classList.add('at-start');
  if(index===presets.length-1)b.classList.add('at-end');
  b.append(node('span','lcars-preset-value',preset.label));
  if(preset.hint)b.append(node('span','lcars-preset-hint',preset.hint));
  b.setAttribute('aria-label','Set '+title+' to '+preset.label);
  presetButtons.push(b);scale.append(b);
 }
 markers.append(scale,node('span','lcars-calibration-spacer'));
 const strip=node('div','lcars-slide-strip');
 const left=node('div','lcars-slide-label');
 const top=node('div','lcars-slide-code');top.append(node('span','',code),node('span','lcars-slide-beacon'));
 const heading=node('strong','lcars-slide-heading',title.replace(' / ',' /\n'));
 left.append(top,heading);
 const track=node('div','lcars-slide-track');
 const topRuler=node('div','lcars-ruler');
 const pills=node('div','lcars-pill-housing');
 const bottomRuler=node('div','lcars-ruler lcars-ruler-bottom');
 const ledNodes=[],rulerNodes=[];
 for(let i=0;i<LCARS_TICK_COUNT;i++){
  const tickType=i%8===0?' major':i%4===0?' medium':'';
  const t1=node('span','lcars-tick'+tickType),t2=node('span','lcars-tick'+tickType);
  topRuler.append(t1);bottomRuler.append(t2);rulerNodes.push(t1,t2);
 }
 for(let i=0;i<LCARS_LED_COUNT;i++){
  const pill=node('span','lcars-pill');pills.append(pill);ledNodes.push(pill);
 }
 const thumb=node('div','lcars-bracket');
 const thumbBody=node('div','lcars-bracket-box');
 const topLip=node('span','lcars-bracket-lip');
 const bottomLip=node('span','lcars-bracket-lip lcars-bracket-lip-bottom');
 const core=node('span','lcars-bracket-core');
 core.append(node('span','lcars-bracket-arrow','◀'),node('span','lcars-bracket-block','▮'),node('span','lcars-bracket-arrow','▶'));
 thumbBody.append(topLip,core,bottomLip);
 const micro=node('div','lcars-bracket-micro','◂ ▮▮▮▮ ▸');
 thumb.append(thumbBody,micro);
 track.append(topRuler,pills,bottomRuler,thumb);
 input.classList.add('lcars-range-native');
 input.setAttribute('aria-label',title+' '+(kind==='swing'?'ratio':'level'));
 // Accessible input overlays the entire touch area, not the calibration labels.
 track.append(input);
 const cap=node('div','lcars-slide-cap');
 const buttons=node('div','lcars-slide-button-grid');
 const makeButton=(className,txt,action)=>{const b=node('button','lcars-cap-button '+className,txt);b.type='button';b.setAttribute('aria-label',action);buttons.append(b);return b;};
 const plus=makeButton('lcars-plus','+','Increase '+title+' by one step');
 const minus=makeButton('lcars-minus','−','Decrease '+title+' by one step');
 const jumpUp=makeButton('lcars-jump-up','▲','Next '+title+' preset');
 const jumpDown=makeButton('lcars-jump-down','▼','Previous '+title+' preset');
 buttons.append(node('span','lcars-cap-crescent'));
 const readout=node('div','lcars-cap-readout');
 if(oldOutput){oldOutput.className='lcars-cap-value';readout.append(oldOutput);}
 else readout.append(node('output','lcars-cap-value'));
 cap.append(buttons,readout);
 strip.append(left,track,cap);
 const telemetry=node('div','lcars-slide-telemetry');
 const telemetryText=node('span','lcars-telemetry-label',kind==='swing'?'50:50 STRAIGHT · 67:33 TRIPLET SWING':'0% SILENCE · 100% FULL OUTPUT');
 const telemetryValue=node('span','lcars-telemetry-value');
 const telemetryGrid=node('span','lcars-telemetry-grid');telemetryGrid.append(node('span','lcars-telemetry-scanner'));
 telemetry.append(telemetryText,telemetryValue,telemetryGrid);
 root.append(markers,strip,telemetry);
 host.replaceWith(root);

 const nativeValue=()=>Number(input.value);
 let lastStep=NaN;
 function sync(){
  const v=nativeValue(),fraction=lcarsFraction(v,min,max),lit=lcarsLedCount(v,min,max);
  const text=display(v);
  const out=readout.querySelector('output');
  out.textContent=text;
  input.setAttribute('aria-valuetext',text);
  thumb.style.left=(7+fraction*86)+'%';
  for(let i=0;i<ledNodes.length;i++){
   ledNodes[i].classList.toggle('lit',i<lit);
   ledNodes[i].classList.toggle('led-gold',i/LCARS_LED_COUNT<.35);
   ledNodes[i].classList.toggle('led-peach',i/LCARS_LED_COUNT>=.35&&i/LCARS_LED_COUNT<.65);
   ledNodes[i].classList.toggle('led-salmon',i/LCARS_LED_COUNT>=.65);
   ledNodes[i].classList.toggle('near-cursor',i===lit-1&&lit>0);
  }
  const brightTicks=Math.round(fraction*(LCARS_TICK_COUNT-1));
  for(let i=0;i<LCARS_TICK_COUNT;i++){
   for(const t of [rulerNodes[i*2],rulerNodes[i*2+1]]){
    t.classList.toggle('lit',i<=brightTicks);
    t.classList.toggle('at-cursor',i===brightTicks);
   }
  }
  presetButtons.forEach((b,i)=>b.classList.toggle('selected',Math.abs(nativeValue()-presets[i].value)<step/2));
  telemetryValue.textContent=kind==='swing'?('OFFSET +'+Math.round(v-50)+'%'):'OUTPUT '+Math.round(v*100)+'%';
  telemetry.dataset.level=String(Math.round(fraction*100));
  root.classList.toggle('lcars-disabled',input.disabled);
  for(const b of [plus,minus,jumpUp,jumpDown,...presetButtons])b.disabled=input.disabled;
  root.style.setProperty('--lcars-position',fraction*100+'%');
 }
 function set(v){
  if(input.disabled)return;
  const next=lcarsSnap(v,min,max,step),before=nativeValue();
  input.value=String(Number(next.toFixed(5)));
  if(nativeValue()!==before)input.dispatchEvent(new Event('input',{bubbles:true}));
  else sync();
 }
 const change=()=>{sync();if(lastStep!==nativeValue()){lastStep=nativeValue();if(root.classList.contains('lcars-touch-active')&&typeof onValueChange==='function')onValueChange();}};
 input.addEventListener('input',change);
 input.addEventListener('change',sync);
 const active=()=>root.classList.add('lcars-touch-active');
 const inactive=()=>root.classList.remove('lcars-touch-active');
 input.addEventListener('pointerdown',active);
 for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])
  input.addEventListener(event,inactive);
 input.addEventListener('focus',()=>root.classList.add('lcars-focused'));
 input.addEventListener('blur',()=>root.classList.remove('lcars-focused'));
 plus.addEventListener('click',()=>set(nativeValue()+step));
 minus.addEventListener('click',()=>set(nativeValue()-step));
 jumpUp.addEventListener('click',()=>set(presets.find(p=>p.value>nativeValue()+step/2)?.value??max));
 jumpDown.addEventListener('click',()=>set([...presets].reverse().find(p=>p.value<nativeValue()-step/2)?.value??min));
 presetButtons.forEach((button,i)=>button.addEventListener('click',()=>set(presets[i].value)));
 sync();
 return {root,input,sync,set};
}

const instances=new WeakMap();
export function mountLcarsSlider(input,options){
 if(instances.has(input))return instances.get(input);
 const instance=createLcarsSlider(input,options);
 instances.set(input,instance);
 return instance;
}
export function syncLcarsSlider(input){instances.get(input)?.sync();}
