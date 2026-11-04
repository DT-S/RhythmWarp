import {createMicAudioSession} from './mic-audio-session.js';
import {synthesize} from './synth.js';
import {measureClickOffset,CLICK_COUNT,CLICK_SPACING_SECONDS} from './click-offset-analysis.js';

// Click-only mic readout. The user's manually entered INPUT DELAY is never
// overwritten; no pad learning, auto adjustment, scoring or audio archive.
const installed=new WeakSet();
export function installAcousticPilot({audio,unlock,canStart}){
 const host=document.querySelector('#micConsole .mic-cfg-body');
 if(!host)return {isBusy:()=>false,stop:()=>{}};
 const panel=document.createElement('details');
 panel.className='lcars-info acoustic-pilot';panel.id='acousticPilot';
 panel.innerHTML=`<summary>CLICK OFFSET // MANUAL MEASUREMENT</summary>
 <div class="acoustic-pilot-body">
 <p class="hint">Play six clicks. Place the phone microphone near the speaker
 or headphone earcup so it can hear the sound. Read the displayed +ms
 offset, then enter it yourself into INPUT DELAY above. No pad hits.</p>
 <div class="acoustic-pilot-actions">
 <button type="button" id="acousticPilotStart">MEASURE SIX CLICKS</button>
 <button type="button" id="acousticPilotAbort" disabled>ABORT</button>
 </div>
 <output id="acousticPilotState" role="status">READY // NO AUDIO SAVED</output>
 <div id="acousticPilotPhase" class="acoustic-pilot-phase">HEARD CLICK OFFSET // — MS</div>
 <div id="acousticPilotProgress" class="acoustic-pilot-progress">READY / CLICK ONLY</div>
 <p class="hint">Readout only: never saves or applies an offset. Repeat for
 each playback route. Headphone sound must be audible to the phone mic.
 The measured path includes acoustic distance and processing delay.</p>
 </div>`;
 host.append(panel);
 const start=panel.querySelector('#acousticPilotStart');
 const abort=panel.querySelector('#acousticPilotAbort');
 const status=panel.querySelector('#acousticPilotState');
 const phase=panel.querySelector('#acousticPilotPhase');
 const progress=panel.querySelector('#acousticPilotProgress');
 let busy=false,generation=0,abortRecording=null;
 const stop=()=>{
   if(!busy)return;
   generation++;
   abortRecording?.(Error('Click test aborted'));
   status.textContent='ABORTED // NO AUDIO SAVED';
   progress.textContent='TEST ABORTED';
 };
 async function run(){
   if(busy)return;
   if(!canStart()){status.textContent='STOP METRONOME AND DISENGAGE MIC FIRST';return;}
   busy=true;const own=++generation;
   start.disabled=true;abort.disabled=false;
   phase.textContent='HEARD CLICK OFFSET // — MS';
   progress.textContent='PREPARING MICROPHONE';
   status.textContent='MICROPHONE ACCESS REQUIRED';
   const transport=document.querySelector('#start');
   const mic=document.querySelector('#micArm');
   if(transport)transport.disabled=true;
   if(mic)mic.disabled=true;
   let context=null,stream=null,source=null,processor=null,output=null;
   let interval=null,watchdog=null;
   const tones=[],route=createMicAudioSession();
   const ensure=()=>{if(own!==generation)throw Error('Click test aborted');};
   const interrupt=()=>{if(document.hidden||context?.state==='interrupted'||context?.state==='closed')stop();};
   try{
     await unlock();ensure();
     context=audio.ctx;
     if(!context?.audioWorklet||context.state!=='running')throw Error('AudioWorklet unavailable');
     if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone API unavailable');
     route.prepare();
     stream=await navigator.mediaDevices.getUserMedia({audio:{
       echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1
     },video:false});
     route.active();ensure();
     if(!canStart())throw Error('Another audio mode started');
     if(!installed.has(context)){
       await context.audioWorklet.addModule('./src/acoustic-pilot-worklet.js');
       installed.add(context);
     }
     ensure();
     source=context.createMediaStreamSource(stream);
     processor=new AudioWorkletNode(context,'lcars-acoustic-pilot',{
       numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
     source.connect(processor);processor.connect(context.destination);
     output=context.createGain();output.gain.value=.7;output.connect(context.destination);
     const wave=synthesize('click',2,context.sampleRate);
     const buffer=context.createBuffer(1,wave.length,context.sampleRate);
     buffer.copyToChannel(wave,0);
     document.addEventListener('visibilitychange',interrupt);
     context.addEventListener('statechange',interrupt);
     stream.getAudioTracks()[0]?.addEventListener('ended',stop,{once:true});
     processor.onprocessorerror=stop;
     const captured=await new Promise((resolve,reject)=>{
       abortRecording=reject;
       let scheduled=[],finishing=false;
       watchdog=setTimeout(()=>reject(Error('Click capture timed out')),11000);
       processor.port.onmessage=event=>{
         if(own!==generation)return;
         const msg=event.data;
         if(msg?.kind==='armed'){
           const first=Math.max(msg.time+1.8,context.currentTime+.5);
           scheduled=Array.from({length:CLICK_COUNT},(_,i)=>first+i*CLICK_SPACING_SECONDS);
           for(const time of scheduled){
             const node=context.createBufferSource();
             node.buffer=buffer;node.connect(output);node.start(time);tones.push(node);
           }
           progress.textContent='FIRST CLICK IN 2 SEC';
           interval=setInterval(()=>{
             const now=context.currentTime;
             progress.textContent=now<first?
               'FIRST CLICK IN '+Math.ceil(first-now)+' SEC':
               'CLICK '+Math.min(CLICK_COUNT,Math.floor((now-first)/CLICK_SPACING_SECONDS)+1)+
               ' / '+CLICK_COUNT;
             if(!finishing&&now>=scheduled.at(-1)+.56){
               finishing=true;clearInterval(interval);interval=null;
               processor.port.postMessage({kind:'finish',phase:4});
             }
           },80);
         }else if(msg?.kind==='segment'){
           if(msg.phase!==4||msg.limited||!(msg.samples instanceof Float32Array)||
              msg.firstFrame<0)return reject(Error('Incomplete microphone capture'));
           resolve({samples:msg.samples,firstFrame:msg.firstFrame,
             sampleRate:msg.sampleRate,stride:msg.stride,scheduled});
         }
       };
       processor.port.postMessage({kind:'start',clickOnly:true});
     });
     ensure();
     const result=measureClickOffset(captured);
     phase.textContent='HEARD CLICK OFFSET // '+
       (result.offsetMs===null?'—':(result.offsetMs>=0?'+':'')+
         result.offsetMs.toFixed(1))+' MS';
     status.textContent=result.status;
     progress.textContent=result.count+' / '+result.total+' CLICKS HEARD'+
       (result.jitterMs!==null?' // JITTER '+result.jitterMs.toFixed(1)+' MS':'');
   }catch(error){
     if(own===generation){
       status.textContent='NO RESULT // '+error.message;
       progress.textContent='RETRY ON CURRENT OUTPUT';
     }
   }finally{
     clearInterval(interval);clearTimeout(watchdog);abortRecording=null;
     try{processor?.port.postMessage({kind:'cancel'});}catch{}
     for(const tone of tones)try{tone.stop();tone.disconnect();}catch{}
     for(const node of [source,processor,output])try{node?.disconnect();}catch{}
     stream?.getTracks().forEach(track=>track.stop());
     route.release();
     context?.removeEventListener('statechange',interrupt);
     document.removeEventListener('visibilitychange',interrupt);
     busy=false;start.disabled=false;abort.disabled=true;
     if(transport)transport.disabled=false;
     if(mic)mic.disabled=false;
   }
 }
 start.addEventListener('click',()=>{void run();});
 abort.addEventListener('click',stop);
 return {isBusy:()=>busy,stop};
}
