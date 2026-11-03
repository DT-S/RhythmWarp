// QRCode.js (MIT, vendored locally) is loaded before app.js, so both QR
// sections work without network, third-party API calls or modal dialogs.
export function paintQR(target,url,size=360){
 target.replaceChildren();
 if(typeof window.QRCode!=='function')throw Error('QR renderer unavailable.');
 new window.QRCode(target,{
  text:url,width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',
  correctLevel:window.QRCode.CorrectLevel.L
 });
}
export function shareActions({url,copyButton,shareButton,linkInput,notify}){
 linkInput.value=url;
 linkInput.onclick=()=>linkInput.select();
 copyButton.onclick=async()=>{
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
   else{
    linkInput.focus();linkInput.select();
    if(!document.execCommand('copy'))throw Error('Copy denied');
   }
   notify('Share link copied.');
  }catch{notify('Copy unavailable. Select the link above and copy manually.','Warningsound');}
 };
 shareButton.hidden=typeof navigator.share!=='function';
 shareButton.onclick=async()=>{
  try{await navigator.share({title:'Rhythm Warp',url});}
  catch(err){if(err.name!=='AbortError')notify('Device sharing unavailable. Use COPY LINK.','Warningsound');}
 };
}
