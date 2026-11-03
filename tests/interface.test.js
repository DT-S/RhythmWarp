import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activationSound,playControlCue,installFeedback,installTapTempo,segmentCornerRadii,UI_SCALES,defaultInterfaceScale} from '../src/interface.js';
import {fresh,validate,presetSettings,loadPreset} from '../src/model.js';
function control({tab,mode,id,active=false,pressed=false,tag='BUTTON'}={}){const classes=new Set(active?['active']:[]);return {id,dataset:{tab,mode},tagName:tag,classList:{contains:s=>classes.has(s),add:s=>classes.add(s),remove:s=>classes.delete(s)},getAttribute:k=>k==='aria-pressed'?String(pressed):null,closest:()=>null,contains:()=>false,querySelector:()=>null};}
function fixture(options={}){const c=control(options);c.closest=s=>s==='.sound-choices'?null:c;const handlers={},calls=[],state=fresh();const root={addEventListener(n,f){(handlers[n]??=[]).push(f);}};installFeedback(root,{unlock:async()=>{},audio:{loading:Promise.resolve(),ui:(name,s)=>{if(s.uiEnabled)calls.push(name);}},state:()=>state});const fire=(name,extra={})=>{for(const f of handlers[name]||[])f({target:c,button:0,pointerId:1,pointerType:'touch',clientX:1,clientY:1,...extra});};return {c,calls,fire,state};}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('navigation uses switch sound only for a different destination',()=>{assert.equal(activationSound(control({tab:'audio'})),'lcars-menu-build');assert.equal(activationSound(control({tab:'audio',active:true})),'buttonpress');assert.equal(activationSound(control({mode:'ramp',pressed:true})),'buttonpress');assert.equal(activationSound(control({mode:'ramp'})),'switchingmenus');});
test('navigation plays one keypress plus one window-build cue, without duplicating on same tab',async()=>{
 const f=fixture({tab:'audio'});
 f.fire('click',{detail:1});
 // Navigation updates the active class immediately, but the cue must remember
 // which tab was selected when the user originally pressed it.
 f.c.classList.add('active');
 await settle();
 assert.deepEqual(f.calls,['buttonpress','lcars-menu-build']);
 f.c.classList.add('active');
 f.fire('click',{detail:1});await settle();
 assert.deepEqual(f.calls,['buttonpress','lcars-menu-build','buttonpress']);
 f.state.uiEnabled=false;
 f.c.classList.remove('active');
 f.fire('click',{detail:1});await settle();
 assert.deepEqual(f.calls,['buttonpress','lcars-menu-build','buttonpress']);
});
test('Circular/Linear toggle uses the exact sidebar window-build combination in both directions',async()=>{
 const f=fixture({id:'view'});
 assert.equal(activationSound(f.c),'lcars-menu-build');
 f.fire('click',{detail:1});await settle(); // Circular to Linear
 f.fire('click',{detail:1});await settle(); // Linear to Circular
 assert.deepEqual(f.calls,['buttonpress','lcars-menu-build','buttonpress','lcars-menu-build']);
 f.state.uiEnabled=false;
 f.fire('click',{detail:1});await settle();
 assert.equal(f.calls.length,4,'disabled UI feedback stays silent');
 const calls=[];
 playControlCue(control({id:'view'}),{ui:(sound,_settings,offset)=>calls.push({sound,offset})},f.state);
 assert.deepEqual(calls,[{sound:'buttonpress',offset:undefined},{sound:'lcars-menu-build',offset:.055}],
   'view switches share sidebar timing and sample, not modechange.mp3');
});
test('finger contact hovers before release; summary activation beeps',async()=>{const f=fixture({tag:'SUMMARY'});f.fire('pointerdown');await settle();assert.deepEqual(f.calls,['hoversound']);assert.ok(f.c.classList.contains('touch-pressed'));f.fire('pointerup');assert.ok(!f.c.classList.contains('touch-pressed'));f.fire('click');await settle();assert.deepEqual(f.calls,['hoversound','option-toggle']);});
test('release or scrolling cancels a delayed hover',async()=>{for(const event of ['pointerup','pointercancel','pointermove']){const f=fixture();f.fire('pointerdown');f.fire(event,{clientX:30,clientY:30});await settle();assert.deepEqual(f.calls,[]);assert.ok(!f.c.classList.contains('touch-pressed'));}});
test('hover preference applies to touch and does not disable click feedback',async()=>{const f=fixture();f.state.hoverEnabled=false;f.fire('pointerdown');await settle();f.fire('pointerup');f.fire('click');await settle();assert.deepEqual(f.calls,['buttonpress']);});
test('disabled buttons produce no touch or click sound',async()=>{const f=fixture();f.c.disabled=true;f.fire('pointerdown');f.fire('click');await settle();assert.deepEqual(f.calls,[]);});
test('scale restores, migrates old backups and survives preset changes',()=>{const s=fresh();s.uiScale=.8;s.presets=[{name:'P',settings:presetSettings({...s,uiScale:1})}];assert.equal(validate(JSON.parse(JSON.stringify(s))).uiScale,.8);assert.equal(loadPreset(s,s.presets[0]).uiScale,.8);delete s.uiScale;assert.equal(validate(s).uiScale,1);assert.throws(()=>validate({...s,uiScale:.01}));assert.deepEqual(UI_SCALES,[.7,.8,.9,1,1.1]);});

