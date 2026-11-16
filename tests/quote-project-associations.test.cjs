'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const helper=pathToFileURL(path.resolve('supabase/functions/wwsolar-quote/quote-links.mjs')).href;
const server=fs.readFileSync('supabase/functions/wwsolar-quote/index.ts','utf8');
const admin=fs.readFileSync('admin-dev.js','utf8');
const client=fs.readFileSync('cliente-dev.js','utf8');
const kit=(id,kwp,title=id)=>({id,kind:'kit',title,price:10139.23,payload:{potenciaKwp:kwp}});
const project=(id)=>({id,kind:'piece',title:id,price:400,payload:{categoria:'projetos'}});
const a=kit('FOTUS-A',4.2,'Kit A'),b=kit('FOTUS-B',4.2,'Kit B'),p=project('PRJ-B-010');
const catalog=[a,b,p];
const base=[{id:a.id,qty:1},{id:b.id,qty:1}];
test('backend reconhece projeto vinculado só ao primeiro kit, sem atribuir ao segundo',async()=>{
 const {verifyProjectAssociations,projectAssociationNotes}=await import(helper);
 const cart=[...base,{id:'PRJ-B-010',qty:1,standaloneQty:0,linkedKits:[a.id]}];
 const association=verifyProjectAssociations(cart,catalog).get(p.id);
 assert.equal(association.linked_kits.length,1);
 assert.equal(association.linked_kits[0].sku,a.id);
 assert.equal(association.standalone_qty,0);
 const items=[{sku:a.id,title:a.title,qty:1},{sku:b.id,title:b.title,qty:1},{sku:p.id,title:p.title,qty:1,...association}];
 const note=projectAssociationNotes(items);
 assert.match(note,/FOTUS-A/);
 assert.doesNotMatch(note,/FOTUS-B/);
 assert.match(note,/TRT não inclusa/);
});
test('backend aceita projeto nos dois kits e avulso, com quantidades independentes',async()=>{
 const {verifyProjectAssociations,projectAssociationNotes}=await import(helper);
 const cart=[...base,{id:p.id,qty:3,standaloneQty:1,linkedKits:[a.id,b.id]}];
 const item=verifyProjectAssociations(cart,catalog).get(p.id);
 assert.deepEqual(item.linked_kits.map(x=>x.sku),[a.id,b.id]);
 assert.equal(item.standalone_qty,1);
 const note=projectAssociationNotes([{sku:p.id,qty:3,...item}]);
 assert.match(note,/FOTUS-A/);assert.match(note,/FOTUS-B/);
 assert.match(note,/1 projeto\(s\) avulso\(s\)/);
});
test('legado e projeto avulso continuam aceitos sem inventar associação',async()=>{
 const {verifyProjectAssociations,projectAssociationNotes}=await import(helper);
 const cart=[...base,{id:p.id,qty:1}];
 assert.equal(verifyProjectAssociations(cart,catalog).size,0);
 assert.equal(projectAssociationNotes([{sku:p.id,qty:1,title:'Projeto'}]),'');
});
test('backend rejeita associação inventada, duplicada, faixa errada e quantidades adulteradas',async()=>{
 const {verifyProjectAssociations}=await import(helper);
 const invalid=[
  [{id:p.id,qty:1,standaloneQty:0,linkedKits:['FOTUS-FAKE']}],
  [{id:p.id,qty:1,standaloneQty:0,linkedKits:[a.id,b.id]}],
  [{id:p.id,qty:1,standaloneQty:1,linkedKits:[a.id]}],
  [{id:p.id,qty:2,standaloneQty:0,linkedKits:[a.id,a.id]}],
  [{id:p.id,qty:1,standaloneQty:0,linkedKits:[a.id]}],
 ];
 assert.throws(()=>verifyProjectAssociations([...base,...invalid[0]],catalog));
 assert.throws(()=>verifyProjectAssociations([...base,...invalid[1]],catalog));
 assert.throws(()=>verifyProjectAssociations([...base,...invalid[2]],catalog));
 assert.throws(()=>verifyProjectAssociations([...base,...invalid[3]],catalog));
 const mismatched=project('PRJ-B-020');
 assert.throws(()=>verifyProjectAssociations([...base,{id:mismatched.id,qty:1,standaloneQty:0,linkedKits:[a.id]}],[...catalog,mismatched]));
 assert.throws(()=>verifyProjectAssociations([...base,{id:a.id,qty:1,standaloneQty:0,linkedKits:[]}],catalog));
});
test('backend persiste associação validada em items JSONB, usa mesmos itens na mensagem, mantém idempotência',()=>{
 for(const fragment of [
  'verifyProjectAssociations(lines,products)',
  'const association=projectLinks.get(l.id)',
  '...(association?association:{})',
  'projectAssociationNotes(order.items)',
  'if(already)return result(200,{quote_version:2,order:already,message:messageFor(already),existing:true},origin)',
  'items,total_cents:total,status:"registrado"',
  'if(total!==expectedTotal)'
 ])assert.ok(server.includes(fragment),fragment);
});
test('histórico exibe nomes dos kits vinculados sem presumir associação por faixa',()=>{
 assert.ok(admin.includes("Array.isArray(x.linked_kits)"));
 assert.ok(admin.includes('Projeto elétrico vinculado a:'));
 assert.ok(client.includes('C.quoteSnapshotMatches(S.lines,data.order.items)'));
});

