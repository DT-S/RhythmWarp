import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
test('Rhythm Warp desktop sidebar is slimmer without changing button hit height', () => {
 const theme = read('rhythm-warp.css');
 const layout = read('v2-layout.css');
 assert.match(theme, /--v2-sidebar:clamp\(78px,8\.5vw,136px\)/);
 assert.match(layout, /min-height:clamp\(48px,6\.2vh,69px\)/);
});
test('Rhythm Warp mobile rib is narrower without changing navigation grid', () => {
 const theme = read('rhythm-warp.css');
 const layout = read('style.css');
 assert.match(theme, /\.app-shell > aside nav \{padding-left:23px;\}/);
 assert.match(theme, /\.app-shell > aside nav::before \{width:25px;/);
 assert.match(layout, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});
test('Rhythm Warp launch frame scales with the slimmer left column', () => {
 const theme = read('rhythm-warp.css');
 const sw = read('sw.js');
 assert.match(theme, /--elbow-w:clamp\(82px,10\.5vw,132px\)/);
 assert.match(theme, /--elbow-w:clamp\(55px,14vw,64px\)/);
 assert.match(sw, /const CACHE=PREFIX\+'rhythm-warp-studio-green-v0-\d+'/);
});
