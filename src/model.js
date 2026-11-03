import {UI_SCALES} from './interface.js';
import {validateSounds} from './custom-sounds.js';
import {diaryDefaults,validateDiary} from './diary.js';
import {SOUNDS} from './synth.js';
import {THEMES} from './lcars-theme.js';
export const MODES={standard:'Standard metronome',polyrhythm:'Polyrhythm',polymeter:'Polymeter',gap:'Gap click',random:'Random gap',offbeat:'Offbeat',displacement:'Beat displacement',ramp:'Tempo ramp'};
export const trainingDefaults=()=>({cycleQuarters:4,audibleBars:4,silentBars:4,minOn:2,maxOn:4,minOff:1,maxOff:4,changeBars:4,resolution:4,shiftStep:1,direction:1,manual:false,offset:0,targetBpm:160,bpmStep:5,rampReturn:false});
/** @typedef {0|1|2|3} ClickState 0=double accent, 1=accent, 2=normal, 3=silent */
export const fresh = () => ({version:5, uiScale:1, customSounds:[], diary:diaryDefaults(), mode:'standard', swing:.5, training:trainingDefaults(), bpm:120, beats:4, subdivisions:2, outer:[0,2,2,2], inner:[3,2], countIn:0, duration:0, master:.65, uiVolume:.18, uiEnabled:true, hoverEnabled:true, haptic:false, launchScreen:true, forceMotion:false, theme:'voyager', channels:[{volume:.8,pan:0,sounds:['click','click','click'],mute:false,solo:false},{volume:.6,pan:0,sounds:['click','click','click'],mute:false,solo:false}], presets:[]});
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function resize(pattern, n) { return Array.from({length:n},(_,i)=>pattern[i]??2); }
export function validate(raw,inheritedSounds=null) {
  if (!raw || ![1,2,3,4,5].includes(raw.version)) throw Error('Unsupported backup version.');
  const s=fresh();
  if(raw.uiScale!==undefined){if(!UI_SCALES.includes(raw.uiScale))throw Error('Invalid interface scale');s.uiScale=raw.uiScale;}
  if(raw.version>=5)s.customSounds=validateSounds(raw.customSounds);
  const bank=inheritedSounds??s.customSounds;
  if(raw.version>=2){
    if(!Object.hasOwn(MODES,raw.mode))throw Error('Invalid training mode');
    s.mode=raw.mode;
    if(!Number.isFinite(raw.swing)||raw.swing<.5||raw.swing>.75)throw Error('Invalid swing');
    s.swing=raw.swing;
    if(!raw.training||typeof raw.training!=='object')throw Error('Missing training settings');
    for(const [k,a,b] of [['cycleQuarters',1,20],['audibleBars',1,64],['silentBars',1,64],['minOn',1,64],['maxOn',1,64],['minOff',1,64],['maxOff',1,64],['changeBars',1,64],['resolution',2,4],['shiftStep',1,3],['offset',0,3],['targetBpm',20,400],['bpmStep',1,100]]){
      const v=raw.training[k];if(!Number.isInteger(v)||v<a||v>b)throw Error(`Invalid ${k}`);s.training[k]=v;
    }
    if(![2,4].includes(s.training.resolution)||s.training.minOn>s.training.maxOn||s.training.minOff>s.training.maxOff)throw Error('Invalid training range');
    if(![-1,1].includes(raw.training.direction))throw Error('Invalid direction');s.training.direction=raw.training.direction;
    for(const k of ['rampReturn','manual']){if(typeof raw.training[k]!=='boolean')throw Error(`Invalid ${k}`);s.training[k]=raw.training[k];}
  }
  for(const [k,a,b] of [['bpm',20,400],['beats',1,20],['subdivisions',1,20],['countIn',0,8],['duration',0,3600],['master',0,1],['uiVolume',0,1]]) {
    if(typeof raw[k]!=='number'||!Number.isFinite(raw[k])||raw[k]<a||raw[k]>b) throw Error(`Invalid ${k}`);
    s[k]=raw[k];
  }
  for(const k of ['beats','subdivisions','countIn','duration']) if(!Number.isInteger(s[k])) throw Error(`Invalid ${k}`);
  for(const [k,n] of [['outer',s.beats],['inner',s.subdivisions]]) {
    if(!Array.isArray(raw[k])||raw[k].length!==n||raw[k].some(v=>!Number.isInteger(v)||v<0||v>3)) throw Error(`Invalid ${k} pattern`);
    s[k]=[...raw[k]];
  }
  for(const k of ['uiEnabled','hoverEnabled','haptic']) {if(typeof raw[k]!=='boolean') throw Error(`Invalid ${k}`);s[k]=raw[k];}
  // Older backups predate this option; they inherit the opt-out screen's
  // default without forcing a format-version bump.
  if(raw.launchScreen!==undefined){
    if(typeof raw.launchScreen!=='boolean')throw Error('Invalid LCARS startup screen setting');
    s.launchScreen=raw.launchScreen;
  }
  if(raw.forceMotion!==undefined){
    if(typeof raw.forceMotion!=='boolean')throw Error('Invalid LCARS motion override setting');
    s.forceMotion=raw.forceMotion;
  }
  if(raw.theme!==undefined){
    if(!THEMES.includes(raw.theme))throw Error('Invalid LCARS display theme');
    s.theme=raw.theme;
  }
  if(!Array.isArray(raw.channels)||raw.channels.length!==2) throw Error('Invalid channels');
  s.channels=raw.channels.map(c=>{
    if(!c||!Number.isFinite(c.volume)||c.volume<0||c.volume>1||!Number.isFinite(c.pan)||Math.abs(c.pan)>1||typeof c.mute!=='boolean'||typeof c.solo!=='boolean') throw Error('Invalid mixer');
    let sounds;
    if(raw.version<3){const old=raw.version===1?'auto':c.sound;if(!Object.hasOwn(SOUNDS,old))throw Error('Invalid sound');sounds=Array(3).fill(old==='auto'?'click':old);}
    else{if(!Array.isArray(c.sounds)||c.sounds.length!==3||c.sounds.some(sound=>sound==='auto'||(!Object.hasOwn(SOUNDS,sound)&&!bank.some(s=>s.id===sound))))throw Error('Invalid accent sounds');sounds=[...c.sounds];}
    return {volume:c.volume,pan:c.pan,mute:c.mute,solo:c.solo,sounds};
  });
  if(!Array.isArray(raw.presets)||raw.presets.length>100) throw Error('Invalid presets');
  s.presets=raw.presets.map(p=>{
    if(typeof p.name!=='string'||p.name.length>80||!p.settings||p.settings.presets?.length) throw Error('Invalid preset');
    return {name:p.name,settings:validate({...p.settings,presets:[]},bank)};
  });
  if(raw.version>=4)s.diary=validateDiary(raw.diary);
  return s;
}
export const audible=(channels,i)=>!channels[i].mute&&(!channels.some(c=>c.solo)||channels[i].solo);

export const presetSettings=s=>structuredClone({...s,customSounds:[],diary:diaryDefaults(),presets:[]});
export const loadPreset=(state,preset)=>validate({...preset.settings,presets:state.presets,version:5,uiScale:state.uiScale,launchScreen:state.launchScreen,forceMotion:state.forceMotion,theme:state.theme,customSounds:state.customSounds,diary:state.diary});
