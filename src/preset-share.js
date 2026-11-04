// Rhythm PADD share format v1. No account, server, samples or personal data.
// The compact fields keep QR matrices readable on phone screens.
import {fresh,validate,presetSettings,loadPreset} from './model.js';
import {SOUNDS} from './synth.js';
export const TRAIN_FIELDS=Object.freeze([
 'cycleQuarters','audibleBars','silentBars','minOn','maxOn','minOff','maxOff',
 'changeBars','resolution','shiftStep','direction','manual','offset',
 'targetBpm','bpmStep','rampReturn'
]);
const MAX_FRAGMENT=4000;
// Canonical public install URL. QR codes must always point to Rhythm Warp,
// even when the app is previewed from localhost or a temporary address.
export const APP_SHARE_URL='https://dt-s.github.io/RhythmWarp/';
export function appShareUrl(){return APP_SHARE_URL;}
const fallbackSound=name=>Object.hasOwn(SOUNDS,name)?name:'click';
export function encodeSharedPreset(preset){
 if(!preset||typeof preset.name!=='string'||!preset.settings)throw Error('Invalid preset.');
 const s=preset.settings;
 const hadCustom=s.channels?.some(c=>c.sounds?.some(sound=>fallbackSound(sound)!==sound))??false;
 const record={
  v:1,n:preset.name,x:hadCustom?1:0,
  s:[s.mode,s.bpm,s.beats,s.subdivisions,s.outer.join(''),s.inner.join(''),
   s.swing,TRAIN_FIELDS.map(k=>s.training[k]),s.countIn,s.duration,s.master,
   s.channels.map(c=>[c.volume,c.pan,...c.sounds.map(fallbackSound),c.mute,c.solo])]
 };
 // Validate the same exact object the recipient would read.
 const json=JSON.stringify(record);
 decodeSharedPresetRecord(record);
 const encoded=btoa(String.fromCharCode(...new TextEncoder().encode(json)))
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(encoded.length>MAX_FRAGMENT)throw Error('Preset exceeds QR link limit.');
 return {url:APP_SHARE_URL+'#p='+encoded,hadCustom};
}
export function decodeSharedPresetFragment(hash){
 if(typeof hash!=='string'||!hash.startsWith('#p='))throw Error('Not a Rhythm PADD preset link.');
 const payload=hash.slice(3);
 if(!payload||payload.length>MAX_FRAGMENT||!/^[A-Za-z0-9_-]+$/.test(payload))
  throw Error('Invalid or oversized shared preset.');
 try{
  const binary=atob(payload.replace(/-/g,'+').replace(/_/g,'/'));
  const json=new TextDecoder('utf-8',{fatal:true}).decode(
   Uint8Array.from(binary,c=>c.charCodeAt(0)));
  return decodeSharedPresetRecord(JSON.parse(json));
 }catch(err){
  if(/Invalid|Unsupported|Missing/.test(err.message))throw err;
  throw Error('Corrupted preset link.');
 }
}
function exactKeys(value,expected){
 return value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).sort().join(',')===expected.slice().sort().join(',');
}
export function decodeSharedPresetRecord(record){
 if(!exactKeys(record,['v','n','x','s'])||record.v!==1||![0,1].includes(record.x))
  throw Error('Unsupported preset link format.');
 if(typeof record.n!=='string'||!record.n.trim()||record.n.length>80)
  throw Error('Invalid preset name.');
 const s=record.s;
 if(!Array.isArray(s)||s.length!==12||!Array.isArray(s[7])||
    s[7].length!==TRAIN_FIELDS.length||!Array.isArray(s[11])||s[11].length!==2)
  throw Error('Invalid preset fields.');
 const pattern=(input)=>typeof input==='string'&&/^[0-3]{1,20}$/.test(input)?
  [...input].map(Number):null;
 const channels=s[11].map(c=>{
  if(!Array.isArray(c)||c.length!==7)throw Error('Invalid channel fields.');
  return {volume:c[0],pan:c[1],sounds:c.slice(2,5),mute:c[5],solo:c[6]};
 });
 const training=Object.fromEntries(TRAIN_FIELDS.map((k,i)=>[k,s[7][i]]));
 const settings=validate({...fresh(),
  mode:s[0],bpm:s[1],beats:s[2],subdivisions:s[3],
  outer:pattern(s[4]),inner:pattern(s[5]),swing:s[6],
  training,countIn:s[8],duration:s[9],master:s[10],channels,
  customSounds:[],presets:[]
 });
 return {name:record.n,settings:presetSettings(settings),hadCustom:record.x===1};
}
// Shared presets change musical parameters, never local preferences or records.
export function loadSharedPreset(state,shared){
 const next=loadPreset(state,shared);
 for(const field of ['uiEnabled','hoverEnabled','haptic','uiVolume'])
  next[field]=state[field];
 return next;
}
export function uniqueSharedPresetName(name,presets){
 const names=new Set(presets.map(p=>p.name));
 if(!names.has(name))return name;
 for(let i=1;i<=100;i++){
  const suffix=i===1?' (shared)':` (shared ${i})`;
  const candidate=name.slice(0,80-suffix.length)+suffix;
  if(!names.has(candidate))return candidate;
 }
 throw Error('Cannot find a free preset name.');
}
