import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldTransition,shouldLaunchBoot,LCARS_BOOT_DURATION_MS,LCARS_PAGE_BUILD_DURATION_MS,LCARS_AUDIO_BUILD_DURATION_MS,LCARS_VIEW_BUILD_DURATION_MS,LCARS_LINEAR_BUILD_DURATION_MS,createMotionController} from '../src/motion.js';
import {readFileSync} from 'node:fs';

test('P6 page transitions occur for actual destination change only',()=>{
 assert.equal(shouldTransition('metronome','audio'),true);
 assert.equal(shouldTransition('audio','audio'),false);
 assert.equal(shouldTransition('audio',''),false);
 assert.equal(shouldTransition('audio',undefined),false);
});
test('P6 motion is event-triggered, reduced-motion safe and never runs on audio frames',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/motion.js',import.meta.url),'utf8');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/lcars-page-build/);
 assert.match(css,/chart-probe-line/);
 assert.match(css,/chart-motion-static/);
 assert.doesNotMatch(css,/(?:animation|transition)\s*:[^;]*\binfinite\b|(?:^|\n)\s*\.scanline\b|(?:^|\n)\s*\.sidebar-node\b/);
 assert.doesNotMatch(js,/requestAnimationFrame|setInterval|AudioContext|Math.random/);
});

test('P6 navigation binds a collection and never calls .forEach on a single element',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/document\.querySelectorAll\('\[data-tab\]'\)\.forEach/);
 assert.match(app,/document\.querySelectorAll\('\.page'\)\.forEach/);
 assert.match(app,/document\.querySelectorAll\('\.nav'\)\.forEach/);
});

test('Launch animation is one-shot, cancels on navigation and respects reduced motion',()=>{
 assert.equal(LCARS_BOOT_DURATION_MS,1450);
 assert.equal(shouldLaunchBoot(),true);
 assert.equal(shouldLaunchBoot({reducedMotion:true}),false);
 assert.equal(shouldLaunchBoot({metronomeVisible:false}),false);
 function element(id){
  const classes=new Set(),listeners=new Map();
  return {id,hidden:false,offsetWidth:250,isConnected:true,
   classList:{
    add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)
   },
   addEventListener:(name,fn)=>listeners.set(name,fn),
   removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}
  };
 }
 const shell=element('shell'),metronome=element('metronome'),audio=element('audio');
 audio.hidden=true;
 const root={
  querySelectorAll:q=>q==='.page'?[metronome,audio]:[],
  querySelector:q=>q==='.app-shell'?shell:null,
  getElementById:id=>id==='metronome'?metronome:id==='audio'?audio:null
 };
 const old=globalThis.matchMedia;
 try{
  globalThis.matchMedia=()=>({matches:false});
  const motion=createMotionController(root);
  assert.equal(motion.boot(),true);
  assert.equal(shell.classList.contains('lcars-booting'),true);
  assert.equal(motion.boot(),false,'Boot never repeats for a controller instance');
  metronome.hidden=true;audio.hidden=false;
  assert.equal(motion.page('audio'),true);
  assert.equal(shell.classList.contains('lcars-booting'),false,
    'Navigation cancels launch and restores fully visible controls');
  motion.page('metronome');
  assert.equal(motion.boot(),false);
  const reduced=createMotionController(root);
  globalThis.matchMedia=()=>({matches:true});
  assert.equal(reduced.boot(),false);
  assert.equal(shell.classList.contains('lcars-booting'),false);
 }finally{
  if(old===undefined)delete globalThis.matchMedia;
  else globalThis.matchMedia=old;
 }
});

