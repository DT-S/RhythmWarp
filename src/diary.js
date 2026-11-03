export const CATEGORIES=['Rudiments','Grooves','Songs','Patterns','Technik','Polyrhythmik','Timing','Sonstiges'];
export const AUTO_LOG_MINIMUMS=Object.freeze([0,10,30,60]);
// New users skip accidental micro-sessions; legacy files without this setting
// migrate to 0s so existing recording behavior is preserved.
export const diaryDefaults=()=>({enabled:true,minAutoLogSeconds:10,exercise:'',category:'Timing',categories:[...CATEGORIES],entries:[]});
export function eligibleAutoLog(seconds,minimum){
 return Number.isFinite(seconds)&&seconds>=Math.max(.1,minimum);
}
export function diaryDeletionTargets(entries,scope,now=Date.now()){
 if(!Array.isArray(entries)||!Number.isFinite(now))throw TypeError('Invalid diary deletion input');
 if(scope==='all')return entries;
 if(scope==='recent')return entries.filter(e=>Number.isFinite(e.end)&&e.end>=now-60000&&e.end<=now);
 throw RangeError('Invalid deletion scope');
}
export function deleteDiaryEntries(diary,scope,now=Date.now()){
 const targets=diaryDeletionTargets(diary.entries,scope,now);
 if(!targets.length)return 0;
 const ids=new Set(targets.map(e=>e.id));
 diary.entries=diary.entries.filter(e=>!ids.has(e.id));
 return targets.length;
}
const num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
const str=(v,n)=>typeof v==='string'&&v.length<=n;
export function validateEntry(e){
 if(!e||!str(e.id,100)||!e.id||!['measured','manual'].includes(e.source)||!num(e.start,0,9e12)||!num(e.end,e.start,9e12)||!num(e.seconds,0,604800)||e.seconds>(e.end-e.start)/1000+.01||!str(e.exercise,80)||!str(e.category,40)||!e.category.trim()||!str(e.notes,4000)||!str(e.preset,80)||!str(e.reason,200)||!str(e.mode,40)||!num(e.bpm,20,400)||!num(e.peak,20,400)||!(e.clean===null||num(e.clean,20,400))||!(e.rating===null||Number.isInteger(e.rating)&&num(e.rating,1,5)))throw Error('Invalid practice entry');
 if(!Array.isArray(e.history)||e.history.length>20000||e.history.some((p,i)=>!num(p.at,0,e.seconds)||!num(p.bpm,20,400)||!str(p.mode,40)||(i&&p.at<e.history[i-1].at)))throw Error('Invalid tempo history');
 return structuredClone(e);
}
export function validateDiary(d){
 if(!d||typeof d.enabled!=='boolean'||(d.minAutoLogSeconds!==undefined&&!AUTO_LOG_MINIMUMS.includes(d.minAutoLogSeconds))||!str(d.exercise,80)||!str(d.category,40)||!Array.isArray(d.categories)||!d.categories.length||d.categories.length>100||d.categories.some(c=>!str(c,40)||!c.trim())||new Set(d.categories).size!==d.categories.length||!d.categories.includes(d.category)||!Array.isArray(d.entries)||d.entries.length>10000)throw Error('Invalid practice diary');
 const entries=d.entries.map(validateEntry);if(new Set(entries.map(e=>e.id)).size!==entries.length)throw Error('Duplicate practice entry');
 return {...d,minAutoLogSeconds:d.minAutoLogSeconds??0,categories:[...d.categories],entries};
}
// Record scheduled boundaries, not animation frames. Trim future look-ahead on stop.
export class PracticeRecorder {
 begin(start,wall,meta){this.start=start;this.wall=wall;this.meta=structuredClone(meta);this.points=[];}
 boundary(time,bpm,mode){if(!this.meta)return;const last=this.points.at(-1);if(!last||last.bpm!==bpm||last.mode!==mode)this.points.push({time,bpm,mode});}
 end(time,id){
  if(!this.meta)return null;
  const meta=this.meta;this.meta=null;const seconds=Math.max(0,time-this.start);
  if(!eligibleAutoLog(seconds,meta.minAutoLogSeconds??0))return null;
  const history=this.points.filter(p=>p.time<time).map(p=>({at:Math.max(0,p.time-this.start),bpm:p.bpm,mode:p.mode}));
  if(!history.length)return null;
  return {id,source:'measured',start:this.wall,end:this.wall+seconds*1000,seconds,exercise:meta.exercise||'Open practice',category:meta.category,preset:meta.preset||'',notes:'',rating:null,clean:null,reason:meta.reason||'Stopped',mode:history[0].mode,bpm:history[0].bpm,peak:Math.max(...history.map(p=>p.bpm)),history};
 }
}
export const dateKey=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const dateLabel=t=>new Date(t).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
export const durationLabel=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export function summarize(entries){
 const days=Object.create(null),categories=Object.create(null),modes=Object.create(null);let seconds=0,peak=0,clean=null;
 for(const e of entries){seconds+=e.seconds;const day=dateKey(e.start);days[day]=(days[day]||0)+e.seconds;categories[e.category]=(categories[e.category]||0)+e.seconds;peak=Math.max(peak,e.peak);if(e.clean!==null)clean=Math.max(clean||0,e.clean);
  if(e.history.length){e.history.forEach((p,i)=>{modes[p.mode]=(modes[p.mode]||0)+Math.max(0,(e.history[i+1]?.at??e.seconds)-p.at);});}else modes[e.mode]=(modes[e.mode]||0)+e.seconds;
 }
 return {seconds,peak,clean,days,categories,modes,count:entries.length};
}
const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replaceAll('"','""')+'"';
export function diaryCSV(entries){
 const rows=[['ID','Quelle','Start','Ende','Dauer Sekunden','Übung','Kategorie','Modus','Start BPM','Höchstes BPM','Sauber BPM (Selbstauskunft)','Bewertung 1–5','Preset','Notizen','Stoppgrund','Tempoverlauf (Sekunden:BPM:Modus)'],...entries.map(e=>[e.id,e.source==='measured'?'Audiozeit gemessen':'Manuell',dateLabel(e.start),dateLabel(e.end),Math.round(e.seconds),e.exercise,e.category,e.mode,e.bpm,e.peak,e.clean,e.rating,e.preset,e.notes,e.reason,e.history.map(p=>`${p.at.toFixed(3)}:${p.bpm}:${p.mode}`).join(' | ')])];
 return '\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n');
}
