/* WW Solar — catálogo inicial de cidades, sem reprodução pública de índices restritos.
   A base TILTED_LATITUDE / Atlas Brasileiro de Energia Solar (INPE, 2017) fornecida
   contém restrição expressa de reprodução para fins comerciais. Aguardamos autorização
   adequada antes de distribuir seus índices no frontend. Não inventar HSP. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WWSolarSolarData=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const months=Object.freeze(['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']);
  const cities=Object.freeze(['Canindé','Caridade','Paramoti'].map(name=>Object.freeze({name,uf:'CE',key:'CE|'+name})));
  // Valores ausentes até a validação dos direitos de uso comercial da fonte.
  const hspByCity=Object.freeze(Object.fromEntries(cities.map(city=>[
    city.key,Object.freeze(Object.fromEntries(months.map(month=>[month,null])))
  ])));
  function find(uf,municipio){
    if(typeof uf!=='string'||typeof municipio!=='string')return null;
    const fold=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
    const match=cities.find(c=>c.uf===uf.trim().toUpperCase()&&fold(c.name)===fold(municipio));
    if(!match)return null;
    const values=hspByCity[match.key];
    if(!values||months.some(m=>!Number.isFinite(values[m])||values[m]<=0))return null;
    return {name:match.name,uf:match.uf,hsp:{...values},unit:'kWh/m²/dia'};
  }
  return Object.freeze({months,cities,find});
});
