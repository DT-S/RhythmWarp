import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const app=read('src/diary-ui.js'), mic=read('src/mic-ui.js'), css=read('v2-astrometrics.css');
const sw=read('sw.js'), polish=read('v2-polish.css');

test('stats preview is isolated and preserves all five real KPI sources',()=>{
 assert.match(css,/RC25\.9 \/\/ VOYAGER ASTROMETRICS/);
 assert.match(css,/#analyticsContent \.stat-grid > \.stat-tile:nth-child\(-n\+2\)/);
 assert.match(css,/#analyticsContent \.stat-grid > \.stat-tile:nth-child\(n\+3\)/);
 assert.match(app,/\['PRACTICE \/ MIN',Math\.round\(summary\.seconds\/60\)\]/);
 for(const label of ['SESSIONS','ACTIVE DAYS','PEAK / BPM','CLEAN / SELF-REPORTED'])
  assert.ok(app.includes("['"+label+"'"),'missing real analytics metric '+label);
 assert.match(app,/analyticsCharts\(entries,range,historyEntries/);
 assert.match(app,/summarize\(entries\)/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-palettes-v\d+'/);
 assert.match(polish,/RC16 · READABILITY SYSTEM/);
});

test('mobile analytics filter disclosure is keyboard-accessible and retains state',()=>{
 assert.match(app,/filterDeckOpen=!window\.matchMedia\('\(max-width:640px\)'\)\.matches/);
 assert.match(app,/el\('div','panel analytics-filter-deck'\)/);
 assert.match(app,/aria-controls','analyticsFilterBody'/);
 assert.match(app,/aria-expanded'/);
 assert.match(app,/filterBody\.hidden=!filterDeckOpen/);
 for(const cls of ['analytics-periods','analytics-categories','analytics-sources'])
  assert.ok(app.includes(cls));
 assert.match(css,/#analyticsContent \.analytics-filter-body\[hidden\]/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/#analyticsContent \.analytics-filter-body \.analytics-sources/);
});

test('microphone archive retains actual six-slot selection and an accessible methodology note',()=>{
 for(const key of ['bestAll','bestWeek','worstWeek','retained.slots.recent'])
  assert.ok(mic.includes(key),'missing saved selector '+key);
 assert.match(mic,/chooser\.className='mic-session-chooser'/);
 assert.match(mic,/button\.addEventListener\('click',\(\)=>\{selectedId=id;void renderArchive\(\);\}\)/);
 assert.match(mic,/info\.className='mic-archive-info'/);
 assert.match(mic,/infoHead\.textContent='SENSOR ARCHIVE INFO'/);
 assert.match(mic,/info\.append\(infoHead,note\);stats\.append\(info\)/);
 assert.match(css,/#analytics #micAnalytics \.mic-session-chooser/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/#metronome #micConsole/);
});
