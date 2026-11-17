'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../admin-composition-core.js');
const adminHtml=fs.readFileSync('admin-dev.html','utf8');
const adminJs=fs.readFileSync('admin-dev.js','utf8');
const adminCss=fs.readFileSync('admin-dev.css','utf8');
const build=fs.readFileSync('scripts/build-cliente-dev.mjs','utf8');
const records=[
{sku:'SOO-665572',title:'MÓDULO DMEGC BIFACIAL 625W',category:'modulos',unit_cost_cents:62500,module_wp:625,source_date:'2026-11-16'},
{sku:'SOO-657985',title:'INVERSOR SAJ MONO 10KW',category:'inversores',unit_cost_cents:286000},
{sku:'SOO-391005',title:'KIT FIXAÇÃO 4 MÓDULOS',category:'estruturas',unit_cost_cents:11990},
{sku:'SOO-525714',title:'PERFIL ALUMÍNIO 2,36M',category:'estruturas',unit_cost_cents:4500},
{sku:'SOO-97082',title:'CABO VERMELHO ROLO 25M',category:'cabos',unit_cost_cents:10000},
{sku:'SOO-97081',title:'CABO PRETO ROLO 25M',category:'cabos',unit_cost_cents:10000},
{sku:'SOO-440111',title:'CONECTOR SOLAR MC4 2 PARES',category:'componentes',unit_cost_cents:1000}
];
const items=core.normalizeCatalog(records);
const lines=records.map((r,i)=>({sku:r.sku,quantity:i===0||i===3?4:1}));
test('composição calcula exatamente custo unitário vezes quantidade',()=>{
 const c=core.composeRows(lines,items);
 assert.equal(c.rows.length,7);
 assert.equal(c.rows[0].subtotalCents,250000);
 assert.equal(c.rows[3].subtotalCents,18000);
 assert.equal(c.totalCents,586990);
 assert.equal(c.panels,4);
 assert.equal(c.powerWp,2500);
 assert.equal(core.money(c.totalCents),'R$ 5.869,90');
});
test('preços inválidos e quantidades quebradas não entram no total',()=>{
 const input=core.normalizeCatalog(records.concat([
 {sku:'SOO-FAKE',title:'Sem valor',category:'cabos',unit_cost_cents:0},
 {sku:'SOO-665572',title:'SKU duplicado',category:'modulos',unit_cost_cents:99999}
 ]));
 assert.equal(input.length,7);
 assert.equal(core.asQuantity('0'),0);
 assert.equal(core.asQuantity('1.5'),0);
 assert.equal(core.asQuantity('999'),999);
 assert.equal(core.asQuantity('1000'),0);
 const result=core.composeRows([{sku:'SOO-440111',quantity:2},{sku:'NAO-EXISTE',quantity:5},{sku:'SOO-97081',quantity:0}],items);
 assert.equal(result.totalCents,2000);
 assert.equal(result.rows[1].subtotalCents,0);
 assert.equal(result.rows[2].subtotalCents,0);
});
test('o resumo não publica kit nem divulga preços ausentes',()=>{
 const text=core.summary(lines,items);
 assert.match(text,/WW Solar — Composição interna de kit/);
 assert.match(text,/Custo total das peças: R\$\s*5\.869,90/);
 assert.match(text,/2,5 kWp/);
 assert.match(text,/Não publicada/);
 assert.equal(core.summary([{sku:'',quantity:1}],items),'');
});
test('somente administrador autenticado consulta a tabela privada sem modificar preços',()=>{
 assert.match(adminJs,/data\?\.user\?\.app_metadata\?\.wwsolar_role!=='admin'/);
 assert.match(adminJs,/if\(!ready\|\|!db\|\|!composeCore\(\)\)return/);
 assert.match(adminJs,/db\.from\('wwsolar_builder_costs'\)/);
 assert.match(adminJs,/\.select\('sku,title,category,unit_cost_cents,module_wp,source_date'\)/);
 assert.doesNotMatch(adminJs,/db\.from\('wwsolar_builder_costs'\)[\s\S]{0,250}\.(?:insert|update|upsert|delete)\(/);
 assert.doesNotMatch(adminHtml, /SOO-665572|SOO-657985|5869,90/);
 assert.doesNotMatch(adminHtml,/Editar custo|Cadastrar preço|Salvar custo/);
});
test('painel conserva seções anteriores e só acrescenta tabela simples para composição',()=>{
 for(const id of ['admin-tab-clients','admin-tab-orders','admin-tab-kits','admin-tab-composer','admin-clients-panel','admin-orders-panel','admin-kits-panel','admin-composer-panel','admin-compose-rows','admin-compose-total','admin-compose-add','admin-compose-copy','admin-compose-clear'])
 assert.ok(adminHtml.includes('id="'+id+'"'),id);
 assert.match(adminHtml,/CÓDIGO/);
 assert.match(adminHtml,/CATEGORIA/);
 assert.match(adminHtml,/DESCRIÇÃO DO PRODUTO/);
 assert.match(adminHtml,/VL UNITÁRIO/);
 assert.match(adminHtml,/VL TOTAL/);
 assert.match(adminHtml,/Composição interna para conferência/);
 assert.match(adminCss,/#FA4100/);
 assert.match(adminCss,/#81F002/);
 assert.match(adminCss, /overflow-x:auto/);
 assert.match(adminHtml, /admin-composition-core\.js\?v=20261117-composition-v1/);
 assert.match(build, /admin-composition-core\.js/);
});
