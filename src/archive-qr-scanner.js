// Local QR scanner: camera frames never leave this device.
// jsQR is vendored under Apache-2.0 and works on iOS Safari without BarcodeDetector.
export function createArchiveScanner({video,onScan,notify,onStatus}){
 let stream=null,frameId=0,lastValue='',lastScan=0,busy=false,active=false,requestId=0;
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 async function stop(){
  requestId++;
  active=false;cancelAnimationFrame(frameId);
  stream?.getTracks().forEach(track=>track.stop());stream=null;
  video.pause();video.srcObject=null;video.hidden=true;
  onStatus('SCANNER STOPPED');
 }
 async function frame(now){
  if(!active)return;
  frameId=requestAnimationFrame(frame);
  if(busy||video.readyState<2||now-lastScan<165)return;
  lastScan=now;
  const width=Math.min(video.videoWidth,720);
  const height=Math.round(video.videoHeight*(width/video.videoWidth));
  if(!width||!height)return;
  canvas.width=width;canvas.height=height;
  ctx.drawImage(video,0,0,width,height);
  const image=ctx.getImageData(0,0,width,height);
  const qr=window.jsQR?.(image.data,width,height,{inversionAttempts:'attemptBoth'});
  const value=qr?.data;
  if(!value||value===lastValue)return;
  lastValue=value;busy=true;
  try{
   const finished=await onScan(value);
   if(finished)await stop();
  }catch(err){notify('QR scan rejected: '+err.message,'Warningsound');}
  finally{busy=false;}
 }
 async function start(){
  if(active)return;
  if(typeof window.jsQR!=='function')throw Error('Offline QR decoder unavailable.');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access is not available. Use a QR link or external scanner.');
  const token=++requestId;
  try{
   try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});}
   catch{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:true});}
   if(token!==requestId){stream?.getTracks().forEach(t=>t.stop());stream=null;return;}
   video.srcObject=stream;video.hidden=false;video.muted=true;video.playsInline=true;
   await video.play();
   if(token!==requestId){await stop();return;}
   active=true;lastValue='';onStatus('SCANNER LIVE / POINT AT QR CODE');
   frameId=requestAnimationFrame(frame);
  }catch(err){await stop();throw Error('Camera scanner unavailable: '+err.message);}
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 return {start,stop,isRunning:()=>active};
}
