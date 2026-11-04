import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linearRowSizes,mobileFrameHeight,visibleViewportHeight} from '../src/linear-layout.js';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

test('entry module imports required linear-layout helpers before rendering either view',()=>{
  const imports=[...app.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/linear-layout\.js['"]/gm)]
    .flatMap(m=>m[1].split(',').map(name=>name.trim()));
  for(const name of ['linearRowSizes','mobileFrameHeight','visibleViewportHeight']){
    assert.ok(imports.includes(name),`Missing ${name} import in app.js; Circular and Linear views both break`);
  }
  assert.deepEqual(linearRowSizes(7,275),[7]);
  assert.equal(mobileFrameHeight(844,.9)*.9,844);
  assert.doesNotMatch(app,/const screenExtent|Math\.max\(screen\.width|Math\.max\(screen\.height/,'screen extent must not size the PWA viewport');
});
