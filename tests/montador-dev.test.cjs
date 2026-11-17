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
test('custo, potência e margem bruta 25% calculada por custo dividido por 0,75',()=>{
 const c=C.calculate(kit,30000,25);
 assert.equal(c.parts_cents,275000);
 assert.equal(c.base_cents,305000);
 assert.equal(c.margin_cents,101667);
 assert.equal(c.total_cents,406667);
 assert.equal(c.dc_wp,3100);
 assert.equal(c.ac_w,3000);
 assert.equal(c.monthly_kwh,397);
 assert.equal(c.dc_ac_ratio,1.03);
});
test('cálculo preserva custo unitário e snapshot sem mutar linhas de entrada',()=>{
 const original=JSON.stringify(kit);
 const c=C.calculate(kit,0,25);
 assert.equal(c.parts_cents,275000);
 assert.equal(c.total_cents,366667);
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
 assert.throws(()=>C.calculate(kit,0,100));
 assert.throws(()=>C.calculate(kit,0,101));
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

test('string boxes entram pelo preço do PDF, excluídas da margem de 25%',()=>{
 const box={sku:'SOO-49672',title:'STRING CLAMPER SB 1000V 32A 1E/1S',category:'stringbox',qty:1,unit_cost_cents:46001,module_wp:0,inverter_w:0};
 const kitPlus=C.calculate([...kit,box],30000,25);
 assert.equal(kitPlus.parts_cents,321001);
 assert.equal(kitPlus.pass_through_cents,46001);
 assert.equal(kitPlus.margin_cents,101667);
 assert.equal(kitPlus.total_cents,452668);
 const onlyBox=C.calculate([box],0,25);
 assert.equal(onlyBox.total_cents,46001);
 assert.equal(onlyBox.margin_cents,0);
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

test('quantidade é escolhida à esquerda antes de adicionar e editada no mesmo lugar',()=>{
 const posLeft=js.indexOf('function renderParts()');
 const posRight=js.indexOf('function renderLines()');
 assert.ok(posLeft>=0 && posRight>posLeft);
 const left=js.slice(posLeft,js.indexOf('function openCost('));
 const right=js.slice(posRight,js.indexOf('function newDraft('));
 assert.ok(left.includes("el('div',undefined,'builder-pick-row')"));
 assert.ok(left.includes("qty.type='number';qty.min='1';qty.max='99';qty.step='1'"));
 assert.ok(left.includes("const minus=makeButton('−',()=>setQuantity(partQuantity(p)-1)"));
 assert.ok(left.includes("const plus=makeButton('+',()=>setQuantity(partQuantity(p)+1)"));
 assert.ok(left.includes("if(addToKit(p,value))syncPartControls()"));
 assert.ok(left.includes("existing.qty=value;"));
 assert.ok(left.includes("add.disabled=!cost||inKit;"));
 assert.ok(left.includes("actions.append(qtyRow,costButton,add)"));
 assert.ok(right.includes("'Quantidade: '+line.qty"));
 assert.ok(!right.includes("()=>updateLine(line.sku,line.qty+1)"));
 assert.ok(!right.includes("()=>updateLine(line.sku,line.qty-1)"));
});
test('quantidades salvas sincronizam ao reabrir, duplicar, remover ou começar outro kit',()=>{
 assert.ok(js.includes('const pendingQuantities=new Map()'));
 assert.ok(js.includes("return existing?existing.qty:(pendingQuantities.get(part.id)||1)"));
 assert.ok(js.includes("lines.push(fromPart(part,quantity))"));
 assert.ok(js.includes("pendingQuantities.delete(sku)"));
 assert.ok(js.includes("lines=[];currentId=null;pendingQuantities.clear()"));
 assert.ok(js.includes("currentId=d.id;lines=clean;pendingQuantities.clear()"));
 assert.ok(js.includes("renderLines();renderParts();status('Rascunho carregado."));
 assert.ok(js.includes("if(!Number.isSafeInteger(value)||value<1||value>99)"));
 assert.ok(js.includes("if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)"));
});

test('custo dividido por 0,75 não equivale a custo acrescido de 25%',()=>{
 const p=C.calculate([{...kit[0],qty:4,unit_cost_cents:62500}],0,25);
 assert.equal(p.base_cents,250000);
 assert.equal(p.total_cents,333333);
 assert.equal(p.margin_cents,83333);
 assert.notEqual(p.total_cents,312500);
 const freight=C.calculate([{...kit[0],qty:4,unit_cost_cents:62500}],10000,25);
 assert.equal(freight.total_cents,346667);
});
test('conector MC4 é componente regular de custo com pacote de 2 pares',()=>{
 const mc4={sku:'SOO-440111',title:'CONECTOR SOLAR MC4 MACHO E FÊMEA COM 2 PARES',category:'componentes',qty:1,unit_cost_cents:1000,module_wp:0,inverter_w:0};
 const c=C.calculate([mc4],0,25);
 assert.equal(c.parts_cents,1000);
 assert.equal(c.total_cents,1333);
 assert.equal(c.margin_cents,333);
 assert.equal(c.pass_through_cents,0);
});
test('interface explica margem sobre a venda em vez de acréscimo sobre custo',()=>{
 assert.ok(html.includes('Margem bruta desejada sobre o preço de venda (%)'));
 assert.ok(html.includes('÷ 0,75'));
 assert.ok(html.includes('max="99.99"'));
 assert.ok(html.includes('Margem bruta estimada (R$)'));
 assert.ok(js.includes('margem_bruta_percentual:c.margin_percent'));
 assert.ok(!js.includes('acrescimo_percentual:c.markup_percent'));
});

test('botões distintos exportam o kit aberto ou o lote de kits salvos',()=>{
 assert.ok(html.includes('id="builder-export"'));
 assert.ok(html.includes('Exportar kit aberto (JSON)'));
 assert.ok(html.includes('id="builder-export-batch"'));
 assert.ok(html.includes('Exportar lote (0) em JSON'));
 assert.ok(html.includes('Somente os kits já salvos entram no lote.'));
 assert.ok(js.includes("builder-export-batch').addEventListener('click',()=>void exportSavedBatch())"));
 assert.ok(js.includes("'Exportar lote ('+drafts.length+') em JSON'"));
});
test('exportação em lote lê todos os rascunhos atuais com RLS sem incluir alterações não salvas',()=>{
 const start=js.indexOf('async function exportSavedBatch(){');
 const end=js.indexOf('async function changeSupplier(){',start);
 assert.ok(start>=0&&end>start);
 const chunk=js.slice(start,end);
 assert.ok(chunk.includes("if(!ready||!user)"));
 assert.ok(chunk.includes("db.from('wwsolar_builder_drafts')"));
 assert.ok(chunk.includes(".eq('owner_id',user.id).eq('supplier',supplier)"));
 assert.ok(chunk.includes(".range(offset,offset+pageSize-1)"));
 assert.ok(chunk.includes("if(saved.length>=2000)throw Error("));
 assert.ok(chunk.includes("if(!saved.length)"));
 assert.ok(chunk.includes("if(d.status!=='rascunho')"));
 assert.ok(chunk.includes("calc.parts_cents!==Number(d.total_cost_cents)"));
 assert.ok(chunk.includes("C.calculate(d.lines,Number(d.freight_cents),Number(d.markup_percent))"));
 assert.ok(chunk.includes("margem_bruta_percentual:calc.margin_percent"));
 assert.ok(chunk.includes("preco_sugerido_centavos:calc.total_cents"));
 assert.ok(chunk.includes("itens:calc.lines"));
 assert.ok(chunk.includes("total_kits:kits.length"));
 assert.ok(chunk.includes("kits\n"));
 assert.ok(chunk.includes("wwsolar-lote-"));
 assert.ok(!chunk.includes("db.from('wwsolar_catalog')"));
 assert.ok(!chunk.includes('.update('));
 assert.ok(!chunk.includes('.insert('));
});
test('exportação em lote calcula preço por margem em snapshots e mantém stringbox sem margem',()=>{
 const a={sku:'MOD-625',title:'MÓDULO 625W',category:'modulos',qty:4,unit_cost_cents:62500,module_wp:625,inverter_w:0};
 const b={sku:'STRING-BOX',title:'STRINGBOX OPCIONAL',category:'stringbox',qty:1,unit_cost_cents:46001,module_wp:0,inverter_w:0};
 const c=C.calculate([a,b],0,25);
 assert.equal(c.parts_cents,296001);
 assert.equal(c.pass_through_cents,46001);
 assert.equal(c.total_cents,379334);
 assert.equal(c.margin_cents,83333);
 assert.equal(c.monthly_kwh,320);
});
