import {boundedNumber,dragIncrement} from './number-control.js';
export function radialTicks(count=72){return Array.from({length:count},(_,i)=>{const a=i/count*2*Math.PI-Math.PI/2,inner=i%6===0?178:180;return {x1:250+Math.cos(a)*inner,y1:250+Math.sin(a)*inner,x2:250+Math.cos(a)*184,y2:250+Math.sin(a)*184};});}
export function installTempoControl(surface,display,input,get,set,guide=null){
 let gesture=null,hold,lastTap=null,editing=false,original;
 const clear=()=>{clearTimeout(hold);hold=null;};
 const sync=()=>{display.textContent=get();display.setAttribute('aria-valuenow',get());};
 function edit(){if(editing)return;guide?.hide();clear();lastTap=null;editing=true;original=get();if(gesture){const id=gesture.id;gesture=null;if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);}display.hidden=true;input.hidden=false;input.value=get();input.focus();input.select();}
 function finish(cancel=false){if(!editing)return;editing=false;set(cancel?original:boundedNumber(input.value,20,400,original));input.hidden=true;display.hidden=false;sync();display.focus();}
 surface.addEventListener('pointerdown',e=>{if(editing||gesture||e.button!==0||e.target.closest('input')||e.target.closest('button')&&e.target.closest('button')!==display)return;e.preventDefault();const r=surface.getBoundingClientRect();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,cx:r.left+r.width/2,cy:r.top+r.height/2,sum:0,mode:null,moved:false,type:e.pointerType};surface.setPointerCapture(e.pointerId);hold=setTimeout(edit,600);});
 surface.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>=8){
   if(!g.moved)guide?.show(display,get(),20,400,'TEMPO / BPM','BPM');
   g.moved=true;clear();lastTap=null;
  }
  const step=dragIncrement(g,e.clientX,e.clientY);
  if(step){set(get()+step);sync();}
  if(g.moved)guide?.update(get());
 });
 function end(e,cancel=false){if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;clear();guide?.hide();if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);if(cancel||g.moved){lastTap=null;return;}if(g.type!=='mouse'){const now=performance.now();if(lastTap&&now-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<25){edit();return;}lastTap={time:now,x:e.clientX,y:e.clientY};}}
 surface.addEventListener('pointerup',e=>end(e));surface.addEventListener('pointercancel',e=>end(e,true));surface.addEventListener('lostpointercapture',()=>{gesture=null;clear();guide?.hide();});
 // The nested numeric button still receives direct dblclick events in
 // keyboard/synthetic activation and in existing regression tests.
 display.addEventListener('dblclick',e=>{e.preventDefault();edit();});
 // Pointer capture is owned by the outer tempo surface. On desktop a
 // double-click can consequently be retargeted to that surface instead of
 // the nested numeric button. Accept it at the capture owner and exclude
 // the +/- buttons, for BOTH the Circular and Linear tempo instruments.
 surface.addEventListener('dblclick',e=>{
  const button=e.target.closest?.('button');
  if(button&&button!==display)return;
  e.preventDefault();edit();
 });
 display.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();edit();}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();set(get()+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1));sync();}});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();finish(e.key==='Escape');}});input.addEventListener('blur',()=>finish());sync();return {sync};
}
