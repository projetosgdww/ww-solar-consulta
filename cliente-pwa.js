// WW Solar PWA: botão de instalação opcional + registro seguro do SW.
// Não persiste páginas, carrinho, credenciais nem respostas privadas no cache.
(()=>{
 'use strict';
 const button=document.getElementById('client-install-app');
 if(!button)return;
 let promptEvent=null;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function refresh(){
   if(standalone()){button.hidden=true;return;}
   button.hidden=!(promptEvent||ios);
 }
 window.addEventListener('beforeinstallprompt',event=>{
   event.preventDefault();
   promptEvent=event;
   refresh();
 });
 window.addEventListener('appinstalled',()=>{
   promptEvent=null;
   refresh();
 });
 button.addEventListener('click',async()=>{
   if(standalone())return;
   if(promptEvent){
     const event=promptEvent;promptEvent=null;
     button.hidden=true;
     try{await event.prompt();await event.userChoice;}catch(_){}
     refresh();
   }else if(ios){
     window.alert('No iPhone: toque em Compartilhar no navegador, escolha “Adicionar à Tela de Início” e confirme “Abrir como App”.');
   }
 });
 refresh();
 if('serviceWorker' in navigator&&window.isSecureContext){
   window.addEventListener('load',()=>{
     navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(error=>{
       console.warn('WW Solar: modo instalável sem SW ativo neste navegador.',error);
     });
   });
 }
})();
