'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const client=fs.readFileSync('cliente-dev.js','utf8');
const server=fs.readFileSync('supabase/functions/wwsolar-quote/index.ts','utf8');
const helper=fs.readFileSync('supabase/functions/wwsolar-quote/quote-links.mjs','utf8');
const preview=fs.readFileSync('supabase/functions/wwsolar-quote-preview/index.ts','utf8');
const html=fs.readFileSync('cliente-dev.html','utf8');

test('candidato comercial não contém botões, permissões ou funções de piloto',()=>{
 for(const source of [client,server]){
   assert.doesNotMatch(source,/PILOT_HOST|wwsolar-quote-pilot|pilot_confirmation|REGISTRAR_TESTE_DEV|pilot_dev/);
 }
 assert.ok(client.includes("const quoteFunction=PREVIEW_HOST?'wwsolar-quote-preview':'wwsolar-quote';"));
 assert.ok(client.includes("action:PREVIEW_HOST?'validate':'submit'"));
 assert.ok(server.includes('if(payload.action==="status")'));
 assert.ok(server.includes('if(!isAdmin)return result(403,{error:"admin_only"}'));
});
test('cliente bloqueia checkout até capacidades v2, idempotência e confirmação do snapshot',()=>{
 const cap=client.indexOf("body:{action:'capabilities'}");
 const submit=client.indexOf("action:PREVIEW_HOST?'validate':'submit'");
 const redirect=client.indexOf("window.location.assign('https://wa.me/'");
 assert.ok(cap>=0&&submit>cap&&redirect>submit);
 for(const expected of [
  'capabilities?.quote_version!==2',
  'capabilities?.project_link_snapshots!==true',
  'capabilities?.idempotent_request_key!==true',
  'Number(data.order.total_cents)!==current.cents',
  '!C.quoteSnapshotMatches(S.lines,data.order.items)',
  'const message=String(data.message)',
  'if(message.length>4000)'
 ])assert.ok(client.includes(expected),expected);
 assert.ok(client.includes('O pedido foi registrado, mas o resumo recebido não corresponde ao carrinho.'));
});
test('erro de rede não afirma falsamente ausência de registro e orienta consultar histórico',()=>{
 assert.doesNotMatch(client,/Nenhum pedido confirmado; tente novamente/);
 assert.ok(client.includes('Confira o histórico antes de repetir a cotação'));
 assert.ok(client.includes('Consulte o histórico antes de tentar de novo.'));
});
test('backend mantém controles de acesso, catálogo, associação e idempotência comprovados no DEV',()=>{
 for(const expected of [
 'admin.auth.getUser(auth.slice(7).trim())',
 'user.app_metadata?.wwsolar_password_change_required===true',
 'user.app_metadata?.wwsolar_role==="admin"',
 'if(payload.action==="capabilities")',
 'idempotent_request_key:true',
 'verifyProjectAssociations(lines,products)',
 'if(total!==expectedTotal)',
 'projectAssociationNotes(order.items)',
 'items,total_cents:total,status:"registrado"',
 'if(saveError.code==="23505")',
 'if(already)return result(200,{quote_version:2,order:already',
 'return result(201,{quote_version:2,order:saved'
 ])assert.ok(server.includes(expected),expected);
 assert.match(helper,/project_tier_mismatch/);
 assert.ok(!preview.includes('.insert('));
 assert.ok(!preview.includes('.update('));
});
test('inversor e SKU distinguem kits da mesma potência sem alterar os preços',()=>{
 const found=client.match(/function kitVariantLabel\(kit\)\{[\s\S]*?\n  \}/);
 assert.ok(found);
 const label=vm.runInNewContext('('+found[0]+')');
 const a={kind:'kit',id:'FOTUS-4200-DEYE-3',payload:{inversor:'Deye 3 kW'},price:9036.08};
 const b={kind:'kit',id:'FOTUS-4200-DEYE-5',payload:{inversor:'Deye 5 kW'},price:9354.50};
 assert.match(label(a),/Deye 3 kW.*FOTUS-4200-DEYE-3/);
 assert.match(label(b),/Deye 5 kW.*FOTUS-4200-DEYE-5/);
 assert.equal(a.price,9036.08);assert.equal(b.price,9354.50);
 assert.ok(client.includes("['Identificação técnica',kitVariantLabel(p)]"));
 assert.ok(client.includes("label.append(el('div',kitVariantLabel(selectedProduct),'client-muted'))"));
 assert.ok(client.includes("x.qty+' × '+x.title+variant"));
});
test('prévia permanece simulação sem gravação; domínio oficial não é tratado como preview',()=>{
 assert.ok(client.includes("^[a-z0-9]{8}\\.ww-solar\\.pages\\.dev$"));
 assert.ok(client.includes('Nenhum pedido foi registrado ou enviado ao WhatsApp.'));
 assert.ok(preview.includes('if(payload.action!=="validate")'));
 assert.ok(!preview.includes('.insert('));
 assert.ok(html.includes('cliente-dev.js?v=20261117-pwa-auto-update-v1'));
});

