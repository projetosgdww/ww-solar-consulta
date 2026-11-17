/* WW Solar PWA: rede atual para HTML, scripts, preços e autenticação.
   Cache apenas de ícones públicos, nunca de páginas, JS, CSS ou dados. */
const VERSION='wwsolar-public-icons-v3';
const PUBLIC_ICONS=['/icons/ww-solar-192.png','/icons/ww-solar-512.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
   const cache=await caches.open(VERSION);
   await cache.addAll(PUBLIC_ICONS);
   await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
   const names=await caches.keys();
   await Promise.all(names.filter(n=>n.startsWith('wwsolar-public-icons-')&&n!==VERSION).map(n=>caches.delete(n)));
   await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 // Navegação e arquivos críticos sempre pela rede, mesmo em instalações antigas.
 if(event.request.mode==='navigate'||event.request.destination==='document'){
   event.respondWith(fetch(event.request,{cache:'no-store'}));
   return;
 }
 if(!PUBLIC_ICONS.includes(url.pathname))return;
 event.respondWith((async()=>{
   const cache=await caches.open(VERSION);
   const hit=await cache.match(event.request);
   return hit||fetch(event.request);
 })());
});
