const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.LOCAL_TEST_URL||'http://127.0.0.1:8092/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let count=0;async function check(name,fn){await fn();count++;console.log('PASS '+name);}
 try{
  await page.goto(base);await page.waitForSelector('#themes');await page.waitForSelector('#app-navigation');await page.waitForFunction(()=>document.querySelector('#theme-name').value.length>0);await page.locator('#new-theme').click();
  await check('création par images et erreur sans son',async()=>{
   await page.locator('#theme-name').fill('School supplies browser');
   await page.locator('#add-images').setInputFiles(['flashcards/fruits/apple.png','flashcards/fruits/banana.png']);
   await page.waitForFunction(()=>document.querySelectorAll('.card').length===2);
   await page.locator('.card input[aria-label="Mot anglais"]').nth(0).fill('Pencil');
   await page.locator('.card input[aria-label="Mot anglais"]').nth(0).press('Tab');
   await page.locator('.card input[aria-label="Mot anglais"]').nth(1).fill('Ruler');
   await page.locator('.card input[aria-label="Mot anglais"]').nth(1).press('Tab');
   await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#message').classList.contains('error'));
   assert.match(await page.locator('#message').textContent(),/son|MP3/);
   assert.equal(await page.locator('.card').count(),2);
  });
  await check('TTS indisponible : cartes conservées et message utile',async()=>{
   await page.route('**/api/tts',route=>route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'Internet indisponible pour le TTS. Importez un MP3.'})}));
   await page.locator('#generate-all').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Internet indisponible'));
   assert.equal(await page.locator('.card').count(),2);await page.unroute('**/api/tts');
  });
  await check('import des MP3 et sauvegarde',async()=>{
   for(let i=0;i<2;i++){await page.locator('.card input[type=file]').nth(i).setInputFiles('audio/fruits/apple.mp3');await page.waitForFunction(n=>document.querySelectorAll('.card audio').length===n,i+1);}
   await page.locator('#credit').fill('Images et sons de test');
   await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#saved-state').textContent.includes('Enregistré'));
   assert.equal(await page.locator('#play-theme').isVisible(),true);
  });
  await check('thème enregistré disponible dans les sept activités',async()=>{
   const href=await page.locator('#play-theme').getAttribute('href');
   const play=await browser.newPage();play.on('pageerror',e=>errors.push(e.message));
   await play.goto(new URL(href,base).href);await play.waitForSelector('#stage .card');
   assert.match(await play.locator('#globalTheme select option:checked').textContent(),/School supplies browser/);
   for(let i=0;i<7;i++){
    await play.locator('#gameList button').nth(i).evaluate(e=>e.click());assert.ok(await play.locator('#stage .card').count()>0);
    const labels=await play.locator('#stage img').evaluateAll(es=>es.map(e=>e.alt));assert.ok(labels.every(s=>['Pencil','Ruler'].includes(s)));
    await play.evaluate(()=>Promise.all([...document.querySelectorAll('#stage img')].map(i=>i.decode())));
   }
   const result=await play.evaluate(async()=>{
    const audio=Object.values(CARD_SETS).flat().filter(c=>c.audio.startsWith('audio/school-supplies-browser'));const context=new AudioContext();
    for(const c of audio){const r=await fetch(c.audio);if(!r.ok)throw Error('missing audio');await context.decodeAudioData(await r.arrayBuffer());}await context.close();return audio.length;
   });assert.ok(result>=2);await play.close();
  });
  let pack;
  await check('export ZIP réel puis import sans écrasement',async()=>{
   const before=await page.locator('.theme-item').count();
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
   const file=await download.path();pack=fs.readFileSync(file);assert.equal(pack.readUInt16LE(0),0x4b50);
   await page.locator('#import-theme').setInputFiles({name:'theme.zip',mimeType:'application/zip',buffer:pack});
   await page.waitForFunction(n=>document.querySelectorAll('.theme-item').length===n,before+1);
  });
  await check('persistance après rechargement et modification d’un thème',async()=>{
   await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.theme-item').length>=2);
   await page.locator('.theme-item').filter({hasText:'School supplies browser'}).first().locator('button').first().click();await page.waitForFunction(()=>document.querySelectorAll('.card').length===2);
   assert.equal(await page.locator('#credit').inputValue(),'Images et sons de test');
   await page.locator('.card input[aria-label="Mot anglais"]').first().fill('Book');await page.locator('.card input[aria-label="Mot anglais"]').first().press('Tab');
   await page.waitForFunction(()=>document.querySelectorAll('.card audio').length===1);
   await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#message').classList.contains('error'));
   assert.match(await page.locator('#message').textContent(),/Book/);
  });
  await check('flux TTS et génération par lot (réponse distante simulée)',async()=>{
   const audio='data:audio/mpeg;base64,'+fs.readFileSync('audio/fruits/apple.mp3').toString('base64');
   const labels=[];await page.route('**/api/tts',route=>{labels.push(route.request().postDataJSON());return route.fulfill({contentType:'application/json',body:JSON.stringify({audio})});});
   await page.selectOption('#accent','com');await page.locator('#generate-all').click();await page.waitForFunction(()=>document.querySelectorAll('.card audio').length===2);
   assert.equal(labels.length,1);assert.equal(labels[0].label,'Book');assert.equal(labels[0].accent,'com');
   await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#saved-state').textContent.includes('Enregistré'));await page.unroute('**/api/tts');
  });
  await check('ZIP invalide : rejet sans perte des thèmes',async()=>{
   const before=await page.locator('.theme-item').count();
   await page.locator('#import-theme').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('bad zip')});
   await page.waitForFunction(()=>document.querySelector('#message').classList.contains('error'));
   assert.equal(await page.locator('.theme-item').count(),before);
  });
  await page.screenshot({path:'/tmp/english-local-workshop.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log(count+' parcours locaux réussis ; aucune erreur JavaScript.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
