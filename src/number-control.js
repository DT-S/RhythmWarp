import {clamp} from './model.js';
import {angleDelta} from './rhythm.js';
export function boundedNumber(text,min,max,fallback){const n=Number(String(text).trim());return String(text).trim()!==''&&Number.isFinite(n)?clamp(Math.round(n),min,max):fallback;}
export function dragIncrement(g,x,y){
  if(!g.mode){if(Math.hypot(x-g.x,y-g.y)<8)return 0;g.mode=Math.abs(y-g.y)>Math.abs(x-g.x)*1.2?'vertical':'orbit';g.lastY=y;g.angle=Math.atan2(y-g.cy,x-g.cx);return 0;}
  if(g.mode==='vertical'){g.sum+=(g.lastY-y)/9;g.lastY=y;}
  else{const a=Math.atan2(y-g.cy,x-g.cx);g.sum+=angleDelta(g.angle,a)/.16;g.angle=a;}
  const steps=Math.trunc(g.sum);g.sum-=steps;return steps;
}
export function enhanceNumber(input,guide=null){
  if(input.dataset.dial)return;input.dataset.dial='true';
  const min=Number(input.min),max=Number(input.max);input.type='text';input.inputMode='numeric';input.hidden=true;
  const wrap=document.createElement('span');wrap.className='number-control';input.before(wrap);wrap.append(input);
  const b=document.createElement('button');b.type='button';b.className='value-dial';b.setAttribute('role','spinbutton');b.setAttribute('aria-label',input.getAttribute('aria-label')||input.closest('label')?.textContent.trim()||'Value');b.setAttribute('aria-valuemin',min);b.setAttribute('aria-valuemax',max);b.title='Drag up/down. Start sideways to rotate. Tap to type.';wrap.prepend(b);
  let g=null,dragged=false,editing=false,original=Number(input.value);
  const sync=()=>{b.textContent=input.value;b.setAttribute('aria-valuenow',input.value);};input._syncDial=sync;sync();
  function set(v){input.value=clamp(v,min,max);sync();input.dispatchEvent(new Event('change',{bubbles:true}));}
  function edit(){guide?.hide();original=Number(input.value);editing=true;b.hidden=true;input.hidden=false;input.focus();input.select();}
  function finish(cancel=false){if(!editing)return;editing=false;input.hidden=true;b.hidden=false;set(cancel?original:boundedNumber(input.value,min,max,original));b.focus();}
  b.addEventListener('pointerdown',e=>{if(e.button!==0||g)return;e.preventDefault();const r=b.getBoundingClientRect();g={id:e.pointerId,x:e.clientX,y:e.clientY,cx:r.left+r.width/2,cy:r.top+r.height/2,sum:0,mode:null};dragged=false;b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointermove',e=>{
   if(!g||g.id!==e.pointerId)return;
   const step=dragIncrement(g,e.clientX,e.clientY);
   if(g.mode){
    if(!dragged){
     const title={beats:'OUTER BEATS',subdivisions:'SUBDIVISIONS',countIn:'COUNT-IN',duration:'DURATION'}[input.id]||
       b.getAttribute('aria-label')||'VALUE';
     guide?.show(b,Number(input.value),min,max,title);
    }
    dragged=true;
   }
   if(step)set(Number(input.value)+step);
   if(dragged)guide?.update(Number(input.value));
  });
  const end=e=>{if(!g||g.id!==e.pointerId)return;g=null;guide?.hide();if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);};
  b.addEventListener('pointerup',end);b.addEventListener('pointercancel',e=>{dragged=true;end(e);});b.addEventListener('lostpointercapture',()=>{g=null;guide?.hide();});
  b.onclick=()=>{if(!dragged)edit();dragged=false;};
  b.onkeydown=e=>{const deltas={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:10,PageDown:-10};if(e.key in deltas){e.preventDefault();set(Number(input.value)+deltas[e.key]);}if(e.key==='Home'||e.key==='End'){e.preventDefault();set(e.key==='Home'?min:max);}if(e.key==='Enter'){e.preventDefault();edit();}};
  input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finish();}if(e.key==='Escape'){e.preventDefault();finish(true);}};input.addEventListener('blur',()=>finish());
}
export function syncNumbers(root=document){root.querySelectorAll('[data-dial]').forEach(input=>input._syncDial?.());}