test('Edge Function preview aceita apenas validação autenticada e não grava pedidos',()=>{
 const preview=fs.readFileSync('supabase/functions/wwsolar-quote-preview/index.ts','utf8');
 assert.ok(preview.includes('if(payload.action!=="validate")'));
 assert.ok(preview.includes('preview_only_validate'));
 assert.ok(preview.includes('validated:true,preview_only:true'));
 assert.ok(preview.includes('verifyProjectAssociations(lines,products)'));
 assert.ok(preview.includes('projectAssociationNotes(order.items)'));
 assert.ok(!preview.includes('.insert('));
 assert.ok(!preview.includes('.update('));
 assert.ok(!preview.includes('.delete('));
 assert.ok(!preview.includes('https://catalogo.wwplatform.com.br'));
 assert.ok(!preview.includes('https://ww-solar.pages.dev'));
 assert.ok(preview.includes('previewOrigin.test(origin)'));
});
test('frontend DEV exige vínculo registrado na simulação e não abre WhatsApp',()=>{
 assert.ok(client.includes("action:PREVIEW_HOST?'validate':'submit'"));
 assert.ok(client.includes("if(PREVIEW_HOST&&!error&&data?.validated===true"));
 assert.ok(client.includes('Simulação DEV aprovada.'));
 assert.ok(client.includes('Nenhum pedido foi registrado ou enviado ao WhatsApp.'));
});

test('backend exige capacidade v2 antes do submit e devolve versão em resposta',()=>{
 assert.ok(server.includes('if(payload.action==="capabilities")'));
 assert.ok(server.includes('project_link_snapshots:true'));
 assert.ok(server.includes('quote_version:2,order:saved'));
 assert.ok(server.includes('quote_version:2,order:already'));
 assert.ok(client.includes("body:{action:'capabilities'}"));
 assert.ok(client.includes('capabilities?.quote_version!==2'));
 assert.ok(client.includes('capabilities?.project_link_snapshots!==true'));
 const guard=client.indexOf("body:{action:'capabilities'}");
 const submit=client.indexOf("action:PREVIEW_HOST?'validate':'submit'");
 assert.ok(guard>0&&submit>guard);
});
test('backend antigo impede submit real sem registrar pedido incompleto',()=>{
 assert.ok(client.includes('if(!PREVIEW_HOST){'));
 assert.ok(client.includes('Sistema de pedidos aguardando atualização.'));
 assert.ok(client.includes('!C.quoteSnapshotMatches(S.lines,data.order.items)'));
 assert.ok(!client.includes('C.linkedProjectNote(S.lines,available())'));
 assert.ok(client.includes('const message=String(data.message)'));
});
test('número WhatsApp de projetos aceita somente dígitos e mantém separação comercial',()=>{
 assert.ok(client.includes('/^55[0-9]{10,11}$/.test(cfg.projectWhatsapp'));
 assert.ok(!client.includes('^55'+String.fromCharCode(92,92)+'d'));
});
