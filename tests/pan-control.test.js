import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAN_PRESETS,setChannelPan} from '../src/pan-control.js';
import {fresh,validate,presetSettings,loadPreset} from '../src/model.js';

function fixture(){
  const channel={pan:.37};
  const slider={value:String(channel.pan)};
  const buttons=PAN_PRESETS.map(({value})=>({
    dataset:{pan:String(value)},
    pressed:null,
    setAttribute(name,value){assert.equal(name,'aria-pressed');this.pressed=value;}
  }));
  return {channel,slider,buttons};
}
test('LEFT, CENTER and RIGHT set exact values and update both controls',()=>{
  const f=fixture();
  for(const [value,active] of [[-1,0],[0,1],[1,2]]){
    assert.equal(setChannelPan(f.channel,value,f.slider,f.buttons),value);
    assert.equal(f.channel.pan,value);
    assert.equal(f.slider.value,String(value));
    assert.deepEqual(f.buttons.map(b=>b.pressed),f.buttons.map((_,i)=>String(i===active)));
  }
});
test('manual panning between presets clears selection without snapping',()=>{
  const f=fixture();
  setChannelPan(f.channel,-.37,f.slider,f.buttons);
  assert.equal(f.channel.pan,-.37);
  assert.deepEqual(f.buttons.map(b=>b.pressed),['false','false','false']);
  setChannelPan(f.channel,0,f.slider,f.buttons);
  assert.deepEqual(f.buttons.map(b=>b.pressed),['false','true','false']);
});
test('pan values outside -1 to +1 cannot corrupt a saved channel',()=>{
  const f=fixture();
  assert.throws(()=>setChannelPan(f.channel,2,f.slider,f.buttons),RangeError);
  assert.equal(f.channel.pan,.37);
});
test('exact pan persists through backup and preset restore on both channels',()=>{
  const state=fresh();
  state.channels[0].pan=-1;
  state.channels[1].pan=0;
  assert.deepEqual(validate(structuredClone(state)).channels.map(c=>c.pan),[-1,0]);
  const preset={name:'Test',settings:presetSettings(state)};
  const modified={...state,channels:structuredClone(state.channels),presets:[preset]};
  modified.channels[0].pan=.45;
  modified.channels[1].pan=1;
  assert.deepEqual(loadPreset(modified,preset).channels.map(c=>c.pan),[-1,0]);
});
test('mixer UI wires native panorama buttons independently of mute/solo toggles',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
  assert.match(app,/for\(const \{label,value\} of PAN_PRESETS\)/);
  assert.match(app,/panButtons\.forEach\(button=>button\.onclick=/);
  assert.match(app,/buildMatrixFaders\(i,c,\{onChange:/);
  assert.match(app,/setChannelPan\(c,input\.value,input,panButtons\)/);
  assert.match(css,/#mixer \.pan-scale button\[aria-pressed=true\]/);
  const matrix=readFileSync(new URL('../v2-matrix.css',import.meta.url),'utf8');
  assert.match(matrix,/#mixer \.matrix-segments/);
});
