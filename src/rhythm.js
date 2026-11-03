export const cycleLength=s=>s.mode==='polyrhythm'?s.training.cycleQuarters:s.beats;
export function rampTempo(s,bar){
  if(s.mode!=='ramp'||bar<0)return s.bpm;
  const t=s.training,steps=Math.ceil(Math.abs(t.targetBpm-s.bpm)/t.bpmStep);
  if(!steps)return s.bpm;
  const n=Math.floor(bar/t.changeBars),position=t.rampReturn?n%(2*steps):Math.min(n,steps);
  const step=position>steps?2*steps-position:position;
  return s.bpm+Math.sign(t.targetBpm-s.bpm)*Math.min(Math.abs(t.targetBpm-s.bpm),step*t.bpmStep);
}
export function phaseFor(s,bar){
  const t=s.training;
  if(s.mode==='gap')return bar%(t.audibleBars+t.silentBars)<t.audibleBars?'CLICK':'GAP';
  if(s.mode==='offbeat')return Math.floor(bar/t.changeBars)%2?'OFFBEAT':'DOWNBEAT';
  if(s.mode==='displacement'){const offset=((t.offset+(t.manual?0:Math.floor(bar/t.changeBars)*t.shiftStep*t.direction))%t.resolution+t.resolution)%t.resolution;return `SHIFT ${offset}/${t.resolution}`;}
  return 'CLICK';
}
export function barEvents(s,bar=0,phase=phaseFor(s,bar)){
  const events=[],add=(q,channel,index,beat,state)=>events.push({q,channel,index,beat,state,sound:s.channels[channel].sounds?.[state]??s.channels[channel].sound??'click'});
  if(bar<0){for(let i=0;i<cycleLength(s);i++)add(i,0,i%s.beats,i,i===0?0:2);return events;}
  if(s.mode==='polyrhythm'){
    for(const [channel,pattern] of [[0,s.outer],[1,s.inner]])pattern.forEach((state,i)=>add(i*s.training.cycleQuarters/pattern.length,channel,i,Math.floor(i*s.training.cycleQuarters/pattern.length),state));
  }else if(s.mode==='polymeter'){
    for(let beat=0;beat<s.beats;beat++){add(beat,0,beat,beat,s.outer[beat]);const i=(bar*s.beats+beat)%s.subdivisions;add(beat,1,i,beat,s.inner[i]);}
  }else if(s.mode==='offbeat'||s.mode==='displacement'){
    const offset=s.mode==='offbeat'?(phase==='OFFBEAT'?1/s.training.resolution:0):Number(phase.split(' ')[1].split('/')[0])/s.training.resolution;
    for(let beat=0;beat<s.beats;beat++){
      add(beat+offset,0,beat,beat,s.outer[beat]);
      // Inner ring remains a silent subdivision guide in these two trainers.
      for(let j=0;j<s.subdivisions;j++)add(beat+j/s.subdivisions,1,j,beat,3);
    }
  }else{
    for(let beat=0;beat<s.beats;beat++){
      add(beat,0,beat,beat,s.outer[beat]);
      for(let sub=0;sub<s.subdivisions;sub++){
        const q=s.subdivisions%2===0&&sub%2?(sub-1+2*s.swing)/s.subdivisions:sub/s.subdivisions;
        add(beat+q,1,sub,beat,s.inner[sub]);
      }
    }
  }
  if(phase==='GAP')events.forEach(e=>e.state=3);
  return events.sort((a,b)=>a.q-b.q||a.channel-b.channel);
}
export function angleDelta(a,b){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d< -Math.PI)d+=Math.PI*2;return d;}
