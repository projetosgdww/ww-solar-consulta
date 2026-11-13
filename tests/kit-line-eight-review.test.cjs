const test=require('node:test');
const assert=require('node:assert/strict');
const K=require('../kit-line-eight-review.js');
const priced={
 'PAV-044':775,'PAV-049':800,'PAV-034':999.88,'PAV-036':1624.88,
 'PAV-037':2249.88,'PAV-040':3162.18,'PAV-057':3874.88,
 'PAV-029':139.86,'PAV-024':63,'PAV-001':130,'PAV-002':130,
 'PAV-003':162.50,'PAV-004':162.50,'PAV-007':13
};
const products=Object.entries(priced).map(([id,price])=>({id,title:id,price,kind:'piece',active:true,approved:true}));
test('oito faixas padronizadas de 300 a 2000 kWh sem duplicidade',()=>{
 assert.deepEqual(K.specifications.map(x=>x.target),[300,500,800,1000,1200,1500,1800,2000]);
 assert.equal(new Set(K.specifications.map(x=>x.code)).size,8);
});
test('WW-300 tem 4 painéis, 4 perfis, 1 fixação e 25 m por cor, sem MC4 avulso',()=>{
 const q=K.compose(K.specifications[0],products);
 assert.deepEqual(q.rows.map(r=>[r.sku,r.quantity]),[
  ['PAV-044',4],['PAV-034',1],['PAV-029',1],['PAV-024',4],['PAV-001',1],['PAV-002',1]
 ]);
 assert.equal(q.generationKwhMonth,307.2);
 assert.equal(q.previewPrice,5464.5);
});
test('WW-500 escolhe SAJ 3 kW e mantém alerta de corrente',()=>{
 const q=K.compose(K.specifications[1],products);
 assert.equal(q.inverter,'PAV-036');
 assert.equal(q.panels,7);
 assert(q.engineeringPending.some(x=>x.includes('15,55 A')));
});
test('WW-800 e WW-1000 usam apenas SAJ 6 kW sem Deye',()=>{
 for(const code of ['WW-800','WW-1000']){
  const q=K.compose(K.specifications.find(x=>x.code===code),products);
  assert.equal(q.inverter,'PAV-037');
 }
});
test('WW-1200 usa SAJ 7,3 kW e três maiores têm aviso trifásico',()=>{
 assert.equal(K.specifications.find(x=>x.code==='WW-1200').inverter,'PAV-040');
 for(const code of ['WW-1500','WW-1800','WW-2000']){
  const q=K.compose(K.specifications.find(x=>x.code===code),products);
  assert.equal(q.inverter,'PAV-057');
  assert.equal(q.gridRequired,'trifasica_380');
 }
});
test('todos os oito permanecem bloqueados para venda e mantêm preço das peças +15%',()=>{
 for(const spec of K.specifications){
  const q=K.compose(spec,products);
  assert.equal(q.engineeringApproved,false);
  assert.equal(q.published,false);
  assert(q.previewPrice>0);
  assert.equal(q.pending.length,0);
  assert(q.engineeringPending.length>0);
  assert.equal(q.previewPrice,Math.round(Math.round(q.subtotal*100)*1.15)/100);
 }
});
