import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {UI_CUE_ASSETS,UI_CUE_PATHS,classifyControlCue} from '../src/ui-cues.js';
import {AudioEngine,LCARS_MENU_BUILD_ASSET} from '../src/audio.js';

test('every one of the 15 uploaded original MP3s is retained and cached for offline playback',()=>{
 const files=Object.values(UI_CUE_ASSETS);
 const names=Object.keys(UI_CUE_ASSETS);
 assert.equal(names.length,15);
 assert.equal(new Set(files).size,15);
 const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(worker,/\.\/src\/ui-cues\.js/);
 for(const file of files){
  const data=readFileSync(new URL('../assets/audio/ui/'+file,import.meta.url));
  assert.ok(data.length>2500,file+' empty');
  assert.equal(data.subarray(0,3).toString('ascii'),'ID3',file+' not a valid MP3 tag');
  const nameWithoutExtension=file.slice(0,-4);
  assert.ok(worker.includes('"'+nameWithoutExtension+'"')||worker.includes("'"+nameWithoutExtension+"'"),file+' missing from offline sound list');
 }
 assert.equal(UI_CUE_PATHS.length,15);
 assert.equal(LCARS_MENU_BUILD_ASSET,UI_CUE_PATHS.find(x=>x.endsWith('/menu_or_window_change.mp3')));
});

test('original bytes survive archive extraction and GitHub binary upload',()=>{
 const check={
  'caution.mp3':'859d39bb9977c56657c32e26ff254c6343466b240067700f39e0c403419964ba',
  'keypress_standart.mp3':'bb0aeb0615bdc2c68a33ca7498833ef8ece44fa10cafd7c498279fb20dd4a68e',
  'launchsound_Staggered_Entrance_Animation.mp3':'3572b83c8768d1379b67a6a9c6ce6814c19da041f6fa903d1a5f283f9746fc33',
  'erase_accepted.mp3':'1e1c95992e4a28f5b7e3892b45efab4e6163c57969cafb49314f8a6b017e0d18'
 };
 for(const [file,hash] of Object.entries(check))
  assert.equal(createHash('sha256').update(readFileSync(new URL('../assets/audio/ui/'+file,import.meta.url))).digest('hex'),hash);
});

const c=({id='',tab,mode,active=false,pressed=false,tag='BUTTON',classes=[]}={})=>({
 id,dataset:{tab,mode},tagName:tag,
 classList:{contains:key=>key==='active'?active:classes.includes(key)},
 getAttribute:name=>name==='aria-pressed'?String(pressed):null,
 querySelector:()=>null
});
test('UI events use the user-named LCARS samples, not generic buttonpress everywhere',()=>{
 assert.equal(classifyControlCue(c({tab:'analytics'})),'lcars-menu-build');
 assert.equal(classifyControlCue(c({tab:'analytics',active:true})),'buttonpress');
 assert.equal(classifyControlCue(c({mode:'polymeter'})),'switchingmenus');
 assert.equal(classifyControlCue(c({id:'view'})),'lcars-menu-build');
 assert.equal(classifyControlCue(c({id:'linearTempoPlus'})),'keypress-increase');
 assert.equal(classifyControlCue(c({id:'minus'})),'keypress-decrease');
 assert.equal(classifyControlCue(c({classes:['matrix-step-down']})),'keypress-decrease');
 assert.equal(classifyControlCue(c({classes:['matrix-micro-right']})),'keypress-increase');
 assert.equal(classifyControlCue(c({classes:['lcars-jump-up']})),'keypress-increase');
 assert.equal(classifyControlCue(c({tag:'SUMMARY'})),'option-toggle');
 assert.equal(classifyControlCue(c({id:'diaryDangerCancel'})),'denied');
 assert.equal(classifyControlCue(c({id:'update'})),'update-restart');
 assert.equal(classifyControlCue(c({id:'start'})),'buttonpress');
});

test('UI cue mute and fallback never touch the metronome instrument scheduler',()=>{
 const engine=new AudioEngine(),calls=[];
 const buffer={duration:.58};
 engine.buffers.set('lcars-menu-build',buffer);
 engine.uiGain={name:'ui'};
 engine.ctx={state:'running',createBufferSource:()=>({
  buffer:null,connect(node){this.output=node;},disconnect(){},start(){calls.push(this);}
 })};
 engine.ui('lcars-menu-build',{uiEnabled:true});
 assert.equal(calls.length,1);
 assert.equal(calls[0].buffer,buffer);
 assert.equal(calls[0].output,engine.uiGain);
 engine.ui('lcars-menu-build',{uiEnabled:false});
 assert.equal(calls.length,1);
 engine.ctx.state='suspended';
 engine.ui('lcars-menu-build',{uiEnabled:true});
 assert.equal(calls.length,1);
 assert.equal(engine.active.size,0,'UI cues must not use active metronome click sources');
});

test('no generic positive confirmation tone exists in this archive, so the existing one remains',()=>{
 const audio=readFileSync(new URL('../src/audio.js',import.meta.url),'utf8');
 assert.match(audio,/legacy-Acceptsound/);
 assert.match(audio,/this\.buffers\.set\('Acceptsound',accepted\)/);
 const diary=readFileSync(new URL('../src/diary-ui.js',import.meta.url),'utf8');
 assert.match(diary,/playCue\('consolewarning'\)/);
 assert.match(diary,/count\?'erase-accepted':'Warningsound'/);
 assert.match(diary,/playCue\('windowcloses'\)/);
});
