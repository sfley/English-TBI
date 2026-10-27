 'use strict';
(async()=>{
 const isGame=location.pathname.startsWith('/app/'),isPrint=location.pathname==='/print.html';
 const query=new URLSearchParams(location.search);
 const lessonId=query.get('lesson')||(location.pathname==='/lesson.html'?query.get('id'):null);
 const lesson=lessonId?await fetch('/api/curriculum/lessons/'+lessonId).then(r=>r.ok?r.json():null).catch(()=>null):null;
 const themes=(await fetch('/api/themes').then(r=>r.json()).catch(()=>({themes:[]}))).themes||[];
 const saved=()=>{try{return sessionStorage.getItem('active-theme');}catch{return null;}};
 let active=themes.find(t=>t.id===query.get('theme')||t.key===query.get('theme'))||themes.find(t=>t.id===saved())||themes[0];
 const nav=document.createElement('header');nav.id='app-navigation';const brand=document.createElement('a');brand.className='app-brand';brand.href='/';brand.textContent='ENGLISH TBI · Accueil';
 const modules=document.createElement('nav');modules.setAttribute('aria-label','Navigation principale');const links={};
 for(const [id,title] of [['prepare','Préparer'],['play','Jouer'],['print','Imprimer']]){const a=document.createElement('a');a.textContent=title;a.dataset.module=id;if((isGame||location.pathname==='/run.html')?id==='play':isPrint?id==='print':id==='prepare')a.setAttribute('aria-current','page');links[id]=a;modules.append(a);}
 const tools=document.createElement('a');tools.href='/themes.html';tools.textContent='Mes thèmes';tools.className='themes-link';const label=document.createElement('label');label.textContent='Thème ';const select=document.createElement('select');select.id='navigation-theme';themes.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.name;select.append(o);});label.append(select);const count=document.createElement('small');count.id='navigation-count';nav.append(brand,modules,tools,label,count);document.body.prepend(nav);
 function update(t){active=t;try{sessionStorage.setItem('active-theme',t.id);}catch{}select.value=t.id;links.prepare.href='/lesson.html?theme='+t.id;links.play.href='/app/?theme='+encodeURIComponent(t.key);links.print.href='/print.html?theme='+t.id;}
 if(active)update(active);
 if(lesson){links.prepare.href='/lesson.html?id='+lesson.id;links.play.href='/run.html?lesson='+lesson.id;links.print.href='/print.html?lesson='+lesson.id;label.hidden=true;count.textContent=lesson.title+' · '+lesson.card_count+' cartes';}
 else if(['/', '/index.html','/home.html','/sequence.html','/lesson.html'].includes(location.pathname)){label.hidden=true;count.hidden=true;links.prepare.href='/lesson.html'+(query.get('sequence')?'?sequence='+query.get('sequence'):'');links.play.href='/';}
 select.onchange=()=>{const t=themes.find(t=>t.id===select.value);if(!t)return;update(t);const owner=isGame?document.querySelector('#globalTheme select'):document.getElementById('theme');if(owner){owner.value=isGame?t.key:t.id;owner.dispatchEvent(new Event('change',{bubbles:true}));}else location.href='/themes.html?theme='+t.id;};
 document.addEventListener('change',e=>{if(!lesson&&e.target.matches('#globalTheme select,#theme')){const t=themes.find(t=>t.id===e.target.value||t.key===e.target.value);if(t)update(t);}});
 window.addEventListener('themechange',e=>{let t=themes.find(t=>t.id===e.detail.id);if(!t){t={id:e.detail.id,key:e.detail.key,name:e.detail.name};themes.push(t);const o=document.createElement('option');o.value=t.id;select.append(o);}Object.assign(t,{name:e.detail.name,key:e.detail.key});[...select.options].find(o=>o.value===t.id).textContent=t.name;if(!lesson)update(t);});
 document.querySelectorAll('.toolbar>a:first-child').forEach(e=>e.hidden=true);
 if(isPrint)document.querySelector('.settings>label:first-child').hidden=true;
 if(!lesson&&active){const owner=isGame?document.querySelector('#globalTheme select'):document.getElementById('theme');if(owner){let done=false;const sync=()=>{if(done||!owner.options.length)return;done=true;const value=isGame?active.key:active.id;if(owner.value!==value){owner.value=value;owner.dispatchEvent(new Event('change',{bubbles:true}));}};sync();if(!done){const observer=new MutationObserver(()=>{sync();if(done)observer.disconnect();});observer.observe(owner,{childList:true});}}}
 if(!isGame)return;
 document.body.classList.add('play-mode');
 const layout=document.querySelector('.layout');const sidebar=document.querySelector('.sidebar');
 const bar=document.createElement('div');bar.className='play-toolbar';
 const activity=document.createElement('details');activity.id='activity-menu';const activityLabel=document.createElement('summary');activityLabel.textContent='Choisir une activité';activity.append(activityLabel,document.querySelector('.games'));
 const settings=document.createElement('details');settings.id='game-settings';const summary=document.createElement('summary');summary.textContent='Réglages';const panel=document.createElement('div');panel.className='settings-panel';panel.append(document.getElementById('controls'),document.querySelector('.global-controls'));settings.append(summary,panel);
 const menu=document.createElement('button');menu.textContent='Menu';menu.className='fullscreen-menu';menu.onclick=()=>document.body.classList.toggle('show-navigation');
 const full=document.createElement('button');full.textContent='Plein écran';full.onclick=()=>{const operation=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();operation?.catch(()=>{});};
 const ritual=document.createElement('a');ritual.textContent=lesson?'Retour à ma séance':'Préparer une séance';
 bar.append(menu,activity,settings,ritual,full);layout.prepend(bar);
 const footer=document.createElement('footer');footer.className='play-actions';const action=document.createElement('div');action.id='game-actions';const restart=document.createElement('button');restart.textContent='Recommencer';restart.id='restart-game';restart.onclick=()=>window.dispatchEvent(new Event('restartgame'));footer.append(action,restart);layout.append(footer);
 // Retain the theme selector as the application state owner, without displaying a second menu.
 sidebar.hidden=true;
 let automatic=true;
 function fit(){const grid=document.querySelector('#stage .grid');if(!grid)return;const count=grid.children.length;if(!count)return;const stage=document.getElementById('stage');const w=stage.clientWidth-32,h=stage.clientHeight-32;let cols=1,best=0;for(let c=1;c<=Math.min(8,count);c++){const size=Math.min(w/c-36,h/Math.ceil(count/c)-80);if(size>best){best=size;cols=c;}}if(automatic)grid.style.gridTemplateColumns=`repeat(${cols}, minmax(0, 1fr))`;else cols=Number(getComputedStyle(grid).gridTemplateColumns.split(' ').length)||cols;const size=Math.max(45,Math.min(320,w/cols-36,h/Math.ceil(count/cols)-80));grid.style.setProperty('--play-card-size',size+'px');}
 function controls(){action.replaceChildren();const play=document.querySelector('#controls [id$="-play-btn"]');if(play)action.append(play.closest('.row'));fit();}
 function rendered(){const selected=document.querySelector('#gameList button.active');activityLabel.textContent=selected?.textContent||'Choisir une activité';const tid=window.THEME_IDS?.[document.querySelector('#globalTheme select').value];ritual.href=lesson?'/run.html?lesson='+lesson.id:'/lesson.html?theme='+tid;fit();}
 document.getElementById('gameList').addEventListener('click',()=>{activity.open=false;rendered();});
 function positionSettings(){if(settings.open){const top=Math.max(12,Math.min(bar.getBoundingClientRect().bottom+8,innerHeight-160));panel.style.top=top+'px';panel.style.maxHeight=Math.max(100,innerHeight-top-12)+'px';}}settings.addEventListener('toggle',positionSettings);window.addEventListener('resize',positionSettings);new ResizeObserver(positionSettings).observe(bar);
 settings.addEventListener('change',e=>{const row=e.target.closest('.row');if(row?.textContent.includes('Colonnes')){automatic=false;fit();}});
 document.addEventListener('click',e=>{if(!activity.contains(e.target))activity.open=false;if(!settings.contains(e.target))settings.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){activity.open=false;settings.open=false;}});
 window.addEventListener('localcontrols',controls);window.addEventListener('localrender',rendered);
 new MutationObserver(rendered).observe(document.getElementById('cardContainer'),{childList:true,subtree:true});
 new ResizeObserver(fit).observe(document.getElementById('stage'));
 controls();rendered();
})();
