import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('full size desktop navigation and a separately slim decorative rail', () => {
 const theme=read('rhythm-warp.css');
 const layout=read('v2-layout.css');
 assert.match(theme,/--v2-sidebar:clamp\(118px,11vw,160px\)/);
 assert.match(theme,/\.app-shell > aside nav \.nav \{[\s\S]*?min-height:48px;/);
 assert.match(theme,/\.app-shell > aside \.rail,\s*\.app-shell > aside \.rail-end \{[\s\S]*?width:14px!important;/);
 assert.match(layout,/grid-template-columns:var\(--v2-sidebar\) minmax\(0,1fr\)/);
 assert.doesNotMatch(theme,/--v2-sidebar:clamp\(78px/);
});
test('the launch screen keeps readable theme buttons but the filler becomes a 14px line', () => {
 const theme=read('rhythm-warp.css');
 assert.match(theme,/--elbow-w:clamp\(100px,11vw,140px\)/);
 assert.match(theme,/--elbow-w:clamp\(78px,21vw,88px\)/);
 assert.match(theme,/\.lcars-start-screen \.lcars-side-filler \{[\s\S]*?width:14px!important;/);
 assert.match(theme,/\.lcars-start-screen \.lcars-side-filler > span \{ display:none!important; \}/);
 assert.match(theme,/\.lcars-start-screen \.lcars-side-block \{[\s\S]*?min-height:44px!important;/);
});
test('iPhone keeps a vertical six-button nav, restores its width, but leaves a thin empty rib', () => {
 const theme=read('rhythm-warp.css');
 assert.match(theme,/--rw-mobile-sidebar:clamp\\(76px,21vw,86px\\)/);
 assert.match(theme,/grid-template-columns:var\\(--rw-mobile-sidebar\\) minmax\\(0,1fr\\)!important/);
 assert.match(theme,/\\.app-shell > aside nav \\{[\\s\\S]*?flex-direction:column!important/);
 assert.match(theme,/\\.app-shell > aside nav \\.nav \\{[\\s\\S]*?min-height:49px!important/);
});
test('offline cache rotates when the screen frame changes', () => {
 assert.match(read('sw.js'),/const CACHE=PREFIX\+'rhythm-warp-studio-green-v0-4'/);
});
