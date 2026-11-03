// Input-only transient detector: deliberately NEVER routes microphone audio to output.
// Adaptive floor + fast envelope works with quiet, low-frequency practice pads.
// Timing is on the AudioContext sample-frame clock (not requestAnimationFrame).
class LcarsOnsetProcessor extends AudioWorkletProcessor {
 constructor(){
   super();
   this.env=0;this.floor=.0006;this.previous=0;this.lastHit=-sampleRate;
   this.minimum=.002;this.ratio=3.5;this.refractory=Math.round(sampleRate*.055);
   this.armed=true;this.quietFrames=0;this.rearmFrames=Math.round(sampleRate*.002);
   this.port.onmessage=e=>{
     if(Object.hasOwn(e.data??{},'sensitivity')){
       const setting=e.data.sensitivity;
       if(setting==='soft'){this.minimum=.0008;this.ratio=2.7;}
       else if(setting==='loud'){this.minimum=.007;this.ratio=4.5;}
       else {this.minimum=.002;this.ratio=3.5;}
     }
     const r=e.data?.reference;
     if(r){
       const guided=r.mode==='guided';
       const bpm=Number(r.bpm),division=Number(r.division);
       // Never hard-gate more than 54% of the intended hit spacing.
       // e.g. 120 BPM x4 = 67.5ms, 240 BPM x4 = 33.75ms.
       const period=guided&&Number.isFinite(bpm)&&bpm>=20&&bpm<=400&&
          [1,2,3,4].includes(division)?60/(bpm*division):null;
       const seconds=period===null?.055:Math.max(.018,Math.min(.095,period*.54));
       this.refractory=Math.round(sampleRate*seconds);
     }
   };
 }
 process(inputs){
   const channel=inputs[0]?.[0];
   if(!channel)return true;
   for(let i=0;i<channel.length;i++){
     const amp=Math.abs(channel[i]);
     this.env+=(amp-this.env)*(amp>this.env ? .075 : .008);
     // Do not teach the noise estimator that a drum attack is background.
     if(this.env<this.floor*2.5)this.floor+=(this.env-this.floor)*.0004;
     const threshold=Math.max(this.minimum,this.floor*this.ratio);
     const frame=currentFrame+i;
     // A long thump is one onset, not another hit every refractory interval.
     // Require a brief, quiet release before a new rising attack can trigger.
     if(this.env<threshold*.55){
       if(this.quietFrames<this.rearmFrames)this.quietFrames++;
       if(this.quietFrames>=this.rearmFrames)this.armed=true;
     }else this.quietFrames=0;
     if(this.armed&&this.env>threshold&&this.env>this.previous*1.035&&
        frame-this.lastHit>=this.refractory){
       this.armed=false;
       this.lastHit=frame;
       this.port.postMessage({kind:'hit',time:frame/sampleRate,level:this.env});
     }
     this.previous=this.env;
   }
   return true;
 }
}
registerProcessor('lcars-onset',LcarsOnsetProcessor);
