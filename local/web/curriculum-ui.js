'use strict';
window.CurriculumUI={
 token:null,
 async api(url,body){if(body!==undefined&&!this.token)this.token=(await this.api('/api/session')).token;const r=await fetch(url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Local-Token':this.token},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Action impossible.');return d;},
 el(tag,text,attrs={}){const e=document.createElement(tag);if(text!==null)e.textContent=text;Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;},
 link(text,href){return this.el('a',text,{href,class:'button'});},
 resources(host,initial=[],themes=[]){
  const self=this;const items=initial.map(x=>({...x}));
  const list=this.el('div',null);host.append(list);
  function draw(){list.replaceChildren();items.forEach((r,i)=>{const row=self.el('div',null,{class:'resource-row'});row.append(self.el('strong',r.title),self.el('small',r.local?'Fichier local':'Internet nécessaire'));for(const [label,action] of [['↑',()=>{if(i)[items[i-1],items[i]]=[items[i],items[i-1]];}],['↓',()=>{if(i<items.length-1)[items[i+1],items[i]]=[items[i],items[i+1]];}],['Retirer',()=>items.splice(i,1)]]){const b=self.el('button',label,{type:'button','aria-label':label+' '+r.title});b.onclick=()=>{action();draw();host.dispatchEvent(new Event('change',{bubbles:true}));};row.append(b);}list.append(row);});}
  const fields=this.el('div',null,{class:'resource-add'});
  const title=this.el('input',null,{placeholder:'Titre de la ressource','aria-label':'Titre de la ressource',maxlength:'120'});
  const url=this.el('input',null,{placeholder:'https://…','aria-label':'Lien de la ressource',type:'url'});
  const kind=this.el('select',null,{'aria-label':'Catégorie de la ressource'});for(const [k,l] of [['song','Chanson'],['video','Vidéo'],['game','Jeu en ligne'],['prep','Fiche de préparation / séance'],['other','Autre']])kind.append(this.el('option',l,{value:k}));
  const add=this.el('button','Ajouter le lien',{type:'button'});const message=this.el('p','',{role:'status'});
  add.onclick=()=>{try{const parsed=new URL(url.value);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password||!title.value.trim())throw Error('Indiquez un titre et une adresse HTTP/HTTPS.');items.push({title:title.value.trim(),url:parsed.href,kind:kind.value,notes:'',local:false});title.value='';url.value='';draw();host.dispatchEvent(new Event('change',{bubbles:true}));message.textContent='Lien ajouté à la fiche. Enregistrez pour le conserver.';}catch(e){message.textContent=e.message;}};
  fields.append(title,kind,url,add);host.append(fields);
  if(themes.length){
   const bank=this.el('select',null,{'aria-label':'Thème pour les ressources'});themes.forEach(t=>bank.append(this.el('option',t.name,{value:t.id})));
   const options=this.el('div',null);const refresh=async()=>{try{const data=await self.api('/api/lesson/'+bank.value);options.replaceChildren();for(const r of data.resources||[]){const b=self.el('button','Ajouter : '+r.title,{type:'button'});b.onclick=()=>{items.push({...r});draw();host.dispatchEvent(new Event('change',{bubbles:true}));};options.append(b);}}catch(e){message.textContent=e.message;}};
   bank.onchange=refresh;
   const upload=this.el('input',null,{type:'file',accept:'.mp3,.mp4,.webm,.ogg,.pdf','aria-label':'Fichier de ressource locale'});
   const send=this.el('button','Ajouter le fichier local',{type:'button'});
   send.onclick=async()=>{send.disabled=true;try{const file=upload.files[0];if(!file||!title.value.trim())throw Error('Indiquez un titre et choisissez un fichier.');if(file.size>64*1024*1024)throw Error('64 Mo maximum.');if(!self.token)self.token=(await self.api('/api/session')).token;const q=new URLSearchParams({theme:bank.value,title:title.value.trim(),kind:kind.value,mode:'file',ext:file.name.split('.').pop()});const response=await fetch('/api/resource?'+q,{method:'POST',headers:{'X-Local-Token':self.token},body:await file.arrayBuffer()});const d=await response.json();if(!response.ok)throw Error(d.error);items.push(d.resources.at(-1));draw();title.value='';upload.value='';host.dispatchEvent(new Event('change',{bubbles:true}));message.textContent='Fichier ajouté à la fiche. Enregistrez pour le conserver.';await refresh();}catch(e){message.textContent=e.message;}finally{send.disabled=false;}};
   host.append(this.el('p','Reprendre une ressource d’un thème ou ajouter un fichier local :'),bank,options,upload,send);refresh();
  }
  host.append(message);draw();return ()=>items.map(x=>({...x}));
 },
 showResources(host,items){const self=this;for(const r of items){const box=this.el('article',null,{class:'resource'});box.append(this.el('h3',r.title));if(r.local&&['song','video'].includes(r.kind)){const m=this.el(r.kind==='song'?'audio':'video',null,{src:r.url,controls:'',preload:'none'});box.append(m);}box.append(this.link(r.local?'Ouvrir le fichier':'Ouvrir en ligne ↗',r.url));const a=box.querySelector('a');a.target='_blank';a.rel='noopener noreferrer';if(r.notes)box.append(this.el('p',r.notes));host.append(box);}document.addEventListener('play',e=>document.querySelectorAll('audio,video').forEach(m=>{if(m!==e.target)m.pause();}),true);window.addEventListener('pagehide',()=>document.querySelectorAll('audio,video').forEach(m=>m.pause()));}
};
