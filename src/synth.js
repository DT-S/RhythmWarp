export const SOUNDS={auto:'MP3 slots / classic fallback',click:'Classic click',bell:'Glass bell',woodblock:'Woodblock',sidestick:'Side stick',kick:'Kick drum',snare:'Snare drum',clave:'Clave',shaker:'Shaker'};
// Deterministic, pre-rendered mono percussion. No synthesis work on the audio callback.
export function synthesize(kind,state,sampleRate=48000){
  if(!SOUNDS[kind]||kind==='auto')kind='click';
  const ratio=[1.65,1.28,1][state],duration={click:.045,bell:.19,woodblock:.085,sidestick:.065,kick:.16,snare:.13,clave:.07,shaker:.07}[kind];
  const data=new Float32Array(Math.ceil(sampleRate*duration));let seed=1729,phase=0,lastNoise=0,peak=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
    let value=0;
    switch(kind){
      case 'click':value=Math.sin(2*Math.PI*900*ratio*t)*Math.exp(-t*155);break;
      case 'bell':value=(Math.sin(2*Math.PI*1050*ratio*t)+.45*Math.sin(2*Math.PI*2.73*1050*ratio*t)+.2*Math.sin(2*Math.PI*4.16*1050*ratio*t))*Math.exp(-t*34);break;
      case 'woodblock':value=(Math.sin(2*Math.PI*680*ratio*t)+.55*Math.sin(2*Math.PI*1110*ratio*t))*Math.exp(-t*87);break;
      case 'sidestick':value=(.8*Math.sin(2*Math.PI*1700*ratio*t)+.2*noise)*Math.exp(-t*(95+state*15));break;
      case 'kick':phase+=2*Math.PI*(55+160*Math.exp(-t*55))*ratio/sampleRate;value=Math.sin(phase)*Math.exp(-t*36)+.06*noise*Math.exp(-t*250);break;
      case 'snare':value=(.65*(noise-lastNoise)+.3*Math.sin(2*Math.PI*195*ratio*t))*Math.exp(-t*(42+state*10));break;
      case 'clave':value=(Math.sin(2*Math.PI*1900*ratio*t)+.3*Math.sin(2*Math.PI*2850*ratio*t))*Math.exp(-t*100);break;
      case 'shaker':value=(noise-lastNoise)*Math.exp(-t*(80+state*30))*(.7+.3*Math.sin(2*Math.PI*(4000*ratio)*t));break;
    }
    lastNoise=noise;value*=Math.min(1,t/.0007)*Math.min(1,(duration-t)/.004);data[i]=value;peak=Math.max(peak,Math.abs(value));
  }
  // Equal peak level: accent states change timbre/pitch, not channel volume.
  if(peak)for(let i=0;i<data.length;i++)data[i]=data[i]/peak*.35;
  return data;
}
