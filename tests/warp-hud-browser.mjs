// Dependency-free Chromium smoke check. Set WARP_BROWSER to a Chromium executable.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep,join} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'artifacts','warp-hud');mkdirSync(output,{recursive:true});
const profile=mkdtempSync(join(output,'browser-profile-'));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const full=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!full.startsWith(resolve(root)+sep)||!existsSync(full)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',mime[extname(full)]||'application/octet-stream');
 res.end(readFileSync(full));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=spawn(process.env.WARP_BROWSER||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
 '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
 '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
],{windowsHide:true,stdio:'ignore'});
let launchError;browser.on('error',e=>{launchError=e;});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try{
 const portFile=join(profile,'DevToolsActivePort');
 for(let i=0;i<100&&!existsSync(portFile);i++){if(launchError)throw launchError;await delay(100);}
 assert.ok(existsSync(portFile),'browser did not expose a debug endpoint');
 const port=readFileSync(portFile,'utf8').split('\n')[0];
 const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let next=0;const pending=new Map(),errors=[];
 socket.onmessage=({data})=>{
  const msg=JSON.parse(data);
  if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);
  const task=pending.get(msg.id);if(!task)return;
  pending.delete(msg.id);clearTimeout(task.timer);
  msg.error?task.reject(new Error(JSON.stringify(msg.error))):task.resolve(msg.result);
 };
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},15000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
 };
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const results=[];
 for(const width of [393,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
  let ready=false;
  for(let i=0;i<100;i++){
   ready=await evaluate("document.querySelector('#lcarsStartup')?.dataset.ready==='true'");
   if(ready)break;await delay(100);
  }
  assert.ok(ready,'app did not initialize');
  for(const theme of ['voyager','elite','redalert']){
   await evaluate(`document.querySelector('[data-set-theme="${theme}"]').click()`);
   const measured=await evaluate(`(()=>{
    const el=document.querySelector('#lcarsStartup'),s=getComputedStyle(el);
    const b=document.querySelector('#lcarsInitialize').getBoundingClientRect();
    return {theme:document.documentElement.dataset.appTheme,edge:s.getPropertyValue('--rw-edge').trim(),bg:s.backgroundColor,cta:{width:b.width,height:b.height},overflow:document.documentElement.scrollWidth>innerWidth};
   })()`);
   assert.equal(measured.theme,theme);assert.ok(measured.cta.height>=44);
   assert.equal(measured.overflow,false,'horizontal page overflow');
   results.push({width,...measured});
   const capture=await send('Page.captureScreenshot',{format:'png'});
   writeFileSync(join(output,`${width}-${theme}-launch.png`),Buffer.from(capture.data,'base64'));
  }
  await evaluate("document.querySelector('#lcarsInitialize').click()");
  await delay(300);
  for(const tab of ['metronome','audio','presets','diary','analytics','settings']){
   await evaluate(`document.querySelector('[data-tab="${tab}"]').click()`);
   assert.equal(await evaluate(`document.querySelector('#${tab}').hidden`),false);
   const capture=await send('Page.captureScreenshot',{format:'png'});
   writeFileSync(join(output,`${width}-${tab}.png`),Buffer.from(capture.data,'base64'));
  }
  await evaluate("document.querySelector('#openLaunchConsole').click()");
 }
 assert.deepEqual(errors,[],'runtime errors');
 writeFileSync(join(output,'measurements.json'),JSON.stringify(results,null,2));
 console.log('Chromium smoke checks passed; screenshots: '+output);
}finally{
 socket?.close();browser.kill();server.close();
}
