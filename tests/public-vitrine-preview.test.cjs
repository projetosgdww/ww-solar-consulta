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
 assert.ok(js.includes("S.db.rpc('wwsolar_public_catalog')"));
 assert.ok(js.includes('if(!PREVIEW_HOST)throw error'));
 assert.ok(js.includes("source='snapshot'"));
 assert.ok(js.includes('client-returned-item'));
 assert.ok(js.includes('client-back-to-catalog'));
 assert.ok(html.includes('id="client-back-to-catalog"'));
});
test('consulta pública só inclui kits e peças ativos e aprovados, com payload por allowlist',()=>{
 for(const expected of ["c.active is true","c.approved is true","c.price > 0",
   "security definer","set search_path = ''","pg_catalog.jsonb_build_object",
   "(c.kind='kit')"])assert.ok(draft.includes(expected),expected);
});

test('domínio oficial nunca pode usar snapshot de preços da prévia',()=>{
 const line=js.split(String.fromCharCode(10)).find(row=>row.trim().startsWith('const PREVIEW_HOST='));
 assert.ok(line,'Detecção de hostname ausente');
 const regexSource=line.slice(line.indexOf('=/')+2,line.lastIndexOf('/.test('));
 const hostPattern=new RegExp(regexSource);
 assert.equal(hostPattern.test('b582a4e8.ww-solar.pages.dev'),true);
 assert.equal(hostPattern.test('ww-solar.pages.dev'),false);
 assert.equal(hostPattern.test('catalogo.wwplatform.com.br'),false);
 assert.equal(hostPattern.test('localhost'),true);
 assert.ok(js.includes('if(!PREVIEW_HOST)throw error'));
 assert.ok(js.includes("show('client-preview-disclaimer',PREVIEW_HOST)"));
});
test('build só inclui snapshot na branch DEV exata',()=>{
 const build=readFileSync('scripts/build-cliente-dev.mjs','utf8');
 assert.ok(build.includes("if(process.env.CF_PAGES_BRANCH==='feat/vitrine-publica-controlada-v1')"));
 assert.ok(build.includes("cp(resolve(root,'dados/vitrine-preview.json'),join(out,'dados/vitrine-preview.json'))"));
 assert.ok(!build.includes("if(process.env.CF_PAGES_BRANCH!=='release/wwsolar-pecas-v1')"));
});
