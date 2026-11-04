import test from 'node:test';
import assert from 'node:assert/strict';
import {createMicAudioSession,isIOSAudioRoute} from '../src/mic-audio-session.js';

test('iPhone and iPadOS audio routing detection is narrow',()=>{
 assert.equal(isIOSAudioRoute({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_7 like Mac OS X)'}),true);
 assert.equal(isIOSAudioRoute({userAgent:'Mozilla/5.0 (Macintosh)',platform:'MacIntel',maxTouchPoints:5}),true);
 assert.equal(isIOSAudioRoute({userAgent:'Mozilla/5.0 (X11; Linux x86_64)',platform:'Linux',maxTouchPoints:0}),false);
});
test('audio session routes are explicitly restored when iOS microphone closes',()=>{
 const changes=[];const route={_type:'playback'};
 Object.defineProperty(route,'type',{get(){return this._type;},set(v){changes.push(v);this._type=v;}});
 const session=createMicAudioSession(route,true);
 assert.equal(session.prepare(),true);
 assert.equal(session.active(),true);
 session.release();session.release();
 assert.deepEqual(changes,['auto','play-and-record','playback','auto']);
});
test('failed microphone permissions still restore the iOS playback session',()=>{
 const changes=[],route={set type(v){changes.push(v);},get type(){return changes.at(-1);}};
 const session=createMicAudioSession(route,true);
 session.prepare();session.release();
 assert.deepEqual(changes,['auto','playback','auto']);
});
test('unsupported and non-iOS audio-session APIs are safe no-ops',()=>{
 const changes=[];
 const route={set type(v){changes.push(v);},get type(){return changes.at(-1);}};
 const desktop=createMicAudioSession(route,false);
 assert.equal(desktop.prepare(),false);
 assert.equal(desktop.active(),false);
 desktop.release();
 assert.deepEqual(changes,[]);
 const unavailable=createMicAudioSession(null,true);
 assert.equal(unavailable.prepare(),false);
 assert.equal(unavailable.active(),false);
 assert.doesNotThrow(()=>unavailable.release());
});
test('route-changing API exceptions never strand mic cleanup',()=>{
 const route={get type(){throw Error('unavailable');},set type(_) {throw Error('unavailable');}};
 const r=createMicAudioSession(route,true);
 assert.equal(r.prepare(),false);
 assert.equal(r.active(),false);
 assert.doesNotThrow(()=>r.release());
});
