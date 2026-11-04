import {analyticsCharts,sessionChart} from './charts.js';
import {MODES} from './model.js';
import {dateKey,dateLabel,durationLabel,summarize,diaryCSV,validateEntry,AUTO_LOG_MINIMUMS,diaryDeletionTargets,deleteDiaryEntries} from './diary.js';
import {download} from './storage.js';
import {enhanceNumber} from './number-control.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(label,fn)=>{const b=el('button','',label);b.type='button';b.onclick=fn;return b;};
function field(label,input){const l=el('label','diary-field');l.append(el('span','field-name',label),input);return l;}
function textInput(value,max=80){const i=el('input');i.value=value;i.maxLength=max;return i;}
function metric(label,value){const n=el('div','stat-tile');n.append(el('span','',label),el('strong','',value));return n;}
export function createDiaryUI(getState,save,notify,isRecording=()=>false,playCue=()=>{}){
 let editing=null,range=30,category='',exercise='',source='all',day='',limit=30;
 // Analytics starts plot-first on phones. The disclosure state survives
 // filtering and page switches; no chart or diary data is discarded.
 let filterDeckOpen=!window.matchMedia('(max-width:640px)').matches;
 const diary=()=>getState().diary;
 // Mobile archive is log-first: its native setup drawer starts collapsed.
 // Desktop retains expanded controls. The user's subsequent drawer state is
 // never reset by render() or by switching pages.
 const setupDeck=document.querySelector('#diarySetup');
 if(setupDeck?.open&&window.matchMedia('(max-width:640px)').matches)setupDeck.open=false;
 const deleteDialog=document.querySelector('#diaryDeleteDialog');
 const dangerText=document.querySelector('#diaryDangerMessage');
 const dangerCount=document.querySelector('#diaryDangerCount');
 const cancelDanger=document.querySelector('#diaryDangerCancel');
 const confirmDanger=document.querySelector('#diaryDangerConfirm');
 let deleteScope=null,deleteCutoff=0,returnFocus=null;
 function closeDanger(){if(deleteDialog.open)deleteDialog.close();}
 function requestDeletion(scope){
  if(isRecording())return notify('Stop playback before deleting practice records.','Warningsound');
  const openedAt=Date.now();
  const count=diaryDeletionTargets(diary().entries,scope,openedAt).length;
  if(!count)return notify(scope==='recent'?'No sessions ended in the last 60 seconds.':'Practice archive is already empty.','Warningsound');
  deleteScope=scope;deleteCutoff=openedAt;returnFocus=document.activeElement;
  dangerCount.textContent=`${count} SESSION${count===1?'':'S'} SELECTED`;
  dangerText.textContent=scope==='all'
   ?'ERASE ALL PRACTICE RECORDS? Session history and analytics will be permanently cleared. Categories and app settings stay unchanged.'
   :'ERASE RECENT RECORDS? Only sessions that ended within the preceding 60 seconds will be deleted. Older records remain.';
  confirmDanger.textContent=scope==='all'?'ERASE ALL':'DELETE RECENT';
  deleteDialog.showModal();
  playCue('consolewarning');
  cancelDanger.focus({preventScroll:true});
 }
 cancelDanger.onclick=closeDanger;
 deleteDialog.addEventListener('cancel',()=>playCue('windowcloses'));

 confirmDanger.onclick=()=>{
  if(!deleteScope)return;
  if(isRecording()){closeDanger();notify('Stop playback before deleting practice records.','Warningsound');return;}
  const count=deleteDiaryEntries(diary(),deleteScope,deleteCutoff);
  if(count){
   // Close potentially edited entries so a later Save cannot resurrect them.
   closeEditor();save();render();
  }
  closeDanger();
  notify(count?`${count} practice session${count===1?'':'s'} permanently deleted.`:'No matching sessions remain.',count?'erase-accepted':'Warningsound');
 };
 deleteDialog.addEventListener('close',()=>{
  deleteScope=null;deleteCutoff=0;
  if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  returnFocus=null;
 });
 document.querySelector('#diaryClearRecent').onclick=()=>requestDeletion('recent');
 document.querySelector('#diaryClearAll').onclick=()=>requestDeletion('all');
 const onPhone=()=>window.matchMedia('(max-width:640px)').matches;
 // The mobile PADD has exactly one scrolling region: <main>. When iOS opens
 // the keyboard, preserve the focused editor field inside that region instead
 // of letting Safari pan the entire zoomed document to an empty black area.
 function keepEditorFieldVisible(){
  if(!editing||!onPhone())return;
  const well=document.querySelector('main'),editor=document.querySelector('#diaryEditor');
  const focused=document.activeElement;
  if(!well||!editor.contains(focused)||!focused.matches('input,textarea,select'))return;
  const bounds=well.getBoundingClientRect(),field=focused.getBoundingClientRect();
  const vv=window.visualViewport;
  // WebKit lets the keyboard cover the lower part of a fixed scroll container.
  // The input must fit into the *visual* viewport, not merely into <main>.
  const visibleTop=Math.max(bounds.top,vv?.offsetTop??bounds.top);
  const visibleBottom=Math.min(bounds.bottom,vv?vv.offsetTop+vv.height:bounds.bottom);
  if(visibleBottom-visibleTop<60)return;
  const zoom=getState().uiScale||1,margin=12;
  if(field.bottom>visibleBottom-margin)well.scrollTop+=(field.bottom-visibleBottom+margin)/zoom;
  else if(field.top<visibleTop+margin)well.scrollTop+=(field.top-visibleTop-margin)/zoom;
 }
 document.querySelector('#diaryEditor').addEventListener('focusin',()=>{
  requestAnimationFrame(keepEditorFieldVisible);
 });
 for(const event of ['resize','scroll']){
  window.visualViewport?.addEventListener(event,()=>{
   requestAnimationFrame(keepEditorFieldVisible);
  },{passive:true});
 }
 function render(){
  const d=diary(),root=document.querySelector('#diaryControls');root.replaceChildren();
  const toggle=button(d.enabled?'AUTO LOG · ON':'AUTO LOG · OFF',()=>{d.enabled=!d.enabled;save();render();});toggle.setAttribute('aria-pressed',d.enabled);toggle.className='full';
  const name=textInput(d.exercise);name.placeholder='Open practice';name.onchange=()=>{d.exercise=name.value.trim();save();};
  const cats=el('div','mode-buttons diary-categories');for(const c of d.categories){const b=button(c,()=>{d.category=c;save();render();});b.setAttribute('aria-pressed',c===d.category);cats.append(b);}
  const add=textInput('',40);add.placeholder='New category';const addForm=el('form','category-form');add.setAttribute('aria-label','New category');const addButton=el('button','','ADD CATEGORY');addForm.append(add,addButton);addForm.onsubmit=e=>{e.preventDefault();const c=add.value.trim();if(!c)return;if(d.categories.length>=100)return notify('Maximum 100 categories.','invalidsound');if(!d.categories.includes(c))d.categories.push(c);d.category=c;save();render();};
  const minimum=el('div','diary-minimum');
  minimum.append(el('span','field-name','AUTO-LOG / MINIMUM DURATION'));
  const thresholdButtons=el('div','diary-minimum-choices');
  thresholdButtons.setAttribute('role','group');
  thresholdButtons.setAttribute('aria-label','Minimum metronome running time for automatic logging');
  for(const seconds of AUTO_LOG_MINIMUMS){
   const b=button(seconds===0?'OFF':seconds+' SEC',()=>{
    d.minAutoLogSeconds=seconds;save();render();
   });
   b.dataset.seconds=String(seconds);
   b.setAttribute('aria-pressed',String(d.minAutoLogSeconds===seconds));
   thresholdButtons.append(b);
  }
  minimum.append(thresholdButtons,el('p','diary-minimum-note',
   'Sessions shorter than this will not be saved automatically. Count-in does not count. Applies from the next Start.'));
  root.append(toggle,minimum,field('NEXT SESSION / EXERCISE',name),el('h3','','CATEGORY'),cats,addForm);
  document.querySelector('#manualEntry').onclick=()=>{editing='new';renderEditor();};
  document.querySelector('#csvExport').onclick=()=>download('lcars-practice.csv',diaryCSV(d.entries),'text/csv;charset=utf-8');
  document.querySelector('#diaryClearRecent').disabled=!diaryDeletionTargets(d.entries,'recent').length;
  document.querySelector('#diaryClearAll').disabled=!d.entries.length;
  renderList();renderStats();
 }
 function renderList(){
  const root=document.querySelector('#diaryList');root.replaceChildren();const entries=[...diary().entries].sort((a,b)=>b.start-a.start);
  document.querySelector('#entryCount').textContent=`${entries.length} SESSIONS`;
  if(!entries.length)root.append(el('p','system-field','NO SESSIONS YET · START TRAINING OR ADD AN ENTRY'));
  for(const e of entries.slice(0,limit)){
   const p=el('article','panel log-entry'),h=el('h3','',e.exercise),data=el('div','session-data');
   for(const [k,v] of [['START',dateLabel(e.start)],['DURATION',durationLabel(e.seconds)],['TEMPO',`${e.bpm} → ${e.peak} BPM`],['CATEGORY',e.category],['MODE',MODES[e.mode]||e.mode],['SOURCE',e.source==='measured'?'AUDIO CLOCK':'MANUAL']])data.append(metric(k,v));
   const actions=el('div','preset-actions log-actions');actions.append(button('EDIT / DETAILS',()=>{editing=e.id;renderEditor();}),button('DELETE',()=>{if(confirm(`Delete “${e.exercise}” from the diary?`)){diary().entries=diary().entries.filter(x=>x.id!==e.id);if(editing===e.id)closeEditor();save();render();}}));p.append(h,data,actions);root.append(p);
  }
  if(entries.length>limit)root.append(button('SHOW 30 MORE',()=>{limit+=30;renderList();}));
 }
 function closeEditor(){editing=null;const root=document.querySelector('#diaryEditor');root.hidden=true;root.replaceChildren();}
 function renderEditor(){
  const root=document.querySelector('#diaryEditor');root.hidden=false;root.replaceChildren();
  const existing=diary().entries.find(e=>e.id===editing);if(!existing&&editing!=='new')return closeEditor();
  const s=getState(),e=existing?structuredClone(existing):{id:crypto.randomUUID(),source:'manual',start:Date.now(),end:Date.now()+600000,seconds:600,exercise:diary().exercise||'Open practice',category:diary().category,notes:'',rating:null,clean:null,preset:'',reason:'Manual entry',mode:s.mode,bpm:s.bpm,peak:s.bpm,history:[]};
  root.append(el('h3','',existing?'SESSION RECORD':'MANUAL SESSION'));
  const form=el('form','diary-form'),name=textInput(e.exercise),cat=textInput(e.category,40),notes=el('textarea');notes.value=e.notes;notes.maxLength=4000;notes.rows=3;name.required=true;cat.required=true;
  const date=el('input');date.type='datetime-local';const local=new Date(e.start-new Date(e.start).getTimezoneOffset()*60000).toISOString().slice(0,16);date.value=local;date.required=true;
  const number=(v,min,max)=>{const i=el('input');i.type='number';i.min=min;i.max=max;i.step=1;i.value=v;return i;};
  const minutes=number(Math.round(e.seconds/60),1,10080),bpm=number(e.bpm,20,400),peak=number(e.peak,20,400),clean=number(e.clean||'',20,400),rating=number(e.rating||'',1,5);clean.placeholder='Optional';rating.placeholder='Optional';
  form.append(field('EXERCISE',name),field('CATEGORY',cat));
  if(e.source==='manual'){form.append(field('START / LOCAL TIME',date),field('DURATION / MIN',minutes),field('START BPM',bpm),field('PEAK BPM',peak));for(const input of [minutes,bpm,peak]){input.required=true;enhanceNumber(input);}}
  else{const fact=el('div','system-field',`${dateLabel(e.start)} – ${dateLabel(e.end)} · ${durationLabel(e.seconds)} · ${e.bpm}–${e.peak} BPM · AUDIO CLOCK`);form.append(fact);}
  form.append(field('CLEAN BPM / SELF-REPORTED',clean),field('RATING / 1–5 / SELF-REPORTED',rating),field('NOTES',notes));
  // Optional numbers retain a genuinely blank value; no hidden default assessment.
  const actions=el('div','preset-actions'),submit=el('button','primary','SAVE SESSION');actions.append(submit,button('CANCEL',closeEditor));form.append(actions);
  form.onsubmit=event=>{event.preventDefault();try{
   e.exercise=name.value.trim()||'Open practice';e.category=cat.value.trim();e.notes=notes.value;e.clean=clean.value===''?null:Number(clean.value);e.rating=rating.value===''?null:Number(rating.value);
   if(e.source==='manual'){e.start=new Date(date.value).getTime();e.seconds=Number(minutes.value)*60;e.end=e.start+e.seconds*1000;e.bpm=Number(bpm.value);e.peak=Number(peak.value);if(e.peak<e.bpm)throw Error('Peak BPM must be at least the start BPM.');}
   validateEntry(e);if(!existing&&diary().entries.length>=10000)throw Error('Diary full. Export and remove old entries.');
   if(!diary().categories.includes(e.category)){if(diary().categories.length>=100)throw Error('Maximum 100 categories.');diary().categories.push(e.category);}
   if(existing)diary().entries=diary().entries.map(x=>x.id===e.id?e:x);else diary().entries.push(e);save();closeEditor();render();notify('Session saved.');
  }catch(err){notify(err.message,'invalidsound');}};
  root.append(form,sessionChart(e));
  const details=el('details','lcars-info');details.append(el('summary','','TIMING RECORD'));details.append(el('p','',`Source: ${e.source}. End: ${dateLabel(e.end)}. ${e.reason}. Preset: ${e.preset||'—'}. Stopping ends a session; the next start creates a separate entry. Idle time between sessions is excluded.`));
  if(e.history.length){const table=el('table','history-table');const head=el('tr');for(const title of ['ELAPSED','BPM','MODE'])head.append(el('th','',title));table.append(head);for(const p of e.history){const row=el('tr');for(const v of [durationLabel(p.at),p.bpm,MODES[p.mode]||p.mode])row.append(el('td','',v));table.append(row);}details.append(table);}root.append(details);
  if(onPhone()){
   // Scroll the inner content well only. No autofocus: the form must be visible
   // before the user chooses an input and intentionally opens the keyboard.
   const well=document.querySelector('main'),zoom=getState().uiScale||1;
   well.scrollTop+=(root.getBoundingClientRect().top-well.getBoundingClientRect().top)/zoom-8;
  }else{
   root.scrollIntoView({block:'start',behavior:'smooth'});
   name.focus({preventScroll:true});
  }
 }
 function renderStats(){
  const root=document.querySelector('#analyticsContent');root.replaceChildren();
  const filters=el('div','panel analytics-filter-deck');
  const heading=el('h3','analytics-filter-heading','DATA FILTERS');
  const filterBody=el('div','analytics-filter-body');filterBody.id='analyticsFilterBody';
  const filterToggle=button('',()=>{
   filterDeckOpen=!filterDeckOpen;
   filterBody.hidden=!filterDeckOpen;
   filterToggle.setAttribute('aria-expanded',String(filterDeckOpen));
   filterToggle.textContent=(filterDeckOpen?'CLOSE / ':'EDIT / ')+(range?range+'D':'ALL');
   filterToggle.setAttribute('aria-label',(filterDeckOpen?'Hide':'Show')+' data filters, '+(range?range+' days':'all time'));
  });
  filterToggle.className='analytics-filter-toggle';
  filterToggle.setAttribute('aria-controls','analyticsFilterBody');
  filterToggle.setAttribute('aria-expanded',String(filterDeckOpen));
  filterToggle.setAttribute('aria-label',(filterDeckOpen?'Hide':'Show')+' data filters, '+(range?range+' days':'all time'));
  filterToggle.textContent=(filterDeckOpen?'CLOSE / ':'EDIT / ')+(range?range+'D':'ALL');
  filterBody.hidden=!filterDeckOpen;
  heading.append(filterToggle);filters.append(heading,filterBody);
  const periods=el('div','mode-buttons analytics-filters analytics-periods');for(const [n,label] of [[7,'7 DAYS'],[30,'30 DAYS'],[90,'90 DAYS'],[0,'ALL TIME']]){const b=button(label,()=>{range=n;day='';renderStats();});b.setAttribute('aria-pressed',range===n);periods.append(b);}filterBody.append(periods);
  const cats=el('div','mode-buttons analytics-filters analytics-categories');for(const c of ['',...diary().categories]){const b=button(c||'ALL CATEGORIES',()=>{category=c;day='';renderStats();});b.setAttribute('aria-pressed',category===c);cats.append(b);}filterBody.append(cats);
  const search=textInput(exercise);search.placeholder='Exercise contains…';search.onchange=()=>{exercise=search.value.trim();day='';renderStats();};filterBody.append(field('EXERCISE FILTER',search));
  const sources=el('div','mode-buttons analytics-filters analytics-sources');for(const [v,label] of [['all','ALL SOURCES'],['measured','AUDIO CLOCK'],['manual','MANUAL']]){const b=button(label,()=>{source=v;day='';renderStats();});b.setAttribute('aria-pressed',source===v);sources.append(b);}filterBody.append(sources);root.append(filters);
  const start=new Date();start.setHours(0,0,0,0);if(range)start.setDate(start.getDate()-range+1);
  const todayEnd=new Date();todayEnd.setHours(23,59,59,999);
  const historyEntries=diary().entries.filter(e=>e.start<=todayEnd.getTime()&&(!category||e.category===category)&&(!exercise||e.exercise.toLowerCase().includes(exercise.toLowerCase()))&&(source==='all'||e.source===source));
  const entries=historyEntries.filter(e=>!range||e.start>=start.getTime());
  const summary=summarize(entries),tiles=el('div','stat-grid');for(const [k,v] of [['PRACTICE / MIN',Math.round(summary.seconds/60)],['SESSIONS',summary.count],['ACTIVE DAYS',Object.keys(summary.days).length],['PEAK / BPM',summary.peak||'—'],['CLEAN / SELF-REPORTED',summary.clean??'—']])tiles.append(metric(k,v));root.append(tiles);
  if(!entries.length){root.append(el('p','system-field','NO SESSIONS MATCH THESE FILTERS'));return;}
  root.append(analyticsCharts(entries,range,historyEntries,e=>{document.querySelector('[data-tab=diary]').click();editing=e.id;renderEditor();}));
  const calendar=el('div','panel');calendar.append(el('h3','','PRACTICE CALENDAR / SELECT DAY'));
  const grid=el('div','practice-calendar');const days=range||Math.min(366,Math.ceil((todayEnd.getTime()-Math.min(...entries.map(e=>e.start)))/86400000));
  const max=Math.max(...Object.values(summary.days),1);
  for(let i=days-1;i>=0;i--){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);const key=dateKey(d),seconds=summary.days[key]||0;const b=button(String(d.getDate()),()=>{day=day===key?'':key;renderStats();});b.className='calendar-day';if(d.getDate()===1)b.dataset.month=String(d.getMonth()+1).padStart(2,'0');b.style.setProperty('--level',seconds?String(.35+.65*seconds/max):'.12');b.setAttribute('aria-pressed',day===key);b.setAttribute('aria-label',`${dateLabel(d).split(',')[0]}: ${durationLabel(seconds)}`);b.title=`${key} · ${durationLabel(seconds)}`;grid.append(b);}calendar.append(grid);if(!range)calendar.append(el('p','system-field','CALENDAR SHOWS UP TO 366 DAYS · TOTALS INCLUDE ALL DATA'));root.append(calendar);
  if(day){const panel=el('div','panel');panel.append(el('h3','',`DAY ${day.split('-').reverse().join('.')}`));for(const e of entries.filter(e=>dateKey(e.start)===day))panel.append(el('p','system-field',`${e.exercise} · ${durationLabel(e.seconds)} · ${e.peak} BPM`));if(!entries.some(e=>dateKey(e.start)===day))panel.append(el('p','system-field','NO PRACTICE'));root.append(panel);}
  const charts=el('div','cards');for(const [title,values] of [['BY CATEGORY',summary.categories],['BY MODE',summary.modes]]){const panel=el('div','panel');panel.append(el('h3','',title));const max=Math.max(...Object.values(values),1);for(const [k,v] of Object.entries(values).sort((a,b)=>b[1]-a[1])){const row=el('div','stat-bar');row.append(el('span','',`${MODES[k]||k} · ${Math.round(v/60)} MIN`));const bar=el('div');bar.style.width=`${Math.max(1,v/max*100)}%`;row.append(bar);panel.append(row);}charts.append(panel);}root.append(charts);
  const progress=el('div','panel');progress.append(el('h3','','BPM HISTORY / LAST 20 MATCHING SESSIONS'));const table=el('table','history-table'),header=el('tr');for(const h of ['DATE / EXERCISE','PEAK','CLEAN¹'])header.append(el('th','',h));table.append(header);for(const e of [...entries].sort((a,b)=>b.start-a.start).slice(0,20)){const row=el('tr');for(const value of [`${dateLabel(e.start)} · ${e.exercise}`,e.peak,e.clean??'—'])row.append(el('td','',value));table.append(row);}progress.append(table);const info=el('details','lcars-info');info.append(el('summary','','STATISTICS INFO'),el('p','','¹ Clean BPM and ratings are self-reported. Audio-clock duration measures metronome running time, not detected playing. Manual sessions are included unless filtered out. Sessions are assigned to their local start date. Count-in is excluded; silent training bars count.'));progress.append(info);root.append(progress);
 }
 return {render,renderStats,closeEditor};
}
