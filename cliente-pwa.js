// WW Solar PWA — atualização automática ao abrir ou retornar ao aplicativo.
// Nenhum dado privado, HTML, script ou cotação é armazenado pelo service worker.
(()=>{
 'use strict';
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 const CURRENT=document.querySelector('meta[name="wwsolar-release"]')?.content||'';
 const CHECK_URL='./pwa-release.json';
 const storageKey='wwsolar-pwa-last-reload-target';
 let checking=false;
 async function checkRelease(){
   if(checking||document.visibilityState==='hidden')return;
   checking=true;
   try{
     const response=await fetch(CHECK_URL+'?t='+Date.now(),{cache:'no-store'});
     if(!response.ok)return;
     const data=await response.json();
     const remote=String(data?.version||'');
     if(!/^[a-zA-Z0-9._-]{3,80}$/.test(remote)||remote===CURRENT)return;
     // Recarregar no máximo uma vez para cada versão publicada, sem laço.
     if(sessionStorage.getItem(storageKey)===remote)return;
     sessionStorage.setItem(storageKey,remote);
     window.location.reload();
   }catch(_){/* Sem rede: continuar versão instalada, sem apagar dados. */}
   finally{checking=false;}
 }
 window.addEventListener('load',()=>{
   navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})
     .then(reg=>reg.update()).catch(error=>{
       console.warn('WW Solar: atualização do PWA indisponível.',error);
     });
   void checkRelease();
 });
 document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible'){
     void navigator.serviceWorker.getRegistration('./').then(reg=>reg?.update()).catch(()=>{});
     void checkRelease();
   }
 });
 window.addEventListener('pageshow',event=>{if(event.persisted)void checkRelease();});
 navigator.serviceWorker.addEventListener('controllerchange',()=>void checkRelease());
})();
