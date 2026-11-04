import {PracticeRecorder} from './diary.js';
import {barEvents,cycleLength,rampTempo,phaseFor} from './rhythm.js';
const timingSettings=({diary,presets,customSounds,...settings})=>structuredClone(settings);
// The timer fills the look-ahead queue; only AudioContext timestamps drive sound.
export class Scheduler {
  constructor(audio,onEnd=()=>{},random=Math.random){this.audio=audio;this.onEnd=onEnd;this.random=random;this.recorder=new PracticeRecorder();this.running=false;this.queue=[];this.horizon=.10;this.onGrid=()=>{};}
  start(settings,meta=null){
    this.stop();this.pending=timingSettings(settings);this.settings=timingSettings(settings);this.running=true;this.lastHealthyTime=this.audio.ctx.currentTime;
    this.bar=-settings.countIn;this.modeBar=0;this.anchor=this.audio.ctx.currentTime+.12;
    this.trainingStart=this.anchor+settings.countIn*cycleLength(settings)*60/settings.bpm;
    if(meta)this.recorder.begin(this.trainingStart,Date.now()+(this.trainingStart-this.audio.ctx.currentTime)*1000,meta);
    this.randomRemaining=0;this.randomOn=false;this.prepare();this.tick();if(this.running)this.timer=setInterval(()=>this.tick(),25);
  }
  prepare(){
    this.bpm=rampTempo(this.settings,this.bar<0?-1:this.modeBar);this.beatSeconds=60/this.bpm;this.length=cycleLength(this.settings);
    this.phase=this.bar<0?'COUNT-IN':phaseFor(this.settings,this.modeBar);
    if(this.bar>=0&&this.settings.mode==='random'){
      if(this.randomRemaining<=0){this.randomOn=!this.randomOn;const t=this.settings.training,lo=this.randomOn?t.minOn:t.minOff,hi=this.randomOn?t.maxOn:t.maxOff;this.randomRemaining=lo+Math.floor(this.random()*(hi-lo+1));}
      this.phase=this.randomOn?'CLICK':'GAP';this.randomRemaining--;
    }
    if(this.bar>=0){this.recorder.boundary(this.anchor,this.bpm,this.settings.mode);this.onGrid({anchor:this.anchor,bpm:this.bpm,length:this.length,bar:this.bar});}
    this.events=barEvents(this.settings,this.bar<0?this.bar:this.modeBar,this.phase);this.index=0;
  }
  update(settings){this.pending=timingSettings(settings);}
  stop(){this.running=false;clearInterval(this.timer);this.audio.cancel();this.queue=[];}
  nextTime(){return this.anchor+(this.index===this.events.length?this.length:this.events[this.index].q)*this.beatSeconds;}
  tick(){
    if(!this.running)return;
    const now=this.audio.ctx.currentTime;
    if(this.audio.ctx.state!=='running'){this.finish('Audio interrupted. Press start to resume.');return;}
    if(this.bar>=0&&this.settings.duration&&now>=this.trainingStart+this.settings.duration){this.finish('Countdown complete.',this.trainingStart+this.settings.duration);return;}
    if(this.nextTime()<now-.08){this.finish('Scheduling interrupted. Restart to keep timing precise.',Math.min(now,this.lastHealthyTime+this.horizon));return;}
    this.lastHealthyTime=now;
    while(this.running&&this.nextTime()<now+this.horizon){
      const time=this.nextTime();
      if(this.bar>=0&&this.settings.duration&&time>=this.trainingStart+this.settings.duration)return;
      if(this.index===this.events.length){
        this.anchor=time;const previous=this.settings;
        this.bar++;if(this.bar>0)this.modeBar++;
        // Count-in stays fixed until complete. Runtime changes commit at boundaries.
        if(this.bar>=0)this.settings=structuredClone(this.pending);
        if(previous.mode!==this.settings.mode||previous.beats!==this.settings.beats||previous.subdivisions!==this.settings.subdivisions||JSON.stringify(previous.training)!==JSON.stringify(this.settings.training)||previous.bpm!==this.settings.bpm){this.modeBar=0;this.randomRemaining=0;this.randomOn=false;}
        if(this.bar===0)this.trainingStart=this.anchor;
        this.prepare();continue;
      }
      const e=this.events[this.index++];this.audio.click(e,time);
      this.queue.push({...e,time,bar:this.bar,count:this.bar<0,phase:this.phase,bpm:this.bpm,mode:this.settings.mode,startBpm:this.settings.bpm,targetBpm:this.settings.training.targetBpm});
    }
  }
  finish(reason,endTime=this.audio.ctx.currentTime){this.stop();this.onEnd(reason,endTime);}
  position(){const now=this.audio.ctx.currentTime,due=[];while(this.queue.length&&this.queue[0].time<=now)due.push(this.queue.shift());return due;}
}
