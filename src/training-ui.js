import {enhanceNumber,syncNumbers} from './number-control.js';
import {syncLcarsSlider} from './lcars-slider.js';
import {MODES,clamp} from './model.js';
const descriptions={
 standard:'Outer ring: quarters per bar. Inner ring: equal subdivisions of each quarter. Both channels are independently programmable.',
 polyrhythm:'Both rings complete one revolution over the SAME cycle length. Outer and inner counts divide that duration independently. BPM still means quarter notes per minute.',
 polymeter:'Both rings advance one point on each quarter note. Different pattern lengths wrap independently. A 3-point and a 4-point pattern realign after 12 quarters.',
 gap:'Audible bars alternate with silent bars. The musical clock and visual positions continue through silence.',
 random:'Audible and silent phase lengths are randomly selected within your ranges. Random choices occur at phase boundaries, never on the audio clock.',
 offbeat:'The OUTER click alternates between downbeats and a delayed position: +1/2 quarter (eighth offbeat) or +1/4 quarter (sixteenth offbeat). Inner ring is a silent visual guide.',
 displacement:'The OUTER click shifts through the selected grid. Forward at resolution 4: 1 → 1e → 1& → 1a. Inner ring is a silent guide. Manual advance commits at the next bar.',
 ramp:'The main BPM value is the START tempo. Step toward the target every chosen number of bars. Return mode travels back to the start and repeats. The center shows start, current, target and tempo change.'
};
const fields={
 standard:[],polyrhythm:[['cycleQuarters','CYCLE LENGTH / QUARTERS',1,20]],polymeter:[],
 gap:[['audibleBars','AUDIBLE BARS',1,64],['silentBars','SILENT BARS',1,64]],
 random:[['minOn','MIN AUDIBLE BARS',1,64],['maxOn','MAX AUDIBLE BARS',1,64],['minOff','MIN SILENT BARS',1,64],['maxOff','MAX SILENT BARS',1,64]],
 offbeat:[['changeBars','BARS PER PHASE',1,64],['resolution','OFFSET GRID',[['2','Eighth / +1⁄2'],['4','Sixteenth / +1⁄4']]]],
 displacement:[['changeBars','BARS PER POSITION',1,64],['resolution','GRID',[['2','Eighths'],['4','Sixteenths']]],['shiftStep','STEP SIZE',1,3],['direction','DIRECTION',[['1','Forward'],['-1','Backward']]],['manual','MANUAL ADVANCE','check']],
 ramp:[['targetBpm','TARGET BPM',20,400],['bpmStep','BPM PER STEP',1,100],['changeBars','BARS PER STEP',1,64],['rampReturn','UP / DOWN REPEAT','check']]
};
export function renderTraining(s,change){
 const $=id=>document.getElementById(id);$('modeTitle').textContent=MODES[s.mode];$('modeDescription').textContent=descriptions[s.mode];
 $('trainingFields').replaceChildren();$('trainingActions').replaceChildren();
 const update=()=>{
   for(const [lo,hi] of [['minOn','maxOn'],['minOff','maxOff']]){
     if(s.training[lo]>s.training[hi])s.training[hi]=s.training[lo];
   }
   $('trainingFields').querySelectorAll('input[data-key]').forEach(el=>el.value=s.training[el.dataset.key]);
   syncNumbers($('trainingFields'));change();
 };
 for(const [key,title,kind,max] of fields[s.mode]){
   const row=document.createElement('div');row.className='parameter-row';
   const label=document.createElement('span');label.className='parameter-name';label.textContent=title;row.append(label);
   if(Array.isArray(kind)||kind==='check'){
     const group=document.createElement('div');group.className='parameter-buttons';group.setAttribute('role','group');group.setAttribute('aria-label',title);
     const choices=kind==='check'?[['false','OFF'],['true','ON']]:kind;
     for(const [value,name] of choices){const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',String(s.training[key])===value);b.onclick=()=>{s.training[key]=kind==='check'?value==='true':Number(value);change();renderTraining(s,change);};group.append(b);}row.append(group);
   }else{
     const el=document.createElement('input');el.type='number';el.min=kind;el.max=max;el.value=s.training[key];el.dataset.key=key;el.setAttribute('aria-label',title);
     el.onchange=()=>{const n=Number(el.value);if(!Number.isFinite(n))return;s.training[key]=clamp(Math.round(n),kind,max);
       if(key==='maxOn'&&s.training.maxOn<s.training.minOn)s.training.minOn=s.training.maxOn;
       if(key==='maxOff'&&s.training.maxOff<s.training.minOff)s.training.minOff=s.training.maxOff;
       update();};row.append(el);enhanceNumber(el);
   }
   $('trainingFields').append(row);
 }
 if(!fields[s.mode].length){const p=document.createElement('div');p.className='system-field';p.textContent=s.mode==='polymeter'?'SHARED QUARTER PULSE':'RING CONTROL ACTIVE';$('trainingFields').append(p);}
 if(s.mode==='displacement'&&s.training.manual){const b=document.createElement('button');b.className='primary';b.textContent='ADVANCE POSITION';b.onclick=()=>{s.training.offset=((s.training.offset+s.training.direction*s.training.shiftStep)%s.training.resolution+s.training.resolution)%s.training.resolution;change();};$('trainingActions').append(b);}
 syncSwing(s);
}
export function syncSwing(s){
 const $=id=>document.getElementById(id),allowed=!['polyrhythm','polymeter','offbeat','displacement'].includes(s.mode)&&s.subdivisions%2===0;
 $('swing').value=Math.round(s.swing*100);$('swing').disabled=!allowed;$('swingValue').textContent=`${Math.round(s.swing*100)}:${100-Math.round(s.swing*100)}`;
 $('swingNote').textContent=allowed?'50:50 straight · 67:33 triplet swing':'Inactive for this mode / odd subdivision count.';
 syncLcarsSlider($('swing'));
}
