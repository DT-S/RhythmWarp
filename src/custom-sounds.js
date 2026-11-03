export const SOUND_LIMIT=16, BYTE_LIMIT=2*1024*1024, BANK_LIMIT=12*1024*1024;
export const customId=id=>typeof id==='string'&&/^user-[a-f0-9-]{36}$/.test(id);
export function validateSounds(bank){
 if(!Array.isArray(bank)||bank.length>SOUND_LIMIT)throw Error('Maximum 16 custom sounds.');
 let total=0;const ids=new Set();
 for(const s of bank){if(!s||!customId(s.id)||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>80||typeof s.data!=='string'||s.data.length>Math.ceil(BYTE_LIMIT/3)*4||!s.data.length||s.data.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s.data)||!Number.isFinite(s.duration)||s.duration<=0||s.duration>5)throw Error('Invalid custom sound.');ids.add(s.id);total+=s.data.length;}
 if(total>BANK_LIMIT)throw Error('Custom sound memory full (12 MB encoded).');return structuredClone(bank);
}
export function encodeBytes(buffer){let text='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
export function decodeBytes(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0)).buffer;}
export function removeSound(state,id){
 state.customSounds=state.customSounds.filter(s=>s.id!==id);
 for(const s of [state,...state.presets.map(p=>p.settings)])for(const c of s.channels)c.sounds=c.sounds.map(sound=>sound===id?'click':sound);
}
export function customSoundUI({state,audio,unlock,changed,render,notify,running}){
 const root=document.querySelector('#customSoundList'),input=document.querySelector('#soundUpload'),zone=document.querySelector('#soundDrop');let busy=false;
 const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b;};
 function draw(){root.replaceChildren();for(const sound of state().customSounds){const row=document.createElement('div');row.className='sound-file';const label=document.createElement('span');label.textContent=`${sound.name} · ${sound.duration.toFixed(2)} SEC`;row.append(label,button('PLAY',async()=>{try{if(running())return notify('Stop the metronome to preview.','Warningsound');await unlock();await audio.loading;await audio.loadCustom(state().customSounds);audio.click({channel:0,state:2,sound:sound.id},audio.ctx.currentTime+.01);}catch{notify('Sound could not play.','invalidsound');}}),button('DELETE',()=>{if(busy||running())return notify('Stop playback and wait for the upload.','Warningsound');if(!confirm(`Delete “${sound.name}”? Its assignments, including presets, switch to Classic click.`))return;removeSound(state(),sound.id);audio.buffers.delete(sound.id);changed();render();}));root.append(row);}if(!root.children.length){const p=document.createElement('p');p.className='system-field';p.textContent='CUSTOM SOUND MEMORY EMPTY';root.append(p);}}
 async function upload(files){if(busy||running())return notify('Stop playback before importing sounds.','Warningsound');busy=true;input.disabled=true;zone.setAttribute('aria-busy','true');let count=0;
 try{await unlock();for(const file of files){if(running())throw Error('Playback started. Remaining uploads cancelled.');if(!file.size||file.size>BYTE_LIMIT)throw Error(`${file.name}: maximum 2 MB per file.`);const bytes=await file.arrayBuffer(),buffer=await audio.ctx.decodeAudioData(bytes.slice(0));if(buffer.duration>5||buffer.duration<=0)throw Error(`${file.name}: use a sound up to 5 seconds.`);if(running())throw Error('Stop playback and upload again.');const sound={id:'user-'+crypto.randomUUID(),name:file.name.slice(0,80),duration:buffer.duration,data:encodeBytes(bytes)};validateSounds([...state().customSounds,sound]);state().customSounds.push(sound);audio.buffers.set(sound.id,buffer);count++;changed();}notify(`${count} sound(s) imported. Choose them in Audio Matrix.`);}catch(err){notify(`${count?count+' imported. ':''}${err.message||'Audio format not supported by this browser.'}`,'invalidsound');}finally{busy=false;input.disabled=false;zone.removeAttribute('aria-busy');input.value='';render();}}
 input.onchange=()=>upload([...input.files]);zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag-over');};zone.ondragleave=()=>zone.classList.remove('drag-over');zone.ondrop=e=>{e.preventDefault();zone.classList.remove('drag-over');upload([...e.dataTransfer.files]);};return {draw,isBusy:()=>busy};
}
