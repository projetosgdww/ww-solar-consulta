'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('catalog/preflight-kits-3600-20261115.json','utf8'));
test('14 kits 3.60 kWp são inéditos e todos aguardam aprovação',()=>{
 const entries=data.records;
 assert.equal(entries.length,14);
 assert.equal(new Set(entries.map(x=>x.id)).size,14);
 for(const r of entries){
  assert.equal(r.active,false);assert.equal(r.approved,false);
  assert.equal(r.payload.placas,6);assert.equal(r.payload.moduloWp,600);
  assert.equal(r.payload.potenciaKwp,3.6);
  assert.equal(r.payload.geracaoMensalKwh,460.8);
  assert.equal(r.payload.faixaGeracaoKwh,450);
  assert.equal(Math.round(r.cost_brl*125)/100,r.price);
 }
});
test('microinversor 2.5 kW unitário fica bloqueado pelo mínimo de 2.772 kW',()=>{
 const x=data.records.find(x=>x.id==='FOTUS-3600-TSUN-2P5');
 assert.equal(x.internal_review.status,'bloqueado_potencia_insuficiente');
 assert.equal(x.internal_review.nominal_kw,2.5);
 assert.equal(x.internal_review.publishable,false);
});
