import {dateKey,dateLabel,durationLabel} from './diary.js';
export function dailySeries(entries,range=30,now=new Date()){
 const end=new Date(now);end.setHours(12,0,0,0);const first=entries.length?Math.min(...entries.map(e=>e.start)):end.getTime();const start=range?new Date(end):new Date(first);start.setHours(12,0,0,0);if(range)start.setDate(start.getDate()-range+1);else{const earliest=new Date(end);earliest.setDate(earliest.getDate()-3659);if(start<earliest)start.setTime(earliest.getTime());}
 const groups=new Map();for(const e of entries){const key=dateKey(e.start),g=groups.get(key)||{seconds:0,count:0,peak:null,clean:null};g.seconds+=e.seconds;g.count++;g.peak=Math.max(g.peak||0,e.peak);if(e.clean!==null)g.clean=Math.max(g.clean||0,e.clean);groups.set(key,g);}
 const result=[];for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const key=dateKey(d),g=groups.get(key)||{seconds:0,count:0,peak:null,clean:null};let sum=0;for(let i=0;i<7;i++){const before=new Date(d);before.setDate(before.getDate()-i);sum+=groups.get(dateKey(before))?.seconds||0;}result.push({date:key,label:key.split('-').reverse().join('.'),minutes:g.seconds/60,count:g.count,peak:g.peak,clean:g.clean,average:sum/420});if(result.length>=3660)break;}return result;
}
export function sessionSeries(entry){return entry.history.flatMap((p,i)=>[{x:p.at,y:p.bpm,label:`${durationLabel(p.at)} · ${p.bpm} BPM`},{x:entry.history[i+1]?.at??entry.seconds,y:p.bpm,label:`${durationLabel(entry.history[i+1]?.at??entry.seconds)} · ${p.bpm} BPM`}]);}
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const svgNode=(tag,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
let chartGradientSerial=0;
function plot(host,series,{xLabel,yLabel,labels=[],bars=false,scatter=false}){
 const mobile=window.matchMedia('(max-width: 640px)').matches;
 const plotW=mobile?360:800,plotH=mobile?245:360;
 const left=mobile?46:66,right=mobile?348:770,top=mobile?32:42,bottom=mobile?190:302;
 const wrap=node('div',undefined,'xy-wrap'),stage=node('div',undefined,'xy-plot-stage'),svg=svgNode('svg',{viewBox:`0 0 ${plotW} ${plotH}`,role:'group','aria-label':`${yLabel} versus ${xLabel}`,class:'xy-plot'}),readout=node('output','TOUCH A POINT / TAB TO INSPECT','system-field chart-readout');
 const points=series.flatMap(s=>s.points).filter(p=>p.y!==null),maxX=Math.max(1,...points.map(p=>p.x),labels.length-1),maxY=Math.max(1,...points.map(p=>p.y))*1.1;
 const x=v=>left+v/maxX*(right-left),y=v=>bottom-v/maxY*(bottom-top);
 for(let i=0;i<=4;i++){const value=maxY*i/4;svg.append(svgNode('line',{x1:left,y1:y(value),x2:right,y2:y(value),class:'chart-grid chart-grid-line'}),svgNode('text',{x:left-9,y:y(value)+4,'text-anchor':'end',class:'axis-label'},maxY<10?value.toFixed(1):Math.round(value)));}
 svg.append(svgNode('text',{x:left,y:mobile?18:22,class:'axis-label'},yLabel),svgNode('text',{x:right,y:plotH-7,'text-anchor':'end',class:'axis-label'},xLabel));
 const ticks=[0,.25,.5,.75,1];for(const t of ticks){const index=Math.round(t*maxX);svg.append(svgNode('text',{x:x(index),y:mobile?bottom+18:328,'text-anchor':t===0?'start':t===1?'end':'middle',class:'axis-label'},labels[index]||Math.round(index)));}
 // Actual recorded points only. The crosshair starts hidden and is moved
 // solely by focus/hover on a mark; no fake telemetry or background loop.
 const chartStatic=points.length>120;
 if(chartStatic)svg.classList.add('chart-motion-static');
 if(points.length&&!chartStatic)stage.classList.add('is-scanning');
 const probeX=svgNode('line',{x1:left,y1:top,x2:left,y2:bottom,
  class:'chart-probe-line','aria-hidden':'true'});
 const probeY=svgNode('line',{x1:left,y1:bottom,x2:right,y2:bottom,
  class:'chart-probe-line','aria-hidden':'true'});
 svg.append(probeX,probeY);
 let inspected=null;
 const hideProbe=mark=>{
  if(mark&&inspected!==mark)return;
  inspected?.classList.remove('chart-inspected');
  inspected=null;
  probeX.classList.remove('is-visible');
  probeY.classList.remove('is-visible');
 };
 const inspect=(mark,p,description)=>{
  if(inspected!==mark)inspected?.classList.remove('chart-inspected');
  inspected=mark;
  mark.classList.add('chart-inspected');
  const px=x(p.x),py=y(p.y);
  probeX.setAttribute('x1',px);probeX.setAttribute('x2',px);
  probeY.setAttribute('y1',py);probeY.setAttribute('y2',py);
  probeX.classList.add('is-visible');
  probeY.classList.add('is-visible');
  readout.textContent=description;
 };
 const legend=node('div',undefined,'chart-legend');
 for(const [index,s] of series.entries()){
  const color=['#ffcc88','#cc99ff','#88ccff','#ff8899','#99ddbb','#eeeeaa'][index%6];const name=node('span',s.name);name.style.borderColor=color;legend.append(name);
  if(!scatter&&(!bars||index)){
   let path='',connected=false,run=[],areaPaths=[];
   const finishArea=()=>{
    if(run.length>1){
     const first=run[0],last=run[run.length-1];
     areaPaths.push(`M${run.map(p=>`${x(p.x)},${y(p.y)}`).join(' L')} L${x(last.x)},${bottom} L${x(first.x)},${bottom} Z`);
    }
    run=[];
   };
   for(const p of s.points){
    if(p.y===null){finishArea();connected=false;continue;}
    path+=`${connected?'L':'M'}${x(p.x)},${y(p.y)} `;
    connected=true;run.push(p);
   }
   finishArea();
   if(path.trim()){
    const id=`lcars-astrometrics-fill-${++chartGradientSerial}`;
    const gradient=svgNode('linearGradient',{id,x1:'0%',y1:'0%',x2:'0%',y2:'100%'});
    gradient.append(svgNode('stop',{offset:'0%','stop-color':color,'stop-opacity':'.8'}),
      svgNode('stop',{offset:'100%','stop-color':color,'stop-opacity':'0'}));
    const defs=svgNode('defs',{});defs.append(gradient);svg.append(defs);
    for(const d of areaPaths)svg.append(svgNode('path',{d,fill:`url(#${id})`,class:'chart-area','aria-hidden':'true'}));
    svg.append(svgNode('path',{d:path,fill:'none',stroke:color,'stroke-width':3.5,pathLength:1,class:'chart-line'}));
    // The highlight is a short stretch of the trace, not a roaming circle.
    if(!chartStatic)svg.append(svgNode('path',{d:path,fill:'none',stroke:color,'stroke-width':3,
      pathLength:1,class:'chart-line-pulse','aria-hidden':'true'}));
   }
  }
  for(const p of s.points){if(p.y===null)continue;const mark=bars&&!index?svgNode('rect',{x:x(p.x)-Math.max(1,Math.min(12,(mobile?110:280)/(maxX+1))),y:y(p.y),width:Math.max(2,Math.min(24,(mobile?225:560)/(maxX+1))),height:Math.max(1,bottom-y(p.y)),fill:color,class:'chart-bar'}):svgNode('circle',{cx:x(p.x),cy:y(p.y),r:5,fill:color,class:'chart-dot'});
   mark.style.setProperty('--stagger',`${Math.min(650,140+Math.round(p.x*12))}ms`);
   const description=`${s.name} · ${p.label}`;mark.setAttribute('tabindex','0');mark.setAttribute('role',p.select?'button':'img');if(p.select){mark.addEventListener('click',p.select);mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.select();}});}mark.setAttribute('aria-label',description);const show=()=>inspect(mark,p,description);
   mark.addEventListener('pointerenter',show);
   mark.addEventListener('pointerdown',show);
   mark.addEventListener('focus',show);
   mark.addEventListener('pointerleave',()=>{if(document.activeElement!==mark)hideProbe(mark);});
   mark.addEventListener('blur',()=>hideProbe(mark));
   svg.append(mark);
  }
 }
 stage.append(svg);wrap.append(stage);host.append(legend,wrap,readout);
}
export function sessionChart(entry){const panel=node('div',undefined,'panel');panel.append(node('h3','SESSION / TEMPO TRACE'));if(!entry.history.length){panel.append(node('p','NO MEASURED TEMPO HISTORY FOR THIS MANUAL ENTRY','system-field'));return panel;}plot(panel,[{name:'TEMPO',points:sessionSeries(entry)}],{xLabel:'ELAPSED SECONDS',yLabel:'BPM'});return panel;}
export function analyticsCharts(entries,range,historyEntries=entries,onEntry=()=>{}){
 const panel=node('div',undefined,'panel');panel.append(node('h3','VISUAL ANALYSIS'));const controls=node('div',undefined,'mode-buttons chart-modes'),content=node('div');let selected='tempo';
 const draw=()=>{content.replaceChildren();for(const b of controls.children)b.setAttribute('aria-pressed',b.dataset.kind===selected);
  if(selected==='scatter'){const groups=new Map();for(const e of entries){if(!groups.has(e.category))groups.set(e.category,[]);groups.get(e.category).push({x:e.seconds/60,y:e.peak,label:`${dateLabel(e.start)} · ${e.exercise} · ${(e.seconds/60).toFixed(1)} MIN · ${e.peak} BPM`,select:()=>onEntry(e)});}plot(content,[...groups].map(([name,points])=>({name,points})),{xLabel:'DURATION / MINUTES',yLabel:'PEAK BPM',scatter:true});content.append(node('p','EACH POINT = ONE SESSION · SELECT TO OPEN ITS RECORD','system-field'));return;}
  if(selected==='session'){const sessions=[...entries].sort((a,b)=>b.start-a.start).slice(0,20),choices=node('div',undefined,'session-choices'),trace=node('div');let chosen=sessions[0];const display=()=>{trace.replaceChildren(sessionChart(chosen));for(const b of choices.children)b.setAttribute('aria-pressed',b.dataset.id===chosen.id);};for(const e of sessions){const b=node('button',`${dateLabel(e.start)} · ${e.exercise}`);b.type='button';b.dataset.id=e.id;b.onclick=()=>{chosen=e;display();};choices.append(b);}content.append(node('p','LAST 20 MATCHING SESSIONS','system-field'),choices,trace);if(chosen)display();return;}
  const days=dailySeries(historyEntries,range),points=(key,unit)=>days.map((d,i)=>({x:i,y:d[key],label:`${d.label} · ${d[key]?.toFixed(key==='count'?0:1)} ${unit}`}));
  const labels=days.map(d=>d.label.slice(0,5));
  if(!range)content.append(node('p','DAILY PLOTS SHOW UP TO 10 YEARS','system-field'));
  if(selected==='tempo')plot(content,[{name:'PEAK BPM',points:points('peak','BPM')},{name:'CLEAN / SELF-REPORTED',points:points('clean','BPM')}],{xLabel:'LOCAL DATE',yLabel:'BPM',labels});
  if(selected==='minutes')plot(content,[{name:'MINUTES',points:points('minutes','MIN')},{name:'7-DAY AVERAGE',points:points('average','MIN / DAY')}],{xLabel:'LOCAL DATE',yLabel:'MINUTES',labels,bars:true});
  if(selected==='sessions')plot(content,[{name:'SESSIONS',points:points('count','SESSIONS')}],{xLabel:'LOCAL DATE',yLabel:'SESSIONS',labels,bars:true});
  content.append(node('p',selected==='tempo'?'GAPS = NO RECORDED TEMPO · CLEAN VALUES ARE SELF-REPORTED':selected==='minutes'?'7-DAY MEAN INCLUDES ZERO DAYS':'ZERO DAYS ARE INCLUDED','system-field'));
 };
 for(const [kind,label] of [['tempo','TEMPO'],['minutes','PRACTICE TIME'],['sessions','SESSIONS / DAY'],['session','SESSION TRACE'],['scatter','SESSION CLOUD']]){const b=node('button',label);b.type='button';b.dataset.kind=kind;b.onclick=()=>{selected=kind;draw();};controls.append(b);}panel.append(controls,content);draw();return panel;
}
