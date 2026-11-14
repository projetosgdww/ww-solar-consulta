'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const data=require('../solarimetria-data.js');
const solar=require('../solarimetria-core.js');
for(const city of ['Canindé','Caridade','Paramoti']){
 test(city+' usa os 12 valores da base de origem e média anual/12',()=>{
   const loc=data.find('CE',city);assert.ok(loc);assert.equal(Object.keys(loc.hsp).length,12);
   const result=solar.calculate(2.4,loc,2025);
   assert.equal(result.monthly.length,12);
   for(let i=0;i<12;i++){
     const row=result.monthly[i];
     assert.equal(row.kwh,2.4*row.hsp*row.days*0.75);
   }
   assert.ok(Math.abs(result.annualKwh-result.monthly.reduce((a,b)=>a+b.kwh,0))<1e-9);
   assert.ok(Math.abs(result.averageMonthlyKwh-result.annualKwh/12)<1e-9);
 });
}
test('valores oficiais Canindé Jan=5.140 HSP e Dez=5.398',()=>{
 const r=data.find('CE','Canindé');assert.equal(r.hsp.jan,5.14);assert.equal(r.hsp.dez,5.398);
});
test('fevereiro 28/29 dias em anos comuns e bissextos',()=>{
 const l=data.find('CE','Paramoti'),common=solar.calculate(2.4,l,2025),leap=solar.calculate(2.4,l,2024);
 assert.equal(common.monthly[1].days,28);assert.equal(leap.monthly[1].days,29);
 assert.equal(leap.monthly[1].kwh-common.monthly[1].kwh,2.4*l.hsp.fev*0.75);
});
test('cidade inexistente ou UF diferente sem fallback',()=>{
 assert.equal(data.find('CE','Fortaleza'),null);
 assert.equal(data.find('PI','Canindé'),null);
 assert.equal(solar.calculate(2.4,null,2025),null);
});
test('dados ausentes retornam null, nunca inventa HSP',()=>{
 const bad={name:'X',uf:'CE',hsp:{jan:5.2}};
 assert.equal(solar.calculate(2.4,bad,2025),null);
 assert.equal(solar.calculate(0,data.find('CE','Canindé'),2025),null);
});
test('normalização de acentos no nome da cidade',()=>{
 assert.equal(data.find('ce','Caninde').name,'Canindé');
});
test('referência determinística de janeiro e média por ano civil',()=>{
 const loc=data.find('CE','Canindé'),r=solar.calculate(2.4,loc,2025);
 assert.ok(Math.abs(r.monthly[0].kwh-286.812)<1e-9);
 assert.ok(Math.abs(r.annualKwh-3703.0068)<1e-7);
});
