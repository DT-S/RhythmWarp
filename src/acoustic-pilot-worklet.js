// Single bounded, zero-output microphone segment for six audible clicks.
// No pad states, training phases, UI audio feedback or retained recordings.
class LcarsAcousticPilotRecorder extends AudioWorkletProcessor{
 constructor(){
   super();
   this.stride=Math.max(1,Math.round(sampleRate/8000));
   this.capacity=Math.ceil(sampleRate*9/this.stride)+2;
   this.mode='idle';this.phase=4;this.samples=null;this.count=0;
   this.firstFrame=-1;
   this.port.onmessage=event=>{
     const msg=event.data||{};
     if(msg.kind==='start'&&this.mode==='idle'){
       this.samples=new Float32Array(this.capacity);
       this.count=0;this.firstFrame=-1;this.mode='capture';
       this.port.postMessage({kind:'armed',phase:4,time:currentFrame/sampleRate});
     }else if(msg.kind==='finish'&&this.mode==='capture'&&msg.phase===4)
       this.complete(false);
     else if(msg.kind==='cancel'){
       this.mode='idle';this.samples=null;this.count=0;
     }
   };
 }
 complete(limited){
   if(this.mode!=='capture')return;
   const samples=this.samples.slice(0,this.count);
   this.mode='idle';this.samples=null;this.count=0;
   this.port.postMessage({kind:'segment',phase:4,samples,
     firstFrame:this.firstFrame,sampleRate,stride:this.stride,limited},
     [samples.buffer]);
 }
 process(inputs,outputs){
   // Never monitor the microphone through the loudspeaker/headphones.
   for(const out of outputs)for(const channel of out)channel.fill(0);
   if(this.mode!=='capture')return true;
   const input=inputs[0]?.[0];
   if(!input)return true;
   for(let i=0;i<input.length;i++){
     const frame=currentFrame+i;
     if(frame%this.stride!==0)continue;
     if(this.firstFrame<0)this.firstFrame=frame;
     if(this.count<this.capacity)this.samples[this.count++]=input[i];
     else{this.complete(true);break;}
   }
   return true;
 }
}
registerProcessor('lcars-acoustic-pilot',LcarsAcousticPilotRecorder);
