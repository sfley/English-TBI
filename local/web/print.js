'use strict';
const $=id=>document.getElementById(id);
let cards=[],name='';let revision=0,loadRevision=0;
function status(text){$('status').textContent=text;}
function invalidate(){revision++;$('preview').replaceChildren();$('print').disabled=true;status('Préparez les pages avec vos nouveaux réglages.');}
function shuffle(values){const result=values.slice();for(let i=result.length-1;i>0;i--){const random=new Uint32Array(1);crypto.getRandomValues(random);const j=random[0]%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;}
function tile(card){const box=document.createElement('div');box.className='tile';const picture=document.createElement('div');picture.className='picture';const image=document.createElement('img');image.src=card.image;image.alt=card.label;picture.append(image);box.append(picture);if($('show-label').checked){const word=document.createElement('div');word.className='word';word.textContent=card.label;box.append(word);}return box;}
function sheet(number){const page=document.createElement('section');page.className='sheet';const header=document.createElement('div');header.className='sheet-header';const title=document.createElement('strong');title.textContent=name;const count=document.createElement('span');count.textContent='Page '+number;header.append(title,count);page.append(header);$('preview').append(page);return page;}
function grid(cols,rows){const g=document.createElement('div');g.className='print-grid';g.style.gridTemplateColumns=`repeat(${cols},minmax(0,1fr))`;g.style.gridTemplateRows=`repeat(${rows},minmax(0,1fr))`;return g;}
async function generate(){
 const run=++revision;$('print').disabled=true;$('preview').replaceChildren();
 if(!cards.length){status('Choisissez un thème.');return;}
 try{
  if($('kind').value==='cards'){
   const n=Number($('per-page').value);const cols=n===2?1:2;
   for(let start=0;start<cards.length;start+=n){const page=sheet(start/n+1);const g=grid(cols,n/cols);cards.slice(start,start+n).forEach(c=>g.append(tile(c)));page.append(g);}
  }else{
   const [cols,rows]=$('grid-size').value.split(',').map(Number);const cells=cols*rows;
   const quantity=Number($('quantity').value);
   if(!Number.isInteger(quantity)||quantity<1||quantity>30)throw Error('Choisissez de 1 à 30 grilles.');
   if(cells>cards.length)throw Error(`Ce thème contient ${cards.length} cartes : choisissez une grille plus petite.`);
   const seen=new Set();let page;
   for(let i=0;i<quantity;i++){
    let selected,key,tries=0;
    do{selected=shuffle(cards).slice(0,cells);key=selected.map(c=>c.id).join('|');tries++;}while(seen.has(key)&&tries<500);
    if(seen.has(key))throw Error('Pas assez de combinaisons pour autant de grilles. Diminuez leur nombre.');
    seen.add(key);if(i%2===0){page=sheet(Math.floor(i/2)+1);const boards=document.createElement('div');boards.className='boards';page.append(boards);}
    const board=document.createElement('section');board.className='board';const title=document.createElement('div');title.className='board-title';title.textContent='Loto · Grille '+(i+1);const g=grid(cols,rows);selected.forEach(c=>g.append(tile(c)));board.append(title,g);page.querySelector('.boards').append(board);
   }
  }
  status('Chargement des images…');await Promise.all([...document.querySelectorAll('#preview img')].map(i=>i.decode()));
  if(run!==revision)return;$('print').disabled=false;status(`${document.querySelectorAll('.sheet').length} page(s) prête(s). Papier A4, portrait, échelle 100 %, sans en-têtes ni pieds de page du navigateur.`);
 }catch(e){if(run!==revision)return;$('preview').replaceChildren();status(e.message);}
}
async function loadTheme(){const loading=++loadRevision;invalidate();cards=[];name='';try{const response=await fetch('/api/themes/'+$('theme').value);if(!response.ok)throw Error('Thème indisponible.');const data=await response.json();if(loading!==loadRevision)return;cards=data.cards;name=data.name;await generate();}catch(e){status(e.message);}}
$('generate').onclick=generate;$('print').onclick=()=>window.print();$('theme').onchange=loadTheme;
for(const id of ['kind','per-page','grid-size','quantity','show-label'])$(id).onchange=()=>{invalidate();const bingo=$('kind').value==='bingo';$('cards-settings').hidden=bingo;$('bingo-settings').hidden=!bingo;$('quantity-settings').hidden=!bingo;};
(async()=>{try{const response=await fetch('/api/themes');if(!response.ok)throw Error('Atelier indisponible.');const data=await response.json();for(const t of data.themes){const opt=document.createElement('option');opt.value=t.id;opt.textContent=t.name;$('theme').append(opt);}const requested=new URLSearchParams(location.search).get('theme');if(data.themes.some(t=>t.id===requested))$('theme').value=requested;await loadTheme();}catch(e){status(e.message);}})();
