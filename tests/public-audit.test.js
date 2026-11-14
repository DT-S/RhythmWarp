import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('public audit checks actual files in paths with spaces and fails closed on missing sources',()=>{
 const root=mkdtempSync(join(tmpdir(),'rhythm warp audit '));
 try{
  mkdirSync(join(root,'scripts'));
  mkdirSync(join(root,'src'));
  mkdirSync(join(root,'assets'));
  const script=join(root,'scripts','audit-public.mjs');
  writeFileSync(script,readFileSync(new URL('../scripts/audit-public.mjs',import.meta.url)));
  for(const file of ['index.html','manifest.webmanifest','sw.js'])writeFileSync(join(root,file),'{}');
  const run=()=>spawnSync(process.execPath,[script],{encoding:'utf8'});
  assert.equal(run().status,0,'valid complete fixture passes');
  writeFileSync(join(root,'assets','unlicensed.mp3'),'fixture');
  let result=run();
  assert.equal(result.status,1);
  assert.match(result.stderr,/unlicensed.mp3: audio asset requires documented distribution rights/);
  rmSync(join(root,'assets','unlicensed.mp3'));
  writeFileSync(join(root,'src','visible.js'),'Starfleet');
  assert.match(run().stderr,/old branding in public source/);
  rmSync(join(root,'src','visible.js'));
  rmSync(join(root,'index.html'));
  result=run();
  assert.equal(result.status,1);
  assert.match(result.stderr,/index.html: required audit source missing/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
