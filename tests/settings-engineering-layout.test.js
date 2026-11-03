import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html'),css=read('v2-theme.css'),sounds=read('src/custom-sounds.js'),sw=read('sw.js'),polish=read('v2-polish.css');

test('RC25.10 engineering deck is CSS-only and isolates seven Settings panels',()=>{
 assert.match(css,/RC25\.10 \/\/ VOYAGER MAIN ENGINEERING/);
 assert.match(css,/@media \(max-width:640px\)/);
 assert.match(css,/#settings \.panel:has\(> label #uiEnabled\)/);
 assert.match(css,/#settings \.panel:has\(> #export\)/);
 assert.match(css,/#settings \.panel:has\(> #offlineStatus\)/);
 assert.match(css,/#settings #customSoundList \.sound-file/);
 assert.match(css,/#settings #buildInfo,#settings #motionInfo/);
 assert.match(polish,/RC16 · READABILITY SYSTEM/);
 assert.doesNotMatch(css,/#diary #diaryEditor|#analyticsContent \.stat-grid|#metronome #micConsole/);
 for(const id of ['openLaunchConsole','scaleButtons','uiEnabled','hoverEnabled','haptic',
   'launchScreen','forceMotion','soundDrop','soundUpload','customSoundList','export','import',
   'offlineStatus','storageStatus','persist','update','buildInfo','motionInfo','viewportDiagnostics']){
  assert.equal(html.split('id="'+id+'"').length-1,1,'unchanged unique settings control '+id);
 }
});

test('mobile switch matrix keeps all five accessible existing controls',()=>{
 // The five labels use one shared :has(input[type=checkbox]) rule; only
 // LCARS corner geometry needs dedicated per-label selectors.
 for(const id of ['uiEnabled','hoverEnabled','forceMotion'])
  assert.match(css,new RegExp('label:has\\(#'+id+'\\)'));
 assert.match(css,/#settings \.panel:has\(> label #uiEnabled\) > label:has\(input\[type="checkbox"\]\)/);
 for(const id of ['uiEnabled','hoverEnabled','haptic','launchScreen','forceMotion'])
  assert.match(html,new RegExp('id="'+id+'" type="checkbox"'));
 assert.match(css,/label:has\(#forceMotion\)[\s\S]*grid-template-columns:minmax\(0,1fr\) 55px/);
 assert.match(css,/label:has\(input\[type="checkbox"\]\) input/);
 assert.match(css,/#settings \.panel:has\(> label #uiEnabled\) > \.lcars-info/);
});

test('sound drop and each recorded sound remain operable without JavaScript changes',()=>{
 assert.match(css,/#settings #soundDrop:focus-within/);
 assert.match(css,/#settings #customSoundList \.sound-file > span/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) 52px 58px/);
 assert.match(sounds,/SOUND_LIMIT=16/);
 assert.match(sounds,/s\.duration>5/);
 assert.match(sounds,/root\.append\(row\)/);
 assert.match(sounds,/button\('PLAY'/);
 assert.match(sounds,/button\('DELETE'/);
});

test('backup and offline controls retain their actual existing actions, not dummy text',()=>{
 assert.match(html,/<button id="export"/);
 assert.match(html,/<label class="file-button">IMPORT JSON<input id="import"/);
 assert.match(html,/<button id="persist"/);
 assert.match(html,/<button id="update"/);
 assert.match(css,/#settings \.panel:has\(> #export\) > \.lcars-info \{order:3;\}/);
 assert.match(css,/#settings #offlineStatus,#settings #storageStatus/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-studio-green-v0-1'/);
});
