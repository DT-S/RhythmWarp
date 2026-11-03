// Pure microphone archive selection. Complete hit histories survive for at most
// six distinct highlighted sessions. A compact rolling 7-day candidate index
// allows weekly best/worst to be recalculated as sessions age out.
export const WEEK_MS=7*24*60*60*1000;
export const CANDIDATE_MAX=1000;
export const SNAPSHOT_POINTS=96;
const valid=n=>typeof n==='number'&&Number.isFinite(n);
const summary=s=>s.benchmarkSummary??s.summary;
const windowValid=(s,now)=>valid(s.started)&&s.started<=now+86400000&&s.started>=now-WEEK_MS;
export function benchmarkScore(s){
 if(s?.mode!=='guided'||!valid(s.targetBpm)||s.targetBpm<=0||
    ![1,2,3,4].includes(s.referenceDivision??1)||!s.gridStats)return null;
 const m=summary(s),g=s.gridStats;
 if(!m||!valid(m.meanAbsMs)||m.meanAbsMs<0||
    !Number.isInteger(m.matched)||m.matched<30||
    !Number.isInteger(g.evaluated)||g.evaluated<60||
    !Number.isInteger(g.detected)||!Number.isInteger(g.missed)||
    g.detected+g.missed!==g.evaluated||g.detected<30||
    g.detected/g.evaluated<.6||!valid(s.seconds)||s.seconds<20)return null;
 // Normalize the absolute timing error to one intended strike interval, then
 // penalize undetected reference windows. This is NOT a musician rating.
 const interval=60000/(s.targetBpm*(s.referenceDivision??1));
 return Math.round((100*m.meanAbsMs/interval+50*g.missed/g.evaluated)*10000)/10000;
}
function sampleHits(hits){
 if(hits.length<=SNAPSHOT_POINTS)return hits.map(h=>[...h]);
 const step=(hits.length-1)/(SNAPSHOT_POINTS-1);
 const sampled=[];
 for(let i=0;i<SNAPSHOT_POINTS;i++)sampled.push([...hits[Math.round(i*step)]]);
 return sampled;
}
export function compactCandidate(s){
 const m=summary(s);
 return {id:s.id,version:1,mode:s.mode,started:s.started,seconds:s.seconds,
   targetBpm:s.targetBpm,inputDelayMs:s.inputDelayMs??0,referenceDivision:s.referenceDivision??1,
   gridStats:s.gridStats?{...s.gridStats}:null,
   benchmarkSummary:{...m},hits:sampleHits(s.hits),compact:true};
}
export function validateCandidates(input){
 if(!Array.isArray(input)||input.length>CANDIDATE_MAX)throw Error('Invalid microphone candidate index');
 const ids=new Set();
 for(const c of input){
   if(!c||!c.compact||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id)||
      !['guided','free'].includes(c.mode)||c.version!==1||!valid(c.started)||
      !valid(c.seconds)||c.seconds<0||c.seconds>604800||
      !Array.isArray(c.hits)||c.hits.length>SNAPSHOT_POINTS||
      !c.benchmarkSummary||!Number.isInteger(c.benchmarkSummary.count)||
      !Number.isInteger(c.benchmarkSummary.matched)||
      c.benchmarkSummary.matched>c.benchmarkSummary.count||
      c.benchmarkSummary.count<0||
      (c.benchmarkSummary.meanAbsMs!==null&&(!valid(c.benchmarkSummary.meanAbsMs)||c.benchmarkSummary.meanAbsMs<0||c.benchmarkSummary.meanAbsMs>1000))||
      ![1,2,3,4].includes(c.referenceDivision)||
      !valid(c.inputDelayMs)||Math.abs(c.inputDelayMs)>500||
      (c.mode==='guided'&&(!valid(c.targetBpm)||c.targetBpm<20||c.targetBpm>400))||
      (c.mode==='free'&&c.targetBpm!==null)||
      (c.gridStats!==null&&(!c.gridStats||!Number.isInteger(c.gridStats.evaluated)||
        !Number.isInteger(c.gridStats.detected)||!Number.isInteger(c.gridStats.missed)||
        c.gridStats.evaluated<0||c.gridStats.evaluated>20000000||
        c.gridStats.detected<0||c.gridStats.missed<0||
        c.gridStats.detected+c.gridStats.missed!==c.gridStats.evaluated||
        c.gridStats.detected>c.benchmarkSummary.matched)))
     throw Error('Invalid microphone candidate index');
   ids.add(c.id);
   let previous=-1;
   for(const h of c.hits){
     if(!Array.isArray(h)||h.length!==4||!Number.isInteger(h[0])||h[0]<previous||
        h[0]<0||h[0]>c.seconds*1000+2000||
        (h[1]!==null&&(!valid(h[1])||Math.abs(h[1])>1000))||
        !Number.isInteger(h[2])||h[2]<0||h[2]>1000||
        (h[3]!==null&&(!valid(h[3])||h[3]<=0||h[3]>1500)))throw Error('Invalid candidate hit sample');
     previous=h[0];
   }
 }
 return input;
}
const recent=(a,b)=>b.started-a.started||a.id.localeCompare(b.id);
function byScore(a,b){return benchmarkScore(a)-benchmarkScore(b)||b.started-a.started||a.id.localeCompare(b.id);}
function newestWinner(list,descending=false){
 const ranked=list.filter(s=>benchmarkScore(s)!==null).sort(byScore);
 return descending?ranked.at(-1)??null:ranked[0]??null;
}
export function classifyArchive(fullRecords,candidateRecords,now=Date.now()){
 const map=new Map();
 // Compact metadata for the rolling week; full records take precedence.
 for(const c of candidateRecords)if(windowValid(c,now))map.set(c.id,c);
 for(const s of fullRecords)map.set(s.id,s);
 const all=[...map.values()].sort(recent);
 const weekly=all.filter(s=>windowValid(s,now));
 const lastThree=all.slice(0,3),bestAll=newestWinner(all);
 const bestWeek=newestWinner(weekly),worstWeek=newestWinner(weekly,true);
 const slots={bestAll:bestAll?.id??null,bestWeek:bestWeek?.id??null,
   worstWeek:worstWeek?.id??null,recent:lastThree.map(s=>s.id)};
 const wanted=new Set([slots.bestAll,slots.bestWeek,slots.worstWeek,...slots.recent].filter(Boolean));
 return {slots,selected:[...wanted].map(id=>map.get(id)).filter(Boolean).sort(recent)};
}
export function retainArchive(fullRecords,candidateRecords,now=Date.now()){
 const cMap=new Map();
 for(const c of candidateRecords)if(windowValid(c,now))cMap.set(c.id,compactCandidate(c));
 for(const s of fullRecords)if(windowValid(s,now))cMap.set(s.id,compactCandidate(s));
 let candidates=[...cMap.values()].sort(recent);
 // Cap the compact rolling index. Keep extremes and newest entries if stressed.
 if(candidates.length>CANDIDATE_MAX){
   const best=newestWinner(candidates),worst=newestWinner(candidates,true);
   const keep=new Set([best?.id,worst?.id].filter(Boolean));
   for(const s of candidates){if(keep.size>=CANDIDATE_MAX)break;keep.add(s.id);}
   candidates=candidates.filter(s=>keep.has(s.id));
 }
 const selection=classifyArchive(fullRecords,candidates,now);
 return {candidates,records:selection.selected.map(s=>s.compact?compactCandidate(s):s),slots:selection.slots};
}
