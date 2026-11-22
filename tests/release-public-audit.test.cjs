'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const js=fs.readFileSync('cliente-dev.js','utf8');
const html=fs.readFileSync('cliente-dev.html','utf8');
const config=fs.readFileSync('cliente-dev-config.js','utf8');
const admin=fs.readFileSync('admin-dev.js','utf8');
test('publicação controlada: flag explícita e domínios permitidos',()=>{
 assert.match(config,/publicQuoteEnabled:\s*true/);
 const guest=js.split('\n').find(x=>x.includes('const GUEST_QUOTE_MODE='));
 assert.match(guest,/cfg\.publicQuoteEnabled===true/);
 assert.ok(guest.includes('catalogo'));
 assert.match(guest,/ww-solar-composicao-dev/);
 assert.ok(!guest.includes('ww-solar\\.pages\\.dev'));
});
test('catálogo público mínimo e falha fechada',()=>{
 assert.match(js,/S\.db\.rpc\('wwsolar_public_catalog_v2'\)/);
 assert.match(js,/if\(!PREVIEW_HOST\)throw error/);
 assert.match(html,/id="client-startup-error" role="alert" hidden/);
 assert.match(html,/id="client-entry" hidden/);
});
test('checkout público confirma cotação sem registrar, com validade e preço reconsultados',()=>{
 const code=js.slice(js.indexOf('async function checkoutGuest'),js.indexOf('async function checkout(){'));
 assert.match(code,/enrichDevKitDetails\(await readPublicCatalog\(\)\)/);
 assert.match(code,/C\.sumCart\(S\.lines,latest\)/);
 assert.match(code,/sum\.cents!==previous\.cents/);
 assert.match(code,/if\(expired\(\)\)throw Error/);
 assert.match(code,/const quoteState=JSON\.stringify/);
 assert.match(code,/!==quoteState/);
 assert.match(code,/C\.linkedProjectNote\(S\.lines,latest\)/);
 assert.match(code,/const whatsappUrl='https:\/\/wa\.me\/'/);
 assert.match(code,/window\.location\.assign\(whatsappUrl\)/);
 assert.doesNotMatch(code,/\.insert\(|\.upsert\(|\.delete\(/);
});
test('admin permanece restrito com vendas fechadas e composição privada',()=>{
 assert.match(admin,/app_metadata\?\.wwsolar_role!=='admin'/);
 assert.match(admin,/wwsolar_manual_sales_dev/);
 assert.match(admin,/wwsolar_builder_costs/);
 assert.doesNotMatch(admin,/wwsolar-create-customer/);
});
