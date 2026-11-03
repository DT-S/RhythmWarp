import {createMicAudioSession} from './mic-audio-session.js';
// Explicit user-initiated microphone access, separate from metronome playback.
const processors=new WeakSet();
export class MicCapture {
 constructor(context,onHit,onEnded=()=>{}){
   this.context=context;this.onHit=onHit;this.onEnded=onEnded;this.active=false;
 }
 async start(sensitivity='normal'){
   if(this.active)return;
   if(!navigator.mediaDevices?.getUserMedia||!this.context.audioWorklet)throw Error('Microphone AudioWorklet is unavailable on this device.');
   const route=createMicAudioSession();
   route.prepare();
   let stream;
   try {
     stream=await navigator.mediaDevices.getUserMedia({audio:{
       echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1
     },video:false});
     route.active();
     if(!processors.has(this.context)){
       await this.context.audioWorklet.addModule('./src/mic-worklet.js');
       processors.add(this.context);
     }
     const source=this.context.createMediaStreamSource(stream);
     const node=new AudioWorkletNode(this.context,'lcars-onset',{
       numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]
     });
     const silent=this.context.createGain();silent.gain.value=0;
     source.connect(node);node.connect(silent);silent.connect(this.context.destination);
     node.port.onmessage=e=>{
       if(this.active&&e.data?.kind==='hit')this.onHit(e.data.time,e.data.level);
     };
     node.port.postMessage({sensitivity});
     this.stream=stream;this.source=source;this.node=node;this.silent=silent;
     this.route=route;this.active=true;
     stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{
       if(this.active){this.stop();this.onEnded();}
     },{once:true}));
   }catch(err){stream?.getTracks().forEach(track=>track.stop());route.release();this.stop();throw err;}
 }
 sensitivity(value){this.node?.port.postMessage({sensitivity:value});}
 reference(mode,bpm,division){
   this.node?.port.postMessage({reference:{mode,bpm,division}});
 }
 stop(){
   this.active=false;
   if(this.node)this.node.port.onmessage=null;
   for(const part of [this.source,this.node,this.silent])try{part?.disconnect();}catch{}
   this.stream?.getTracks().forEach(track=>track.stop());
   this.route?.release();this.route=null;
   this.source=null;this.node=null;this.silent=null;this.stream=null;
 }
}
