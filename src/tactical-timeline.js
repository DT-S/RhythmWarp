// Pure display-only lookahead for Voyager Tactical's scrolling lane.
// Mirrors Scheduler.prepare()/tick() bar boundaries, including pending edits
// and rampTempo(). AudioEngine's scheduling queue is never modified.
import {cycleLength,rampTempo} from './rhythm.js';

const valid=x=>typeof x==='number'&&Number.isFinite(x);
export function projectTacticalBars(clock,following=4){
 if(!clock?.running||!valid(clock.anchor)||!valid(clock.bpm)||
    !valid(clock.length)||clock.bpm<=0||clock.length<=0||!clock.settings)return [];
 const base=clock.settings;
 let settings=base;
 let bar=Number.isInteger(clock.bar)?clock.bar:0;
 let modeBar=Number.isInteger(clock.modeBar)?clock.modeBar:0;
 let anchor=clock.anchor;
 let bpm=clock.bpm;
 let length=clock.length;
 const result=[];
 const count=Math.max(0,Math.min(6,Math.trunc(following)));
 for(let i=0;i<=count;i++){
  result.push({anchor,bpm,length,bar,modeBar,settings,projected:i>0});
  const nextBar=bar+1;
  const pending=clock.pending||settings;
  let nextModeBar=modeBar+(nextBar>0?1:0);
  // Exactly the same reset triggers as Scheduler.tick() at a bar boundary.
  if(nextBar>=0&&(settings.mode!==pending.mode||
    settings.beats!==pending.beats||
    settings.subdivisions!==pending.subdivisions||
    JSON.stringify(settings.training)!==JSON.stringify(pending.training)||
    settings.bpm!==pending.bpm))nextModeBar=0;
  anchor+=length*60/bpm;
  if(nextBar>=0)settings=pending;
  bar=nextBar;modeBar=nextModeBar;
  bpm=rampTempo(settings,bar<0?-1:modeBar);
  length=cycleLength(settings);
  if(!valid(length)||!valid(bpm)||length<=0||bpm<=0)break;
 }
 return result;
}

/** Visual distance between neighbouring quarter-note reference ticks. */
export const TACTICAL_BEAT_SPACING=72;
export const TACTICAL_NOW_X=326; // More readable strike history at high BPM

/**
 * Map a real AudioContext timestamp to a continuous musical-quarter axis.
 * This deliberately does not zoom out to fit future bars. Each bar owns its
 * actual beat duration, so tempo ramps change the SCROLL SPEED, not the
 * distance between beats. A retained count-in bar preserves the origin at
 * the transition to bar zero.
 */
export function tacticalBeatPosition(time,segments){
 if(!valid(time)||!Array.isArray(segments)||!segments.length)return null;
 const ordered=segments.filter(b=>valid(b.anchor)&&valid(b.bpm)&&valid(b.length)&&
   b.bpm>0&&b.length>0).slice().sort((a,b)=>a.anchor-b.anchor);
 if(!ordered.length)return null;
 let beats=0;
 for(let i=0;i<ordered.length;i++){
  const bar=ordered[i];
  const next=ordered[i+1];
  if(!next||time<next.anchor-1e-8){
   return beats+(time-bar.anchor)*bar.bpm/60;
  }
  beats+=bar.length;
 }
 return null;
}
