'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('cliente-dev.html','utf8');
const js=fs.readFileSync('cliente-dev.js','utf8');
const official=fs.readFileSync('supabase/functions/wwsolar-quote/index.ts','utf8');
const preview=fs.readFileSync('supabase/functions/wwsolar-quote-preview/index.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/20261116205500_wwsolar_public_catalog_only_kits.sql','utf8');

test('vitrine exibe somente kits geradores, sem aba nem navegação de peças avulsas',()=>{
 assert.ok(html.includes('02 / KITS GERADORES SOLARES'));
 assert.ok(html.includes('Escolha seu kit gerador.'));
 assert.doesNotMatch(html,/id="client-pieces-link"|data-kind="piece"|Peças avulsas/);
 assert.ok(html.includes('id="client-kits-link"'));
 assert.ok(html.includes('id="client-projects-link"'));
 assert.ok(html.includes('id="projetos"'));
});

test('cliente autenticado filtra peças avulsas também quando a tabela privada as retorna',()=>{
 assert.ok(js.includes("const quotableProduct=p=>p?.kind==='kit' ||"));
 assert.ok(js.includes("p?.kind==='piece'&&p?.payload?.categoria==='projetos'&&/^PRJ-B-/.test(p.id)"));
 assert.ok(js.includes('Number(p.price)>0&&quotableProduct(p)'));
 assert.ok(js.includes("S.kind='kit';"));
 assert.doesNotMatch(js,/\$\('client-pieces-link'\)\.addEventListener/);
});

test('vitrine anônima descarta itens legados em cache e serviços inesperados',()=>{
 assert.ok(js.includes("if(item.kind==='piece'&&item.payload?.categoria!=='projetos')continue;"));
 assert.ok(js.includes("const PUBLIC_CATEGORIES=new Set(['projetos'])"));
 assert.ok(js.includes("S.db.rpc('wwsolar_public_catalog')"));
 assert.ok(js.includes("if(!PREVIEW_HOST)throw error"));
});

test('carrinhos antigos com peças permanecem visíveis mas impedem renovação e checkout',()=>{
 assert.ok(js.includes("!newCatalog.some(p=>p.id===line.id&&quotableProduct(p))"));
 assert.ok(js.includes("S.lines.some(line=>!(fresh||[]).some(p=>p.id===line.id&&quotableProduct(p)))"));
 assert.ok(js.includes("C.sumCart(S.lines,(fresh||[]).filter(quotableProduct))"));
 assert.ok(js.includes('itens indisponíveis no carrinho antigo'));
 assert.ok(js.includes('Remova-os do carrinho antes de continuar.'));
});

test('função oficial e função de prévia rejeitam avulsos antes de calcular e registrar cotação',()=>{
 for(const source of [official,preview]){
   const mismatch=source.indexOf('if(products?.length!==unique.size)');
   const guard=source.indexOf('error:"item_removed_from_catalog"');
   const calc=source.indexOf('verifyProjectAssociations(lines,products)');
   assert.ok(mismatch>=0&&guard>mismatch&&calc>guard);
   assert.ok(source.includes('p.kind!=="kit"'));
   assert.ok(source.includes('p.payload?.categoria==="projetos"'));
   assert.ok(source.includes('/^PRJ-B-/.test(String(p.id))'));
 }
 assert.ok(official.includes('if(already)return result(200,{quote_version:2'));
 assert.ok(official.includes('if(payload.action==="status")'));
});

test('RPC mantém kits aprovados e projetos PRJ-B, sem avulsos nem alterações destrutivas',()=>{
 assert.ok(sql.includes("c.kind='kit'"));
 assert.ok(sql.includes("c.kind='piece' and c.id like 'PRJ-B-%'"));
 assert.ok(!sql.includes("'modulos','microinversores'"));
 assert.ok(!sql.includes("('modulos'"));
 assert.ok(sql.includes("create or replace function public.wwsolar_public_catalog()"));
 for(const fragment of ['delete from','update public.wwsolar_catalog','alter table','drop table','grant select on public.wwsolar_catalog'])
   assert.ok(!sql.toLowerCase().includes(fragment));
});

test('o montador DEV permanece independente e a consulta de custos não é alterada',()=>{
 const builder=fs.readFileSync('montador-dev.js','utf8');
 const build=fs.readFileSync('scripts/build-cliente-dev.mjs','utf8');
 assert.ok(builder.includes("db.from('wwsolar_catalog').select('id,title,payload')"));
 assert.ok(builder.includes("db.from('wwsolar_builder_costs').upsert"));
 assert.ok(build.includes("CF_PAGES_BRANCH==='feat/wwsolar-montador-kits-dev-v1'"));
});
