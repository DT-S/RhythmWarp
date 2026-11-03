import {decodeBytes} from './custom-sounds.js';
import {synthesize,SOUNDS} from './synth.js';
import {UI_CUE_ASSETS} from './ui-cues.js';
export const METRONOME_GAIN=2;
// This separate slot now uses the supplied real menu/window-change sample.
export const LCARS_MENU_BUILD_SLOT='lcars-menu-build';
export const LCARS_MENU_BUILD_ASSET='./assets/audio/ui/menu_or_window_change.mp3';
import {audible} from './model.js';
export class AudioEngine {
  constructor(){this.buffers=new Map();this.active=new Set();this.sampleStatus=[];}
  async unlock(){
    if(!this.ctx){
      this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
      this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);
      this.uiGain=this.ctx.createGain();this.uiGain.connect(this.master);
      this.metronomeBus=this.ctx.createDynamicsCompressor();
      this.metronomeBus.threshold.value=-3;this.metronomeBus.knee.value=3;this.metronomeBus.ratio.value=20;this.metronomeBus.attack.value=.001;this.metronomeBus.release.value=.06;this.metronomeBus.connect(this.master);
      this.tracks=[0,1].map(()=>{const gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();gain.connect(pan);pan.connect(this.metronomeBus);return {gain,pan};});
      // Unlock synchronously within the original user gesture before fetching.
      const silent=this.ctx.createBufferSource();silent.buffer=this.ctx.createBuffer(1,1,this.ctx.sampleRate);silent.connect(this.ctx.destination);silent.start();
      this.loading=this.load();
    }
    await this.ctx.resume();
  }
  async load(){
    // Decode the exact 15 uploaded cues. Legacy sounds remain available only
    // as fallbacks and for generic successful notifications (Acceptsound).
    const newEntries=Object.entries(UI_CUE_ASSETS).map(([name,file])=>
      [name,'./assets/audio/ui/'+file]);
    const legacy=['switchingmenus','hoversound','Acceptsound',
      'invalidsound','Warningsound','buttonpress'].map(name=>
      ['legacy-'+name,'./assets/audio/ui/'+name+'.mp3']);
    // Let the opening sample finish independently of the other 20 files.
    // Waiting for the entire bank can miss the short startup animation.
    const cueLoads=[...newEntries,...legacy].map(([key,path])=>{
      const task=(async()=>{
        try{
          const response=await fetch(path);
          if(!response.ok)throw Error('HTTP '+response.status);
          const bytes=await response.arrayBuffer();
          if(!bytes.byteLength)throw Error('Empty sound');
          this.buffers.set(key,await this.ctx.decodeAudioData(bytes));
        }catch{this.sampleStatus.push(key);}
      })();
      if(key==='lcars-launch')this.launchReady=task;
      return task;
    });
    await Promise.all(cueLoads);
    // Preserve the old Acceptsound key for existing positive toasts.
    const accepted=this.buffers.get('legacy-Acceptsound');
    if(accepted)this.buffers.set('Acceptsound',accepted);
    for(const kind of Object.keys(SOUNDS).filter(k=>k!=='auto'))for(let state=0;state<3;state++){
      const data=synthesize(kind,state,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(`synth-${kind}-${state}`,buffer);
    }
  }
  async prepareCustom(bank){const buffers=new Map();for(const sound of bank){const buffer=await this.ctx.decodeAudioData(decodeBytes(sound.data));if(buffer.duration>5||buffer.duration<=0)throw Error('Custom sound exceeds 5 seconds.');buffers.set(sound.id,buffer);}return buffers;}
  async loadCustom(bank){for(const sound of bank)if(!this.buffers.has(sound.id)){const buffer=await this.ctx.decodeAudioData(decodeBytes(sound.data));if(buffer.duration>5||buffer.duration<=0)throw Error('Custom sound exceeds 5 seconds.');this.buffers.set(sound.id,buffer);}}
  mix(s){if(!this.ctx)return;this.master.gain.setValueAtTime(s.master,this.ctx.currentTime);this.uiGain.gain.value=s.uiVolume;this.tracks.forEach((t,i)=>{t.gain.gain.value=audible(s.channels,i)?s.channels[i].volume*METRONOME_GAIN:0;t.pan.pan.value=s.channels[i].pan;});}
  click(event,time){
    if(event.state===3)return;
    const c=this.ctx,track=this.tracks[event.channel];
    const choice=event.sound||'click';
    let buffer=this.buffers.get(choice);
    if(!buffer){
      const synthKey=`synth-${choice}-${event.state}`;
      buffer=this.buffers.get(synthKey);
      if(!buffer){const data=synthesize(choice,event.state,c.sampleRate);buffer=c.createBuffer(1,data.length,c.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(synthKey,buffer);}
    }
    const source=c.createBufferSource();source.buffer=buffer;source.connect(track.gain);source.start(time);
    this.active.add(source);source.onended=()=>{this.active.delete(source);source.disconnect();source._env?.disconnect();};
  }
  ui(name,s,delaySeconds=0){if(!this.ctx||this.ctx.state!=='running'||!s.uiEnabled)return;
    const fallback=name===LCARS_MENU_BUILD_SLOT?'legacy-switchingmenus':
      name==='lcars-launch'?'legacy-switchingmenus':
      name==='keypress-increase'||name==='keypress-decrease'||name==='option-toggle'?'legacy-buttonpress':
      name==='consolewarning'||name==='denied'?'legacy-Warningsound':
      name==='erase-accepted'||name==='windowcloses'||name==='update-restart'?'legacy-Acceptsound':
      'legacy-'+name;
    const b=this.buffers.get(name)||this.buffers.get(fallback)||
      (name===LCARS_MENU_BUILD_SLOT?this.buffers.get('switchingmenus'):null);
    if(!b)return;
    const source=this.ctx.createBufferSource();source.buffer=b;
    source.connect(this.uiGain);source.start(delaySeconds>0?this.ctx.currentTime+delaySeconds:0);
    source.onended=()=>source.disconnect();}
  cancel(){for(const node of this.active){try{node.stop();}catch{}}this.active.clear();}
}
