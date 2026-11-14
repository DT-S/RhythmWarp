import {readdirSync, readFileSync, existsSync} from 'node:fs';
import {join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const publicSources=['index.html','manifest.webmanifest','src','assets','sw.js'];
const forbidden=/\b(?:LCARS|Voyager|Starfleet|Star\s*Trek|Elite\s*Force|Red\s*Alert|Rhythm\s*PADD|USS\s+Voyager)\b/i;
const violations=[];
function walk(path) {
 const full=join(root,path);
 if(!existsSync(full))throw new Error('Missing audit directory: '+path);
 for(const entry of readdirSync(full,{withFileTypes:true})){
  const rel=join(path,entry.name);
  if(entry.isDirectory())walk(rel);
  else if(entry.isFile()){
   if(/\.(mp3|wav|ogg|m4a|flac|aif|aiff)$/i.test(entry.name)){
    violations.push(rel+': audio asset requires documented distribution rights');
   }
   if(['.html','.css','.js','.json','.webmanifest','.svg'].includes(extname(entry.name))){
    const data=readFileSync(join(root,rel),'utf8');
    if(forbidden.test(data))violations.push(rel+': old branding in public source');
   }
  }
 }
}
for(const file of publicSources){
 const full=join(root,file);
 if(!existsSync(full)){
  violations.push(file+': required audit source missing');
  continue;
 }
 const stat=await import('node:fs').then(fs=>fs.statSync(full));
 if(stat.isDirectory())walk(file);
 else if(['.html','.js','.json','.webmanifest','.svg'].includes(extname(file))&&forbidden.test(readFileSync(full,'utf8')))violations.push(file+': old branding in public source');
}
if(violations.length){console.error('PUBLIC AUDIT FAILED:\n'+violations.join('\n'));process.exitCode=1;}
else console.log('PUBLIC TEXT/AUDIO AUDIT OK (no legal clearance implied)');
