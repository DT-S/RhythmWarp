// LCARS live sensor plots. Pure, bounded telemetry derived from existing hit events.
// No microphone audio is stored or processed in the rendering path.
const number=v=>typeof v==='number'&&Number.isFinite(v);
export const SENSOR_WINDOW=72;
export const DISTRIBUTION_WINDOW=128;
export const OFFSET_BOUND_MS=125;
export function liveOffsets(hits,limit=SENSOR_WINDOW){
 return hits.slice(-limit).filter(h=>number(h[1])).map(h=>({ms:h[0],value:h[1]}));
}
export function liveHitRates(hits,limit=SENSOR_WINDOW){
 return hits.slice(-limit).filter(h=>number(h[3])&&h[3]>0&&h[3]<=1500)
   .map(h=>({ms:h[0],value:h[3]}));
}
export function liveHistogram(hits,limit=DISTRIBUTION_WINDOW,bound=OFFSET_BOUND_MS,bins=15){
 const values=hits.slice(-limit).map(h=>h[1]).filter(number);
 const counts=Array(bins).fill(0);
 for(const value of values){
   const index=Math.max(0,Math.min(bins-1,Math.floor((value+bound)/(2*bound)*bins)));
   counts[index]++;
 }
 return {counts,count:values.length,meanMs:values.length?
   Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null,bound};
}
export function liveTargetRate(mode,bpm,division){
 if(mode!=='guided'||!number(bpm)||!Number.isInteger(division)||
  ![1,2,3,4].includes(division)||bpm<20||bpm>400)return null;
 return Math.round(bpm*division*10)/10;
}
const svgNS='http://www.w3.org/2000/svg';
function node(doc,tag,attrs={},label){
 const el=doc.createElementNS(svgNS,tag);
 for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
 if(label!==undefined)el.textContent=label;
 return el;
}
function text(svg,x,y,value,extra={}){
 svg.append(node(svg.ownerDocument,'text',{x,y,class:'mic-sensor-axis',...extra},value));
}
function drawLattice(svg){
 const doc=svg.ownerDocument;
 for(let i=0;i<=5;i++){
  const y=20+i*24;
  svg.append(node(doc,'line',{x1:32,y1:y,x2:462,y2:y,class:'mic-sensor-grid'}));
 }
 for(let i=0;i<=10;i++){
  const x=32+i*43;
  svg.append(node(doc,'line',{x1:x,y1:20,x2:x,y2:140,class:'mic-sensor-grid mic-sensor-vertical'}));
 }
}
function scatter(svg,series,{lo,hi,target=null,connect=true,spikes=false,toleranceMs=0}){
 const doc=svg.ownerDocument;
 const start=series[0]?.ms??0,end=series.at(-1)?.ms??(start+1),range=Math.max(1,end-start);
 const x=v=>32+430*(v-start)/range;
 const y=v=>140-120*(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo);
 if(number(target)){
  const yy=y(target);
  // A mathematically scaled ±10ms tolerance area, not a fixed-pixel imitation.
  if(toleranceMs>0){
   const top=y(target+toleranceMs),bottom=y(target-toleranceMs);
   svg.append(node(doc,'rect',{x:32,y:top,width:430,height:bottom-top,class:'mic-tolerance-corridor'}));
  }
  svg.append(node(doc,'line',{x1:32,y1:yy,x2:462,y2:yy,class:'mic-sensor-reference'}));
 }
 if(connect&&series.length>1){
  let path='',prev=null;
  for(const item of series){
   const px=x(item.ms),py=y(item.value);
   // A long rest is a discontinuity, not an invented continuous tempo line.
   const separated=prev!==null&&item.ms-prev>2000;
   path+=(prev===null||separated?'M':'L')+px.toFixed(2)+','+py.toFixed(2)+' ';
   prev=item.ms;
  }
  svg.append(node(doc,'path',{d:path.trim(),class:'mic-sensor-line'}));
 }
 for(const item of series){
  const px=x(item.ms).toFixed(2),py=y(item.value).toFixed(2);
  const clipped=item.value<lo||item.value>hi;
  if(spikes)svg.append(node(doc,'line',{x1:px,y1:y(target??0).toFixed(2),x2:px,y2:py,
    class:clipped?'mic-sensor-stem mic-sensor-clipped':'mic-sensor-stem'}));
  svg.append(node(doc,'circle',{cx:px,cy:py,r:3,
    class:clipped?'mic-sensor-dot mic-sensor-clipped':'mic-sensor-dot'}));
 }
 return Math.round(range/1000*10)/10;
}
export function renderLiveSensor(host,hits,{kind='timing',mode='guided',bpm=120,division=1}={}){
 if(!host)return {count:0,reference:null};
 host.replaceChildren();host.setAttribute('viewBox','0 0 480 168');
 host.setAttribute('role','img');
 const captions={
  timing:'Sensor timing offsets around zero milliseconds',
  rate:'Detected hit rate and current reference in hits per minute',
  distribution:'Distribution of detected offsets, no fitted curve'
 };
 host.setAttribute('aria-label',captions[kind]??captions.timing);
 drawLattice(host);
 if(kind==='distribution'&&mode==='guided'){
  const hist=liveHistogram(hits),peak=Math.max(...hist.counts,1);
  const center=host.ownerDocument;
  const zeroX=32+430/2;
  host.append(node(center,'line',{x1:zeroX,y1:20,x2:zeroX,y2:140,class:'mic-sensor-reference'}));
  hist.counts.forEach((n,i)=>{
   const h=112*n/peak;
   host.append(node(center,'rect',{x:34+i*28.3,y:139-h,width:22,height:h,
     class:'mic-sensor-histogram'}));
  });
  text(host,34,13,'OFFSET DISTRIBUTION / LAST '+DISTRIBUTION_WINDOW);
  text(host,34,158,'−'+hist.bound+' ms');
  text(host,448,158,'+'+hist.bound+' ms',{'text-anchor':'end'});
  if(!hist.count)text(host,240,83,'NO MATCHED HITS',{'text-anchor':'middle'});
  return {count:hist.count,reference:null,meanMs:hist.meanMs};
 }
 if(kind==='rate'){
  const series=liveHitRates(hits),reference=liveTargetRate(mode,bpm,division);
  const values=series.map(p=>p.value);
  if(number(reference))values.push(reference);
  const min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):60;
  // Quantized axis ranges do not change layout size; preserve reference visibility.
  const lo=number(reference)?Math.max(0,Math.floor(reference*.6/10)*10):
    Math.max(0,Math.floor(min*.8/20)*20);
  const hi=number(reference)?Math.max(lo+20,Math.ceil(reference*1.4/10)*10):
    Math.max(lo+20,Math.ceil(Math.max(60,max*1.15)/20)*20);
  const seconds=scatter(host,series,{lo,hi,target:reference});
  text(host,34,13,number(reference)?'CURRENT REF '+reference+' HITS/MIN':'FREE / RAW HITS/MIN');
  text(host,34,158,Math.round(lo)+' H/M');
  text(host,448,158,Math.round(hi)+' H/M',{'text-anchor':'end'});
  if(!series.length)text(host,240,82,'AWAITING STRIKE RATE',{'text-anchor':'middle'});
  return {count:series.length,reference,seconds};
 }
 const series=mode==='guided'?liveOffsets(hits):[];
 const seconds=scatter(host,series,{lo:-OFFSET_BOUND_MS,hi:OFFSET_BOUND_MS,target:0,connect:false,spikes:true,toleranceMs:10});
 text(host,34,13,'TIMING OFFSET / LAST '+SENSOR_WINDOW+' DETECTED HITS');
 text(host,34,158,'EARLY −'+OFFSET_BOUND_MS+' ms');
 text(host,448,158,'LATE +'+OFFSET_BOUND_MS+' ms',{'text-anchor':'end'});
 if(!series.length)text(host,240,82,mode==='free'?'NO TIMING GRID':'AWAITING MATCHED HITS',{'text-anchor':'middle'});
 return {count:series.length,reference:0,seconds};
}
