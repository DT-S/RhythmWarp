import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PracticeRecorder,diaryDefaults,validateDiary,validateEntry,diaryCSV,summarize,dateKey,AUTO_LOG_MINIMUMS,eligibleAutoLog,diaryDeletionTargets,deleteDiaryEntries} from '../src/diary.js';
import {fresh,validate,presetSettings,loadPreset} from '../src/model.js';
import {Scheduler} from '../src/scheduler.js';
const meta={exercise:'Triplets',category:'Timing',preset:'My preset'};
function record(){const r=new PracticeRecorder();r.begin(5,100000,meta);r.boundary(5,120,'standard');return r;}
function entry(){return record().end(65,'id-1');}
test('recording excludes count-in, ignores future lookahead, closes once',()=>{const r=record();r.boundary(8,125,'ramp');r.boundary(12,130,'ramp');const e=r.end(10,'id');assert.equal(e.seconds,5);assert.equal(e.start,100000);assert.equal(e.end,105000);assert.equal(e.peak,125);assert.deepEqual(e.history.map(p=>p.at),[0,3]);assert.equal(r.end(15,'id'),null);validateEntry(e);});
test('stopping before count-in ends creates no diary entry',()=>{assert.equal(record().end(4,'id'),null);});
test('repeated bar boundaries do not bloat history',()=>{const r=record();for(let i=6;i<65;i++)r.boundary(i,120,'standard');assert.equal(r.end(65,'id').history.length,1);});
test('gap practice remains part of active duration',()=>{const r=record();r.boundary(10,120,'gap');assert.equal(r.end(20,'id').seconds,15);});
test('diary metadata is captured at start',()=>{const m={...meta},r=new PracticeRecorder();r.begin(0,10000,m);m.exercise='Changed';r.boundary(0,80,'standard');assert.equal(r.end(5,'id').exercise,'Triplets');});
test('v3 backup migration adds an empty diary without losing settings',()=>{const old=fresh();old.version=3;delete old.diary;old.bpm=147;const s=validate(old);assert.equal(s.version,5);assert.equal(s.bpm,147);assert.deepEqual(s.diary,diaryDefaults());});
test('presets do not capture or replace practice records/preferences',()=>{const s=fresh();s.diary.entries=[entry()];s.diary.enabled=false;s.diary.exercise='Keep me';const p={name:'Rhythm',settings:presetSettings(s)};p.settings.bpm=160;assert.equal(p.settings.diary.entries.length,0);s.presets=[p];const loaded=loadPreset(s,p);assert.deepEqual(loaded.diary,s.diary);assert.equal(loaded.bpm,160);assert.deepEqual(validate(JSON.parse(JSON.stringify(loaded))),loaded);});
test('invalid or duplicate records are rejected atomically',()=>{for(const change of [{seconds:-1},{seconds:999999},{rating:6},{clean:0},{start:NaN},{history:[{at:99,bpm:120,mode:'standard'}]}])assert.throws(()=>validateEntry({...entry(),...change}));const d=diaryDefaults();d.entries=[entry(),entry()];assert.throws(()=>validateDiary(d));});
test('CSV quotes multiline text, uses BOM/semicolons, neutralizes formulas',()=>{const e=entry();e.notes='=HYPERLINK("evil")\nnext';const csv=diaryCSV([e]);assert.ok(csv.startsWith('\uFEFF"ID";'));assert.ok(csv.includes('"\'=HYPERLINK(""evil"")\nnext"'));assert.ok(csv.includes('Audiozeit gemessen'));});
test('analytics separates modes by elapsed history and keeps clean unset',()=>{const e=entry();e.history.push({at:20,bpm:130,mode:'ramp'});e.peak=130;const s=summarize([e]);assert.equal(s.seconds,60);assert.equal(s.modes.standard,20);assert.equal(s.modes.ramp,40);assert.equal(s.clean,null);assert.equal(s.days[dateKey(e.start)],60);});
test('scheduler logs count-in and ramp correctly without any animation frames',()=>{const a={ctx:{currentTime:0,state:'running'},cancel(){},click(){}},s=new Scheduler(a),c=fresh();c.bpm=60;c.beats=1;c.outer=[0];c.countIn=1;c.mode='ramp';Object.assign(c.training,{changeBars:1,targetBpm:65,bpmStep:1});s.start(c,meta);clearInterval(s.timer);for(let t=.01;t<2.5;t+=.01){a.ctx.currentTime=t;s.tick();}const e=s.recorder.end(2.5,'id');s.stop();assert.ok(Math.abs(e.seconds-1.38)<1e-8);assert.equal(e.bpm,60);assert.equal(e.peak,61);assert.equal(e.history[1].at,1);assert.equal(s.settings.diary,undefined);});
test('countdown records exact end, not the polling delay',()=>{const a={ctx:{currentTime:0,state:'running'},cancel(){},click(){}},c=fresh();c.duration=1;let e;const s=new Scheduler(a,(reason,end)=>{e=s.recorder.end(end,'id');});s.start(c,meta);clearInterval(s.timer);for(let t=.01;t<1.2;t+=.01){a.ctx.currentTime=t;s.tick();}assert.equal(e.seconds,1);assert.equal(s.running,false);});
test('scheduler stall does not record the long unplayed interval',()=>{const a={ctx:{currentTime:0,state:'running'},cancel(){},click(){}},s=new Scheduler(a,(reason,end)=>{result=s.recorder.end(end,'id');});let result;s.start(fresh(),meta);clearInterval(s.timer);for(let t=.01;t<1;t+=.01){a.ctx.currentTime=t;s.tick();}a.ctx.currentTime=300;s.tick();assert.ok(result.seconds<1.1);assert.equal(s.running,false);});

