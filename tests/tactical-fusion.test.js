import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),js=read('src/tactical-view.js'),app=read('src/app.js'),
 mic=read('src/mic-ui.js'),css=read('v2-tactical.css'),sw=read('sw.js');
test('Tactical is a third state; authentic dual-ring sequencer remains unique',()=>{
 assert.match(html,/id="tacticalViewSwitch"/);
 for(const v of ['circular','linear','tactical'])assert.match(html,new RegExp('data-tac-view="'+v+'"'));
 assert.match(html,/id="tacticalRingDock"/);
 assert.match(html,/id="tacticalRingOverlay"/);
 assert.match(html,/id="tacticalLane"/);
 assert.match(js,/dock\.prepend\(dial\)/);
 assert.match(js,/instrument\.insertBefore\(dial,linear\)/);
 assert.match(js,/function drawRing\(/);
 assert.match(js,/function drawLane\(/);
 assert.match(app,/createTacticalView/);
 assert.match(app,/tactical\.frame\(\)/);
 assert.equal(html.split('id="dial"').length-1,1,'must reuse real dial, not duplicate it');
 assert.equal(html.split('id="rings"').length-1,1,'must reuse both real beat rings');
});
test('Tactical is presentation only; hit timestamps share the AudioContext timebase',()=>{
 assert.match(js,/audio\.ctx\?\.currentTime/);
 assert.match(js,/referenceTime/);
 assert.match(js,/const actual=finite\(hit\.correctedTime\)/);
 assert.match(js,/const x=xAt\(actual\)/);
 assert.match(js,/tacticalBeatPosition\(when,visible\)-beatAtNow/);
 assert.match(js,/const hitPhase=/);
 assert.match(mic,/new CustomEvent\('lcars:mic-hit'/);
 assert.match(mic,/new CustomEvent\('lcars:bar-grid'/);
 assert.match(mic,/new CustomEvent\('lcars:mic-session'/);
 assert.match(mic,/correctedTime=time-inputDelayMs\/1000/);
 assert.match(js,/renderLiveSensor\(plot,data/);
 assert.doesNotMatch(js,/navigator\.mediaDevices|audio\.click\(|scheduler\.start\(/);
});
test('Voyager bloom, blue grid, 320px fallback and offline assets',()=>{
 assert.match(css,/#tactical \.tac-lane-grid/);
 assert.match(css,/#tactical \.tac-plot-shell \.mic-sensor-grid/);
 assert.match(css,/drop-shadow/);
 assert.match(css,/@keyframes tac-sweep/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-studio-green-v0-1'/);
 assert.match(sw,/\.\/v2-tactical\.css/);
 assert.match(sw,/\.\/src\/tactical-view\.js/);
 assert.match(html,/href="\.\/v2-tactical\.css"/);
});


test('Tactical view buttons use established keypress + LCARS window-switch audio cue',async()=>{
 const {classifyControlCue}=await import('../src/ui-cues.js');
 const {playControlCue}=await import('../src/interface.js');
 const inactive={id:'',dataset:{tacView:'tactical'},getAttribute:()=> 'false'};
 const active={id:'',dataset:{tacView:'tactical'},getAttribute:()=> 'true'};
 assert.equal(classifyControlCue(inactive),'lcars-menu-build');
 assert.equal(classifyControlCue(active),'buttonpress');
 const played=[],audio={ui:(...args)=>played.push(args)},settings={uiEnabled:true};
 playControlCue(inactive,audio,settings,classifyControlCue(inactive));
 assert.deepEqual(played.map(x=>x[0]),['buttonpress','lcars-menu-build']);
 assert.equal(played[1][2],.055);
 played.length=0;
 playControlCue(active,audio,settings,classifyControlCue(active));
 assert.deepEqual(played.map(x=>x[0]),['buttonpress']);
});

test('Armed Tactical full width overrides the older two-column mic instrument rule',()=>{
 assert.match(css,/#metronome\.tactical-active\.mic-telemetry-on \.instrument:not\(:has/);
 assert.match(css,/#metronome\.tactical-active\.mic-telemetry-on \.instrument-layout > \.instrument/);
 assert.match(css,/grid-template-columns:none!important/);
 assert.match(css,/#metronome\.mic-telemetry-on \.section-heading > #view/);
 assert.match(css,/display:none!important/);
});
test('Tactical entry animation honors motion preferences and stages all subsystems',()=>{
 for(const name of ['tactical-rail-on','tactical-core-online','tactical-lattice-on','tactical-node-on'])
  assert.ok(css.includes('@keyframes '+name));
 for(const name of ['tac-cockpit','tac-ring-dock','tac-lane-shell','tac-plot-shell','tac-diagnostic-row'])
  assert.ok(css.includes('tactical.lcars-view-enter .'+name),'missing staged '+name);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/html:not\(\[data-lcars-motion="force"\]\)/);
});

test('STOP clears the circular playhead independent of microphone capture',()=>{
 assert.match(js,/function drawRing\(time\)\{[\s\S]*?if\(!scheduler\.running\)\{overlay\.replaceChildren\(\);return;\}/);
 assert.match(js,/if\(scheduler\.running\)drawRing\(time\);\s*else overlay\.replaceChildren\(\)/);
 assert.match(js,/drawLane\(scheduler\.running\|\|micOn\?time:0\)/);
});

test('One-window Tactical reuses the original LCARS deck buttons and live settings inline',()=>{
 for(const id of ['deckParamsToggle','deckMicToggle','tacticalMix','tacticalDeckHost',
                   'tacticalDeckBarMount','tacticalSettingsBody'])
  assert.equal(html.split('id="'+id+'"').length-1,1,'missing or duplicated '+id);
 // Other pages may legitimately contain native dialogs; only Tactical
 // configuration is forbidden from adding its own modal/overlay.
 assert.equal(html.includes('tacticalSettingsDialog'),false);
 assert.match(js,/deckMount\.append\(deckBar\)/);
 assert.match(js,/deckHome\.after\(deckBar\)/);
 assert.match(js,/settingsBody\.append\(node\)/);
 assert.match(js,/placeholder\.replaceWith\(node\)/);
 assert.match(js,/settingsBody\.hidden=true/);
 assert.match(js,/settingsBody\.hidden=false/);
 assert.match(js,/function selectSettings\(name\)/);
 assert.match(js,/deckMount\.addEventListener\('click'/);
 assert.doesNotMatch(js,/showModal\(|settingsDialog|backdrop-filter/);
 for(const id of ['trainingDeck','mixer','micConsole'])
  assert.ok(js.includes("$('"+id+"')"),'not reusing '+id);
 assert.match(css,/#metronome\.tactical-active #tacticalSettingsBody #trainingDeck/);
 assert.match(css,/#metronome\.tactical-active #tacticalSettingsBody #mixer/);
 assert.match(css,/#metronome\.tactical-active #tacticalSettingsBody #micConsole/);
 assert.match(css,/#tactical \.tac-inline-body\[hidden\]/);
 assert.doesNotMatch(css,/#tacticalSettingsDialog|::backdrop/);
 assert.equal(html.split('id="mixer"').length-1,1);
 assert.equal(html.split('id="trainingDeck"').length-1,1);
 assert.equal(html.split('id="micConsole"').length-1,1);
});
