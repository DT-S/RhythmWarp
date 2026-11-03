import test from 'node:test';
import assert from 'node:assert/strict';
import {benchmarkScore,compactCandidate,retainArchive,classifyArchive,validateCandidates,WEEK_MS,SNAPSHOT_POINTS} from '../src/mic-retention.js';
const day=86400000,now=1764000000000;
function session(id,ago,{err=8,missed=5,count=100,free=false,division=2}={}){
 const started=now-ago*day;
 const hits=Array.from({length:count},(_,i)=>[i*250,free?null:err,150,240]);
 return {id,version:1,mode:free?'free':'guided',started,seconds:120,
  targetBpm:free?null:120,referenceDivision:division,inputDelayMs:20,
  hits,summary:{count,matched:free?0:count,meanAbsMs:free?null:err},
  gridStats:free?null:{evaluated:count+missed,detected:count,missed}};
}
test('selection covers all-time best, rolling-week extremes and last three, deduped',()=>{
 const records=[session('oldBest',30,{err:2}),session('weekBest',1,{err:4}),
  session('weekWorst',2,{err:48}),session('recent',.1,{err:18}),session('extra',.3,{err:25}),
  session('free',0,{free:true})];
 const r=retainArchive(records,[],now);
 assert.equal(r.slots.bestAll,'oldBest');
 assert.equal(r.slots.bestWeek,'weekBest');
 assert.equal(r.slots.worstWeek,'weekWorst');
 assert.deepEqual(r.slots.recent,['free','recent','extra']);
 assert.equal(r.records.length,6);
 assert.equal(r.candidates.length,5);
 assert.ok(r.records.some(s=>s.id==='free'));
});
test('seven-day rollover promotes next best via compact comparisons',()=>{
 const all=[session('alltime',20,{err:1}),session('expiring',6.9,{err:3}),
 session('next',5,{err:7}),session('worst',2,{err:52}),session('newest',0,{err:15})];
 const a=retainArchive(all,[],now);
 assert.equal(a.slots.bestWeek,'expiring');
 const b=retainArchive(a.records,a.candidates,now+day);
 assert.equal(b.slots.bestWeek,'next');
 assert.equal(b.slots.bestAll,'alltime');
 assert.ok(b.records.length<=6);
});
test('rank requires enough measured slots and values are normalized to intended interval',()=>{
 assert.equal(benchmarkScore(session('tiny',0,{count:3})),null);
 assert.equal(benchmarkScore(session('free',0,{free:true})),null);
 assert.equal(benchmarkScore(session('untrusted',0,{count:40,missed:90})),null);
 assert.ok(benchmarkScore(session('stable',0,{err:8,division:4}))>
  benchmarkScore(session('stable2',0,{err:8,division:1})));
});
test('rolling candidate records are sampled, small, and invalid imported entries fail',()=>{
 const s=session('long',1,{count:12000});
 s.seconds=3600;
 const c=compactCandidate(s);
 assert.equal(c.hits.length,SNAPSHOT_POINTS);
 assert.equal(c.benchmarkSummary.count,12000);
 assert.equal(validateCandidates([c])[0].id,'long');
 assert.throws(()=>validateCandidates([c,c]),/Invalid/);
 assert.throws(()=>validateCandidates([{...c,hits:[[1,'bad',1,120]]}]),/Invalid/);
});
test('zero eligible sessions never get a fabricated best or worst',()=>{
 const r=retainArchive([session('free',0,{free:true})],[],now);
 assert.equal(r.slots.bestAll,null);assert.equal(r.slots.bestWeek,null);
 assert.equal(r.slots.worstWeek,null);assert.deepEqual(r.slots.recent,['free']);
});
test('expired comparison candidates are removed while persistent all-time champion remains',()=>{
 const a=retainArchive([session('legend',100,{err:1}),session('oldweek',6,{err:9})],[],now);
 const b=retainArchive(a.records,a.candidates,now+WEEK_MS+1);
 assert.equal(b.candidates.length,0);
 assert.equal(b.slots.bestAll,'legend');
});
