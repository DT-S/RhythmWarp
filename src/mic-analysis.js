// Pure analysis of transient timestamps. Times share the AudioContext clock.
// Metrics describe detected attacks, not musical ability or verified accuracy.
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const round=v=>Math.round(v*10)/10;
// Positive delay shifts detected microphone timestamps earlier; experimental correction.
export function validateInputDelayMs(v){
 if(typeof v!=='number'||!Number.isFinite(v)||v< -500||v>500||
    Math.abs(v*10-Math.round(v*10))>1e-7)throw Error('Invalid microphone input delay');
 return round(v);
}
// User-selected straight reference grid; independent from audible click patterns.
export function validateReferenceDivision(value){
 if(!Number.isInteger(value)||![1,2,3,4].includes(value))throw Error('Invalid analysis reference division');
 return value;
}
export class TimingSession {
  constructor({mode,at,wall=Date.now(),bpm=0,inputDelayMs=0,referenceDivision=1}) {
    if(!['guided','free'].includes(mode)||!finite(at))throw Error('Invalid analysis mode/time');
    this.mode=mode;this.at=at;this.wall=wall;this.bpm=bpm;this.inputDelayMs=validateInputDelayMs(inputDelayMs);
    this.referenceDivision=validateReferenceDivision(referenceDivision);
    this.hits=[];this.grid=[];this.lastTimes=[];this.limit=60000;
    this.closedSlots=0;this.matchedSlots=0;this.missedSlots=0;
  }
  // Only a reference window whose entire tolerance has elapsed is evaluated.
  // A future slot is not a missed strike, even if it was scheduled ahead.
  progress(now){
    if(this.mode!=='guided'||!finite(now))return null;
    const cutoff=now-this.inputDelayMs/1000;
    const remaining=[];
    for(const g of this.grid){
      const gate=Math.min(.22,.45*60/(g.bpm*this.referenceDivision));
      if(g.time+gate<=cutoff){
        this.closedSlots++;
        if(g.used)this.matchedSlots++;else this.missedSlots++;
      }else remaining.push(g);
    }
    this.grid=remaining;
    return this.gridProgress();
  }
  gridProgress(){
    if(this.mode!=='guided')return null;
    return {evaluated:this.closedSlots,detected:this.matchedSlots,missed:this.missedSlots};
  }
  addGrid({anchor,bpm,length}) {
    if(this.mode!=='guided'||!finite(anchor)||!finite(bpm)||bpm<=0||!finite(length)||length<=0)return;
    // Scheduler prepares the next bar ahead of real audio time. Never expire
    // reference slots using a *future* bar anchor as if it were current time.
    for(let i=0;i<=Math.ceil(length*this.referenceDivision);i++){
      const time=anchor+i*60/(bpm*this.referenceDivision);
      // Forecast the NEXT downbeat so early strikes across bar boundaries can match.
      if(time>=this.at&&time<=anchor+length*60/bpm+1e-6&&
         !this.grid.some(g=>Math.abs(g.time-time)<.0002))this.grid.push({time,bpm,used:false});
    }
    // Defensive bound: retire old windows before discarding any entries.
    // In normal scheduler operation fewer than two bars remain active.
    if(this.grid.length>400){
      const overflow=this.grid.splice(0,this.grid.length-400);
      for(const g of overflow){
        this.closedSlots++;
        if(g.used)this.matchedSlots++;else this.missedSlots++;
      }
    }
  }
  hit(time,level=0){
    if(!finite(time)||time<this.at||this.hits.length>=this.limit)return null;
    this.lastTimes.push(time);if(this.lastTimes.length>5)this.lastTimes.shift();
    const intervals=this.lastTimes.length-1;
    const duration=this.lastTimes.at(-1)-this.lastTimes[0];
    const candidate=intervals>=2&&duration>.06?round(60*intervals/duration):null;
    const rate=candidate!==null&&candidate<=1500?candidate:null;
    // Archive raw onset elapsed time, but compare corrected arrival against the grid.
    const comparedTime=time-this.inputDelayMs/1000;
    this.progress(time);
    let closest=null,distance=Infinity,nearUsed=false,nearAny=false,hasReference=this.grid.length>0;
    if(this.mode==='guided'){
      hasReference=this.grid.length>0;
      for(const g of this.grid){
        const delta=comparedTime-g.time,allowed=Math.min(.22,.45*60/(g.bpm*this.referenceDivision));
        if(Math.abs(delta)>allowed)continue;
        nearAny=true;
        if(g.used){nearUsed=true;continue;}
        if(Math.abs(delta)<distance){closest=g;distance=Math.abs(delta);}
      }
    }
    if(closest)closest.used=true;
    const hit=[Math.round((time-this.at)*1000),closest?round((comparedTime-closest.time)*1000):null,
      Math.round(Math.max(0,Math.min(1,level))*1000),rate];
    this.hits.push(hit);
    const reason=this.mode==='free'?'FREE':closest?'MATCHED':
      !hasReference?'NO REFERENCE':nearAny&&nearUsed?'ADDITIONAL STRIKE':'OUTSIDE REFERENCE GRID';
    return {elapsedMs:hit[0],offsetMs:hit[1],rateBpm:rate,count:this.hits.length,reason};
  }
  snapshot(endTime,id){
    if(!finite(endTime)||endTime<this.at||!id)throw Error('Invalid session end');
    this.progress(endTime);
    return {id,version:1,mode:this.mode,started:this.wall,seconds:round(endTime-this.at),
      targetBpm:this.mode==='guided'?this.bpm:null,inputDelayMs:this.inputDelayMs,
      referenceDivision:this.referenceDivision,gridStats:this.gridProgress(),hits:this.hits.map(h=>[...h]),
      summary:summarizeHits(this.hits)};
  }
}
export function summarizeHits(hits){
  const errors=hits.map(h=>h[1]).filter(finite),sorted=[...errors].sort((a,b)=>a-b);
  const n=errors.length,mean=n?errors.reduce((a,b)=>a+b,0)/n:null;
  const abs=n?errors.reduce((a,b)=>a+Math.abs(b),0)/n:null;
  const median=n?(sorted[(n-1)>>1]+sorted[n>>1])/2:null;
  const sd=n?Math.sqrt(errors.reduce((a,b)=>a+(b-mean)**2,0)/n):null;
  const rates=hits.map(h=>h[3]).filter(v=>finite(v)&&v>0&&v<1500);
  return {count:hits.length,matched:n,unmatched:hits.length-n,
    meanMs:mean===null?null:round(mean),medianMs:median===null?null:round(median),
    meanAbsMs:abs===null?null:round(abs),spreadMs:sd===null?null:round(sd),
    early:errors.filter(v=>v<0).length,late:errors.filter(v=>v>0).length,
    hitRateBpm:rates.length?round(rates.at(-1)):null};
}
export function validateAnalysisSessions(sessions){
 if(!Array.isArray(sessions)||sessions.length>500)throw Error('Invalid analysis archive');
 const ids=new Set();
 return sessions.map(s=>{
   if(!s||s.version!==1||typeof s.id!=='string'||s.id.length>100||!s.id||ids.has(s.id)||
      !['guided','free'].includes(s.mode)||!finite(s.started)||s.started<0||
      !finite(s.seconds)||s.seconds<0||s.seconds>604800||
      (s.targetBpm!==null&&(!finite(s.targetBpm)||s.targetBpm<20||s.targetBpm>400))||
      !Array.isArray(s.hits)||s.hits.length>60000)throw Error('Invalid analysis session');
   ids.add(s.id);const inputDelayMs=validateInputDelayMs(s.inputDelayMs??0);
   const referenceDivision=validateReferenceDivision(s.referenceDivision===undefined?1:s.referenceDivision);let last=-1;
   for(const h of s.hits){
     if(!Array.isArray(h)||h.length!==4||!Number.isInteger(h[0])||h[0]<last||h[0]<0||
        h[0]>s.seconds*1000+2000||
        (h[1]!==null&&(!finite(h[1])||Math.abs(h[1])>1000))||
        !Number.isInteger(h[2])||h[2]<0||h[2]>1000||
        (h[3]!==null&&(!finite(h[3])||h[3]<=0||h[3]>1500)))throw Error('Invalid hit event');
     last=h[0];
   }
   const compact=s.compact===true;
   if(s.compact!==undefined&&s.compact!==true)throw Error('Invalid compact session flag');
   const benchmarkSummary=s.benchmarkSummary;
   if(compact){
     if(!benchmarkSummary||typeof benchmarkSummary!=='object'||
        !Number.isSafeInteger(benchmarkSummary.count)||benchmarkSummary.count<s.hits.length||
        !Number.isSafeInteger(benchmarkSummary.matched)||benchmarkSummary.matched<0||
        benchmarkSummary.matched>benchmarkSummary.count||
        !Number.isSafeInteger(benchmarkSummary.unmatched)||
        benchmarkSummary.unmatched!==benchmarkSummary.count-benchmarkSummary.matched||
        (benchmarkSummary.meanAbsMs!==null&&(!finite(benchmarkSummary.meanAbsMs)||
          benchmarkSummary.meanAbsMs<0||benchmarkSummary.meanAbsMs>1000))||
        ['meanMs','medianMs','spreadMs','hitRateBpm'].some(k=>
          benchmarkSummary[k]!==null&&(!finite(benchmarkSummary[k])||
            Math.abs(benchmarkSummary[k])>1500)))
       throw Error('Invalid compact benchmark summary');
   }else if(benchmarkSummary!==undefined)throw Error('Benchmark summary requires compact session');
   const gridStats=s.gridStats===undefined?null:s.gridStats;
   if(gridStats!==null){
     if(s.mode!=='guided'||!gridStats||typeof gridStats!=='object'||
        !['evaluated','detected','missed'].every(k=>Number.isSafeInteger(gridStats[k])&&gridStats[k]>=0&&gridStats[k]<=20000000)||
        gridStats.detected+gridStats.missed!==gridStats.evaluated||
        gridStats.detected>(compact?benchmarkSummary.matched:
          s.hits.filter(h=>h[1]!==null).length))throw Error('Invalid reference grid stats');
   }
   return {...s,inputDelayMs,referenceDivision,gridStats:gridStats?{evaluated:gridStats.evaluated,
     detected:gridStats.detected,missed:gridStats.missed}:null,
     summary:summarizeHits(s.hits),hits:s.hits.map(h=>[...h])};
 });
}
