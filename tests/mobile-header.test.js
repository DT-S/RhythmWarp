import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('RC13 keeps the PADD wordmark on the colored iPhone chassis bar',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const start=css.indexOf('RC13 · Compact iPhone PADD header');
 assert.ok(start>0,'RC13 mobile design layer missing');
 const patch=css.slice(start);
 assert.match(patch,/@media \(max-width:640px\)/);
 assert.match(patch,/grid-template-rows:40px minmax\(0,1fr\) 29px/);
 assert.match(patch,/\.app-shell > header \.heading/);
 assert.match(patch,/\.app-shell > header \.heading h1 \.mobile-title/);
 assert.match(patch,/color:#000/);
 assert.match(patch,/\.app-shell > header::after/);
 assert.match(patch,/#metronome \.instrument:has\(> #linear:not\(\[hidden\]\)\) > \.transport/);
 assert.match(patch,/order:0/);
 assert.doesNotMatch(patch,/@media \(min-width:/,'unchanged tablet and desktop layouts');
});

test('RC13 view-specific transport order does not move Circular controls',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const block=css.slice(css.indexOf('RC13 · Compact iPhone PADD header'));
 assert.doesNotMatch(block,/#metronome #dial:not\(\[hidden\]\)\s*\{/);
 assert.doesNotMatch(block,/#metronome \.transport\s*\{\s*order:0/);
 assert.match(block,/#linear:not\(\[hidden\]\)/);
});

test('RC14 shares a rail-start variable and grid alignment across iPhone widths',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const rc=css.slice(css.indexOf('RC13 · Compact iPhone PADD header'));
 assert.match(rc,/--lcars-bus-start:clamp\(86px,26\.5vw,99px\)/);
 assert.match(rc,/> header::after\s*\{[^}]*left:var\(--lcars-bus-start\)/);
 assert.match(rc,/> header \.heading\s*\{[^}]*left:var\(--lcars-bus-start\)/);
 assert.match(rc,/grid-template-columns:13% 65% 22%/);
 assert.match(rc,/h1 \.mobile-title\s*\{[^}]*position:static/);
 assert.doesNotMatch(rc,/left:clamp\(118px,30\.5vw,132px\)/);
});

test('RC14 ties tablet/desktop RHYTHM PADD to their actual segmented LCARS rail',()=>{
 const css=readFileSync(new URL('../v2-layout.css',import.meta.url),'utf8');
 const rc=css.slice(css.indexOf('RC14: one proportional top-bus'));
 assert.ok(rc.startsWith('RC14: one proportional top-bus'));
 assert.match(rc,/@media \(min-width:641px\)/);
 assert.match(rc,/left:calc\(var\(--v2-sidebar\) \+ var\(--v2-gutter\)\)/);
 assert.match(rc,/grid-template-columns:13% 65% 22%/);
 assert.match(rc,/\.mobile-title\s*\{[^}]*position:static/);
 assert.match(rc,/color:#000/);
});

test('RC14 preserves decorative bars while giving Linear START/TAP breathing room',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const rc=css.slice(css.indexOf('RC13 · Compact iPhone PADD header'));
 assert.match(rc,/#metronome \.instrument:has\(> #linear:not\(\[hidden\]\)\)\s*\{[^}]*padding-top:23px/);
 assert.match(rc,/#metronome \.instrument:has\(> #linear:not\(\[hidden\]\)\) > \.transport/);
 const bars=css.match(/#metronome \.instrument::after\s*\{[\s\S]*?background:\s*linear-gradient\([^}]*\}/g)||[];
 assert.ok(bars.some(x=>x.includes('var(--padd-lavender)')&&x.includes('var(--padd-blue)')),
  'three colored telemetry bars must not be removed');
});
