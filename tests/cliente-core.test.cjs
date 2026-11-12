const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../cliente-core.js');
const products=[
  {id:'KIT-008',kind:'kit',title:'Kit 6,25 kWp',price:10276.46,active:true,approved:true,payload:{geracaoMensalKwh:800}},
  {id:'PAV-036',kind:'piece',title:'Inversor 3 kW',price:1624.88,active:true,approved:true,payload:{}},
  {id:'KIT-010',kind:'kit',title:'Kit 8 kWp',price:12500,active:true,approved:true,payload:{geracaoMensalKwh:1100}}
];
test('simulador escolhe menor kit que atende',()=>assert.equal(C.recommendedKit(products,750).id,'KIT-008'));
test('simulador escolhe o maior se nenhum atende',()=>assert.equal(C.recommendedKit(products,15000).id,'KIT-010'));
test('carrinho soma em centavos sem floating point',()=>{
 const result=C.sumCart([{id:'PAV-036',qty:2},{id:'KIT-008',qty:1}],products);
 assert.equal(result.cents,1352622);
});
test('recusa item excluído da consulta',()=>assert.throws(()=>C.sumCart([{id:'PAV-999',qty:1}],products)));
test('recusa quantidade fracionária ou maior que 99',()=>{
 assert.throws(()=>C.cleanLines([{id:'PAV-036',qty:1.5}]));
 assert.throws(()=>C.cleanLines([{id:'PAV-036',qty:100}]));
});
test('recusa item duplicado no carrinho',()=>assert.throws(()=>C.cleanLines([{id:'KIT-008',qty:1},{id:'KIT-008',qty:1}])));
test('não permite preço de item inativo ou não aprovado',()=>assert.throws(()=>C.sumCart([{id:'PAV-036',qty:1}],products.map(p=>({...p,approved:false})))));
test('mensagem do WhatsApp usa itens e confirma cotação',()=>{
 const {selected,cents}=C.sumCart([{id:'KIT-008',qty:1}],products);
 const message=C.buildMessage('cliente@exemplo.com',selected,cents);
 assert.match(message,/cliente@exemplo.com/);assert.match(message,/R\$ 10.276,46/);
 assert.match(message,/não é compra concluída/);
});
