import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validate,resize,audible} from '../src/model.js';
import {barEvents,angleDelta} from '../src/rhythm.js';
import {Scheduler} from '../src/scheduler.js';
import {readFileSync,existsSync,statSync} from 'node:fs';
const config=(beats,subdivisions)=>({...fresh(),beats,subdivisions,outer:Array(beats).fill(2),inner:Array(subdivisions).fill(2)});
for(const [beats,sub] of [[4,1],[4,3],[4,6],[5,7],[7,9],[20,20]])test(`${beats} quarters x ${sub} subdivisions`,()=>{
 const events=barEvents(config(beats,sub));assert.equal(events.length,beats*(sub+1));
 const outer=events.filter(e=>e.channel===0),inner=events.filter(e=>e.channel===1);
 assert.deepEqual(outer.map(e=>e.q),Array.from({length:beats},(_,i)=>i));
 for(let i=0;i<inner.length;i++){assert.ok(Math.abs(inner[i].q-i/sub)<1e-12);assert.equal(inner[i].beat,Math.floor(i/sub));assert.equal(inner[i].index,i%sub);}
 assert.ok(events.every((e,i)=>!i||e.q>=events[i-1].q));assert.ok(events.at(-1).q<beats);
});
test('preserve deliberate simultaneous channels',()=>{const e=barEvents(config(4,3));assert.equal(e.filter(x=>x.q===1).length,2);});
test('resize preserves prefix and fills normal',()=>{assert.deepEqual(resize([0,3,1],2),[0,3]);assert.deepEqual(resize([0,3],4),[0,3,2,2]);});
test('angular wrap and reverse',()=>{assert.ok(Math.abs(angleDelta(179*Math.PI/180,-179*Math.PI/180)-2*Math.PI/180)<1e-12);assert.ok(angleDelta(-3.12,3.12)<0);});
test('JSON round trip with presets; invalid inputs rejected',()=>{const s=fresh();s.presets.push({name:'Triplets',settings:config(5,7)});assert.deepEqual(validate(JSON.parse(JSON.stringify(s))),s);for(const bad of [{...s,bpm:NaN},{...s,beats:2.5},{...s,inner:[6]},{...s,version:999},{...s,channels:[]},{...s,presets:[{name:'Bad',settings:{...fresh(),presets:[{}]}}]}])assert.throws(()=>validate(bad));});
test('independent solo/mute',()=>{const c=fresh().channels;assert.ok(audible(c,0));c[1].solo=true;assert.equal(audible(c,0),false);assert.ok(audible(c,1));c[1].mute=true;assert.equal(audible(c,1),false);});
function fake(){return {ctx:{currentTime:0,state:'running'},played:[],cancel(){},click(e,time){this.played.push({...e,time});}};}
function advance(s,a,to){while(a.ctx.currentTime<to){a.ctx.currentTime=Math.min(to,a.ctx.currentTime+.01);s.tick();s.position();}}
test('scheduler: 100 bars no drift, no duplicate events',()=>{const a=fake(),s=new Scheduler(a);s.start(config(5,7));clearInterval(s.timer);advance(s,a,250);const outer=a.played.filter(e=>e.channel===0);for(let i=0;i<outer.length;i++)assert.ok(Math.abs(outer[i].time-(.12+i*.5))<1e-9);const keys=a.played.map(e=>e.channel+':'+e.time.toFixed(10));assert.equal(new Set(keys).size,keys.length);s.stop();});
test('tempo and structure change only at planned bar boundary',()=>{const a=fake(),s=new Scheduler(a);s.start(config(4,2));clearInterval(s.timer);advance(s,a,.5);s.update({...config(3,3),bpm:60});advance(s,a,3);const outer=a.played.filter(e=>e.channel===0);assert.deepEqual(outer.slice(0,5).map(e=>Math.round(e.time*100)),[12,62,112,162,212]);assert.ok(a.played.some(e=>e.channel===1&&Math.abs(e.time-(2.12+1/3))<1e-9));s.stop();});
test('count-in uses quarters and excludes duration',()=>{const a=fake(),s=new Scheduler(a);s.start({...config(4,3),countIn:2,duration:1});clearInterval(s.timer);advance(s,a,4);assert.equal(a.played.filter(e=>e.time<4.12).length,8);assert.ok(Math.abs(s.trainingStart-4.12)<1e-10);advance(s,a,5.3);assert.equal(s.running,false);assert.ok(a.played.every(e=>e.time<5.12));});
test('stalls stop instead of producing overdue bursts',()=>{const a=fake();let reason;const s=new Scheduler(a,r=>reason=r);s.start(fresh());clearInterval(s.timer);a.ctx.currentTime=10;s.tick();assert.equal(s.running,false);assert.match(reason,/interrupted/);});
test('suspended audio stops cleanly',()=>{const a=fake(),s=new Scheduler(a);s.start(fresh());clearInterval(s.timer);a.ctx.state='suspended';s.tick();assert.equal(s.running,false);});
test('manifest uses repository-relative scope and start URL',()=>{const m=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url)));assert.equal(m.scope,'./');assert.equal(m.start_url,'./');});