test('Launch choreography uses real circular geometry, has reduced-motion escape hatch and is not an idle loop',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const name of ['lcars-launch-elbow','lcars-launch-bar-x','lcars-launch-bar-y',
                    'lcars-launch-pop','lcars-launch-ring','lcars-launch-node']){
  assert.ok(css.includes(name),'Missing '+name);
 }
 assert.match(css,/\.app-shell\.lcars-booting #rings circle\.track/);
 assert.match(css,/\.app-shell\.lcars-booting #rings g\[data-index\]/);
 assert.match(css,/animation:lcars-launch-node/);
 assert.doesNotMatch(css,/#rings g\[data-index\][^{}]*\{[^}]*transform\s*:/,
   'Boot may not transform SVG hit targets');
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/animation:[^;]*infinite/);
 assert.match(app,/\}render\(\);[\s\S]*function bootDirect\(\)/);
 assert.match(app,/--boot-delay:/);
 assert.match(sw,/const CACHE=PREFIX\+'lcars-core-v2-rc\d+-/);
});

test('RC9 page builds never touch persistent chassis and clear on rapid navigation',()=>{
 assert.equal(LCARS_PAGE_BUILD_DURATION_MS,1200);
 const shellClasses=new Set(),classFor=classes=>({
  add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)
 });
 const shell={classList:classFor(shellClasses)};
 const pageIds=['metronome','audio','presets','diary','analytics','settings'];
 const pages=pageIds.map(id=>{
  const classes=new Set();
  return {id,hidden:id!=='metronome',offsetWidth:300,classList:classFor(classes),
    addEventListener:()=>{},removeEventListener:()=>{}};
 });
 const byId=Object.fromEntries(pages.map(p=>[p.id,p]));
 const root={
  querySelectorAll:q=>q==='.page'?pages:[],
  querySelector:q=>q==='.app-shell'?shell:null,
  getElementById:id=>byId[id]
 };
 const nativeSet=globalThis.setTimeout,nativeClear=globalThis.clearTimeout,nativeMatch=globalThis.matchMedia;
 let key=0;const tasks=new Map();
 try{
  globalThis.setTimeout=(fn,ms)=>{const id=++key;tasks.set(id,{fn,ms});return id;};
  globalThis.clearTimeout=id=>tasks.delete(id);
  globalThis.matchMedia=()=>({matches:false});
  const motion=createMotionController(root);
  byId.metronome.hidden=true;byId.audio.hidden=false;
  assert.equal(motion.page('audio'),true);
  assert.equal(shell.classList.contains('lcars-page-building'),false,
    'fixed sidebar/header must stay visible during a tab build');
  assert.equal(byId.audio.classList.contains('lcars-page-enter'),true);
  assert.equal([...tasks.values()][0].ms,LCARS_AUDIO_BUILD_DURATION_MS);
  assert.equal(motion.page('audio'),false,'current page is never rebooted');
  byId.audio.hidden=true;byId.analytics.hidden=false;
  assert.equal(motion.page('analytics'),true);
  assert.equal(byId.audio.classList.contains('lcars-page-enter'),false,
    'cancel old tab on fast navigation');
  assert.equal(byId.analytics.classList.contains('lcars-page-enter'),true);
  assert.equal(tasks.size,1,'no abandoned timeouts after fast switching');
  [...tasks.values()][0].fn();
  assert.equal(tasks.size,0);
  assert.equal(shell.classList.contains('lcars-page-building'),false);
  assert.equal(byId.analytics.classList.contains('lcars-page-enter'),false);
  globalThis.matchMedia=()=>({matches:true});
  byId.analytics.hidden=true;byId.settings.hidden=false;
  assert.equal(motion.page('settings'),true);
  assert.equal(shell.classList.contains('lcars-page-building'),false,
    'reduced motion must never enter a boot state');
  assert.equal(byId.settings.classList.contains('lcars-page-enter'),false);
 }finally{
  globalThis.setTimeout=nativeSet;globalThis.clearTimeout=nativeClear;
  if(nativeMatch===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=nativeMatch;
 }
});

