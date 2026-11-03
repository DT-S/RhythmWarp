const PREFIX='rhythm-warp-'+new URL(self.registration.scope).pathname+'-'+new URL(self.registration.scope).pathname+'-';
const CACHE=PREFIX+'rhythm-warp-studio-green-v0-1';
const FILES=['./','./index.html','./style.css','./v2-layout.css','./v2-precision.css','./v2-matrix.css','./v2-gesture-guide.css','./v2-linear-gesture.css','./v2-motion.css','./v2-astrometrics.css','./v2-polish.css','./v2-lcars-slider.css','./v2-diary-maintenance.css','./v2-startup.css','./v2-boot-reveal.css','./v2-theme.css','./v2-mic.css','./v2-ios-standalone.css','./v2-diary-archive.css','./v2-tactical.css','./v2-mobile-signal-databank.css','./v2-share.css','./rhythm-warp.css','./vendor/qrcode.js','./src/preset-share.js','./src/qr-share-ui.js','./src/archive-share.js','./src/archive-share-ui.js','./src/archive-qr-scanner.js','./vendor/jsQR.js','./tests/ios-statusbar-probe.html','./tests/ios-statusbar-probe.webmanifest','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./src/app.js','./src/tactical-view.js','./src/tactical-timeline.js','./src/mic-ui.js','./src/mic-retention.js','./src/mic-live-plots.js','./src/mic-analysis.js','./src/mic-capture.js','./src/acoustic-pilot-ui.js','./src/acoustic-pilot-worklet.js','./src/click-offset-analysis.js','./src/mic-audio-session.js','./src/mic-worklet.js','./src/lcars-theme.js','./src/interface.js','./src/update-manager.js','./src/viewport-zoom-guard.js','./src/pan-control.js','./src/matrix-faders.js','./src/lcars-slider.js','./src/gesture-guide.js','./src/linear-gesture.js','./src/motion.js','./src/launch-cue.js','./src/precision-slider.js','./src/linear-layout.js','./src/tempo-control.js','./src/charts.js','./src/custom-sounds.js','./src/diary.js','./src/diary-ui.js','./src/model.js','./src/rhythm.js','./src/audio.js','./src/scheduler.js','./src/storage.js','./src/synth.js','./src/ui-cues.js','./src/training-ui.js','./src/number-control.js',...['switchingmenus','hoversound','Acceptsound','invalidsound','Warningsound','buttonpress',...["caution","consolewarning","denied","erase_accepted","hovering","invalid_input","keypress_decrease","keypress_increase","keypress_standart","launchsound_Staggered_Entrance_Animation","menu_or_window_change","modechange","option_toggle_or_secondary_menu_pops_up","update&restart","windowcloses"]].map(n=>`./assets/audio/ui/${n}.mp3`)];
// Stage a complete release; never mutate the cache of an already active version.
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE);
 try{await c.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));}
 catch(err){await caches.delete(CACHE);throw err;}
 // Only a first install activates immediately. Later releases wait for approval.
 if(!self.registration.active)await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data==='ACTIVATE')self.skipWaiting();});
// Cache-first for navigation, CSS, JS, and the rest of the installed shell.
// NO background cache.put(): source versions must never be mixed at runtime.
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  const cached=await c.match(e.request,{ignoreSearch:true});
  if(cached)return cached;
  if(e.request.mode==='navigate'){
   const index=await c.match(new URL('./index.html',self.registration.scope));
   if(index)return index;
  }
  try{return await fetch(e.request);}
  catch{return new Response('Offline resource unavailable',{status:503});}
 })());
});
