// WW Solar PWA — registro seguro sem botão interno de instalação.
// Android/iOS: instalação pelo menu nativo do navegador.
// Dados privados, autenticação, HTML e carrinho não são armazenados pelo service worker.
(()=>{
 'use strict';
 if('serviceWorker' in navigator && window.isSecureContext){
   window.addEventListener('load',()=>{
     navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(error=>{
       console.warn('WW Solar: registro do PWA não disponível neste navegador.',error);
     });
   });
 }
})();
