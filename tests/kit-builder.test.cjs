const test=require('node:test');
const assert=require('node:assert/strict');
const K=require('../kit-builder-core.js');
const item=(id,title,categoria)=>({id,title,kind:'piece',active:true,approved:true,payload:{categoria}});
const pieces=[
  item('PAV-049','MODULO 625W N-TYPE DMEGC BIFACIAL 30MM','modulos'),
  item('PAV-043','MODULO 585W RENEPV BIFACIAL 30 MM','modulos'),
  item('PAV-036','INVERSOR SAJ AFCI MONO 3K-R5-ON-GRID 220V 1MPPT','inversores'),
  item('PAV-035','INVERSOR DEYE AFCI MONOFASICO 6K ON GRID 220V 2MPPT','inversores'),
  item('PAV-038','INVERSOR DEYE MONO 7.3KW ON GRID 220V 2MPPT','inversores'),
  item('PAV-041','INVERSOR SAJ AFCI MONO 10KW-R6 220V 3MPPT','inversores'),
  item('PAV-039','INVERSOR DEYE AFCI MONO 10.5KW ON GRID-G2 220V 2MPPT','inversores'),
  item('PAV-029','KIT FIXAÇÃO TELHA CERÂMICA COM PROLONGADOR PARA 4 MÓDULOS','estruturas'),
  item('PAV-028','KIT FIXAÇÃO TELHA FIBROCIMENTO PARAFUSO INOX MADEIRA PARA 4 MODULOS','estruturas'),
  item('PAV-032','KIT FIXAÇAO TELHA METALICA MINI-TRILHO 42CM PARA 4 MODULOS','estruturas'),
  item('PAV-024','PERFIL FIXAÇAO MODULO 27,8MMX45MMX2.36M','estruturas'),
  item('PAV-001','CABO SOLAR 4MM VERMELHO - 25MT','cabos'),
  item('PAV-002','CABO SOLAR 4MM PRETO - 25MT','cabos'),
  item('PAV-003','CABO SOLAR 6MM PRETO - 25MT','cabos'),
  item('PAV-004','CABO SOLAR 6MM VERMELHO - 25MT','cabos'),
  item('PAV-007','CONECTOR SOLAR MC4 MACHO E FEMEA COM 2 PARES','componentes'),
];
const draft=(panels,extra={})=>K.compose({panels,products:pieces,...extra});
test('12 modelos exclusivos, 625 W, de 2.5 a 16.25 kWp',()=>{
  assert.equal(K.PRESETS.length,12);
  assert.deepEqual(K.PRESETS.map(x=>x.panels),[4,6,8,10,12,14,16,18,20,22,24,26]);
  assert.equal(draft(4).kwp,2.5);
  assert.equal(draft(26).kwp,16.25);
  assert.equal(new Set(K.PRESETS.map(x=>x.code)).size,12);
});
test('tres coberturas diferentes sem multiplicar o numero de modelos',()=>{
  const ceramic=draft(10,{roof:'ceramica',dcInputs:2});
  const fiber=draft(10,{roof:'fibrocimento',dcInputs:2});
  const metal=draft(10,{roof:'metalica',dcInputs:2});
  assert.equal(ceramic.rows.find(x=>x.sku==='PAV-029').qty,3);
  assert.equal(fiber.rows.find(x=>x.sku==='PAV-028').qty,3);
  assert.equal(metal.rows.find(x=>x.sku==='PAV-032').qty,3);
  assert.equal(ceramic.rows.find(x=>x.sku==='PAV-024').qty,10);
  assert.equal(metal.rows.some(x=>x.sku==='PAV-024'),false,'evitar dupla contagem de trilho longo e mini');
});
test('triagem 0,77 não homologa automaticamente nem força inversor incompatível',()=>{
  const a=draft(4);assert.equal(a.suggestedInverter.kw,3);
  const b=draft(10);assert.equal(b.suggestedInverter.kw,6);
  const c=draft(14);assert.equal(c.suggestedInverter.kw,7.3);
  const d=draft(26,{dcInputs:2});
  assert.equal(d.suggestedInverter,null);
  assert.equal(d.previewPrice,null);
  assert.equal(d.engineeringApproved,false);
  assert.equal(d.publicationAllowed,false);
});
test('mudança de módulo recalcula kWp mantendo quantidade',()=>{
  const a=draft(10,{moduleSku:'PAV-043'});
  assert.equal(a.moduleWp,585);
  assert.equal(a.kwp,5.85);
});
test('3m/modulo, acima de 14 modulos cabo de 6mm e bobinas 25m',()=>{
  const a=draft(14,{dcInputs:2});
  assert.equal(a.cableGauge,4);
  assert.equal(a.estimatedTotalMeters,42);
  assert.equal(a.rows.find(x=>x.sku==='PAV-001').qty,1);
  const b=draft(16,{dcInputs:4});
  assert.equal(b.cableGauge,6);
  assert.equal(b.estimatedTotalMeters,48);
  assert.equal(b.rows.find(x=>x.sku==='PAV-004').qty,1);
  assert.equal(b.rows.find(x=>x.sku==='PAV-007').qty,2);
});
test('pares MC4 não são inventados com base em MPPT',()=>{
  const a=draft(10);assert.equal(a.dcInputs,null);
  assert.equal(a.rows.find(x=>x.label.startsWith('MC4')).qty,null);
  assert.equal(a.previewPrice,null);
  assert.throws(()=>draft(10,{dcInputs:0}),/entradas CC/);
});
test('15% de ACRÉSCIMO sobre custo real só com todas as linhas e quantidades',()=>{
  const base=draft(10,{dcInputs:2});
  assert.equal(base.previewPrice,null,'sem preços cadastrados nos fixtures, composição fica pendente');
  const costs=base.rows.filter(x=>x.sku).map((x,i)=>({sku:x.sku,unit_cost:100+i*25}));
  const priced=draft(10,{dcInputs:2,costs});
  assert.equal(priced.missingCosts.length,0);
  assert.equal(priced.previewPrice,Math.round(priced.cost*115)/100);
  assert.equal(priced.engineeringApproved,false,'não liberar para clientes apenas por ter preço');
});
test('validação de catálogo e entradas malformadas',()=>{
  assert.throws(()=>draft(5),/12 kits/);
  assert.throws(()=>draft(10,{roof:'solo'}),/Cobertura inválida/);
  assert.throws(()=>draft(10,{redMeters:1,blackMeters:1}),/insuficientes/);
  assert.throws(()=>draft(10,{moduleSku:'PAV-035'}),/Módulo indisponível/);
});

