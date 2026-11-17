'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('cliente-dev.js','utf8');
const css=fs.readFileSync('cliente-dev.css','utf8');
const html=fs.readFileSync('cliente-dev.html','utf8');
const core=require('../cliente-core.js');

const card=js.slice(js.indexOf('function renderProducts(){'),js.indexOf('function showToast('));
test('cards de kits usam somente dados reais e identidade por SKU',()=>{
 assert.match(card,/C\.matchingKits\(available\(\),S\.target\)/);
 assert.match(card,/const x=p\.payload\|\|\{\}/);
 assert.match(card,/const kwp=C\.kitKwp\(p\)/);
 assert.match(card,/const monthly=C\.estimatedGeneration\(p\)/);
 assert.match(card,/const band=Number\(x\.faixaGeracaoKwh\)/);
 assert.match(card,/card\.dataset\.productId=p\.id/);
 assert.match(card,/SKU: '\+p\.id/);
 assert.match(card,/Kit Solar '\+decimal\(kwp\)\+' kWp'/);
 assert.match(card,/Kit solar '\+number\(advertised\)\+' kWh\/mês'/);
 assert.doesNotMatch(card,/Geração média de '\+number\(advertised\)/);
 assert.match(card,/label:'MÉDIA MENSAL',value:number\(Math\.round\(monthly\|\|0\)\)\+' kWh\/mês\*'/);
 assert.match(card,/Math\.round\(monthly\|\|0\)/);
});
test('modelo aprovado tem faixas visualmente separadas e ícones vetoriais',()=>{
 for(const name of [
  'ww-kit-card-v2','ww-kit-chip','ww-kit-quote','ww-kit-freight','ww-kit-stats',
  'ww-kit-stat','ww-kit-price','ww-kit-cta','ww-kit-disclaimer'
 ])assert.ok(card.includes(name),name);
 for(const name of ['truck','power','chart','info'])
   assert.ok(js.includes("wwKitIcon('"+name+"')")||js.includes("icon:'"+name+"'"),name);
 assert.match(card,/Frete incluso para Canindé\/CE/);
 assert.match(card,/Outras cidades sob consulta/);
 assert.match(card,/POTÊNCIA INSTALADA/);
 assert.match(card,/MÉDIA MENSAL/);
 assert.match(card,/Consulte detalhes e condições após entrar\./);
 assert.match(card,/Estimativa de geração\. Equipamentos, compatibilidade e instalação sujeitos à validação técnica/);
 assert.match(card,/condições climáticas de cada mês\./);
});
test('preço e ações originais de login e carrinho são preservados',()=>{
 assert.match(card,/euro\(p\.price\)/);
 assert.match(card,/Ver Detalhes do Kit →/);
 assert.match(card,/if\(!S\.user\)\{requestLoginFor\(p\.id\);return;\}/);
 assert.match(card,/btn\('Adicionar à cotação \+',\(\)=>add\(p\.id\)/);
 assert.match(card,/detailPanel\.hidden=!expanded/);
 assert.match(js,/function add\(id\)/);
 assert.match(js,/function requestLoginFor\(id\)/);
 assert.match(js,/function checkout\(\)/);
 assert.match(js,/wwsolar-quote/);
 assert.match(js,/wwsolar_public_catalog/);
 assert.ok(!card.includes('document.write'));
 assert.ok(!card.includes("innerHTML="));
});
test('média e preço do kit de referência sem modificar cálculos originais',()=>{
 const sample={
   id:'FOTUS-3600-DEYE-3',kind:'kit',title:'Kit solar 450 kWh/mês · 3,60 kWp',
   price:8260.98,active:true,approved:true,payload:{
     potenciaKwp:3.6,faixaGeracaoKwh:450,geracaoMensalKwh:460.8,freteInclusoParaCaninde:true
   }
 };
 assert.equal(core.kitKwp(sample),3.6);
 assert.equal(Math.round(core.estimatedGeneration(sample)),461);
 assert.equal(sample.payload.faixaGeracaoKwh,450);
 assert.equal(core.money(sample.price),'R$ 8.260,98');
});
test('estilos seguem o card aprovado e permanecem isolados do restante do site',()=>{
 assert.match(css,/#client-app #client-product-grid \.ww-kit-card-v2/);
 assert.match(css,/\.ww-kit-card-v2:before\{[\s\S]*?linear-gradient\(90deg,#D73700 0%,#FA4100 55%,#FF8A4D 100%\)/);
 assert.match(css,/#client-app #client-product-grid \.ww-kit-quote/);
 assert.match(css,/background:#81F002;color:#183400/);
 assert.match(css,/background:#FFFFFF;border:1px solid #e4e9dc/);
 assert.match(css,/background:#f3ffe8/);
 assert.match(css,/background:#ff6631;color:#17241a/);
 assert.match(css,/color:#FA4100;font-size:14px/);
 assert.match(css,/#client-product-grid \.ww-kit-stats/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/#client-product-grid \.ww-kit-price/);
 assert.match(css,/#client-app #client-product-grid \.ww-kit-cta/);
 assert.match(css,/background:#FA4100;color:#17241a/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(html,/cliente-dev\.css\?v=20261117-cards-paleta-v3/);
 assert.match(html,/cliente-dev\.js\?v=20261117-cards-modelo-v2/);
});
