'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../consumo-core.js');
const html=fs.readFileSync('cliente-dev.html','utf8');
const js=fs.readFileSync('consumo-ui.js','utf8');
const css=fs.readFileSync('cliente-dev.css','utf8');
const build=fs.readFileSync('scripts/build-cliente-dev.mjs','utf8');
test('calcula kWh por mês com 30/7 dias médios, quantidade e potência',()=>{
 assert.ok(Math.abs(C.calculate({watts:100,quantity:2,hours:5,days:7})-30)<1e-9);
 assert.ok(Math.abs(C.calculate({watts:200,quantity:1,hours:8,days:5})-34.2857142857)<1e-8);
 assert.equal(C.total([{kwh:30},{kwh:34.285714285714285}]),64.28571428571428);
});
test('não aceita potência, quantidade ou uso impossíveis',()=>{
 for(const data of [{watts:0,quantity:1,hours:5,days:7},{watts:100,quantity:0,hours:5,days:7},{watts:100,quantity:1,hours:25,days:7},{watts:100,quantity:1,hours:5,days:8},{watts:100,quantity:1.2,hours:5,days:7},{watts:Infinity,quantity:1,hours:5,days:7}])assert.equal(C.calculate(data),null);
});
test('opções são referências ilustrativas e podem ser alteradas',()=>{
 assert.ok(C.appliances.length>=25);
 assert.ok(C.appliances.some(x=>x.id==='outro'));
 assert.match(html,/Referências médias de uma/);
 assert.match(html,/refrigeradores e ar-condicionado/);
 assert.match(html,/não valores exatos dos aparelhos vendidos hoje/);
});
test('V1 fica no menu do catálogo, não exige login ou altera pedidos',()=>{
 assert.match(html,/id="client-consumo-link"/);
 assert.match(html,/href="#consumo"/);
 assert.match(html,/id="ww-consumo-form"/);
 assert.match(html,/id="ww-consumo-total"/);
 assert.match(html,/consumo-core\.js\?v=20261117-consumo-v2/);
 assert.match(html,/consumo-ui\.js\?v=20261117-consumo-v2/);
 assert.match(js,/navigator\.clipboard\.writeText/);
 assert.doesNotMatch(js,/supabase|wwsolar_carts|localStorage|fetch\(/i);
 assert.match(css,/#consumo \.ww-consumo-card/);
 assert.match(build,/'consumo-core\.js','consumo-ui\.js'/);
});

test('V2: referências históricas identificadas e consumo de compressor sem 24h × W',()=>{
 assert.equal(C.appliances.find(x=>x.id==='ventilador').watts,65);
 assert.equal(C.appliances.find(x=>x.id==='microondas').watts,1200);
 assert.equal(C.appliances.find(x=>x.id==='chuveiro').watts,3500);
 const fridge=C.appliances.find(x=>x.id==='geladeira-1');
 assert.equal(fridge.mode,'monthly');assert.equal(fridge.monthlyKwh,30);
 assert.equal(C.calculateMonthly({monthlyKwh:fridge.monthlyKwh,quantity:2}),60);
 assert.equal(C.calculateMonthly({monthlyKwh:0,quantity:1}),null);
 assert.equal(C.calculateMonthly({monthlyKwh:50,quantity:1.2}),null);
 assert.match(html,/pbe\.inmetro\.gov\.br/);
 assert.match(js,/monthlyRow\.hidden=!isMonthly/);
 assert.match(js,/timeRows\.hidden=isMonthly/);
 assert.match(js,/details\.open=false/);
});
