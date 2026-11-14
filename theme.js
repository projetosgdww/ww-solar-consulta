/* WW Solar — preferência visual local, sem autenticação, rede ou rastreamento. */
(function(){
 'use strict';
 const KEY='wwsolar:theme:v1';
 const options=['light','dark','auto'];
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
 function set(v){
   if(!options.includes(v))return;
   preference=v;try{localStorage.setItem(KEY,v);}catch(_){}
   apply();
   document.querySelectorAll('.ww-theme-select').forEach(x=>{x.value=v;});
 }
 apply();
 if(mq){if(mq.addEventListener)mq.addEventListener('change',()=>{if(preference==='auto')apply();});else if(mq.addListener)mq.addListener(()=>{if(preference==='auto')apply();});}
 document.addEventListener('DOMContentLoaded',()=>{
   const header=document.querySelector('.header-inner, .site-header .container');
   if(!header)return;
   const box=document.createElement('div');box.className='ww-theme-switch';
   const label=document.createElement('label');label.className='ww-theme-label';label.textContent='Tema';
   const select=document.createElement('select');select.className='ww-theme-select';
   select.setAttribute('aria-label','Escolher aparência do WW Solar');
   for(const [value,name] of [['auto','◐ Auto'],['light','☀ Claro'],['dark','☾ Escuro']]){
     const item=document.createElement('option');item.value=value;item.textContent=name;select.append(item);
   }
   select.value=preference;
   select.addEventListener('change',()=>set(select.value));
   label.append(select);box.append(label);
   header.append(box);
 });
 window.WWSolarTheme=Object.freeze({get:()=>preference,set});
})();