test('90% is the initial compact-phone scale, desktop remains 100%',()=>{assert.equal(defaultInterfaceScale(true),.9);assert.equal(defaultInterfaceScale(false),1);});

function segmentRect(column,row,width=50,height=40){
 const left=column*55,top=row*45;
 return {left,top,right:left+width,bottom:top+height,width,height};
}
test('LCARS sound matrix curves only the four exposed corners of a 4-by-2 group',()=>{
 const rectangles=Array.from({length:8},(_,i)=>segmentRect(i%4,Math.floor(i/4)));
 assert.deepEqual(segmentCornerRadii(rectangles),[
  '20px 0 0 0','0 0 0 0','0 0 0 0','0 20px 0 0',
  '0 0 0 20px','0 0 0 0','0 0 0 0','0 0 20px 0'
 ]);
});
test('LCARS segment caps track reflow, incomplete rows and single controls',()=>{
 const ragged=Array.from({length:6},(_,i)=>segmentRect(i%4,Math.floor(i/4)));
 const caps=segmentCornerRadii(ragged);
 assert.equal(caps[4],'0 0 0 20px');
 assert.equal(caps[5],'0 0 20px 0');
 const twoColumns=Array.from({length:6},(_,i)=>segmentRect(i%2,Math.floor(i/2)));
 const narrow=segmentCornerRadii(twoColumns);
 assert.equal(narrow[1],'0 20px 0 0');
 assert.equal(narrow[4],'0 0 0 20px');
 assert.equal(narrow[5],'0 0 20px 0');
 assert.deepEqual(segmentCornerRadii([segmentRect(0,0)]),['20px 20px 20px 20px']);
 assert.deepEqual(segmentCornerRadii([{top:0,left:0,right:0,width:0,height:0}]),[null]);
});

test('segmented layout refresh is scoped to dynamic controls, not frame-updated text',()=>{
 const source=readFileSync(new URL('../src/interface.js',import.meta.url),'utf8');
 assert.match(source,/observer\.observe\(node,\{childList:true,subtree:true\}\)/);
 assert.doesNotMatch(source,/observer\.observe\(root,\{childList:true,subtree:true/);
});

test('Tap Tempo measures on pointerdown and never on pointerup or its synthetic click',()=>{
 const callbacks={};let taps=0;
 const button={addEventListener:(event,fn)=>{callbacks[event]=fn;}};
 installTapTempo(button,()=>{taps++;});
 callbacks.pointerdown({button:0,isPrimary:true,pointerType:'touch'});
 assert.equal(taps,1);
 // Releasing a pressed finger adds no second tempo sample.
 callbacks.click({detail:1});
 assert.equal(taps,1);
 callbacks.pointerdown({button:0,isPrimary:true,pointerType:'touch'});
 assert.equal(taps,2);
 callbacks.click({detail:1});
 assert.equal(taps,2);
 // Keyboard/assistive activation has no preceding pointerdown.
 callbacks.click({detail:0});
 assert.equal(taps,3);
 callbacks.click({detail:1});
 assert.equal(taps,4);
 callbacks.pointerdown({button:2,isPrimary:true,pointerType:'mouse'});
 callbacks.pointerdown({button:0,isPrimary:false,pointerType:'touch'});
 assert.equal(taps,4);
});

test('Tap Tempo makes exactly one press beep on contact, independent of hover setting',async()=>{
 const f=fixture({id:'tap'});
 f.fire('pointerdown');await settle();
 assert.deepEqual(f.calls,['buttonpress']);
 f.fire('pointerup');f.fire('click',{detail:1});
 await settle();
 assert.deepEqual(f.calls,['buttonpress']);
 f.fire('pointerover',{pointerType:'mouse'});
 await settle();
 assert.deepEqual(f.calls,['buttonpress']);
 const noHover=fixture({id:'tap'});
 noHover.state.hoverEnabled=false;
 noHover.fire('pointerdown');await settle();
 assert.deepEqual(noHover.calls,['buttonpress']);
 noHover.fire('pointerup');noHover.fire('click',{detail:1});
 await settle();
 assert.deepEqual(noHover.calls,['buttonpress']);
});

test('Tap Tempo keeps keyboard activation feedback',async()=>{
 const f=fixture({id:'tap'});
 f.fire('click',{detail:0});await settle();
 assert.deepEqual(f.calls,['buttonpress']);
});

test('mobile diary editor does not auto-focus or use document scrollIntoView',()=>{
 const source=readFileSync(new URL('../src/diary-ui.js',import.meta.url),'utf8');
 assert.match(source,/if\(onPhone\(\)\)\{/);
 assert.match(source,/well\.scrollTop\+=/);
 assert.match(source,/for\(const event of \['resize','scroll'\]\)/);
 const mobile=source.split('if(onPhone()){').at(-1).split('}else{')[0];
 assert.doesNotMatch(mobile,/\.focus\(/);
 assert.doesNotMatch(mobile,/\.scrollIntoView\(/);
});
