import test from 'node:test';
import assert from 'node:assert/strict';
import {TimingSession,summarizeHits,validateAnalysisSessions,validateReferenceDivision} from '../src/mic-analysis.js';
test('guided matching preserves early, late, missed and one-to-one beat associations',()=>{
 const a=new TimingSession({mode:'guided',at:10,bpm:120,wall:1000});
 a.addGrid({anchor:10,bpm:120,length:4});
 assert.equal(a.hit(10.015,.05).offsetMs,15);
 assert.equal(a.hit(10.02,.1).offsetMs,null);
 assert.equal(a.hit(10.485,.06).offsetMs,-15);
 assert.equal(a.hit(11.25,.08).offsetMs,null);
 const s=a.snapshot(12,'abc');
 assert.equal(s.summary.matched,2);assert.equal(s.summary.unmatched,2);
 assert.equal(s.summary.meanMs,0);assert.equal(s.summary.spreadMs,15);
});
test('free mode reports raw hit rate, not speculative musical tempo',()=>{
 const a=new TimingSession({mode:'free',at:0});
 a.hit(0,.02);a.hit(.5,.02);const third=a.hit(1,.02);
 assert.equal(third.rateBpm,120);
 assert.equal(third.offsetMs,null);
 assert.equal(a.snapshot(1.1,'free').summary.hitRateBpm,120);
});
test('empty and unusual sessions remain valid without invented scores',()=>{
 assert.deepEqual(summarizeHits([]),{count:0,matched:0,unmatched:0,
   meanMs:null,medianMs:null,meanAbsMs:null,spreadMs:null,
   early:0,late:0,hitRateBpm:null});
 const a=new TimingSession({mode:'free',at:3});a.hit(3.1);
 assert.equal(validateAnalysisSessions([a.snapshot(4,'q')])[0].hits.length,1);
});
test('invalid imported timestamps and duplicate sessions are rejected',()=>{
 const a=new TimingSession({mode:'free',at:0});a.hit(.2);
 const session=a.snapshot(.5,'one');
 assert.throws(()=>validateAnalysisSessions([session,session]),/Invalid/);
 assert.throws(()=>validateAnalysisSessions([{...session,hits:[[60000,null,3,null]]}]),/Invalid/);
});

test('a strike before the next bar can match the forecast downbeat only once',()=>{
 const s=new TimingSession({mode:'guided',at:0,bpm:120});
 s.addGrid({anchor:.12,bpm:120,length:4});
 assert.equal(s.hit(2.09).offsetMs,-30);
 s.addGrid({anchor:2.12,bpm:120,length:4});
 assert.equal(s.hit(2.15).offsetMs,null);
});
test('sub-60 ms sample duplicate cannot produce infinite raw hit rate',()=>{
 const s=new TimingSession({mode:'free',at:0});
 s.hit(0);s.hit(.001);
 assert.equal(s.hit(.002).rateBpm,null);
 assert.equal(s.snapshot(.01,'fast').summary.hitRateBpm,null);
});

test('manual input delay is subtracted from detected onset before quarter matching',()=>{
 const a=new TimingSession({mode:'guided',at:10,bpm:120,inputDelayMs:74.3});
 a.addGrid({anchor:10.12,bpm:120,length:4});
 const hit=a.hit(10.1943);
 assert.equal(hit.offsetMs,0);
 assert.equal(hit.reason,'MATCHED');
 const rec=a.snapshot(11,'calibrated');
 assert.equal(rec.inputDelayMs,74.3);
 assert.equal(validateAnalysisSessions([rec])[0].inputDelayMs,74.3);
});
test('extra attacks and onsets outside quarter grid receive distinct diagnostics',()=>{
 const a=new TimingSession({mode:'guided',at:5,bpm:120});
 a.addGrid({anchor:5.12,bpm:120,length:4});
 assert.equal(a.hit(5.13).reason,'MATCHED');
 assert.equal(a.hit(5.14).reason,'ADDITIONAL STRIKE');
 assert.equal(a.hit(5.37).reason,'OUTSIDE REFERENCE GRID');
});
test('legacy session imports default correction to zero and invalid settings are rejected',()=>{
 const a=new TimingSession({mode:'free',at:0}).snapshot(1,'legacy');
 delete a.inputDelayMs;
 assert.equal(validateAnalysisSessions([a])[0].inputDelayMs,0);
 for(const inputDelayMs of [Infinity,700,'50',0.05])
   assert.throws(()=>new TimingSession({mode:'guided',at:0,inputDelayMs}),/Invalid/);
 assert.throws(()=>validateAnalysisSessions([{...a,inputDelayMs:999}]),/Invalid/);
});

