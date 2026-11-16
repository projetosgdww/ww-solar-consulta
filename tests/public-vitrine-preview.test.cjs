'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const data=JSON.parse(readFileSync('dados/vitrine-preview.json','utf8'));
const js=readFileSync('cliente-dev.js','utf8');
const html=readFileSync('cliente-dev.html','utf8');
const draft=readFileSync('supabase/drafts/20261116_wwsolar_public_catalog_rpc.sql','utf8');
test('snapshot público mostra somente 25 kits, 51 peças e 7 projetos ativos',()=>{
 assert.equal(data.previewOnly,true);
 assert.equal(data.items.length,83);
 assert.equal(data.items.filter(x=>x.kind==='kit').length,25);
 assert.equal(data.items.filter(x=>x.kind==='piece' && x.payload.categoria==='projetos').length,7);
 assert.equal(data.items.filter(x=>x.kind==='piece' && x.payload.categoria!=='projetos').length,51);
 assert.ok(data.items.every(x=>x.active===true&&x.approved===true&&Number(x.price)>0));
 assert.ok(data.items.every(x=>!x.id.startsWith('WW-')&&!x.id.startsWith('PRJ-WW-')));
 const known=data.items.find(x=>x.id==='FOTUS-3600-DEYE-3');
 assert.equal(Number(known.price),8260.98);
});
test('allowlist não exporta custos, dados de clientes nem payload interno',()=>{
 const publicKeys=new Set(['id','kind','title','price','payload','active','approved']);
 const kitKeys=new Set(['potenciaKwp','faixaGeracaoKwh','geracaoMensalKwh','freteInclusoParaCaninde','prazoEntregaDiasUteis','prazoAdicionalDiasUteis']);
 for(const item of data.items){
   assert.ok(Object.keys(item).every(k=>publicKeys.has(k)),item.id);
   const keys=Object.keys(item.payload||{});
   assert.ok(keys.every(k=>item.kind==='kit'?kitKeys.has(k):k==='categoria'),item.id);
 }
 assert.doesNotMatch(JSON.stringify(data),/service_role|custo[A-Za-z]*|fornecedor|email|user_id|origemKit|componentesIncluidos/i);
});
test('visitante não obtém carrinho, somente login sob demanda',()=>{
 assert.match(js,/async function showPublicCatalog\(\)/);
 assert.match(js,/if\(!S\.user\)\{requestLoginFor\(id\);return;\}/);
 assert.match(js,/show\('client-cart-top',false\)/);
 assert.match(js,/if\(!S\.user\)\{requestLoginFor\(id\);return;\}/);
 assert.match(html,/id="client-login-open"/);
 assert.match(html,/id="client-preview-disclaimer"/);
 assert.match(html,/Clique aqui e fale com a WW Solar/);
});
test('migração preparada não concede SELECT sobre wwsolar_catalog a anon',()=>{
 assert.match(draft,/revoke all on function public\.wwsolar_public_catalog\(\) from public,anon,authenticated/);
 assert.match(draft,/grant execute on function public\.wwsolar_public_catalog\(\) to anon,authenticated/);
 assert.doesNotMatch(draft,/grant select on public\.wwsolar_catalog to anon/i);
 assert.doesNotMatch(draft,/create policy/i);
});

test('RPC dinâmica substitui snapshot, com falha fechada fora do DEV',()=>{
 assert.match(js,/S\\.db\\.rpc\\('wwsolar_public_catalog'\\)/);
 assert.match(js,/if\\(!PREVIEW_HOST\\)throw error/);
 assert.match(js,/source='snapshot'/);
 assert.match(js,/client-returned-item/);
 assert.match(js,/client-back-to-catalog/);
 assert.match(html,/id="client-back-to-catalog"/);
});
test('consulta pública só inclui kits e peças ativos e aprovados, com payload por allowlist',()=>{
 assert.match(draft,/c\\.active is true/);
 assert.match(draft,/c\\.approved is true/);
 assert.match(draft,/c\\.price > 0/);
 assert.match(draft,/security definer/);
 assert.match(draft,/set search_path = ''/);
 assert.match(draft,/pg_catalog\\.jsonb_build_object/);
 assert.match(draft,/\\(c\\.kind='kit'\\)/);
});
