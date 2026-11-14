/* WW Solar — tema local: clique para Claro → Escuro → Automático. */
(function(){
 'use strict';
 const KEY='wwsolar:theme:v1';
 const options=['light','dark','auto'];
 const labels={light:'Claro',dark:'Escuro',auto:'Automático'};
 const icons={light:'☀',dark:'☾',auto:'◐'};
 const mq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
 function stored(){try{const v=localStorage.getItem(KEY);return options.includes(v)?v:'light';}catch(_){return 'light';}}
 let preference=stored();
 function apply(){
   const resolved=preference==='auto'?(mq&&mq.matches?'dark':'light'):preference;
   document.documentElement.dataset.theme=resolved;
   document.documentElement.dataset.themePreference=preference;
   document.documentElement.style.colorScheme=resolved;
   const meta=document.querySelector('meta[name="theme-color"]');
   if(meta)meta.setAttribute('content',resolved==='dark'?'#101b1f':'#0e2023');
 }
 function refresh(){
   document.querySelectorAll('.ww-theme-button').forEach(button=>{
     const next=options[(options.indexOf(preference)+1)%options.length];
     const icon=document.createElement('span');icon.className='ww-theme-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[preference];
     const name=document.createElement('span');name.className='ww-theme-current';name.textContent=labels[preference];
     button.replaceChildren(icon,name);
     button.setAttribute('aria-label','Tema '+labels[preference]+'. Clique para mudar para '+labels[next]+'.');
     button.setAttribute('title','Tema '+labels[preference]+' · próximo: '+labels[next]);
   });
 }
 function set(v){
   if(!options.includes(v))return;
   preference=v;
   try{localStorage.setItem(KEY,v);}catch(_){}
   apply();refresh();
 }
 apply();
 if(mq){
   const changed=()=>{if(preference==='auto')apply();};
   if(mq.addEventListener)mq.addEventListener('change',changed);
   else if(mq.addListener)mq.addListener(changed);
 }
 document.addEventListener('DOMContentLoaded',()=>{
   const header=document.querySelector('.header-inner, .site-header .container');
   if(!header)return;
   const box=document.createElement('div');box.className='ww-theme-switch';
   const button=document.createElement('button');button.type='button';button.className='ww-theme-button';
   button.addEventListener('click',()=>set(options[(options.indexOf(preference)+1)%options.length]));
   box.append(button);
   const cart=header.querySelector('#client-cart-top');
   if(cart)header.insertBefore(box,cart);
   else header.append(box);
   refresh();
 });
 window.WWSolarTheme=Object.freeze({get:()=>preference,set});
})();
