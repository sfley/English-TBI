const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const base=process.env.LOCAL_TEST_URL||'http://127.0.0.1:8092/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let count=0;async function check(name,fn){await fn();count++;console.log('PASS '+name);}
 try{
  await page.goto(base);await page.waitForFunction(()=>document.querySelectorAll('.theme-item').length>=2);
  await check('deux thèmes fournis modifiables dans l’atelier',async()=>{
   for(const [name,size] of [['fruits',17],['wild animals',13]]){
    await page.locator('.theme-item').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})}).locator('button').click();
    await page.waitForFunction(n=>document.querySelectorAll('.card').length===n,size);
    assert.equal(await page.locator('.card audio').count(),size);
   }
  });
  await check('nom Feelings affiché exactement dans les jeux',async()=>{
   await page.locator('#theme-name').fill('Feelings');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#saved-state').textContent.includes('Enregistré'));
   const href=await page.locator('#play-theme').getAttribute('href');const play=await browser.newPage();await play.goto(new URL(href,base).href);await play.waitForSelector('#stage .card');
   assert.equal(await play.locator('#globalTheme option:checked').textContent(),'Feelings');assert.equal(await play.locator('#globalTheme option').evaluateAll(es=>es.some(e=>e.textContent.includes('Local ·'))),false);await play.close();
  });
  const printHref=await page.locator('.theme-item').filter({has:page.locator('strong',{hasText:/^fruits$/})}).locator('a').filter({hasText:'Imprimer'}).getAttribute('href');
  await page.goto(new URL(printHref,base).href);await page.waitForFunction(()=>!document.querySelector('#print').disabled);
  await check('flashcards : 17 cartes, 3 pages, PDF A4',async()=>{
   assert.equal(await page.locator('.tile').count(),17);assert.equal(await page.locator('.sheet').count(),3);assert.equal(await page.locator('.word').count(),17);
   const file='/tmp/english-flashcards-test.pdf';await page.pdf({path:file,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
   const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});assert.match(info,/Pages:\s+3/);assert.match(info,/Page size:.*A4/);
   const text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});assert.ok(text.includes('Apple'));assert.ok(text.includes('Watermelon'));
  });
  await check('mots masqués et 4 flashcards par page',async()=>{
   await page.selectOption('#per-page','4');await page.locator('#show-label').uncheck();assert.equal(await page.locator('#print').isDisabled(),true);await page.locator('#generate').click();await page.waitForFunction(()=>!document.querySelector('#print').disabled);
   assert.equal(await page.locator('.word').count(),0);assert.equal(await page.locator('.sheet').count(),5);
  });
  await check('loto : 5 grilles distinctes de 6 cases, 3 pages PDF',async()=>{
   await page.selectOption('#kind','bingo');await page.locator('#quantity').fill('5');await page.locator('#quantity').press('Tab');await page.locator('#generate').click();await page.waitForFunction(()=>!document.querySelector('#print').disabled);
   assert.equal(await page.locator('.board').count(),5);assert.equal(await page.locator('.tile').count(),30);assert.equal(await page.locator('.sheet').count(),3);
   const boards=await page.locator('.board').evaluateAll(bs=>bs.map(b=>[...b.querySelectorAll('img')].map(i=>i.alt)));
   assert.ok(boards.every(b=>new Set(b).size===6));assert.equal(new Set(boards.map(b=>b.join('|'))).size,5);
   const file='/tmp/english-loto-test.pdf';await page.pdf({path:file,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});assert.match(execFileSync('pdfinfo',[file],{encoding:'utf8'}),/Pages:\s+3/);
   const dimensions=await page.locator('.tile img').evaluateAll(es=>es.map(i=>[i.naturalWidth,i.naturalHeight]));assert.ok(dimensions.every(([w,h])=>w===187&&h===187));
  });
  await check('limites du nombre de grilles et changement de format',async()=>{
   await page.locator('#quantity').fill('31');await page.locator('#quantity').press('Tab');await page.locator('#generate').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('1 à 30'));assert.equal(await page.locator('#print').isDisabled(),true);
   await page.locator('#quantity').fill('1');await page.locator('#quantity').press('Tab');await page.selectOption('#grid-size','3,3');await page.locator('#generate').click();await page.waitForFunction(()=>!document.querySelector('#print').disabled);assert.equal(await page.locator('.tile').count(),9);
  });
  assert.deepEqual(errors,[]);console.log(count+' contrôles éditeur et impression réussis.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
