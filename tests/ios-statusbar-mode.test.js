import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const appHtml=read('../index.html');
const mobileCss=read('../v2-ios-standalone.css');
const appJs=read('../src/app.js');
const probeHtml=read('./ios-statusbar-probe.html');
const probeManifest=JSON.parse(read('./ios-statusbar-probe.webmanifest'));
const serviceWorker=read('../sw.js');

test('iOS opaque status bar is set before standalone install',()=>{
 assert.match(appHtml,/name="apple-mobile-web-app-capable" content="yes"/);
 assert.match(appHtml,/name="apple-mobile-web-app-status-bar-style" content="black"/);
 assert.doesNotMatch(appHtml,/content="black-translucent"/);
 assert.match(appHtml,/viewport-fit=cover/);
});
test('mobile root uses dynamic viewport, without enlarging the app beyond paintable WebKit viewport',()=>{
 assert.match(mobileCss,/html,body\s*\{\s*height:100dvh;\s*min-height:100dvh;/);
 assert.match(appJs,/shell\.style\.height=\x60\$\{mobileFrameHeight\(height,state\.uiScale\)\}px\x60/);
 assert.match(appJs,/SCREEN MINUS WEB VIEWPORT:/);
 assert.match(appJs,/STATUS BAR META:/);
 assert.match(serviceWorker,/const CACHE=PREFIX\+'rhythm-warp-studio-green-v0-1'/);
});
test('independent probe PWA has its own identity and opaque iOS status bar',()=>{
 assert.match(probeHtml,/name="apple-mobile-web-app-status-bar-style" content="black"/);
 assert.match(probeHtml,/href="\.\/ios-statusbar-probe\.webmanifest"/);
 assert.equal(probeManifest.id,'./ios-statusbar-probe');
 assert.equal(probeManifest.start_url,'./ios-statusbar-probe.html');
 assert.equal(probeManifest.display,'standalone');
});