test('all six pages animate only their inner panels while fixed rails stay untouched',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const marker of [
  '.page.lcars-page-enter > .section-heading',
  '.page.lcars-page-enter > .cards > .panel',
  '.page.lcars-page-enter #diaryList',
  '.page.lcars-page-enter #presetList',
  '.page.lcars-page-enter > .section-heading',
  '.page.lcars-page-enter > .cards',
  '.page.lcars-page-enter #diaryControls',
  '.page.lcars-page-enter #analyticsContent',
  '#metronome.lcars-page-enter #rings circle.track',
  '@media (prefers-reduced-motion:reduce)'
 ])assert.ok(css.includes(marker),'missing construction stage '+marker);
 assert.match(css,/\.page\.lcars-page-enter \{[\s\S]*?animation:none;/);
 const cssTail=css.slice(css.indexOf('RC9 · THE CHASSIS STAYS ON'));
 assert.doesNotMatch(cssTail,/\.app-shell\.lcars-page-building/,'fixed shell may animate only at initial boot');
 assert.doesNotMatch(cssTail,/\.page\.lcars-page-enter::(?:before|after)\s*\{[^}]*\banimation:\s*(?!none)/,
   'tab frames must not redraw fixed perimeter rails');
 assert.doesNotMatch(jsMotion(),/classList\.add\('lcars-page-building'\)/,
   'navigation must not animate the stable shell');
 function jsMotion(){return readFileSync(new URL('../src/motion.js',import.meta.url),'utf8');}

 assert.doesNotMatch(css,/\.page\.lcars-page-enter \{[^}]*translateX\(/,
  'never slide the complete page or its hit targets horizontally');
 assert.match(sw,/const CACHE=PREFIX\+'lcars-core-v2-rc\d+-/); // Cache rotates with release.
});

test('RC10 view reassembly is one-shot per toggle, cancellable and reduced-motion-safe',()=>{
 assert.equal(LCARS_VIEW_BUILD_DURATION_MS,1200);
 const classes=()=>{const all=new Set();return {
  add:v=>all.add(v),remove:v=>all.delete(v),contains:v=>all.has(v)
 };};
 const dial={id:'dial',hidden:false,offsetWidth:410,classList:classes()};
 const linear={id:'linear',hidden:true,offsetWidth:410,classList:classes()};
 const metronome={id:'metronome',hidden:false,offsetWidth:640,classList:classes()};
 const audio={id:'audio',hidden:true,offsetWidth:640,classList:classes()};
 const shell={classList:classes()};
 const pages=[metronome,audio];
 const root={
  querySelectorAll:q=>q==='.page'?pages:[],
  querySelector:q=>q==='.app-shell'?shell:null,
  getElementById:id=>id==='metronome'?metronome:id==='audio'?audio:null
 };
 const prevSet=globalThis.setTimeout,prevClear=globalThis.clearTimeout,prevMatch=globalThis.matchMedia;
 let id=0;const pending=new Map();
 try{
  globalThis.setTimeout=(fn,ms)=>{const next=++id;pending.set(next,{fn,ms});return next;};
  globalThis.clearTimeout=id=>pending.delete(id);
  globalThis.matchMedia=()=>({matches:false});
  const motion=createMotionController(root);
  dial.hidden=true;linear.hidden=false;
  assert.equal(motion.view(linear),true);
  assert.equal(linear.classList.contains('lcars-view-enter'),true);
  assert.equal(pending.size,1);
  assert.equal([...pending.values()][0].ms,LCARS_LINEAR_BUILD_DURATION_MS);
  // Rapid return to Circular cancels the pending Linear assembly.
  linear.hidden=true;dial.hidden=false;
  assert.equal(motion.view(dial),true);
  assert.equal(linear.classList.contains('lcars-view-enter'),false);
  assert.equal(dial.classList.contains('lcars-view-enter'),true);
  assert.equal(pending.size,1,'only the most recent build has a timer');
  assert.equal(shell.classList.contains('lcars-booting'),false);
  assert.equal(shell.classList.contains('lcars-page-building'),false);
  [...pending.values()][0].fn();
  assert.equal(dial.classList.contains('lcars-view-enter'),false);
  assert.equal(pending.size,0);
  globalThis.matchMedia=()=>({matches:true});
  dial.hidden=true;linear.hidden=false;
  assert.equal(motion.view(linear),false,'reduced motion skips view assembly');
  assert.equal(linear.classList.contains('lcars-view-enter'),false);
  globalThis.matchMedia=()=>({matches:false});
  assert.equal(motion.view(linear),true);
  metronome.hidden=true;audio.hidden=false;
  motion.page('audio');
  assert.equal(linear.classList.contains('lcars-view-enter'),false,
   'switching to another page cancels sequencer assembly');
 }finally{
  globalThis.setTimeout=prevSet;globalThis.clearTimeout=prevClear;
  if(prevMatch===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=prevMatch;
 }
});

test('RC10 rebuilds individual view beats without any outer LCARS chassis animation',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const selector of [
  '#metronome #dial.lcars-view-enter #rings circle.track',
  '#metronome #dial.lcars-view-enter #rings g[data-index]',
  '#metronome #linear.lcars-view-enter > h3',
  '#metronome #linear.lcars-view-enter .pattern-row[data-channel="0"] .step',
  '#metronome #linear.lcars-view-enter .pattern-row[data-channel="1"] .step'
 ])assert.ok(css.includes(selector),'missing staged sequencer element: '+selector);
 assert.match(css,/@keyframes lcars-view-beat/);
 assert.match(app,/--view-delay:/);
 assert.match(app,/b\.style\.setProperty\('--view-delay'/);
 const newRules=css.slice(css.indexOf('RC10 · VIEW-SPECIFIC BEAT ASSEMBLY'));
 assert.doesNotMatch(newRules,/#metronome\s*\.instrument\s*\{/,
  'view switch should not rebuild instrument console');
 assert.doesNotMatch(newRules,/\.app-shell\.lcars-booting/,
  'view switch must not touch startup shell');
 assert.doesNotMatch(newRules,/animation:[^;]*infinite/);
 assert.match(newRules,/prefers-reduced-motion:reduce/);
 assert.match(sw,/const CACHE=PREFIX\+'lcars-core-v2-rc\d+-/);
});

test('RC15 returning to active Linear from another tab replays the real view build',()=>{
 assert.equal(LCARS_LINEAR_BUILD_DURATION_MS,1950);
 const createClasses=()=>{const set=new Set();return {
  add:v=>set.add(v),remove:v=>set.delete(v),contains:v=>set.has(v)
 };};
 const linear={id:'linear',hidden:false,offsetWidth:400,classList:createClasses()};
 const dial={id:'dial',hidden:true,offsetWidth:400,classList:createClasses()};
 const metronome={id:'metronome',hidden:true,offsetWidth:800,classList:createClasses()};
 const settings={id:'settings',hidden:false,offsetWidth:800,classList:createClasses()};
 const shell={classList:createClasses()};
 const pages=[metronome,settings];
 const byId={metronome,settings,linear,dial};
 const root={querySelectorAll:q=>q==='.page'?pages:[],querySelector:q=>q==='.app-shell'?shell:null,
  getElementById:id=>byId[id]};
 const orig={set:globalThis.setTimeout,clear:globalThis.clearTimeout,match:globalThis.matchMedia};
 let counter=0;const scheduled=new Map();
 try{
  globalThis.setTimeout=(fn,ms)=>{const id=++counter;scheduled.set(id,{fn,ms});return id;};
  globalThis.clearTimeout=id=>scheduled.delete(id);
  globalThis.matchMedia=()=>({matches:false});
  const motion=createMotionController(root);
  settings.hidden=true;metronome.hidden=false;
  assert.equal(motion.page('metronome'),true);
  assert.equal(metronome.classList.contains('lcars-page-enter'),true);
  assert.equal(linear.classList.contains('lcars-view-enter'),true,
   'returning from another tab must animate actual Linear tempo and beats');
  assert.deepEqual([...scheduled.values()].map(x=>x.ms).sort((a,b)=>a-b),
   [LCARS_LINEAR_BUILD_DURATION_MS,LCARS_LINEAR_BUILD_DURATION_MS]);
  assert.equal(shell.classList.contains('lcars-page-building'),false);
  // Switching out, then quickly back: both previous timers must be cancelled.
  metronome.hidden=true;settings.hidden=false;
  assert.equal(motion.page('settings'),true);
  assert.equal(linear.classList.contains('lcars-view-enter'),false);
  assert.equal(scheduled.size,1);
  settings.hidden=true;metronome.hidden=false;
  assert.equal(motion.page('metronome'),true);
  assert.equal(linear.classList.contains('lcars-view-enter'),true);
  assert.equal(scheduled.size,2);
  for(const task of [...scheduled.values()])task.fn();
  assert.equal(scheduled.size,0);
  assert.equal(linear.classList.contains('lcars-view-enter'),false);
  assert.equal(metronome.classList.contains('lcars-page-enter'),false);
  // Circular is still the original fast on-page sequence.
  linear.hidden=true;dial.hidden=false;
  metronome.hidden=true;settings.hidden=false;motion.page('settings');
  metronome.hidden=false;settings.hidden=true;motion.page('metronome');
  assert.equal(linear.classList.contains('lcars-view-enter'),false);
  assert.deepEqual([...scheduled.values()].map(x=>x.ms),
   [LCARS_PAGE_BUILD_DURATION_MS]);
 }finally{
  globalThis.setTimeout=orig.set;globalThis.clearTimeout=orig.clear;
  if(orig.match===undefined)delete globalThis.matchMedia;
  else globalThis.matchMedia=orig.match;
 }
});

test('RC15 Linear tempo and real beats are staggered for both entry routes',()=>{
 const css=readFileSync(new URL('../v2-motion.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const section=css.slice(css.indexOf('RC15 · LINEAR SUBROUTINE'));
 assert.ok(section.length>3000,'missing real Linear instrument choreography');
 for(const target of [
  '.linear-tempo-console','.linear-tempo-code',
  '.linear-tempo-id strong','.linear-tempo-hint',
  '.linear-tempo-control','#linearTempoValue',
  '.linear-tempo-steps button:first-child',
  '.linear-tempo-steps button:last-child',
  '> h3:nth-of-type(2)',
  '.pattern-row[data-channel="0"] .step',
  '.pattern-row[data-channel="1"] .step'
 ])assert.ok(section.includes(target),'missing animated control: '+target);
 assert.match(section,/#metronome\.lcars-page-enter #linear\.lcars-view-enter/);
 assert.match(section,/--linear-return-offset:180ms/);
 assert.match(section,/calc\(var\(--linear-return-offset,0ms\) \+ var\(--view-delay,820ms\)\)/);
 assert.match(app,/820\+channel\*210\+i\*24/);
 assert.doesNotMatch(section,/animation:[^;]*infinite/);
 assert.doesNotMatch(section,/(?:translate[XYZ]?|scale[XYZ]?)\(/);
 assert.match(section,/prefers-reduced-motion:reduce/);
});

test('RC22 mobile animation override bypasses OS reduce preference deliberately',()=>{
 const previous=globalThis.matchMedia;
 const classes=()=>{const values=new Set();return {
  add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)
 };};
 const metronome={id:'metronome',hidden:false,classList:classes()};
 const shell={classList:classes()};
 const root={
  documentElement:{dataset:{lcarsMotion:'force'}},
  querySelectorAll:q=>q==='.page'?[metronome]:[],
  querySelector:q=>q==='.app-shell'?shell:null,
  getElementById:id=>id==='metronome'?metronome:null
 };
 const currentSet=globalThis.setTimeout,currentClear=globalThis.clearTimeout;
 try{
  globalThis.matchMedia=()=>({matches:true});
  globalThis.setTimeout=()=>99;
  globalThis.clearTimeout=()=>{};
  const motion=createMotionController(root);
  assert.equal(motion.boot(),true);
  assert.equal(shell.classList.contains('lcars-booting'),true);
  motion.finishBoot();
  assert.equal(shell.classList.contains('lcars-booting'),false);
  root.documentElement.dataset.lcarsMotion='system';
  const normal=createMotionController(root);
  assert.equal(normal.boot(),false);
 }finally{
  if(previous===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=previous;
  globalThis.setTimeout=currentSet;globalThis.clearTimeout=currentClear;
 }
});
