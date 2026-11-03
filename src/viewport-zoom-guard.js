/**
 * Lock browser-level zoom without affecting regular one-finger scrolling,
 * tapping, sliders, or the app's own Interface Size setting.
 *
 * Safari/iOS can ignore viewport scale hints (notably for accessibility).
 * Its non-standard gesture events still need an explicit cancellation.
 * Multi-touch fallback covers mobile engines using standard touch events.
 */
export function installViewportZoomGuard(root=document) {
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 const preventMultiTouch=e=>{if(e.touches?.length>1)prevent(e);};
 const options={passive:false};
 for(const type of ['gesturestart','gesturechange','gestureend']){
  root.addEventListener(type,prevent,options);
 }
 for(const type of ['touchstart','touchmove']){
  root.addEventListener(type,preventMultiTouch,options);
 }
 return ()=>{
  for(const type of ['gesturestart','gesturechange','gestureend'])
   root.removeEventListener(type,prevent,options);
  for(const type of ['touchstart','touchmove'])
   root.removeEventListener(type,preventMultiTouch,options);
 };
}
