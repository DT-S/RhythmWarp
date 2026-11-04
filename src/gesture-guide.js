// P4 morphing LCARS value guide. Purely presentational: numeric controllers
// remain the only owners of state changes, accessibility and pointer capture.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function ladderSteps(value,min,max,radius=6){
 const center=clamp(Math.round(value),min,max);
 return Array.from({length:radius*2+1},(_,i)=>{
  const offset=radius-i,v=center+offset;
  return {value:v,offset,available:v>=min&&v<=max,active:offset===0,major:offset%5===0};
 });
}

// Morph from the REAL button rectangle, ending CENTERED on its position rather
// than opening a second control beside it. Only clamp near viewport edges.
export function ladderMorphGeometry(rect,viewportWidth,viewportHeight,guideWidth=104,guideHeight=260){
 const edge=8;
 const from={left:rect.left,top:rect.top,width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
 const to={
  left:clamp(rect.left+rect.width/2-guideWidth/2,edge,Math.max(edge,viewportWidth-edge-guideWidth)),
  top:clamp(rect.top+rect.height/2-guideHeight/2,edge,Math.max(edge,viewportHeight-edge-guideHeight)),
  width:guideWidth,height:guideHeight
 };
 return {from,to};
}

export function createGestureGuide(doc=document){
 const root=doc.createElement('div');
 root.className='gesture-guide';root.setAttribute('aria-hidden','true');
 const body=doc.createElement('div');body.className='gesture-guide-body';
 const title=doc.createElement('div');title.className='gesture-guide-heading';
 const value=doc.createElement('output');value.className='gesture-guide-value';
 const ladder=doc.createElement('div');ladder.className='gesture-guide-rungs';
 const rows=Array.from({length:13},()=>{
  const item=doc.createElement('div');item.className='gesture-guide-rung';
  const line=doc.createElement('span');line.className='gesture-guide-tick';
  const number=doc.createElement('span');number.className='gesture-guide-number';
  item.append(line,number);ladder.append(item);
  return {item,number};
 });
 body.append(title,value,ladder);root.append(body);doc.body.append(root);
 let active=false,source=null,min=0,max=20,units='',finishTimer=null;
 function finishMorph(){
  clearTimeout(finishTimer);finishTimer=null;
  source?.classList.remove('gesture-source-active');
  source=null;
  root.classList.remove('is-visible','is-morphing');
 }
 root.addEventListener('transitionend',event=>{
  if(event.target===root&&event.propertyName==='height'&&!active)finishMorph();
 });
 const update=n=>{
  if(!active)return;
  const current=clamp(Math.round(n),min,max);
  value.textContent=units==='BPM'?`${current} BPM`:`${current}`;
  // The shrinking capsule must already show the NEW value, not the one
  // at pointer-down; the real button updates underneath the overlay.
  root.dataset.sourceText=String(current);
  ladderSteps(current,min,max).forEach((tick,i)=>{
   const row=rows[i];
   // Keep all 13 grid tracks occupied. Hiding DOM rows collapses their
   // tracks near max=20, making the highlighted center rung move.
   row.item.hidden=false;
   row.item.classList.toggle('is-outside',!tick.available);
   row.item.classList.toggle('is-current',tick.active);
   row.item.classList.toggle('is-major',tick.major);
   row.number.textContent=tick.available&&(tick.active||tick.major)?String(tick.value):'';
  });
 };
 const hide=()=>{
  if(!active)return;
  active=false;
  root.classList.remove('is-visible');
  // Transitionend may never fire when the tab is backgrounded, or if reduced
  // motion disables transitions. Never leave the source button invisible.
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reduced)finishMorph();
  else finishTimer=setTimeout(()=>{if(!active)finishMorph();},280);
 };
 const show=(anchor,n,minimum,maximum,label='VALUE',unit='')=>{
  if(!anchor?.isConnected)return;
  finishMorph(); // a second gesture can interrupt the reverse morph safely
  min=minimum;max=maximum;units=unit;title.textContent=label;
  const rect=anchor.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return;
  const geometry=ladderMorphGeometry(rect,window.innerWidth,window.innerHeight);
  for(const [name,v] of Object.entries(geometry.from)){
   root.style.setProperty(`--guide-from-${name}`,`${v}px`);
  }
  for(const [name,v] of Object.entries(geometry.to)){
   root.style.setProperty(`--guide-to-${name}`,`${v}px`);
  }
  const style=window.getComputedStyle(anchor);
  root.style.setProperty('--guide-source-color',style.backgroundColor);
  root.style.setProperty('--guide-source-radius',style.borderRadius);
  root.style.setProperty('--guide-source-ink',style.color);
  root.style.setProperty('--guide-source-family',style.fontFamily);
  root.style.setProperty('--guide-source-size',style.fontSize);
  root.style.setProperty('--guide-source-weight',style.fontWeight);
  source=anchor;
  active=true;
  root.classList.add('is-morphing');
  update(n);
  // Force a collapsed starting rectangle before asking CSS to interpolate.
  // Otherwise Safari may skip the morph and show the expanded overlay at once.
  root.getBoundingClientRect();
  source.classList.add('gesture-source-active');
  root.classList.add('is-visible');
 };
 window.addEventListener('blur',hide);
 return {show,update,hide,element:root};
}
