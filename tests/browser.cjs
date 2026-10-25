const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://127.0.0.1:8080/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 let checks=0;
 const errors=[];
 async function pageFor(prefs, fakeAudio=false) {
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({prefs,fakeAudio})=>{
   if(prefs==='blocked') Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}});
   else if(prefs!==undefined) localStorage.setItem('ui_prefs',prefs);
   document.addEventListener('DOMContentLoaded',()=>{
    for(const game of Object.values(window.GAME_REGISTRY)){
     const mount=game.mountControls;
     game.mountControls=function(...args){window.testState=args[1];return mount.apply(this,args);};
    }
   });
   window.audioEvents=[];
   if(fakeAudio){
    window.Audio=class {
     constructor(src){this.src=src;}
     play(){window.audioEvents.push(this.src);this.timer=setTimeout(()=>this.onended?.(),80);return Promise.resolve();}
     pause(){clearTimeout(this.timer);window.audioEvents.push('STOP');}
     removeAttribute(){} load(){}
    };
   }
  },{prefs,fakeAudio});
  return page;
 }
 async function ok(name,fn){await fn();checks++;console.log('PASS '+name);}
 try {
  for(const pref of ['{oops','null','[]','42','{"tbi":"false"}','blocked']) await ok('préférences '+pref,async()=>{
   const p=await pageFor(pref);await p.goto(base+'?game=__proto__');await p.waitForSelector('#stage .card');assert.equal(await p.locator('#gameList button.active').textContent(),'Visual Board');assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('tbi')),false);await p.close();
  });
  const p=await pageFor(undefined,true);await p.goto(base);await p.waitForSelector('#stage .card');
  const ids=['tableau','listen','mask','pairs','order','missing','vf'];
  const names=['Visual Board','Listen',"What's Hidden?",'Memory Match','Sequence',"What's Missing?",'True or False'];
  async function game(id){await p.locator('#gameList button').filter({hasText:names[ids.indexOf(id)]}).click();}
  for(const theme of ['fruits','wild animals']) for(const id of ids) await ok(id+' / '+theme,async()=>{
   await game(id);await p.selectOption('#globalTheme select',theme);
   const count=await p.locator('#stage .card').count();assert.ok(count>0);
   assert.equal(await p.locator('#stage img').evaluateAll(es=>es.every(e=>decodeURIComponent(e.getAttribute('src')).includes('/'+document.querySelector('#globalTheme select').value+'/'))),true);
   await p.evaluate(()=>Promise.all([...document.querySelectorAll('#stage img')].map(i=>i.decode())));
   if(id==='tableau') await p.locator('#stage .card').first().click();
   if(id==='listen') await p.evaluate(()=>{const s=testState;[...document.querySelectorAll('#stage .card')].find(e=>e.querySelector('img').alt===s.listen.target.label).click();});
   if(id==='mask') await p.locator('#stage .masked').first().click();
   if(id==='pairs') await p.evaluate(()=>{const s=testState.pairs;const a=s.board[0];const es=document.querySelectorAll('#stage .card');es[0].click();es[s.board.findIndex((c,i)=>i>0&&c.id===a.id)].click();});
   if(id==='order') await p.evaluate(()=>{for(const c of testState.order.sequence){[...document.querySelectorAll('#stage .card')].find(e=>e.querySelector('img').alt===c.label).click();}});
   if(id==='missing') await p.evaluate(()=>{const s=testState.missing;const el=document.querySelector(`[data-id="${s.target.id}"]`);const n=s.remaining.length;el.click();el.click();if(s.remaining.length!==n-1)throw Error('double réponse');});
   if(id==='vf'){await p.locator('.vf-controls button').first().click();assert.equal(await p.locator('.vf-controls button:disabled').count(),2);}
   // A pending transition must never replace the newly selected board.
   await game(id==='tableau'?'vf':'tableau');
   const snapshot=await p.locator('#cardContainer').innerHTML();await p.waitForTimeout(1300);assert.equal(await p.locator('#cardContainer').innerHTML(),snapshot);
  });
  await ok('zéro Vrai, réglages successifs et réponses',async()=>{
   await game('vf');await p.locator('#controls input[type=number]').nth(1).fill('0');await p.locator('#controls input[type=number]').nth(1).press('Tab');
   assert.equal(await p.evaluate(()=>testState.vf.asgns.filter(a=>a.isTrue).length),0);
   await p.locator('#controls input[type=number]').first().fill('8');await p.locator('#controls input[type=number]').first().press('Tab');
   assert.equal(await p.locator('#stage .card').count(),8);assert.equal(await p.evaluate(()=>testState.vf.asgns.filter(a=>a.isTrue).length),0);
   for(const b of await p.locator('.vf-controls button').all())if(await b.textContent()==='Faux')await b.click();
   assert.equal(await p.locator('#stage .card.correct').count(),8);
  });
  for(const id of ['order','missing']) for(const change of ['game','theme','reset']) await ok('annulation séquence '+id+' / '+change,async()=>{
   await game(id);await p.selectOption('#globalTheme select','fruits');
   await p.locator('#'+id+'-play-btn').click();
   if(change==='game')await game('tableau');
   if(change==='theme')await p.selectOption('#globalTheme select','wild animals');
   if(change==='reset'){await p.locator('#controls input[type=number]').first().fill('4');await p.locator('#controls input[type=number]').first().press('Tab');}
   const n=await p.evaluate(()=>audioEvents.length);await p.waitForTimeout(650);assert.equal(await p.evaluate(()=>audioEvents.length),n);
   if(change!=='game')assert.equal(await p.locator('#'+id+'-play-btn').isEnabled(),true);
  });
  await ok('annulation minuteurs lors du changement de thème',async()=>{
   for(const id of ['listen','mask','pairs','order','missing']){
    await game(id);await p.selectOption('#globalTheme select','fruits');
    await p.evaluate(id=>{
     const s=testState;
     const tiles=[...document.querySelectorAll('#stage .card')];
     if(id==='listen')tiles.find(e=>e.querySelector('img').alt===s.listen.target.label).click();
     if(id==='mask')document.querySelector('.masked').click();
     if(id==='missing')document.querySelector(`[data-id="${s.missing.target.id}"]`).click();
     if(id==='pairs'){tiles[0].click();tiles[s.pairs.board.findIndex((c,i)=>i&&c.id===s.pairs.board[0].id)].click();}
     if(id==='order')for(const c of s.order.sequence)tiles.find(e=>e.querySelector('img').alt===c.label).click();
    },id);
    await p.selectOption('#globalTheme select','wild animals');const html=await p.locator('#cardContainer').innerHTML();await p.waitForTimeout(1300);assert.equal(await p.locator('#cardContainer').innerHTML(),html);
   }
  });
  await p.close();
  const real=await pageFor();await real.goto(base);await real.waitForSelector('#stage .card');
  await ok('30 images et 30 sons : chargement et décodage réels',async()=>{
   const counts=await real.evaluate(async()=>{
    const cards=Object.values(CARD_SETS).flat();const context=new AudioContext();
    for(const c of cards){const image=new Image();image.src=c.img;await image.decode();const r=await fetch(c.audio);if(!r.ok)throw Error(c.audio);const audio=await context.decodeAudioData(await r.arrayBuffer());if(audio.duration<=0)throw Error('empty audio');}
    await context.close();return cards.length;
   });assert.equal(counts,30);
  });
  await ok('lecture audio réelle puis arrêt au changement',async()=>{
   await real.evaluate(()=>{const Native=window.Audio;window.lastAudio=null;window.Audio=function(src){return window.lastAudio=new Native(src);};});
   await real.locator('#stage .card').first().click();await real.waitForFunction(()=>lastAudio&&!lastAudio.paused);
   await real.locator('#gameList button').filter({hasText:'Listen'}).click();assert.equal(await real.evaluate(()=>lastAudio.paused),true);
  });
  await real.close();assert.deepEqual(errors,[]);console.log(`${checks} contrôles réussis; aucune erreur JavaScript.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
