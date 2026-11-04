import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {standaloneIPhoneViewportGap,mobileFrameHeight} from '../src/linear-layout.js';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../v2-ios-standalone.css',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('iOS 26 installed PWA reports inaccessible physical screen gap, never extra usable height',()=>{
 assert.equal(standaloneIPhoneViewportGap(763,390,844,390,true),81);
 assert.equal(standaloneIPhoneViewportGap(797,390,844,390,true),47);
 assert.equal(standaloneIPhoneViewportGap(844,390,844,390,true),0);
 assert.ok(Math.abs(mobileFrameHeight(763,.9)*.9-763)<1e-9);
});
test('Safari, iPad, landscape and unrelated large height differences are not standalone iPhone gaps',()=>{
 assert.equal(standaloneIPhoneViewportGap(763,390,844,390,false),null);
 assert.equal(standaloneIPhoneViewportGap(763,390,844,393,true),81);
 assert.equal(standaloneIPhoneViewportGap(763,390,844,410,true),null);
 assert.equal(standaloneIPhoneViewportGap(844,844,390,844,true),null);
 assert.equal(standaloneIPhoneViewportGap(600,390,844,390,true),null);
 assert.equal(standaloneIPhoneViewportGap(900,390,844,390,true),null);
});
test('LCARS shell uses reachable viewport, retains five-pixel decorative inset and read-only diagnostics',()=>{
 assert.match(app,/standaloneIPhoneViewportGap\(layoutHeight/);
 assert.match(app,/const height=keyboardSafeViewportHeight\(measured,stablePaddViewport,editorFocused\)/);
 assert.doesNotMatch(app,/shell\.style\.height=.*screen\.height/);
 assert.match(app,/shell\.classList\.toggle\('ios-standalone-viewport',viewportGap!==null\)/);
 assert.match(css,/\.app-shell\.ios-standalone-viewport\s*\{/);
 assert.match(css,/padding-bottom:calc\(5px \* var\(--mobile-zoom-inverse,1\)\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(html,/id="viewportDiagnostics"/);
 assert.match(html,/id="viewportMetrics"/);
 assert.match(app,/refreshViewportDiagnostics\(\)/);
 assert.match(sw,/\.\/v2-ios-standalone\.css/);
});
