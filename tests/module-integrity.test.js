import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Prevent a repeat of the v0.5.10 startup regression: a relative ESM import
// may not point to a nonexisting file. Everything in src/ must also be
// precached because this PWA is explicitly intended to start fully offline.
const sourceRoot=new URL('../src/',import.meta.url);
const runtimeModules=readdirSync(sourceRoot).filter(name=>name.endsWith('.js')).sort();
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('all local JavaScript module imports resolve to real repository files',()=>{
  for(const moduleName of runtimeModules){
    const moduleUrl=new URL(moduleName,sourceRoot);
    const code=readFileSync(moduleUrl,'utf8');
    const moduleImports=[...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(match=>match[1]);
    for(const importPath of moduleImports){
      if(!importPath.startsWith('.'))continue;
      const target=new URL(importPath,moduleUrl);
      assert.ok(existsSync(target),`${moduleName}: missing import ${importPath}`);
    }
  }
});

test('every runtime module is listed in the offline service-worker precache',()=>{
  for(const moduleName of runtimeModules){
    const asset=`'./src/${moduleName}'`;
    assert.ok(worker.includes(asset),`Missing SW precache asset ${asset}`);
  }
});

test('entry module and key runtime assets are present in app shell',()=>{
  assert.match(html,/type="module"\s+src="\.\/src\/app\.js"/);
  assert.match(html,/rel="stylesheet"\s+href="\.\/style\.css"/);
  for(const path of ['index.html','style.css','src/app.js','manifest.webmanifest']){
    assert.ok(worker.includes(`'./${path}'`),`Missing critical PWA asset ${path}`);
  }
});

test('the V2 branch keeps the existing persisted schema until an explicit migration',()=>{
  const model=readFileSync(new URL('../src/model.js',import.meta.url),'utf8');
  assert.match(model,/version:5/);
});

test('all executable JavaScript modules parse as valid ECMAScript',()=>{
  for(const moduleName of runtimeModules){
    const file=fileURLToPath(new URL(moduleName,sourceRoot));
    assert.doesNotThrow(()=>{
      execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
    },`Broken JS syntax in ${moduleName}`);
  }
});

test('test suite sources also pass JavaScript syntax checking',()=>{
 const testsRoot=new URL('../tests/',import.meta.url);
 for(const testName of readdirSync(testsRoot).filter(x=>x.endsWith('.js')||x.endsWith('.mjs'))){
  assert.doesNotThrow(()=>execFileSync(process.execPath,
   ['--check',fileURLToPath(new URL(testName,testsRoot))],{stdio:'pipe'}),
    `Invalid test source syntax in ${testName}`);
 }
});
