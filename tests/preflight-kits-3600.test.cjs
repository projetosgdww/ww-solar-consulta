'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('catalog/preflight-kits-3600-20261115.json','utf8'));
test('12 kits candidatos de 3,60 kWp, margem 25%, sem publicação',()=>{
 const items=data.records;
 assert.equal(items.length,12);
 assert.equal(new Set(items.map(x=>x.id)).size,12);
 for(const p of items){
  assert.equal(p.active,false);assert.equal(p.approved,false);
  assert.equal(p.payload.placas,6);
  assert.equal(p.payload.moduloWp,600);
  assert.equal(p.payload.potenciaKwp,3.6);
  assert.equal(p.payload.geracaoMensalKwh,460.8);
  assert.equal(p.payload.faixaGeracaoKwh,450);
  assert.equal(p.price,Math.round(p.cost_brl*125)/100);
  assert.equal(p.payload.freteInclusoParaCaninde,true);
  assert.equal(p.payload.destinoFreteIncluso,'Canindé/CE');
  assert.equal(p.payload.prazoEntregaDiasUteis,15);
  assert.equal(p.payload.prazoAdicionalDiasUteis,5);
  assert.equal(p.payload.origemKit,'fotus_pronto');
  assert.equal(p.internal_review.publishable,false);
  assert.ok(p.payload.observacaoComercial.includes('Para outras cidades, frete sob consulta.'));
 }
});
test('configurações TSUNESS de um único microinversor excluídas',()=>{
 const excluded=['FOTUS-3600-TSUN-2P5','FOTUS-3600-TSUN-3'];
 for(const id of excluded){
  assert.equal(data.records.some(x=>x.id===id),false,id);
  assert.equal(data.excluded_configurations.some(x=>x.id===id),true,id);
 }
 assert.equal(data.records.filter(x=>x.payload.tipoInversor==='micro').length,3);
});