test('reverte margens a partir de preços avulsos APENAS como estimativa',()=>{
  const rows=[
    {sku:'PAV-049',qty:10,label:'Módulos'},
    {sku:'PAV-041',qty:1,label:'Inversor'},
    {sku:'PAV-029',qty:3,label:'Fixação'},
    {sku:'PAV-001',qty:2,label:'Cabo'},
    {sku:'PAV-007',qty:1,label:'MC4'}
  ];
  const prices=[
    {...pieces.find(p=>p.id==='PAV-049'),price:800.00},
    {...pieces.find(p=>p.id==='PAV-041'),price:3575.11},
    {...pieces.find(p=>p.id==='PAV-029'),price:139.86},
    {...pieces.find(p=>p.id==='PAV-001'),price:130.00},
    {...pieces.find(p=>p.id==='PAV-007'),price:13.00}
  ];
  assert.equal(K.estimatedCostFromSale(prices[0]).unitCost,625);
  assert.equal(K.estimatedCostFromSale(prices[1]).unitCost,2860.09);
  assert.equal(K.estimatedCostFromSale(prices[2]).unitCost,99.90);
  assert.equal(K.estimatedCostFromSale(prices[3]).unitCost,100);
  assert.equal(K.estimatedCostFromSale(prices[4]).unitCost,10);
  const quote=K.costSummary(rows,[],prices);
  assert.equal(quote.estimatedLines,5);
  assert.equal(quote.verifiedLines,0);
  assert.equal(quote.pricingStatus,'estimado');
  assert.equal(quote.cost,10*625+2860.09+3*99.90+2*100+10);
  assert.equal(quote.sellingPrice,Math.round(quote.cost*115)/100);
  assert(quote.rows.every(x=>x.costSource==='estimado'));
});
test('precificação usa custo comprovado prioritariamente, não margem em cima da venda',()=>{
  const p={...pieces.find(x=>x.id==='PAV-049'),price:800,updated_at:'2026-11-12T10:00:00Z'};
  const r=[{sku:p.id,qty:2,label:'Módulo'}];
  const manual=K.costSummary(r,[{sku:p.id,unit_cost:600,updated_at:'2026-11-12T11:00:00Z'}],[p]);
  assert.equal(manual.cost,1200);
  assert.equal(manual.sellingPrice,1380);
  assert.equal(manual.pricingStatus,'confirmado');
  const old=K.costSummary(r,[{sku:p.id,unit_cost:600,updated_at:'2026-11-11T11:00:00Z'}],[p]);
  assert.equal(old.cost,1250);
  assert.equal(old.pricingStatus,'estimado');
  assert.equal(old.staleLines,1);
  assert.equal(old.rows[0].costSource,'estimado_revisar');
});
test('atualizar catálogo atualiza precificação sem digitação, sem publicar kit',()=>{
 const original={...pieces.find(x=>x.id==='PAV-049'),price:800};
 const updated={...original,price:810};
 const originalQuote=K.costSummary([{sku:original.id,qty:10,label:'Módulos'}],[],[original]);
 const newQuote=K.costSummary([{sku:updated.id,qty:10,label:'Módulos'}],[],[updated]);
 assert.equal(newQuote.cost-originalQuote.cost,100);
 assert.equal(newQuote.sellingPrice-originalQuote.sellingPrice,115);
 assert.equal(draft(10).publicationAllowed,false);
});
test('não inverte margens de categorias excluídas, preço ausente ou valor sem base',()=>{
 assert.equal(K.estimatedCostFromSale(item('x','Módulo','baterias')),null);
 assert.equal(K.estimatedCostFromSale({...pieces[0],price:0}),null);
 assert.equal(K.estimatedCostFromSale({...pieces[0],price:100}),null);
});
