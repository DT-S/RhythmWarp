import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),ui=read('src/diary-ui.js'),css=read('v2-diary-archive.css');
const sw=read('sw.js');

test('Voyager archive is a separate, theme-aware, offline preview skin',()=>{
 assert.match(html,/href="\.\/v2-diary-archive\.css"/);
 assert.match(sw,/\.\/v2-diary-archive\.css/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-palettes-v\d+'/);
 assert.match(css,/#diary #diaryList \.log-entry/);
 assert.match(css,/var\(--padd-orange/);
 assert.match(css,/var\(--padd-lavender/);
 assert.match(css,/@media \(max-width:640px\)/);
 assert.doesNotMatch(css,/#analyticsContent|#metronome|#mixer/);
});

test('native collapsible mobile setup retains every original diary ID and data action',()=>{
 assert.match(html,/<details id="diarySetup" class="panel diary-setup-deck" open><summary>SESSION SETUP<\/summary>/);
 for(const id of ['diaryControls','manualEntry','csvExport','diaryEditor','diaryList',
                  'entryCount','diaryClearRecent','diaryClearAll','diaryDeleteDialog']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' ID must remain unique');
 }
 assert.match(ui,/if\(setupDeck\?\.open&&window\.matchMedia\('\(max-width:640px\)'\)\.matches\)setupDeck\.open=false;/);
 assert.match(css,/#diary #diarySetup > summary:focus-visible/);
 assert.match(html,/<details class="lcars-info"><summary>RECORDING INFO<\/summary>/);
});

test('session preview lists six metrics in the requested 3x2 reading order',()=>{
 const start=ui.indexOf("for(const [k,v] of [['START',dateLabel(e.start)]");
 assert.ok(start>=0,'session tile definition exists');
 const end=ui.indexOf("data.append(metric(k,v))",start);
 const segment=ui.slice(start,end);
 const labels=[...segment.matchAll(/\['(START|DURATION|TEMPO|CATEGORY|MODE|SOURCE)'/g)].map(x=>x[1]);
 assert.deepEqual(labels,['START','DURATION','TEMPO','CATEGORY','MODE','SOURCE']);
 assert.match(css,/grid-template-columns:minmax\(0,1\.15fr\) minmax\(0,\.85fr\) minmax\(0,1fr\)/);
 assert.match(css,/@media \(max-width:360px\)/);
});

test('mobile editor uses paired fields without compromising the existing form and iOS focus policy',()=>{
 assert.match(css,/#diary #diaryEditor \.diary-form\s*\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/input\[type="datetime-local"\]/);
 assert.match(css,/:has\(textarea\)/);
 assert.match(ui,/keepEditorFieldVisible\(\)/);
 assert.match(ui,/const well=document\.querySelector\('main'\)/);
 assert.match(ui,/form\.onsubmit=event=>/);
 assert.match(ui,/validateEntry\(e\)/);
 assert.match(ui,/diaryCSV\(d\.entries\)/);
 assert.match(ui,/requestDeletion\('all'\)/);
});
