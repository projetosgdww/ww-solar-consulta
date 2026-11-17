'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../consumo-core.js');
const html=fs.readFileSync('cliente-dev.html','utf8');
const js=fs.readFileSync('consumo-ui.js','utf8');
const build=fs.readFileSync('scripts/build-cliente-dev.mjs','utf8');
test('potência média não é apresentada como fato; dados reais estão vinculados ao modelo',()=>{
 assert.ok(C.appliances.length>=35);
 const ids=C.appliances.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(!C.appliances.some(x=>/antig|hist[oó]ric/i.test(x.label)));
 assert.ok(!JSON.stringify(C.appliances).includes('Solucoes_Energeticas_para_a_Amazonia'));
 assert.equal(C.appliances.find(x=>x.id==='ventilador').watts,140);
 assert.equal(C.appliances.find(x=>x.id==='liquidificador').watts,550);
 assert.equal(C.appliances.find(x=>x.id==='airfryer').watts,1500);
 for(const x of C.appliances){
  if(x.manual){assert.equal(x.watts,undefined);assert.equal(x.monthlyKwh,undefined);}
  else if(x.basis==='estimativa'){assert.ok(x.watts>0);assert.ok(x.note);assert.equal(x.model,undefined);}
  else {assert.ok(x.model);assert.match(x.sourceUrl,/^https:\/\//);}
 }
});
test('mantém itens das imagens e os da V1 com duplicações mescladas',()=>{
 const must=['churrasqueira','chuveiro','pc-escritorio','pc-gamer','pc-extremo','notebook-comum','notebook-gamer','enceradeira','espremedor','exhaustor','ferro','fogao','forno','microondas','freezer','frigobar','geladeira','lavadora','liquidificador','lampada','monitor','multiprocessador','panela','prancha','sanduicheira','secador','televisao','ventilador','videogame','som','ar-9000','ar-12000','ar-18000','ar-24000','aspirador','batedeira','bomba','cafeteira','airfryer','outro'];
 for(const id of must)assert.ok(C.appliances.some(x=>x.id===id),id);
});
test('cálculos distintos para Watts, kWh por mês e kWh por ciclo',()=>{
 assert.equal(C.calculate({watts:100,quantity:2,hours:5,days:7}),30);
 assert.equal(C.calculateMonthly({monthlyKwh:31.3,quantity:2}),62.6);
 assert.ok(Math.abs(C.calculateCycles({cycleKwh:.43,cyclesPerWeek:3,quantity:1})-(.43*3*30/7))<1e-10);
 assert.equal(C.calculateCycles({cycleKwh:.43,cyclesPerWeek:0,quantity:1}),null);
 assert.equal(C.calculate({watts:0,quantity:1,hours:5,days:7}),null);
});
test('interface não inventa potência; sem login e sem alterar carrinho',()=>{
 assert.match(js,/details\.open=!!item\.manual/);
 assert.match(js,/Modelo específico ainda não verificado/);
 assert.match(js,/source\.append\(link\)/);
 assert.match(js,/calculateCycles/);
 assert.match(html,/id="ww-consumo-cycle-row"/);
 assert.match(html,/consumo-core\.js\?v=20261117-consumo-v3/);
 assert.match(html,/consumo-ui\.js\?v=20261117-consumo-v3/);
 assert.match(html,/fichas dos fabricantes/);
 assert.doesNotMatch(html,/tabela histórica do MME/);
 assert.doesNotMatch(js,/supabase|wwsolar_carts|localStorage|fetch\(/i);
 assert.match(build,/'consumo-core\.js','consumo-ui\.js'/);
});

test('PCs e notebooks têm wattagem fixa editável sem intervalos exibidos',()=>{
 const expected={'notebook-comum':50,'notebook-gamer':200,'pc-escritorio':225,'pc-gamer':550,'pc-extremo':950};
 for(const [id,watts] of Object.entries(expected)){
  const item=C.appliances.find(x=>x.id===id);
  assert.equal(item.watts,watts);assert.equal(item.basis,'estimativa');
  assert.equal(item.mode,'watts');
 }
 assert.ok(!C.appliances.some(x=>x.id==='computador-perifericos'));
 assert.equal(C.appliances.find(x=>x.id==='airfryer').label,'Air fryer');
});
test('condicionadores de ar referenciam modelos 2025 e potência elétrica em carga total',()=>{
 const models=[
 ['ar-9000',780,'ZICST9QF-02'],
 ['ar-12000',1172,'LCST12QF-02I'],
 ['ar-18000',1691,'LCS18F'],
 ['ar-24000',2197,'ZICST24QF-02']
 ];
 for(const [id,watts,model] of models){
  const item=C.appliances.find(x=>x.id===id);
  assert.equal(item.watts,watts);assert.match(item.model,new RegExp(model));
  assert.equal(item.basis,'inmetro');assert.equal(item.variable,true);
  assert.match(item.source,/31\/12\/2025/);assert.match(item.source,/carga total/);
 }
 assert.match(js,/Ar-condicionado inverter varia/);
});

test('sugestão utiliza catálogo real com geração igual ou superior, sem inventar produto',()=>{
 const catalog=require('../cliente-core.js');
 const kits=[
  {id:'KIT-300',kind:'kit',active:true,approved:true,price:4300,title:'Kit 300',payload:{potenciaKwp:2.4}},
  {id:'KIT-450',kind:'kit',active:true,approved:true,price:6200,title:'Kit 450',payload:{potenciaKwp:3.6}},
  {id:'KIT-INATIVO',kind:'kit',active:false,approved:true,price:100,title:'Inativo',payload:{potenciaKwp:3}},
 ];
 assert.equal(catalog.recommendedKit(kits,385)?.id,'KIT-450');
 assert.equal(catalog.recommendedKit(kits,900),null);
 assert.equal(catalog.estimatedGeneration(kits[1]),460.8);
 const app=fs.readFileSync('cliente-dev.js','utf8');
 assert.match(app,/wwsolar:consumo-recommend/);
 assert.match(app,/C\.recommendedKit\(products,target\)/);
 assert.match(app,/wwsolar:consumo-open-kit/);
 assert.match(app,/setTarget\(Math\.max\(300,Math\.min\(2200,kwh\)\)\)/);
 assert.match(js,/wwsolar:consumo-result/);
 assert.match(js,/wwsolar:consumo-open-kit/);
 assert.match(html,/id="ww-consumo-suggestion"/);
 assert.match(html,/id="ww-consumo-find-kit"/);
 assert.match(html,/Prévia comercial/);
 assert.match(js,/https:\/\/wa\.me\/5585992723637/);
 assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|wwsolar-quote/);
});