test('snapshot rejeita vínculo desviado, quantidade adulterada e projeto avulso indevido',()=>{
 const C=require('../cliente-core.js');
 const lines=[
  {id:'FOTUS-3600-DEYE-3',qty:1},
  {id:'FOTUS-4200-DEYE-3',qty:1},
  {id:'PRJ-B-010',qty:1,standaloneQty:0,linkedKits:['FOTUS-4200-DEYE-3']}
 ];
 const items=[
  {sku:'FOTUS-3600-DEYE-3',qty:1,subtotal_cents:826098},
  {sku:'FOTUS-4200-DEYE-3',qty:1,subtotal_cents:903608},
  {sku:'PRJ-B-010',qty:1,subtotal_cents:40000,linked_kits:[{sku:'FOTUS-4200-DEYE-3',title:'Kit 500'}],standalone_qty:0}
 ];
 const clone=()=>JSON.parse(JSON.stringify(items));
 assert.equal(C.quoteSnapshotMatches(lines,items),true);
 const wrong=clone();wrong[2].linked_kits=[{sku:'FOTUS-3600-DEYE-3',title:'Kit 450'}];
 assert.equal(C.quoteSnapshotMatches(lines,wrong),false);
 const missing=clone();delete missing[2].linked_kits;
 assert.equal(C.quoteSnapshotMatches(lines,missing),false);
 const standalone=clone();standalone[2].standalone_qty=1;
 assert.equal(C.quoteSnapshotMatches(lines,standalone),false);
 const qty=clone();qty[1].qty=2;
 assert.equal(C.quoteSnapshotMatches(lines,qty),false);
 const duplicate=clone();duplicate[1].sku='FOTUS-3600-DEYE-3';
 assert.equal(C.quoteSnapshotMatches(lines,duplicate),false);
});
test('origem pública é somente leitura e não permite uso de função piloto no cliente comercial',()=>{
 assert.ok(preview.includes('if(payload.action!=="validate")'));
 assert.ok(!preview.includes('.insert('));
 assert.ok(!preview.includes('.delete('));
 assert.ok(!preview.includes('.update('));
 assert.ok(client.includes("const PREVIEW_HOST="));
 assert.ok(client.includes("const quoteFunction=PREVIEW_HOST?'wwsolar-quote-preview':'wwsolar-quote';"));
 assert.doesNotMatch(client,/wwsolar-quote-pilot|REGISTRAR_TESTE_DEV/);
});

test('WhatsApp só abre após registro confirmado e usa texto do servidor e telefone configurado',()=>{
 const cfg=fs.readFileSync('cliente-dev-config.js','utf8');
 assert.match(cfg,/whatsapp:\s*"5585992723637"/);
 assert.match(cfg,/projectWhatsapp:\s*"5585991170375"/);
 const primary='5585992723637',project='5585991170375';
 assert.match(primary,/^55[0-9]{10,11}$/);
 assert.match(project,/^55[0-9]{10,11}$/);
 const redirect=client.indexOf("window.location.assign('https://wa.me/'");
 const snapshot=client.indexOf('!C.quoteSnapshotMatches(S.lines,data.order.items)',client.indexOf("async function checkout()"));
 const confirmed=client.indexOf('Number(data.order.total_cents)!==current.cents',client.indexOf("async function checkout()"));
 assert.ok(snapshot>0&&confirmed>0&&redirect>snapshot&&redirect>confirmed);
 assert.ok(client.includes('const message=String(data.message)'));
 assert.ok(client.includes('encodeURIComponent(message)'));
 assert.ok(client.includes("const destination=hasProject&&/^55[0-9]{10,11}$/.test(cfg.projectWhatsapp||'')?cfg.projectWhatsapp:cfg.whatsapp;"));
 assert.ok(client.includes("window.location.assign('https://wa.me/'+destination+'?text='+encodeURIComponent(message))"));
 assert.doesNotMatch(client,/https:\/\/api\.whatsapp\.com\/send\?phone=|fetch\(['"]https:\/\/wa\.me/);
});
test('build comercial usa RPC ao vivo e não copia snapshot DEV para release',()=>{
 const build=fs.readFileSync('scripts/build-cliente-dev.mjs','utf8');
 assert.ok(build.includes("if(process.env.CF_PAGES_BRANCH==='feat/vitrine-publica-controlada-v1')"));
 assert.ok(build.includes('dados/vitrine-preview.json'));
 assert.ok(!build.includes("CF_PAGES_BRANCH==='release/wwsolar-pecas-v1'"));
 assert.ok(client.includes('wwsolar_public_catalog'));
 assert.ok(client.includes('const PREVIEW_HOST='));
});
test('backend V2 preserva atualização de status e histórico administrativo',()=>{
 assert.ok(server.includes('if(payload.action==="status")'));
 assert.ok(server.includes('if(!isAdmin)return result(403,{error:"admin_only"}'));
 assert.ok(server.includes('status_updated_by:user.id'));
 assert.ok(server.includes('if(!changed)return result(409,{error:"concurrent_update"}'));
 assert.ok(server.includes('quote_version:2,order:already'));
 assert.ok(server.includes('quote_version:2,order:saved'));
});
