import test from 'node:test';
import assert from 'node:assert/strict';
import {projectTacticalBars,tacticalBeatPosition,TACTICAL_BEAT_SPACING,TACTICAL_NOW_X} from '../src/tactical-timeline.js';
import {cycleLength,rampTempo} from '../src/rhythm.js';

const settings=(mode='standard',overrides={})=>({
 mode,bpm:120,beats:4,subdivisions:2,
 training:{targetBpm:150,bpmStep:10,changeBars:1,rampReturn:false},...overrides
});
const clock=(s,overrides={})=>({
 running:true,anchor:100,bpm:rampTempo(s,0),length:cycleLength(s),
 bar:0,modeBar:0,settings:s,pending:s,...overrides
});
test('Tactical lookahead draws the active and 4 future bars before any onGrid event',()=>{
 const s=settings(),x=projectTacticalBars(clock(s));
 assert.equal(x.length,5);
 assert.deepEqual(x.map(b=>b.bar),[0,1,2,3,4]);
 assert.deepEqual(x.map(b=>b.bpm),[120,120,120,120,120]);
 for(let i=1;i<x.length;i++){
  assert.ok(Math.abs(x[i].anchor-(x[i-1].anchor+x[i-1].length*60/x[i-1].bpm))<1e-9);
  assert.equal(x[i].projected,true);
 }
 assert.equal(x[0].projected,false);
});
test('tempo ramp lookahead uses scheduler rampTempo for each future bar, with no boundary gaps',()=>{
 const s=settings('ramp');
 const x=projectTacticalBars(clock(s),6);
 assert.deepEqual(x.map(b=>b.bpm),[120,130,140,150,150,150,150]);
 assert.deepEqual(x.map(b=>b.modeBar),[0,1,2,3,4,5,6]);
 for(let i=1;i<x.length;i++)
  assert.ok(Math.abs(x[i].anchor-(x[i-1].anchor+x[i-1].length*60/x[i-1].bpm))<1e-9);
});
test('returning tempo ramp forecasts deceleration too, without altering the audio scheduler',()=>{
 const s=settings('ramp',{training:{targetBpm:150,bpmStep:10,changeBars:1,rampReturn:true}});
 const x=projectTacticalBars(clock(s),6);
 assert.deepEqual(x.map(b=>b.bpm),[120,130,140,150,140,130,120]);
});
test('pending mode and tempo edits reset phase only at next scheduler bar',()=>{
 const old=settings('standard'),next=settings('ramp',{bpm:95,
  training:{targetBpm:125,bpmStep:15,changeBars:1,rampReturn:false}});
 const x=projectTacticalBars(clock(old,{modeBar:16,pending:next}),3);
 assert.deepEqual(x.map(b=>b.bpm),[120,95,110,125]);
 assert.deepEqual(x.map(b=>b.modeBar),[16,0,1,2]);
 assert.equal(x[1].anchor,102);
 assert.equal(old.bpm,120,'source settings were modified');
 assert.equal(next.bpm,95,'pending settings were modified');
});
test('count-in forecasts exact bar zero without starting the ramp prematurely',()=>{
 const s=settings('ramp');
 const x=projectTacticalBars(clock(s,{bar:-1,bpm:120,modeBar:0}),3);
 assert.deepEqual(x.map(b=>b.bar),[-1,0,1,2]);
 assert.deepEqual(x.map(b=>b.bpm),[120,120,130,140]);
});
test('stopped or invalid scheduler state does not invent future reference clicks',()=>{
 const s=settings();
 assert.deepEqual(projectTacticalBars(clock(s,{running:false})),[]);
 assert.deepEqual(projectTacticalBars(clock(s,{bpm:0})),[]);
 assert.deepEqual(projectTacticalBars(null),[]);
});

test('Count-in bar remains a continuous musical coordinate through the first played bar',()=>{
 const s=settings();
 const clockDuringCountIn=clock(s,{bar:-1,bpm:120,anchor:100,length:4,modeBar:0});
 const all=projectTacticalBars(clockDuringCountIn,4);
 const countIn=all[0],first=all[1];
 assert.equal(countIn.bar,-1);assert.equal(first.bar,0);
 assert.equal(first.anchor,102);
 assert.equal(tacticalBeatPosition(countIn.anchor,all),0);
 assert.equal(tacticalBeatPosition(first.anchor,all),4);
 assert.ok(Math.abs(tacticalBeatPosition(101.99,all)-3.98)<1e-8);
 assert.ok(Math.abs(tacticalBeatPosition(102.01,all)-4.02)<1e-8);
 const firstBarX=at=>TACTICAL_NOW_X+(tacticalBeatPosition(first.anchor,all)-tacticalBeatPosition(at,all))*TACTICAL_BEAT_SPACING;
 assert.ok(firstBarX(102.01)<firstBarX(101.99),'first regular bar keeps moving left, no teleport');
 assert.ok(firstBarX(101.99)-firstBarX(102.01)<4,'crossing count-in boundary must not jump');
});
test('Beat spacing stays spacious even when multiple future bars are precomputed',()=>{
 const s=settings(),projected=projectTacticalBars(clock(s));
 const origin=tacticalBeatPosition(100,projected);
 for(let q=1;q<=8;q++){
  const time=100+q*.5;
  const x=TACTICAL_NOW_X+(tacticalBeatPosition(time,projected)-origin)*TACTICAL_BEAT_SPACING;
  assert.ok(Math.abs(x-(TACTICAL_NOW_X+q*TACTICAL_BEAT_SPACING))<1e-7);
 }
 assert.ok(TACTICAL_BEAT_SPACING>=65,'should not cram 3 bars into 295 SVG pixels');
});
test('Tempo ramp accelerates visual motion without shrinking per-beat distances',()=>{
 const s=settings('ramp');
 const segs=projectTacticalBars(clock(s),4);
 const t1=segs[1].anchor,t2=t1+60/130;
 assert.ok(Math.abs(tacticalBeatPosition(t2,segs)-tacticalBeatPosition(t1,segs)-1)<1e-8);
 const next=segs[2].anchor;
 assert.ok(Math.abs(tacticalBeatPosition(next,segs)-tacticalBeatPosition(t1,segs)-4)<1e-8);
 // This is precisely the same visual quarter-note distance as at 120 BPM,
 // but the AudioContext time to traverse it is shorter at 130 BPM.
 assert.ok(t2-t1<.5);
});

test('Tactical NOW cursor retains at least four quarters of past hit history',()=>{
 assert.ok(TACTICAL_NOW_X>=310&&TACTICAL_NOW_X<=350);
 assert.ok(TACTICAL_NOW_X/TACTICAL_BEAT_SPACING>4);
 assert.ok(420-TACTICAL_NOW_X>=60);
});
