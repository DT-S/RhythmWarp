import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installViewportZoomGuard} from '../src/viewport-zoom-guard.js';

function fixture(){
 const listeners=new Map(),registered=[];
 const root={
  addEventListener(type,fn,options){(listeners.get(type)||listeners.set(type,[]).get(type)).push(fn);registered.push({type,fn,options});},
  removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(x=>x!==fn));}
 };
 const fire=(type,touches=1)=>{
  let blocked=false;
  const event={cancelable:true,touches:Array.from({length:touches},()=>({})),preventDefault(){blocked=true;}};
  for(const handler of listeners.get(type)||[])handler(event);
  return blocked;
 };
 return {root,fire,registered};
}

test('Safari pinch gestures are cancelled from start to end',()=>{
 const f=fixture();const uninstall=installViewportZoomGuard(f.root);
 for(const event of ['gesturestart','gesturechange','gestureend'])assert.equal(f.fire(event),true);
 assert.ok(f.registered.every(e=>e.options.passive===false));
 uninstall();
 assert.equal(f.fire('gesturestart'),false);
});

test('single finger taps and normal scrolling are unaffected',()=>{
 const f=fixture();installViewportZoomGuard(f.root);
 for(const event of ['touchstart','touchmove'])assert.equal(f.fire(event,1),false);
});

test('multi-finger pinch is blocked even without Safari gesture events',()=>{
 const f=fixture();installViewportZoomGuard(f.root);
 assert.equal(f.fire('touchstart',2),true);
 assert.equal(f.fire('touchmove',2),true);
 assert.equal(f.fire('touchmove',3),true);
 assert.equal(f.fire('touchstart',1),false);
});

test('RC3 mobile viewport and CSS exclude browser-level zoom',()=>{
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../v2-polish.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(index,/maximum-scale=1,user-scalable=no/);
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 const expectedRelease=pkg.version.replace('-rc.',' RC');
 assert.ok(index.includes('Rhythm core '+expectedRelease),'UI release label must match package version');
 assert.match(css,/html,body,\.app-shell\{touch-action:pan-x pan-y;\}/);
 assert.match(sw,/const CACHE=PREFIX\+'lcars-core-v2-/); // Version-specific cache names may change.
 assert.match(sw,/\.\/src\/viewport-zoom-guard\.js/);
 assert.match(app,/installViewportZoomGuard\(document\)/);
 assert.match(app,/shell\.style\.zoom=state\.uiScale/); // Internal scaling remains.
});
