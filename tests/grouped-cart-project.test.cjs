'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../cliente-core.js');
const kit=id=>({id,kind:'kit',active:true,approved:true,price:8580.44,payload:{potenciaKwp:3.6,placas:6,moduloWp:600}});
const project=(id,price=400)=>({id,kind:'piece',active:true,approved:true,price,payload:{categoria:'projetos'}});
test('kit Fotus + projeto mostra uma linha sem alterar total cobrado',()=>{
 const catalog=[kit('FOTUS-3600-GOODWE-3P3'),project('PRJ-B-010')];
 const cart=C.sumCart([{id:catalog[0].id,qty:1},{id:'PRJ-B-010',qty:1}],catalog);
 assert.equal(cart.cents,898044);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog).map(x=>x.id),[catalog[0].id]);
 assert.equal(cart.selected.length,2); // a cotação inclui o serviço
});
test('projeto avulso sem kit continua visível e com preço próprio',()=>{
 const catalog=[project('PRJ-B-010')];
 const cart=C.sumCart([{id:'PRJ-B-010',qty:1}],catalog);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog).map(x=>x.id),['PRJ-B-010']);
 assert.equal(cart.cents,40000);
});
test('kit WW com projeto dedicado fica numa linha visual só',()=>{
 const k=kit('WW-500'),p={...project('PRJ-WW-500'),payload:{categoria:'projetos',kitCodigo:'WW-500'}};
 const catalog=[k,p],cart=C.sumCart([{id:k.id,qty:1},{id:p.id,qty:1}],catalog);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog).map(x=>x.id),['WW-500']);
 assert.equal(cart.cents,898044);
});
test('separados: kits sem projeto e projetos não associados continuam visíveis',()=>{
 const k=kit('FOTUS-3600-GOODWE-3P3'),p=project('PRJ-B-020',500);
 const catalog=[k,p],cart=C.sumCart([{id:k.id,qty:1},{id:p.id,qty:1}],catalog);
 assert.deepEqual(C.cartDisplayRows(cart.selected,catalog).map(x=>x.id),[k.id,p.id]);
});
test('quando o projeto é desmarcado, o kit continua e o total diminui',()=>{
 const catalog=[kit('FOTUS-3600-GOODWE-3P3'),project('PRJ-B-010')];
 const without=C.sumCart([{id:catalog[0].id,qty:1}],catalog);
 assert.equal(without.cents,858044);
 assert.equal(C.cartDisplayRows(without.selected,catalog).length,1);
});
