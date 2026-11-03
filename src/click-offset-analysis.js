// Click-only readout; no pad learning, correction or persistence.
const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),i=b.length>>1;return b.length%2?b[i]:(b[i-1]+b[i])/2;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const CLICK_COUNT=6,CLICK_SPACING_SECONDS=.72;
export function measureClickOffset({samples,firstFrame,sampleRate,stride,scheduled}){
 if(!(samples instanceof Float32Array)||!samples.length||!Number.isFinite(firstFrame)||firstFrame<0||
   !Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000||
   !Number.isInteger(stride)||stride<1||stride>32||!Array.isArray(scheduled)||
   scheduled.length!==CLICK_COUNT||!scheduled.every(Number.isFinite))throw Error('Invalid audible click measurement');
 const hz=sampleRate/stride,base=firstFrame/sampleRate;
 if(hz<6000||hz>16000)throw Error('Unsupported microphone sample rate');
 const env=new Float32Array(samples.length),width=Math.max(1,Math.round(hz*.006));
 let sum=0;
 for(let i=0;i<samples.length;i++){
   const v=samples[i];sum+=v*v;
   if(i>=width)sum-=samples[i-width]*samples[i-width];
   env[i]=Math.sqrt(Math.max(0,sum)/Math.min(i+1,width));
 }
 const ix=t=>clamp(Math.round((t-base)*hz),0,env.length-1);
 const delays=[];
 for(const time of scheduled){
   const a=ix(time+.008),b=ix(time+.52);
   if(b<=a)continue;
   const fa=ix(time-.17),fb=ix(time-.04);
   const floor=fb>fa?median([...env.slice(fa,fb)])||.0001:.0001;
   let peak=0,at=-1;
   for(let i=a;i<=b;i++)if(env[i]>peak){peak=env[i];at=i;}
   if(at<0||peak<Math.max(.0015,floor*3))continue;
   const threshold=Math.max(floor*2,peak*.18,.0007);
   let onset=at;
   for(let i=at;i>=Math.max(a,at-Math.round(hz*.045));i--){
     if(env[i]<=threshold){onset=i+1;break;}
     onset=i;
   }
   delays.push((base+onset/hz-time)*1000);
 }
 const delay=median(delays),mad=delay===null?null:median(delays.map(v=>Math.abs(v-delay)));
 const spread=delay===null?null:Math.max(...delays)-Math.min(...delays);
 const stable=delays.length>=4&&mad<=10&&spread<=30;
 return {count:delays.length,total:CLICK_COUNT,
   offsetMs:delays.length<3?null:Math.round(delay*10)/10,
   jitterMs:mad===null?null:Math.round(mad*10)/10,
   stable,status:stable?'REPRODUCIBLE / MANUAL ENTRY':
     delays.length<3?'CLICK NOT HEARD':'UNSTABLE / REPEAT MEASUREMENT'};
}
