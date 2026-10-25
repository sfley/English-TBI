'use strict';
(async()=>{
 const isGame=location.pathname.startsWith('/app/');
 const isPrint=location.pathname==='/print.html';
 const current=isGame?'play':isPrint?'print':'prepare';
 const saved=()=>{try{return sessionStorage.getItem('active-theme');}catch{return null;}};
 const remember=id=>{try{sessionStorage.setItem('active-theme',id);}catch{}};
 const data=await fetch('/api/themes').then(r=>r.json()).catch(()=>({themes:[]}));
 const themes=data.themes||[];
 if(!themes.length)return;
 const requested=new URLSearchParams(location.search).get('theme');
 let active=themes.find(t=>t.id===requested||t.key===requested)||themes.find(t=>t.id===saved())||themes.find(t=>t.key===document.querySelector('#globalTheme select')?.value)||themes[0];
 const nav=document.createElement('header');nav.id='app-navigation';
 const brand=document.createElement('strong');brand.textContent='ENGLISH TBI';
 const modules=document.createElement('nav');modules.setAttribute('aria-label','Navigation principale');
 const links={};for(const [id,label] of [['prepare','Préparer'],['play','Jouer'],['print','Imprimer']]){const a=document.createElement('a');a.textContent=label;a.dataset.module=id;if(id===current)a.setAttribute('aria-current','page');links[id]=a;modules.append(a);}
 const label=document.createElement('label');label.textContent='Thème ';const select=document.createElement('select');select.id='navigation-theme';for(const t of themes){const o=document.createElement('option');o.value=t.id;o.textContent=t.name;select.append(o);}label.append(select);
 const count=document.createElement('small');count.id='navigation-count';nav.append(brand,modules,label,count);document.body.prepend(nav);
 function update(theme){active=theme;count.textContent='';fetch('/api/lesson/'+theme.id).then(r=>r.json()).then(d=>{if(active.id===theme.id)count.textContent=(d.selected?.length||theme.count||'')+' cartes';}).catch(()=>{});remember(theme.id);select.value=theme.id;links.prepare.href='/?theme='+theme.id;links.play.href='/app/?theme='+encodeURIComponent(theme.key);links.print.href='/print.html?theme='+theme.id;document.querySelectorAll('[data-prepare-tab]').forEach(a=>a.href=(a.dataset.prepareTab==='cards'?'/?theme=':'/session.html?theme=')+theme.id);}
 if(current==='prepare'){
  const tabs=document.createElement('nav');tabs.className='prepare-tabs';tabs.setAttribute('aria-label','Préparation du thème');for(const [id,text] of [['cards','Thèmes et cartes'],['session','Séance et ressources']]){const a=document.createElement('a');a.dataset.prepareTab=id;a.textContent=text;if((location.pathname==='/session.html')===(id==='session'))a.setAttribute('aria-current','page');tabs.append(a);}nav.after(tabs);
 }
 update(active);
 select.onchange=()=>{
  const t=themes.find(t=>t.id===select.value);update(t);
  const target=isGame?document.querySelector('#globalTheme select'):document.getElementById('theme');
  if(target){target.value=isGame?t.key:t.id;target.dispatchEvent(new Event('change',{bubbles:true}));}
  else location.href='/?theme='+t.id;
 };
 document.addEventListener('change',e=>{
  if(e.target.matches('#globalTheme select,#theme')){const t=themes.find(t=>t.id===e.target.value||t.key===e.target.value);if(t)update(t);}
 });
 window.addEventListener('themechange',e=>{let t=themes.find(t=>t.id===e.detail.id);if(t){t.name=e.detail.name;t.key=e.detail.key||t.key;t.count=e.detail.cards?.length||t.count;}else{t={id:e.detail.id,name:e.detail.name,key:e.detail.key,count:e.detail.cards?.length};themes.push(t);const o=document.createElement('option');o.value=t.id;select.append(o);}select.querySelectorAll('option').forEach(o=>{if(o.value===t.id)o.textContent=t.name;});update(t);});
 document.querySelectorAll('.top>nav,.top>a,.toolbar>a:first-child').forEach(e=>e.hidden=true);
 if(location.pathname==='/session.html')document.querySelector('.top label').hidden=true;
 if(isPrint)document.querySelector('.settings>label:first-child').hidden=true;
 const owner=isGame?document.querySelector('#globalTheme select'):document.getElementById('theme');
 if(owner){let synced=false;const sync=()=>{if(synced||!owner.options.length)return;synced=true;const value=isGame?active.key:active.id;if(owner.value!==value){owner.value=value;owner.dispatchEvent(new Event('change',{bubbles:true}));}};sync();if(!synced){const pending=new MutationObserver(()=>{sync();if(synced)pending.disconnect();});pending.observe(owner,{childList:true});}}
 if(!isGame)return;
 document.body.classList.add('play-mode');
 const layout=document.querySelector('.layout');const sidebar=document.querySelector('.sidebar');
 const bar=document.createElement('div');bar.className='play-toolbar';
 const activity=document.createElement('details');activity.id='activity-menu';const activityLabel=document.createElement('summary');activityLabel.textContent='Choisir une activité';activity.append(activityLabel,document.querySelector('.games'));
 const settings=document.createElement('details');settings.id='game-settings';const summary=document.createElement('summary');summary.textContent='Réglages';const panel=document.createElement('div');panel.className='settings-panel';panel.append(document.getElementById('controls'),document.querySelector('.global-controls'));settings.append(summary,panel);
 const menu=document.createElement('button');menu.textContent='Menu';menu.className='fullscreen-menu';menu.onclick=()=>document.body.classList.toggle('show-navigation');
 const full=document.createElement('button');full.textContent='Plein écran';full.onclick=()=>{const operation=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();operation?.catch(()=>{});};
 const ritual=document.createElement('a');ritual.textContent='Rituel et ressources';
 bar.append(menu,activity,settings,ritual,full);layout.prepend(bar);
 const footer=document.createElement('footer');footer.className='play-actions';const action=document.createElement('div');action.id='game-actions';const restart=document.createElement('button');restart.textContent='Recommencer';restart.id='restart-game';restart.onclick=()=>window.dispatchEvent(new Event('restartgame'));footer.append(action,restart);layout.append(footer);
 // Retain the theme selector as the application state owner, without displaying a second menu.
 sidebar.hidden=true;
 let automatic=true;
 function fit(){const grid=document.querySelector('#stage .grid');if(!grid)return;const count=grid.children.length;if(!count)return;const stage=document.getElementById('stage');const w=stage.clientWidth-32,h=stage.clientHeight-32;let cols=1,best=0;for(let c=1;c<=Math.min(8,count);c++){const size=Math.min(w/c-36,h/Math.ceil(count/c)-80);if(size>best){best=size;cols=c;}}if(automatic)grid.style.gridTemplateColumns=`repeat(${cols}, minmax(0, 1fr))`;else cols=Number(getComputedStyle(grid).gridTemplateColumns.split(' ').length)||cols;const size=Math.max(45,Math.min(320,w/cols-36,h/Math.ceil(count/cols)-80));grid.style.setProperty('--play-card-size',size+'px');}
 function controls(){action.replaceChildren();const play=document.querySelector('#controls [id$="-play-btn"]');if(play)action.append(play.closest('.row'));fit();}
 function rendered(){const selected=document.querySelector('#gameList button.active');activityLabel.textContent=selected?.textContent||'Choisir une activité';const tid=window.THEME_IDS?.[document.querySelector('#globalTheme select').value];ritual.href='/session.html?theme='+tid;fit();}
 document.getElementById('gameList').addEventListener('click',()=>{activity.open=false;rendered();});
 settings.addEventListener('change',e=>{const row=e.target.closest('.row');if(row?.textContent.includes('Colonnes')){automatic=false;fit();}});
 document.addEventListener('click',e=>{if(!activity.contains(e.target))activity.open=false;if(!settings.contains(e.target))settings.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){activity.open=false;settings.open=false;}});
 window.addEventListener('localcontrols',controls);window.addEventListener('localrender',rendered);
 new MutationObserver(rendered).observe(document.getElementById('cardContainer'),{childList:true,subtree:true});
 new ResizeObserver(fit).observe(document.getElementById('stage'));
 controls();rendered();
})();
