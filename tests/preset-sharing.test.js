import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh} from '../src/model.js';
import {
 encodeSharedPreset,decodeSharedPresetFragment,loadSharedPreset,
 uniqueSharedPresetName,appShareUrl,TRAIN_FIELDS
} from '../src/preset-share.js';
function example(){
 const s=fresh();s.mode='ramp';s.bpm=135;s.beats=7;
 s.outer=[0,2,3,2,1,2,3];s.training.targetBpm=180;
 s.channels[0].pan=-.5;s.channels[0].sounds=['click','click','click'];
 s.theme='redalert';s.customSounds=[];s.diary.entries=[{id:'private'}];
 return {name:'School groove',settings:s};
}
test('QR link roundtrip preserves rhythm, swing, full training and audio but strips personal data',()=>{
 const p=example(),encoded=encodeSharedPreset(p),decoded=decodeSharedPresetFragment(new URL(encoded.url).hash);
 assert.equal(decoded.name,'School groove');
 assert.equal(decoded.settings.bpm,135);
 assert.deepEqual(decoded.settings.outer,[0,2,3,2,1,2,3]);
 assert.equal(decoded.settings.training.targetBpm,180);
 assert.equal(decoded.settings.channels[0].pan,-.5);
 assert.equal(decoded.settings.mode,'ramp');
 assert.equal(decoded.hadCustom,false);
 assert.equal(decoded.settings.diary.entries.length,0);
 assert.equal(decoded.settings.theme,'voyager'); // never share local display theme
 assert.equal(decoded.settings.customSounds.length,0);
 assert.equal(decoded.settings.presets.length,0);
 assert.ok(encoded.url.startsWith(appShareUrl()+'#p='));
 assert.ok(encoded.url.length<1600,'QR matrix should remain realistically scannable');
 assert.equal(TRAIN_FIELDS.length,16);
});
test('custom sample identifiers are replaced locally; no samples or IDs travel',()=>{
 const p=example();p.settings.channels[0].sounds[1]='user-11111111-2222-3333-4444-555555555555';
 const encoded=encodeSharedPreset(p);
 assert.equal(encoded.hadCustom,true);
 assert.doesNotMatch(encoded.url,/user-/);
 const loaded=decodeSharedPresetFragment(new URL(encoded.url).hash);
 assert.equal(loaded.hadCustom,true);
 assert.deepEqual(loaded.settings.channels[0].sounds,['click','click','click']);
});
test('sharing does not alter recipient privacy, appearance, other presets or UI volume',()=>{
 const state=fresh();state.theme='elite';state.uiVolume=.77;state.uiEnabled=false;
 state.presets=[{name:'Existing',settings:structuredClone(fresh())}];
 state.diary.entries=[{id:'keep',source:'manual',start:1000,end:11000,seconds:10,exercise:'My rudiments',category:'Timing',notes:'',preset:'',reason:'Manual',mode:'standard',bpm:120,peak:120,clean:null,rating:null,history:[]}];
 const next=loadSharedPreset(state,decodeSharedPresetFragment(new URL(encodeSharedPreset(example()).url).hash));
 assert.equal(next.bpm,135);
 assert.equal(next.theme,'elite');
 assert.equal(next.uiEnabled,false);
 assert.equal(next.uiVolume,.77);
 assert.deepEqual(next.presets,state.presets);
 assert.deepEqual(next.diary.entries,state.diary.entries);
 assert.equal(state.bpm,120);
});
test('duplicate names get a new unique name without overwriting',()=>{
 assert.equal(uniqueSharedPresetName('Beat',[{name:'Beat'}]),'Beat (shared)');
 assert.equal(uniqueSharedPresetName('Beat',[{name:'Beat'},{name:'Beat (shared)'}]),'Beat (shared 2)');
});
test('reject malformed fragments, schema injection and invalid training parameters',()=>{
 const encoded=encodeSharedPreset(example()).url.split('#')[1].slice(2);
 assert.throws(()=>decodeSharedPresetFragment('#p='+encoded+'!'));
 assert.throws(()=>decodeSharedPresetFragment('#p='+'a'.repeat(4001)));
 assert.throws(()=>decodeSharedPresetFragment('#p=abc'));
 const fake={v:1,n:'Nope',x:0,s:[]};
 const encode=v=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(v))))
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 assert.throws(()=>decodeSharedPresetFragment('#p='+encode({...fake,evil:1})));
 const copied=example();copied.settings.training.audibleBars=0;
 assert.throws(()=>encodeSharedPreset(copied));
});
test('QR, preview, and vendor source are in offline bundle and app wiring',()=>{
 const root=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const sw=root('sw.js'),app=root('src/app.js'),html=root('index.html');
 for(const file of ['./src/preset-share.js','./src/qr-share-ui.js','./vendor/qrcode.js','./v2-share.css'])
  assert.ok(sw.includes("'"+file+"'"),file+' missing from offline cache');
 assert.match(html,/id="sharedPresetPreview"/);
 assert.match(html,/id="appShareQr"/);
 assert.match(html,/vendor\/qrcode\.js/);
 assert.match(app,/decodeSharedPresetFragment/);
 assert.match(app,/sharedPresetSave/);
 assert.match(app,/paintQR/);
 assert.match(root('vendor/qrcode.js'),/QRCode/);
});
