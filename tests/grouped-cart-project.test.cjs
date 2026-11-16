'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../cliente-core.js');
const kit=(id,price=8580.44)=>({id,kind:'kit',active:true,approved:true,price,payload:{potenciaKwp:3.6,placas:6,moduloWp:600}});
const project=(id,price=400)=>({id,kind:'piece',active:true,approved:true,price,payload:{categoria:'projetos'}});
test('kit Fotus e projeto explicitamente vinculado mostram uma linha sem reduzir cobrança',()=>{
 const k=kit('FOTUS-3600-GOODWE-3P3'),p=project('PRJ-B-010'),catalog=[k,p];
 const lines=C.setProjectForKit([{id:k.id,qty:1}],k.id,p.id,true);
 const cart=C.sumCart(lines,catalog);
 assert.equal(cart.cents,898044);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog,lines).map(x=>x.id),[k.id]);
 assert.equal(cart.selected.length,2);
 assert.deepEqual(lines.find(x=>x.id===p.id).linkedKits,[k.id]);
});
test('projeto avulso sem kit continua visível com preço próprio',()=>{
 const catalog=[project('PRJ-B-010')],lines=[{id:'PRJ-B-010',qty:1}];
 const cart=C.sumCart(lines,catalog);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog,lines).map(x=>x.id),['PRJ-B-010']);
 assert.equal(cart.cents,40000);
});
test('kit WW com projeto dedicado fica em uma linha visual',()=>{
 const k=kit('WW-500'),p={...project('PRJ-WW-500'),payload:{categoria:'projetos',kitCodigo:'WW-500'}};
 const catalog=[k,p],lines=[{id:k.id,qty:1},{id:p.id,qty:1}];
 const cart=C.sumCart(lines,catalog);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog,lines).map(x=>x.id),['WW-500']);
 assert.equal(cart.cents,898044);
});
test('um projeto legado PRJ-B não é associado automaticamente a kit da mesma potência',()=>{
 const k=kit('FOTUS-3600-GOODWE-3P3'),p=project('PRJ-B-010');
 const catalog=[k,p],lines=[{id:k.id,qty:1},{id:p.id,qty:1}];
 const cart=C.sumCart(lines,catalog);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog,lines).map(x=>x.id),[k.id,p.id]);
});
test('ao desmarcar projeto somente o kit fica e total diminui',()=>{
 const k=kit('FOTUS-3600-GOODWE-3P3'),p=project('PRJ-B-010'),catalog=[k,p];
 const withProject=C.setProjectForKit([{id:k.id,qty:1}],k.id,p.id,true);
 const without=C.setProjectForKit(withProject,k.id,p.id,false);
 const cart=C.sumCart(without,catalog);
 assert.equal(cart.cents,858044);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog,without).map(x=>x.id),[k.id]);
});
test('dois kits de mesma geração mantêm checkboxes e projetos separados',()=>{
 const a=kit('FOTUS-4200-DEYE-3',10139.23),b=kit('FOTUS-4200-GOODWE-3',10578.67),p=project('PRJ-B-010',400);
 const catalog=[a,b,p],base=[{id:a.id,qty:1},{id:b.id,qty:1}];
 const justA=C.setProjectForKit(base,a.id,p.id,true);
 assert.deepEqual(justA.find(x=>x.id===p.id).linkedKits,[a.id]);
 assert.equal(justA.find(x=>x.id===p.id).qty,1);
 assert.equal(C.sumCart(justA,catalog).cents,2111790);
 const both=C.setProjectForKit(justA,b.id,p.id,true);
 assert.deepEqual(both.find(x=>x.id===p.id).linkedKits,[a.id,b.id]);
 assert.equal(both.find(x=>x.id===p.id).qty,2);
 assert.equal(C.sumCart(both,catalog).cents,2151790);
 const justB=C.setProjectForKit(both,a.id,p.id,false);
 assert.deepEqual(justB.find(x=>x.id===p.id).linkedKits,[b.id]);
 assert.equal(justB.find(x=>x.id===p.id).qty,1);
 assert.equal(C.sumCart(justB,catalog).cents,2111790);
 assert.deepEqual(C.cartDisplayRows(C.sumCart(justB,catalog).selected,catalog,justB).map(x=>x.id),[a.id,b.id]);
 const none=C.setProjectForKit(justB,b.id,p.id,false);
 assert.equal(none.find(x=>x.id===p.id),undefined);
 assert.equal(C.sumCart(none,catalog).cents,2071790);
});
test('projeto avulso não desaparece ao selecionar ou remover um projeto de kit',()=>{
 const a=kit('FOTUS-4200-DEYE-3'),b=kit('FOTUS-4200-GOODWE-3'),p=project('PRJ-B-010');
 const catalog=[a,b,p],base=[{id:a.id,qty:1},{id:b.id,qty:1},{id:p.id,qty:1}];
 const joined=C.setProjectForKit(base,a.id,p.id,true);
 assert.equal(joined.find(x=>x.id===p.id).qty,2);
 assert.equal(joined.find(x=>x.id===p.id).standaloneQty,1);
 const display=C.cartDisplayRows(C.sumCart(joined,catalog).selected,catalog,joined);
 const standalone=display.find(x=>x.id===p.id);
 assert.equal(standalone.qty,1);
 assert.equal(standalone.amount,40000);
 const unlinked=C.setProjectForKit(joined,a.id,p.id,false);
 assert.equal(unlinked.find(x=>x.id===p.id).qty,1);
 assert.equal(unlinked.find(x=>x.id===p.id).standaloneQty,1);
});
test('remover um kit não remove o projeto do outro nem projetos avulsos',()=>{
 const a=kit('FOTUS-4200-DEYE-3'),b=kit('FOTUS-4200-GOODWE-3'),id='PRJ-B-010';
 let lines=[{id:a.id,qty:1},{id:b.id,qty:1},{id,qty:1}];
 lines=C.setProjectForKit(lines,a.id,id,true);
 lines=C.setProjectForKit(lines,b.id,id,true);
 const remaining=C.removeKitProjectLinks(lines,a.id);
 assert.deepEqual(remaining.find(x=>x.id===id).linkedKits,[b.id]);
 assert.equal(remaining.find(x=>x.id===id).standaloneQty,1);
 assert.ok(remaining.some(x=>x.id===b.id));
 assert.ok(!remaining.some(x=>x.id===a.id));
});
test('vínculos inconsistentes e duplicados são rejeitados antes de salvar',()=>{
 const id='PRJ-B-010';
 assert.throws(()=>C.cleanLines([{id,qty:1,standaloneQty:0,linkedKits:['FOTUS-A','FOTUS-A']}]),/Vínculo/);
 assert.throws(()=>C.cleanLines([{id,qty:2,standaloneQty:0,linkedKits:['FOTUS-A']}]),/Quantidade/);
 assert.throws(()=>C.cleanLines([{id,qty:1,standaloneQty:0,linkedKits:'FOTUS-A'}]),/Vínculos/);
});

