// Experimental WebKit/iOS audio-session routing guard.
// getUserMedia can switch playback into a voice/call route with separate volume.
// This may restore the intended output route and playback *after* mic capture;
// it cannot guarantee unchanged loudness *during* capture. Never boost gain here.
export function isIOSAudioRoute(nav=globalThis.navigator){
  const ua=nav?.userAgent||'';
  return /iPhone|iPad|iPod/.test(ua) ||
    (nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1);
}
export function createMicAudioSession(
  session=globalThis.navigator?.audioSession,
  ios=isIOSAudioRoute()
){
  if(!ios)session=null;
  let prepared=false,finished=false;
  function set(type){
    if(!session)return false;
    try{
      session.type=type;
      return session.type===type;
    }catch{return false;}
  }
  return {
    prepare(){
      if(finished)return false;
      prepared=true;
      // Reset a previous WebKit voice route before requesting the mic.
      return set('auto');
    },
    active(){
      if(finished||!prepared)return false;
      // A post-getUserMedia explicit transition can restore device routing on
      // some Safari builds. Still an experimental, device-dependent workaround.
      return set('play-and-record');
    },
    release(){
      if(finished)return;
      finished=true;
      if(!prepared)return;
      // WebKit may otherwise remain on the low-volume call route after
      // releasing all mic tracks. Both transitions are intentional.
      set('playback');
      set('auto');
    }
  };
}
