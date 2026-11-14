'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const solar=require('../solarimetria-core.js'),data=require('../solarimetria-data.js');
const months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
// FIXTURES SINTÉTICAS EXCLUSIVAS PARA TESTES: NÃO SÃO DADOS SOLARIMÉTRICOS REAIS.
function synthetic(name,base){return {name,uf:'CE',hsp:Object.fromEntries(months.map((m,i)=>[m,base+i*.02]))};}
for(const city of ['Canindé','Caridade','Paramoti']){
 test(city+' (fixture sintética): meses, anual e média anual/12',()=>{
   const loc=synthetic(city,4.0);
   const result=solar.calculate(2.4,loc,2026);
   assert.equal(result.monthly.length,12);
   for(let i=0;i<12;i++)assert.equal(result.monthly[i].kwh,2.4*loc.hsp[months[i]]*result.monthly[i].days*0.75);
   assert.ok(Math.abs(result.annualKwh-result.monthly.reduce((s,v)=>s+v.kwh,0))<1e-9);
   assert.equal(result.averageMonthlyKwh,result.annualKwh/12);
 });
}
test('fevereiro: 28 e 29 dias, respeitando o calendário',()=>{
 const loc=synthetic('Local teste',4.0);
 const a=solar.calculate(2.4,loc,2026),b=solar.calculate(2.4,loc,2024);
 assert.equal(a.monthly[1].days,28);assert.equal(b.monthly[1].days,29);
 assert.equal(b.monthly[1].kwh-a.monthly[1].kwh,2.4*loc.hsp.fev*.75);
});
test('sem dados reais ou município cadastrado: sem estimativa',()=>{
 for(const city of ['Canindé','Caridade','Paramoti'])assert.equal(data.find('CE',city),null);
 assert.equal(data.find('CE','Fortaleza'),null);assert.equal(data.find('PI','Canindé'),null);
 assert.equal(solar.calculate(2.4,null,2026),null);
});
test('meses incompletos e potência inválida nunca geram valores fictícios',()=>{
 assert.equal(solar.calculate(2.4,{hsp:{jan:5}},2026),null);
 assert.equal(solar.calculate(0,synthetic('teste',4.0),2026),null);
});
test('nomes e UF preparados para expansão da base',()=>{
 assert.deepEqual(data.cities.map(c=>c.name),['Canindé','Caridade','Paramoti']);
 assert.equal(data.months.length,12);
});


test('fixtures de demonstração são explicitamente sintéticas, três municípios e doze meses',()=>{
 const demo=require('../solarimetria-demo.js');
 assert.equal(demo.synthetic,true);
 for(const city of ['Canindé','Caridade','Paramoti']){
   const loc=demo.find('CE',city);
   assert.equal(loc.demo,true);
   assert.match(loc.source,/SINTÉTICOS/);
   assert.equal(Object.keys(loc.hsp).length,12);
   const estimate=solar.calculate(2.4,loc,2026);
   assert.equal(estimate.monthly.length,12);
   assert.equal(estimate.averageMonthlyKwh,estimate.annualKwh/12);
 }
 assert.equal(demo.find('CE','Fortaleza'),null);
 assert.equal(demo.find('PI','Canindé'),null);
});
