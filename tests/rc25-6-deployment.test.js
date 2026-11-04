import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('RC25.13.5 Tactical preview identifies itself and retains RC25.6 deployment provenance',()=>{
 const html=root('index.html');
 const pkg=JSON.parse(root('package.json'));
 const sw=root('sw.js');
 const marker=root('rc25-6-deployment.txt');
 assert.equal(pkg.version,'2.0.0-rc.25.13.5');
 assert.equal((html.match(/CORE 2\.0\.0 RC25\.13\.5/g)||[]).length,2);
 assert.doesNotMatch(html,/CORE 2\.0\.0 RC25\.(?:5|6|7|8|9|10)/);
 assert.match(sw,/const CACHE=PREFIX\+'rhythm-warp-palettes-v\d+'/);
 assert.match(marker,/opaque-statusbar-rc25-6-20261026/);
});
