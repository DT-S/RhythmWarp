import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,validate,loadPreset} from '../src/model.js';
import {playControlCue} from '../src/interface.js';
import {runInNewContext} from 'node:vm';

test('confirming a theme-console return plays one launch sound without restarting the transport',async()=>{
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const handler=source.slice(source.indexOf('initialize.onclick=()=>{'),source.indexOf('if(state.launchScreen){showLaunchConsole();}'));
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 for(const enabled of [true,false]){
  let sounds=0,unlocks=0,builds=0,mixes=0;
  const state={...fresh(),uiEnabled:enabled};
  const before=JSON.stringify(state);
  const initialize={disabled:false},startup={hidden:false};
  const shell={inert:true,classList:{contains:()=>true}};
  const context={initialize,startup,shell,state,firstEntry:false,
   unlock:()=>{unlocks++;return Promise.resolve();},
   motion:{boot:options=>{assert.equal(options.replay,true);builds++;return true;}},
   audio:{ctx:{state:'running'},buffers:new Map([['lcars-launch',{}]]),launchReady:Promise.resolve(),
    mix:()=>{mixes++;},ui:(key,received)=>{
     assert.equal(key,'lcars-launch');assert.equal(received,state);sounds++;
    }},
   scheduler:{start:()=>assert.fail('launch cue must never start transport')}};
  runInNewContext(handler,context);
  initialize.onclick();initialize.onclick(); // rapid duplicate click is ignored
  await flush();
  assert.equal(builds,1);assert.equal(sounds,enabled?1:0);
  assert.equal(unlocks,enabled?1:0);assert.equal(mixes,enabled?1:0);
  assert.equal(startup.hidden,true);assert.equal(shell.inert,false);
  assert.equal(JSON.stringify(state),before,'launch sound preserves rhythm and device settings');
  // A later explicit return gets its own cue, not a global once-only guard.
  initialize.disabled=false;startup.hidden=false;
  initialize.onclick();await flush();
  assert.equal(sounds,enabled?2:0);
 }
});

test('LCARS startup screen enabled by default, switch survives JSON backup and old backups',()=>{
 const next=fresh();
 assert.equal(next.launchScreen,true);
 next.launchScreen=false;
 assert.equal(validate(JSON.parse(JSON.stringify(next))).launchScreen,false);
 const older={...fresh()};delete older.launchScreen;
 assert.equal(validate(older).launchScreen,true);
 for(const incorrect of [null,12,'off']){
  assert.throws(()=>validate({...fresh(),launchScreen:incorrect}),/LCARS startup screen/);
 }
});

test("loading rhythm presets never changes the user\'s startup-screen preference",()=>{
 const settings=fresh();settings.launchScreen=true;
 const current=fresh();current.launchScreen=false;
 const output=loadPreset(current,{name:'Preset',settings});
 assert.equal(output.launchScreen,false);
});

test('navigation adds the tactile keypress without losing the window-change sample',()=>{
 const heard=[];
 const audio={ui:(...args)=>heard.push(args)};
 const nav={dataset:{tab:'audio'},classList:{contains:()=>false}};
 playControlCue(nav,audio,{uiEnabled:true});
 assert.deepEqual(heard.map(x=>x[0]),['buttonpress','lcars-menu-build']);
 assert.equal(heard[1][2],.055);
 heard.length=0;
 const active={dataset:{tab:'audio'},classList:{contains:()=>true}};
 playControlCue(active,audio,{uiEnabled:true});
 assert.deepEqual(heard.map(x=>x[0]),['buttonpress']);
 heard.length=0;
 playControlCue({id:'view',dataset:{},classList:{contains:()=>false}},audio,{uiEnabled:true});
 assert.deepEqual(heard.map(x=>x[0]),['buttonpress','lcars-menu-build']);
 assert.equal(heard[1][2],.055,'Circular/Linear must use the same sidebar cue offset');
});

test('visible accessible LCARS startup includes real logo and an opt-out control',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(html,/id="lcarsStartup"/);
 assert.match(html,/id="lcarsInitText">START RHYTHM WARP/);
 assert.match(html,/class="lcars-start-logo" viewBox="0 0 240 240"/);
 assert.match(html,/class="emblem-ring-outer"/);
 assert.match(html,/data-set-theme="voyager"/);
 assert.match(html,/id="bpmPreviewToggle"/);
 assert.match(html,/<span class="lcars-subbrand-label">RHYTHM TRAINING \/\/ OFFLINE ENGINE<\/span>/);
 const css=readFileSync(new URL('../v2-startup.css',import.meta.url),'utf8');
 assert.match(css,/\.lcars-subbrand-bar::before/);
 assert.match(css,/\.lcars-subbrand-bar::after/);
 assert.match(css,/\.lcars-subbrand-label/);
 assert.match(html,/id="launchScreen" type="checkbox"/);
 assert.match(app,/if\(state\.launchScreen\)/);
 assert.doesNotMatch(app,/await Promise\.race/);
 assert.match(app,/const launched=motion\.boot\(\{replay:!originalBoot\}\)/);
 assert.ok(app.indexOf('startup.hidden=true;')<
  app.indexOf('const launched=motion.boot({replay:!originalBoot})'),'splash must leave before app construction begins');
 assert.match(html,/id="mobileBuildVersion" class="mobile-build-version"/);
 assert.match(html,/id="forceMotion" type="checkbox"/);
 assert.match(html,/id="motionInfo"/);
 assert.match(app,/startup\.hidden=true;[\s\S]*const launched=motion\.boot\(\{replay:!originalBoot\}\)/);
 assert.match(sw,/\.\/v2-startup\.css/);
});
