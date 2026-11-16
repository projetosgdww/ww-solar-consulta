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
 assert.ok(client.includes("card.append(el('small',kitVariantLabel(p),'client-muted'))"));
 assert.ok(client.includes("label.append(el('small',kitVariantLabel(selectedProduct),'client-muted'))"));
 assert.ok(client.includes("x.qty+' × '+x.title+variant"));
});
test('prévia permanece simulação sem gravação; domínio oficial não é tratado como preview',()=>{
 assert.ok(client.includes("^[a-z0-9]{8}\\.ww-solar\\.pages\\.dev$"));
 assert.ok(client.includes('Nenhum pedido foi registrado ou enviado ao WhatsApp.'));
 assert.ok(preview.includes('if(payload.action!=="validate")'));
 assert.ok(!preview.includes('.insert('));
 assert.ok(html.includes('cliente-dev.js?v=20261116-checkout-comercial-rc1'));
});
