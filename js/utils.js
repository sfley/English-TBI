(function () {
 function shuffleInPlace(arr) {
 for (let i = arr.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1));
 [arr[i], arr[j]] = [arr[j], arr[i]];
 }
 return arr;
 }
 function el(tag, opts = {}) {
 const e = document.createElement(tag);
 if (opts.className) e.className = opts.className;
 if (opts.text) e.textContent = opts.text;
 if (opts.html) e.innerHTML = opts.html;
 if (opts.attrs) {
 for (const [k, v] of Object.entries(opts.attrs)) { e.setAttribute(k, v); }
 }
 if (opts.on) {
 for (const [type, handler] of Object.entries(opts.on)) { e.addEventListener(type, handler); }
 }
 return e;
 }
 function requestFullscreen() {
 const docEl = document.documentElement;
 if (docEl.requestFullscreen) return docEl.requestFullscreen();
 if (docEl.webkitRequestFullscreen) return docEl.webkitRequestFullscreen();
 if (docEl.msRequestFullscreen) return docEl.msRequestFullscreen();
 }
 // All delayed work belongs to the current game/round.
 let generation = 0;
 const timers = new Map();
 let activeAudio = null;
 function workToken() { return generation; }
 function isCurrent(token) { return token === generation; }
 function gameTimeout(callback, ms, onCancel) {
   const token = generation;
   const id = setTimeout(() => {
     timers.delete(id);
     if (isCurrent(token)) callback();
   }, ms);
   timers.set(id, onCancel);
   return id;
 }
 function stopAudio() {
   if (activeAudio) activeAudio.cancel();
 }
 function cancelGameWork() {
   generation++;
   for (const [id, onCancel] of timers) {
     clearTimeout(id);
     if (onCancel) onCancel();
   }
   timers.clear();
   stopAudio();
 }
 function wait(ms) {
   return new Promise(resolve => gameTimeout(() => resolve(true), ms, () => resolve(false)));
 }
 function playAudio(src) {
   stopAudio();
   return new Promise(resolve => {
     if (!src) return resolve(false);
     const audio = new Audio(src);
     let settled = false;
     const finish = ok => {
       if (settled) return;
       settled = true;
       audio.onended = audio.onerror = null;
       if (activeAudio?.audio === audio) activeAudio = null;
       resolve(ok);
     };
     activeAudio = { audio, cancel() {
       audio.pause();
       audio.removeAttribute('src');
       audio.load();
       finish(false);
     } };
     audio.onended = () => finish(true);
     audio.onerror = () => finish(false);
     try { audio.play().catch(() => finish(false)); } catch { finish(false); }
   });
 }
 window.addEventListener('pagehide', cancelGameWork);
 window.Utils = { shuffleInPlace, el, requestFullscreen, playAudio,
   gameTimeout, cancelGameWork, workToken, isCurrent, wait };
})();
