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
 assert.ok(C.appliances.length>=10);
 assert.ok(C.appliances.some(x=>x.id==='outro'));
 assert.match(html,/Potências iniciais ilustrativas e ajustáveis/);
 assert.match(html,/Geladeira, freezer e ar-condicionado têm consumo variável/);
 assert.match(html,/não retiradas de uma tabela oficial/);
});
test('V1 fica no menu do catálogo, não exige login ou altera pedidos',()=>{
 assert.match(html,/id="client-consumo-link"/);
 assert.match(html,/href="#consumo"/);
 assert.match(html,/id="ww-consumo-form"/);
 assert.match(html,/id="ww-consumo-total"/);
 assert.match(html,/consumo-core\.js\?v=20261117-consumo-v1/);
 assert.match(html,/consumo-ui\.js\?v=20261117-consumo-v1/);
 assert.match(js,/navigator\.clipboard\.writeText/);
 assert.doesNotMatch(js,/supabase|wwsolar_carts|localStorage|fetch\(/i);
 assert.match(css,/#consumo \.ww-consumo-card/);
 assert.match(build,/'consumo-core\.js','consumo-ui\.js'/);
});
