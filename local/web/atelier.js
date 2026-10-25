'use strict';
const $ = id => document.getElementById(id);
const model = {id:null,cards:[],dirty:false,busy:false};
let token;
let playing;
const fileLimit = 8*1024*1024;
function message(text,error=false,host='message'){ $(host).textContent=text;$(host).classList.toggle('error',error); }
function dirty(){model.dirty=true;$('saved-state').textContent='Modifications à enregistrer';$('play-theme').hidden=true;}
function stopSounds(){document.querySelectorAll('audio').forEach(a=>a.pause());playing=null;}
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO'){if(playing&&playing!==e.target)playing.pause();playing=e.target;}},true);
window.addEventListener('pagehide',stopSounds);
window.addEventListener('beforeunload',e=>{if(model.dirty){e.preventDefault();e.returnValue='';}});
async function request(url,payload,isZip=false){
 const response=await fetch(url,payload===undefined?{}:{method:'POST',headers:{'X-Local-Token':token,'Content-Type':isZip?'application/zip':'application/json'},body:isZip?payload:JSON.stringify(payload)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Action impossible.');return data;
}
async function operation(fn){
 if(model.busy)return;
 model.busy=true;$('editor-fields').disabled=true;
 document.querySelectorAll('.library button,.library input').forEach(e=>e.disabled=true);
 try{await fn();}catch(e){message(e.message,true);}finally{model.busy=false;$('editor-fields').disabled=false;document.querySelectorAll('.library button,.library input').forEach(e=>e.disabled=false);}
}
function dataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Lecture du fichier impossible.'));r.readAsDataURL(file);});}
function newTheme(){
 if(model.busy||model.dirty&&!confirm('Abandonner les modifications non enregistrées ?'))return;
 stopSounds();model.id=null;model.cards=[];model.dirty=false;$('theme-name').value='';$('credit').value='';$('saved-state').textContent='Non enregistré';$('editor-title').textContent='Créer un thème';$('play-theme').hidden=true;message('');render();
}
function render(){
 stopSounds();$('cards').replaceChildren();$('card-count').textContent=model.cards.length?`${model.cards.length} carte${model.cards.length>1?'s':''}`:'Aucune carte';
 for(const card of model.cards){
  const box=document.createElement('article');box.className='card';
  const image=document.createElement('img');image.src=card.image;image.alt=card.label;box.append(image);
  const label=document.createElement('label');label.textContent='Mot anglais';
  const input=document.createElement('input');input.value=card.label;input.maxLength=100;input.setAttribute('aria-label','Mot anglais');
  input.addEventListener('input',()=>{card.label=input.value;dirty();});
  input.addEventListener('change',()=>{if(card.audio&&card.audioLabel!==card.label.trim()){card.audio=null;render();message('Mot modifié : générez ou importez son nouveau son.');}});
  label.append(input);box.append(label);
  const status=document.createElement('small');status.textContent=card.audio?'Son prêt à écouter':'Son à générer ou à importer';box.append(status);
  if(card.audio){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=card.audio;box.append(audio);}
  const generate=document.createElement('button');generate.textContent=card.audio?'Régénérer la voix':'Générer la voix';generate.type='button';generate.onclick=()=>operation(async()=>{await generateCard(card);render();message('Son généré. Écoutez-le avant de valider.');});box.append(generate);
  const upload=document.createElement('label');upload.className='button';upload.textContent='Importer un MP3';
  const audioInput=document.createElement('input');audioInput.type='file';audioInput.accept='.mp3,audio/mpeg';audioInput.hidden=true;
  audioInput.onchange=()=>operation(async()=>{const file=audioInput.files[0];if(!file)return;if(file.size>fileLimit)throw Error('MP3 trop volumineux (8 Mo maximum).');card.audio=await dataURL(file);card.audioLabel=card.label.trim();dirty();render();message('MP3 chargé. Écoutez-le puis enregistrez le thème.');});
  upload.append(audioInput);box.append(upload);
  const remove=document.createElement('button');remove.textContent='Retirer cette carte';remove.className='remove';remove.onclick=()=>{model.cards=model.cards.filter(c=>c!==card);dirty();render();};box.append(remove);$('cards').append(box);
 }
}
async function addImages(files){
 const accepted=[...files];if(model.cards.length+accepted.length>60)throw Error('60 cartes maximum par thème.');
 const added=[];
 for(const file of accepted){
  if(file.size>fileLimit)throw Error(`${file.name} dépasse 8 Mo.`);
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error(`${file.name} : choisissez une image PNG, JPEG ou WebP.`);
  const image=await dataURL(file);const probe=new Image();probe.src=image;await probe.decode();
  if(probe.naturalWidth*probe.naturalHeight>20000000)throw Error(`${file.name} : image trop grande (20 mégapixels maximum).`);
  added.push({label:file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim(),image,audio:null,audioLabel:null});
 }
 model.cards.push(...added);dirty();render();message('Images ajoutées. Vérifiez les mots, puis préparez les sons.');
}
async function generateCard(card){
 if(!card.label.trim())throw Error('Renseignez le mot anglais avant de générer sa voix.');
 message(`Génération de « ${card.label} »…`);
 const result=await request('/api/tts',{label:card.label.trim(),accent:$('accent').value});
 card.audio=result.audio;card.audioLabel=card.label.trim();dirty();
}
async function loadCatalog(){
 const result=await request('/api/themes');$('themes').replaceChildren();
 for(const theme of result.themes){
  const item=document.createElement('div');item.className='theme-item';const title=document.createElement('strong');title.textContent=theme.name;
  const count=document.createElement('small');count.textContent=`${theme.count} cartes`;
  const edit=document.createElement('button');edit.textContent='Modifier';edit.onclick=()=>operation(async()=>{
   if(model.dirty&&!confirm('Abandonner les modifications non enregistrées ?'))return;
   const data=await request('/api/themes/'+theme.id);model.id=data.id;model.cards=data.cards.map(c=>({label:c.label,image:c.image,audio:c.audio,audioLabel:c.label}));model.dirty=false;$('theme-name').value=data.name;$('credit').value=data.credit||'';$('editor-title').textContent='Modifier un thème';$('saved-state').textContent='Enregistré sur cet ordinateur';setPlayLink(data.name);render();message('Thème chargé.');
  });
  const exp=document.createElement('a');exp.className='button';exp.textContent='Exporter';exp.href='/api/themes/'+theme.id+'/export';exp.download='theme.zip';item.append(title,count,edit,exp);$('themes').append(item);
 }
 if(!result.themes.length)$('themes').textContent='Vos nouveaux thèmes apparaîtront ici. Les fruits et les animaux sont déjà disponibles dans les jeux.';
 message(result.warnings.join('\n'),!!result.warnings.length,'library-message');
}
function setPlayLink(name){const key=`Local · ${name} [${model.id.slice(0,8)}]`;$('play-theme').href='/app/?theme='+encodeURIComponent(key);$('play-theme').hidden=false;}
async function save(){
 for(const c of model.cards)if(c.audioLabel!==c.label.trim())c.audio=null;
 const result=await request('/api/save',{id:model.id,name:$('theme-name').value,credit:$('credit').value,cards:model.cards.map(c=>({...c,label:c.label.trim()}))});
 model.id=result.id;model.dirty=false;$('saved-state').textContent='Enregistré sur cet ordinateur';setPlayLink(result.name);await loadCatalog();message(`Thème enregistré : images dans flashcards/${result.folder}/, sons dans audio/${result.folder}/. Le fichier cards.js est mis à jour.`);return result;
}
$('new-theme').onclick=newTheme;
$('theme-name').oninput=dirty;$('credit').oninput=dirty;
$('add-images').onchange=()=>operation(async()=>{await addImages($('add-images').files);$('add-images').value='';});
$('drop-zone').ondragover=e=>{e.preventDefault();$('drop-zone').classList.add('over');};
$('drop-zone').ondragleave=()=>$('drop-zone').classList.remove('over');
$('drop-zone').ondrop=e=>{e.preventDefault();$('drop-zone').classList.remove('over');if(!model.busy)operation(()=>addImages(e.dataTransfer.files));};
$('generate-all').onclick=()=>operation(async()=>{
 let count=0;
 try{for(const c of model.cards)if(!c.audio||c.audioLabel!==c.label.trim()){await generateCard(c);count++;}}finally{render();}
 message(count?`${count} son(s) généré(s). Écoutez-les, puis enregistrez.`:'Tous les sons sont déjà présents. Utilisez « Régénérer » sur une carte pour changer sa voix.');
});
$('save').onclick=()=>operation(save);
$('export').onclick=()=>operation(async()=>{const result=await save();const a=document.createElement('a');a.href='/api/themes/'+result.id+'/export';a.download='theme.zip';document.body.append(a);a.click();a.remove();});
$('import-theme').onchange=()=>operation(async()=>{
 const file=$('import-theme').files[0];if(!file)return;if(file.size>50*1024*1024)throw Error('ZIP trop volumineux (50 Mo maximum).');
 const result=await request('/api/import',await file.arrayBuffer(),true);await loadCatalog();message(`« ${result.name} » importé et disponible dans les jeux. L’import crée une copie sans écraser un thème existant.`);$('import-theme').value='';
});
(async()=>{try{token=(await request('/api/session')).token;await loadCatalog();render();}catch(e){message('Connexion à l’atelier impossible. Relancez DEMARRER.bat. '+e.message,true);}})();
