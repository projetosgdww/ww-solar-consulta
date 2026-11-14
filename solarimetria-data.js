/* WW Solar — base solarimétrica selecionada a partir do arquivo fornecido pelo proprietário.
   Fonte: TILTED_LATITUDE_sedes-munic.csv; Atlas Brasileiro de Energia Solar (2017),
   séries mensais de irradiação no plano inclinado em Wh/m²/dia para sedes municipais.
   Valores inteiros da fonte, divididos por 1000 no cálculo (HSP em kWh/m²/dia).
   Base expansível por UF e município; nenhuma cidade recebe valores presumidos. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WWSolarSolarData=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const months=Object.freeze(['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']);
  const raw=Object.freeze({
    'CE|Canindé': [5140,5372,5464,5082,5249,5150,5519,6216,6616,6354,6061,5398],
    'CE|Caridade':[5153,5420,5318,5010,5394,5318,5580,6335,6431,6188,5457],
    'CE|Paramoti':[5085,5301,5270,4992,5330,5227,5494,6202,6566,6363,6080,5461]
  });
  const cities=Object.freeze(['Canindé','Caridade','Paramoti'].map(name=>Object.freeze({name,uf:'CE',key:'CE|'+name})));
  function find(uf,municipio){
    if(typeof uf!=='string'||typeof municipio!=='string')return null;
    const fold=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
    const match=cities.find(c=>c.uf===uf.trim().toUpperCase()&&fold(c.name)===fold(municipio));
    if(!match)return null;
    const values=raw[match.key];
    if(!Array.isArray(values)||values.length!==12||values.some(v=>!Number.isFinite(v)||v<=0))return null;
    return {name:match.name,uf:match.uf,hsp:Object.fromEntries(months.map((m,i)=>[m,values[i]/1000])),source:'TILTED_LATITUDE_sedes-munic.csv',unit:'kWh/m²/dia'};
  }
  return Object.freeze({months,cities,find});
});