test('new archives default to 10 seconds and legacy archives migrate without changing recording behavior',()=>{
 const freshArchive=diaryDefaults();
 assert.equal(freshArchive.minAutoLogSeconds,10);
 assert.deepEqual(AUTO_LOG_MINIMUMS,[0,10,30,60]);
 const legacy={...freshArchive};delete legacy.minAutoLogSeconds;
 assert.equal(validateDiary(legacy).minAutoLogSeconds,0);
 const old=fresh();delete old.diary.minAutoLogSeconds;
 const migrated=validate(old);assert.equal(migrated.diary.minAutoLogSeconds,0);
 assert.equal(validate(fresh()).diary.minAutoLogSeconds,10);
 assert.throws(()=>validateDiary({...freshArchive,minAutoLogSeconds:15}),/diary/i);
});
test('a captured threshold excludes short audio sessions but permits sessions exactly on the boundary',()=>{
 for(const minimum of AUTO_LOG_MINIMUMS){
  const begin=(length)=>{
   const r=new PracticeRecorder();
   r.begin(0,100000,{...meta,minAutoLogSeconds:minimum});
   r.boundary(0,120,'standard');
   return r.end(length,'logged-'+minimum);
  };
  assert.equal(eligibleAutoLog(minimum===0?.05:minimum-.01,minimum),false);
  assert.equal(eligibleAutoLog(minimum===0?.1:minimum,minimum),true);
  if(minimum)assert.equal(begin(minimum-.01),null);
  assert.ok(begin(minimum===0?1:minimum));
 }
});
test('deleting last minute means recently ENDED entries, not entries shorter than one minute',()=>{
 const now=1_000_000;
 const old={...entry(),id:'older',end:now-120000,start:now-180000,seconds:60};
 const recent={...entry(),id:'recent',end:now-5000,start:now-65000,seconds:60};
 const recentShort={...entry(),id:'recentShort',end:now-59999,start:now-65000,seconds:5.001};
 const future={...entry(),id:'future',end:now+5000,start:now-55000};
 const diary={...diaryDefaults(),entries:[old,recent,recentShort,future]};
 assert.deepEqual(diaryDeletionTargets(diary.entries,'recent',now).map(x=>x.id),['recent','recentShort']);
 assert.equal(deleteDiaryEntries(diary,'recent',now),2);
 assert.deepEqual(diary.entries.map(x=>x.id),['older','future']);
 assert.equal(deleteDiaryEntries(diary,'recent',now),0);
 assert.equal(deleteDiaryEntries(diary,'all',now),2);
 assert.deepEqual(diary.entries,[]);
 assert.equal(diary.category,'Timing');
 assert.deepEqual(diary.categories,diaryDefaults().categories);
 assert.throws(()=>deleteDiaryEntries(diary,'everything'),RangeError);
});
test('all-records deletion affects diary entries only, not presets, sounds or settings',()=>{
 const s=fresh();s.diary.entries=[entry()];s.diary.enabled=false;
 s.diary.minAutoLogSeconds=30;
 s.bpm=184;s.presets=[{name:'favorite',settings:presetSettings(s)}];
 assert.equal(deleteDiaryEntries(s.diary,'all'),1);
 assert.equal(s.diary.entries.length,0);
 assert.equal(s.diary.enabled,false);
 assert.equal(s.diary.minAutoLogSeconds,30);
 assert.equal(s.bpm,184);
 assert.equal(s.presets[0].name,'favorite');
 assert.deepEqual(validate(JSON.parse(JSON.stringify(s))),s);
});
test('diary purge dialog has modal accessibility roles and session-running safety',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/diary-ui.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../v2-diary-maintenance.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(html,/id="diaryDeleteDialog"[^>]+role="alertdialog"/);
 assert.match(html,/id="diaryDangerCancel"/);
 assert.match(html,/id="diaryDangerConfirm"/);
 assert.match(ui,/if\(isRecording\(\)\)/);
 assert.match(ui,/deleteDialog\.showModal\(\)/);
 assert.match(ui,/deleteDiaryEntries\(diary\(\),deleteScope,deleteCutoff\)/);
 assert.match(css,/lcars-danger-dialog::backdrop/);
 assert.match(css,/#diaryDangerCancel/);
 assert.match(css,/#diaryDangerConfirm/);
 assert.match(sw,/const CACHE=PREFIX\+'lcars-core-v2-rc\d+/); // Version rotates for each release.
 assert.match(sw,/\.\/v2-diary-maintenance\.css/);
});
