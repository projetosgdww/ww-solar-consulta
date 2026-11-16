'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../montador-core.js');
const html=fs.readFileSync('montador-dev.html','utf8');
const js=fs.readFileSync('montador-dev.js','utf8');
const admin=fs.readFileSync('admin-dev.html','utf8');
const build=fs.readFileSync('scripts/build-cliente-dev.mjs','utf8');
const sql=fs.readFileSync('supabase/migrations/20261116202500_wwsolar_montador_kits_dev.sql','utf8');
const kit=[
 {sku:'MOD-620',title:'MODULO 620W',category:'modulos',qty:5,unit_cost_cents:25000,module_wp:620,inverter_w:0},
 {sku:'INV-3',title:'INVERSOR DEYE 3KW',category:'inversores',qty:1,unit_cost_cents:150000,module_wp:0,inverter_w:3000}
];
test('custo, potência, geração e acréscimo de 25% são determinísticos',()=>{
 const c=C.calculate(kit,30000,25);
 assert.equal(c.parts_cents,275000);
 assert.equal(c.base_cents,305000);
 assert.equal(c.markup_cents,76250);
 assert.equal(c.total_cents,381250);
 assert.equal(c.dc_wp,3100);
 assert.equal(c.ac_w,3000);
 assert.equal(c.monthly_kwh,397);
 assert.equal(c.dc_ac_ratio,1.03);
});
test('cálculo preserva custo unitário e snapshot sem mutar linhas de entrada',()=>{
 const original=JSON.stringify(kit);
 const c=C.calculate(kit,0,25);
 assert.equal(c.parts_cents,275000);
 assert.equal(c.total_cents,343750);
 assert.equal(JSON.stringify(kit),original);
});
test('extrai potência dos módulos e inversores sem inferir dados inexistentes',()=>{
 assert.equal(C.extractModuleWp('MODULO 620W ZNSHINE'),620);
 assert.equal(C.extractModuleWp('CABO 6MM PRETO'),0);
 assert.equal(C.extractInverterW('INVERSOR DEYE 7.3KW 220V','inversores'),7300);
 assert.equal(C.extractInverterW('INVERSOR SAJ MONO 3K-R5','inversores'),3000);
 assert.equal(C.extractInverterW('MODULO 620W','modulos'),0);
});
test('impede quantidades, totais e custos absurdos',()=>{
 assert.equal(C.normalizedLines([{...kit[0],qty:0}]),null);
 assert.equal(C.normalizedLines([{...kit[0],qty:100}]),null);
 assert.equal(C.normalizedLines([kit[0],kit[0]]),null);
 assert.equal(C.parseBRL('-1'),null);
 assert.equal(C.parseBRL('Infinity'),null);
 assert.throws(()=>C.calculate(kit,-1,25));
 assert.throws(()=>C.calculate(kit,0,301));
});
test('alerta técnico é somente triagem, não aprovação elétrica',()=>{
 const alert=C.technicalAlert(C.calculate(kit));
 assert.match(alert,/strings|fichas técnicas/i);
 assert.match(C.technicalAlert(C.calculate([kit[0]])),/incompleta/i);
});
test('tabelas privadas com políticas de admin e sem grants para anon',()=>{
 assert.match(sql,/create table public\.wwsolar_builder_costs/);
 assert.match(sql,/create table public\.wwsolar_builder_drafts/);
 assert.match(sql,/force row level security/g);
 assert.match(sql,/revoke all on public\.wwsolar_builder_costs from public, anon, authenticated/);
 assert.match(sql,/revoke all on public\.wwsolar_builder_drafts from public, anon, authenticated/);
 assert.equal((sql.match(/wwsolar_role'\) = 'admin'/g)||[]).length,8);
 assert.ok(!/grant\s+(?:all|select|insert|update)\s+on\s+public\.wwsolar_builder_\w+\s+to\s+anon/i.test(sql));
 assert.ok(!/delete\s+from\s+public\.wwsolar_catalog/i.test(sql));
});
test('montador só inicia com administrador autenticado, sem troca de senha pendente',()=>{
 assert.ok(js.includes('db.auth.getUser()'));
 assert.ok(js.includes("u.app_metadata?.wwsolar_role!=='admin'"));
 assert.ok(js.includes("u.app_metadata?.wwsolar_password_change_required===true"));
 assert.ok(js.includes("user=u;ready=true;"));
 assert.ok(html.includes('id="builder-app" hidden'));
});
test('montador nunca escreve no catálogo comercial e preserva composição histórica',()=>{
 for(const blocked of ["db.from('wwsolar_catalog').insert","db.from('wwsolar_catalog').upsert",
 "db.from('wwsolar_catalog').update","db.from('wwsolar_quote_requests').insert",
 "db.functions.invoke('wwsolar-quote'"]){
   assert.ok(!js.includes(blocked),'Proibido: '+blocked);
 }
 assert.ok(js.includes("db.from('wwsolar_builder_costs').upsert"));
 assert.ok(js.includes("db.from('wwsolar_builder_drafts').upsert"));
 assert.ok(js.includes('C.normalizedLines(d.lines)'));
 assert.ok(js.includes('unit_cost_cents:values.parts_cents')===false);
 assert.ok(js.includes('total_cost_cents:values.parts_cents'));
 assert.ok(js.includes('currentId=null'));
});
test('montador é publicado só na branch DEV e aparece no painel admin',()=>{
 assert.ok(build.includes("CF_PAGES_BRANCH==='feat/wwsolar-montador-kits-dev-v1'"));
 assert.ok(build.includes("await writeFile(join(out,'montador.html'),builder)"));
 assert.ok(admin.includes('href="./montador.html"'));
 assert.ok(html.includes('id="builder-parts-list"'));
 assert.ok(html.includes('id="builder-lines"'));
 assert.ok(html.includes('id="builder-drafts-list"'));
});
test('exportação de rascunho não equivale a publicação',()=>{
 assert.ok(js.includes("status:'rascunho_nao_publicado'"));
 assert.ok(js.includes("const blob=new Blob([JSON.stringify(data,null,2)]"));
 assert.ok(!js.includes('approved:true'));
 assert.ok(!js.includes('published:true'));
});

test('string boxes entram pelo valor original do PDF, sem margem de 25%',()=>{
 const box={sku:'SOO-49672',title:'STRING CLAMPER SB 1000V 32A 1E/1S',category:'stringbox',qty:1,unit_cost_cents:46001,module_wp:0,inverter_w:0};
 const kitPlus=C.calculate([...kit,box],30000,25);
 assert.equal(kitPlus.parts_cents,321001);
 assert.equal(kitPlus.pass_through_cents,46001);
 assert.equal(kitPlus.markup_cents,76250);
 assert.equal(kitPlus.total_cents,427251);
 const onlyBox=C.calculate([box],0,25);
 assert.equal(onlyBox.total_cents,46001);
 assert.equal(onlyBox.markup_cents,0);
});
test('37 equipamentos Soollar são abastecidos exclusivamente da tabela privada',()=>{
 assert.ok(js.includes("supplier='Soollar'"));
 assert.ok(html.includes('value="Soollar"'));
 assert.ok(js.includes("db.from('wwsolar_builder_costs').select"));
 assert.ok(js.includes("parts=partsFromCosts()"));
 assert.ok(!js.includes("db.from('wwsolar_catalog').select"));
 assert.ok(html.includes('id="builder-stringbox-pass"'));
 assert.ok(js.includes("if(itemCategory(p)==='stringbox')"));
 assert.ok(js.includes("source_date,source_reference,updated_at"));
});
test('montador preserva atualização manual de custo e origens de preço',()=>{
 assert.ok(js.includes('source_reference:'));
 assert.ok(js.includes('Atualização manual no Montador DEV'));
 assert.ok(js.includes("db.from('wwsolar_builder_costs').upsert"));
 assert.ok(js.includes('onConflict:\'owner_id,supplier,sku\''));
 assert.ok(js.includes('Rascunhos salvos continuam com valores históricos'));
});

test('filtro Trilhos e perfis mostra cinco referencias sem duplicar registros',()=>{
 assert.ok(js.includes("trilhos:'Trilhos e perfis'"));
 assert.ok(js.includes("const isRail=p=>itemCategory(p)==='estruturas'"));
 assert.ok(js.includes("/trilho|perfil/i.test"));
 assert.ok(js.includes("parts.filter(isRail).length"));
 assert.ok(js.includes("category==='trilhos'?isRail(p):itemCategory(p)===category"));
 assert.ok(js.includes("const partsFromCosts=()=>costs.map"));
 assert.ok(js.includes("parts=partsFromCosts()"));
 assert.doesNotMatch(js,/db\.from\('wwsolar_catalog'\)\.(?:insert|upsert|update)/);
});