test('guided x2, x3, x4 recognize eighth, triplet and sixteenth onsets',()=>{
 for(const division of [2,3,4]){
  const s=new TimingSession({mode:'guided',at:10,bpm:120,inputDelayMs:75,referenceDivision:division});
  s.addGrid({anchor:10.1,bpm:120,length:2});
  for(let i=0;i<2*division;i++){
   const hit=s.hit(10.1+i*.5/division+.075);
   assert.equal(hit.reason,'MATCHED',division+' subdiv '+i);
   assert.equal(hit.offsetMs,0);
  }
  const rec=s.snapshot(11.2,'division-'+division);
  assert.equal(rec.referenceDivision,division);
  assert.equal(rec.targetBpm,120,'quarter-note tempo is unchanged');
  assert.equal(validateAnalysisSessions([rec])[0].referenceDivision,division);
 }
});
test('subdivision gate never steals an adjacent grid position',()=>{
 const s=new TimingSession({mode:'guided',at:0,bpm:120,referenceDivision:4});
 s.addGrid({anchor:.12,bpm:120,length:1});
 assert.equal(s.hit(.12).reason,'MATCHED');
 assert.equal(s.hit(.13).reason,'ADDITIONAL STRIKE');
 assert.equal(s.hit(.183).reason,'OUTSIDE REFERENCE GRID');
 assert.equal(s.hit(.245).offsetMs,0);
 assert.equal(s.hit(.37).offsetMs,0);
});
test('forecast next-bar subdivision slot survives boundary de-duplication',()=>{
 const s=new TimingSession({mode:'guided',at:0,bpm:120,referenceDivision:2});
 s.addGrid({anchor:.12,bpm:120,length:4});
 assert.equal(s.hit(2.10).offsetMs,-20);
 s.addGrid({anchor:2.12,bpm:120,length:4});
 assert.equal(s.hit(2.125).reason,'ADDITIONAL STRIKE');
});
test('legacy analysis defaults to quarters; invalid divisions fail validation',()=>{
 const legacy=new TimingSession({mode:'guided',at:0,bpm:120}).snapshot(1,'legacy-division');
 delete legacy.referenceDivision;
 assert.equal(validateAnalysisSessions([legacy])[0].referenceDivision,1);
 for(const v of [0,5,2.5,'2',null]){
  assert.throws(()=>validateReferenceDivision(v),/Invalid/);
  assert.throws(()=>validateAnalysisSessions([{...legacy,referenceDivision:v}]),/Invalid/);
 }
});

test('missed grid points are counted only after their tolerance window closes',()=>{
 const s=new TimingSession({mode:'guided',at:0,bpm:120,referenceDivision:2});
 s.addGrid({anchor:.12,bpm:120,length:2});
 assert.deepEqual(s.progress(.2),{evaluated:0,detected:0,missed:0});
 assert.equal(s.hit(.14).reason,'MATCHED');
 assert.deepEqual(s.progress(.2),{evaluated:0,detected:0,missed:0});
 assert.deepEqual(s.progress(.24),{evaluated:1,detected:1,missed:0});
 assert.deepEqual(s.progress(.49),{evaluated:2,detected:1,missed:1});
 assert.equal(s.hit(.625).reason,'MATCHED');
 const record=s.snapshot(.83,'completed');
 assert.deepEqual(record.gridStats,{evaluated:3,detected:2,missed:1});
 assert.deepEqual(validateAnalysisSessions([record])[0].gridStats,record.gridStats);
});
test('manual input compensation delays evaluating the final slot until a matching mic onset can arrive',()=>{
 const s=new TimingSession({mode:'guided',at:1,bpm:120,referenceDivision:4,inputDelayMs:100});
 s.addGrid({anchor:1.2,bpm:120,length:1});
 assert.equal(s.progress(1.32).evaluated,0);
 assert.equal(s.hit(1.3).offsetMs,0);
 assert.equal(s.progress(1.37).detected,1);
});
test('free mode never invents a missed-grid statistic; old sessions remain valid',()=>{
 const free=new TimingSession({mode:'free',at:0});
 free.hit(.25);
 assert.equal(free.snapshot(1,'free-progress').gridStats,null);
 const legacy=new TimingSession({mode:'guided',at:0,bpm:120}).snapshot(1,'legacy-progress');
 delete legacy.gridStats;
 assert.equal(validateAnalysisSessions([legacy])[0].gridStats,null);
});
test('reject corrupted reference statistics in restored archives',()=>{
 const s=new TimingSession({mode:'guided',at:0,bpm:120});
 s.addGrid({anchor:0,bpm:120,length:1});
 s.hit(.02);
 const record=s.snapshot(1,'corrupted-stats');
 for(const gridStats of [{evaluated:1,detected:4,missed:0},{evaluated:10,detected:1,missed:0},
   {evaluated:-1,detected:0,missed:0},'bad']){
   assert.throws(()=>validateAnalysisSessions([{...record,gridStats}]),/Invalid/);
 }
});

test('lookahead for next bar never prematurely expires fast subdivision slots',()=>{
 const s=new TimingSession({mode:'guided',at:0,bpm:300,referenceDivision:4});
 // At 300 BPM, each sixteenth slot is 50ms apart; prepare next bar early.
 s.addGrid({anchor:.12,bpm:300,length:4});
 const before=s.gridProgress();
 s.addGrid({anchor:.92,bpm:300,length:4});
 assert.deepEqual(s.gridProgress(),before,'scheduler lookahead must not mark future slots missed');
 assert.equal(s.hit(.87).offsetMs,0,'late-in-bar hit still finds its slot');
 const after=s.progress(.92);
 assert.ok(after.missed>0);
 assert.equal(after.detected,1);
});

test('compact archive validates original summary separately from sampled plot events',()=>{
 const original=new TimingSession({mode:'guided',at:0,bpm:120,referenceDivision:2});
 original.addGrid({anchor:.1,bpm:120,length:80});
 for(let i=0;i<100;i++)original.hit(.1+i*.25);
 const record=original.snapshot(28,'compact-archive');
 // Simulate a retained full-session benchmark with fewer sampled chart points.
 const compact={...record,compact:true,hits:record.hits.slice(0,12),
   benchmarkSummary:record.summary};
 const imported=validateAnalysisSessions([compact])[0];
 assert.equal(imported.benchmarkSummary.count,100);
 assert.equal(imported.hits.length,12);
 assert.throws(()=>validateAnalysisSessions([{...compact,benchmarkSummary:{count:-1}}]),/Invalid/);
});
