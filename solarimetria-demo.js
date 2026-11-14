/* WW Solar — DADOS SINTÉTICOS DE DEMONSTRAÇÃO, NÃO SÃO IRRADIAÇÃO REAL.
   Usar exclusivamente em previews Cloudflare Pages com flag explícita.
   Não usar estes números em cotações, estimativas comerciais ou produção. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WWSolarSolarDemo=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
 const profiles=Object.freeze({
   'Canindé': [4.10,4.20,4.35,4.25,4.45,4.70,4.95,5.15,5.30,5.10,4.75,4.30],
   'Caridade':[4.20,4.30,4.40,4.30,4.55,4.80,5.05,5.20,5.35,5.15,4.85,4.40],
   'Paramoti': [4.00,4.15,4.25,4.20,4.40,4.65,4.85,5.10,5.25,5.00,4.70,4.25]
 });
 function find(uf,city){
   if(String(uf).toUpperCase()!=='CE'||!Object.hasOwn(profiles,city))return null;
   return {name:city,uf:'CE',hsp:Object.fromEntries(months.map((m,i)=>[m,profiles[city][i]])),
      demo:true,source:'DADOS SINTÉTICOS EXCLUSIVOS PARA TESTE DE INTERFACE'};
 }
 return Object.freeze({find,synthetic:true});
});