test('nota de WhatsApp cita exclusivamente o SKU do kit com projeto marcado',()=>{
 const a=kit('FOTUS-4200-DEYE-3',10139.23),b=kit('FOTUS-4200-GOODWE-3',10578.67),p=project('PRJ-B-010');
 const lines=C.setProjectForKit([{id:a.id,qty:1},{id:b.id,qty:1}],a.id,p.id,true);
 const note=C.linkedProjectNote(lines,[a,b,p]);
 assert.match(note,/FOTUS-4200-DEYE-3/);
 assert.doesNotMatch(note,/FOTUS-4200-GOODWE-3/);
 assert.match(note,/PRJ-B-010/);
 assert.match(note,/TRT não inclusa/);
 assert.equal(C.linkedProjectNote([{id:a.id,qty:1}],[a,b,p]),'');
});

test('histórico confirmado corresponde ao kit escolhido e quantidade de projetos',()=>{
 const a=kit('FOTUS-4200-DEYE-3',10139.23);
 const b=kit('FOTUS-4200-GOODWE-3',10578.67);
 const p=project('PRJ-B-010');
 const lines=C.setProjectForKit([{id:a.id,qty:1},{id:b.id,qty:1}],b.id,p.id,true);
 const items=[
  {sku:a.id,qty:1},{sku:b.id,qty:1},
  {sku:p.id,qty:1,standalone_qty:0,linked_kits:[{sku:b.id,title:b.id}]}
 ];
 assert.equal(C.quoteSnapshotMatches(lines,items),true);
 assert.equal(C.quoteSnapshotMatches(lines,items.map(x=>x.sku===p.id?{
  ...x,linked_kits:[{sku:a.id,title:a.id}]
 }:x)),false);
 assert.equal(C.quoteSnapshotMatches(lines,items.map(x=>x.sku===p.id?{
  ...x,standalone_qty:1
 }:x)),false);
 assert.equal(C.quoteSnapshotMatches(lines,items.slice(1)),false);
});
test('histórico de projeto avulso legado é preservado sem vínculo fictício',()=>{
 const k=kit('FOTUS-4200-DEYE-3');
 const lines=[{id:k.id,qty:1},{id:'PRJ-B-010',qty:1}];
 assert.equal(C.quoteSnapshotMatches(lines,[{sku:k.id,qty:1},{sku:'PRJ-B-010',qty:1}]),true);
 assert.equal(C.quoteSnapshotMatches(lines,[{sku:k.id,qty:1},{
  sku:'PRJ-B-010',qty:1,linked_kits:[{sku:k.id}],standalone_qty:0
 }]),false);
});
test('histórico de dois kits e projeto avulso pode conservar vínculos mistos',()=>{
 const a=kit('FOTUS-4200-DEYE-3'),b=kit('FOTUS-4200-GOODWE-3');
 const lines=C.setProjectForKit([{id:a.id,qty:1},{id:b.id,qty:1},
  {id:'PRJ-B-010',qty:1}],a.id,'PRJ-B-010',true);
 const saved=[
  {sku:a.id,qty:1},{sku:b.id,qty:1},
  {sku:'PRJ-B-010',qty:2,standalone_qty:1,linked_kits:[{sku:a.id,title:a.id}]}
 ];
 assert.equal(C.quoteSnapshotMatches(lines,saved),true);
});
