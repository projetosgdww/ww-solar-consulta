const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../cliente-core.js');
const products=[
  {id:'KIT-008',kind:'kit',title:'Kit 6,25 kWp',price:10276.46,active:true,approved:true,payload:{potenciaKwp:6.25,geracaoMensalKwh:9999}},
  {id:'PAV-036',kind:'piece',title:'Inversor 3 kW',price:1624.88,active:true,approved:true,payload:{}},
  {id:'KIT-010',kind:'kit',title:'Kit 8 kWp',price:12500,active:true,approved:true,payload:{potenciaKwp:8,geracaoMensalKwh:9999}}
];
test('simulador escolhe menor kit que atende',()=>assert.equal(C.recommendedKit(products,750).id,'KIT-008'));
test('simulador não indica kit abaixo da geração desejada',()=>assert.equal(C.recommendedKit(products,15000),null));
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
 assert.match(message,/cliente@exemplo.com/);assert.match(message,/R\$\s+10\.276,46/);
 assert.match(message,/não é compra concluída/);
});

test('carrinho expira em 25 minutos sem virar reserva de estoque',()=>{
 const start='2026-11-12T15:00:00.000Z';
 const t=Date.parse(start);
 assert.equal(C.quoteRemainingMs(start,t),25*60*1000);
 assert.equal(C.quoteRemainingMs(start,t+5*60*1000),20*60*1000);
 assert.equal(C.quoteRemainingMs(start,t+25*60*1000),0);
 assert.equal(C.quoteRemainingMs(start,t+26*60*1000),0);
 assert.equal(C.quoteClock(25*60*1000),'25:00');
 assert.equal(C.quoteClock(79*1000),'01:19');
 assert.equal(C.quoteClock(0),'00:00');
});

test('geração mensal usa exclusivamente 128 vezes a potência em kWp',()=>{
  assert.equal(C.GENERATION_FACTOR,128);
  assert.equal(C.estimatedGeneration(products[0]),800);
  assert.equal(C.estimatedGeneration(products[2]),1024);
  assert.equal(C.estimatedGeneration({payload:{placas:6,moduloWp:625}}),480);
  assert.equal(C.estimatedGeneration({payload:{potenciaKwp:16.25}}),2080);
});
test('faixa de geração lista somente kits aprovados acima da demanda',()=>{
  const kits=[
    {id:'Z6',kind:'kit',active:true,approved:true,price:100,payload:{potenciaKwp:3.60}},
    {id:'D6',kind:'kit',active:true,approved:true,price:102,payload:{potenciaKwp:3.75}},
    {id:'D8',kind:'kit',active:true,approved:true,price:110,payload:{potenciaKwp:5}},
    {id:'LEGADO',kind:'kit',active:false,approved:false,price:5,payload:{potenciaKwp:7}}
  ];
  assert.deepEqual(C.matchingKits(kits,470).map(p=>p.id),['D6','D8']);
  assert.deepEqual(C.matchingKits(kits,1000),[]);
  assert.equal(C.recommendedKit(kits,470).id,'D6');
  assert.equal(C.recommendedKit(kits,1000),null);
});

test('projeto opcional segue tabela Grupo B e excepcional até 3 kW',()=>{
 const examples=[
  [2.4,'PRJ-B-003',300],[3,'PRJ-B-003',300],
  [4.2,'PRJ-B-010',400],[6.25,'PRJ-B-010',400],
  [8.4,'PRJ-B-010',400],[9.6,'PRJ-B-010',400],
  [10,'PRJ-B-020',500],[12,'PRJ-B-020',500],
  [14.4,'PRJ-B-020',500],[16.25,'PRJ-B-020',500],
  [20,'PRJ-B-030',600],[30,'PRJ-B-040',700],
  [40,'PRJ-B-050',800],[50,'PRJ-B-060',900],[60,'PRJ-B-060',900]
 ];
 for(const [kwp,id,price] of examples){
  assert.equal(C.projectForKwp(kwp)?.id,id);
  assert.equal(C.projectForKwp(kwp)?.price,price);
 }
 assert.equal(C.projectForKwp(0),null);
 assert.equal(C.projectForKwp(60.01),null);
});
test('cotação kit + projeto inclui serviço separadamente e preserva TRT por conta do contratante',()=>{
 const kit={id:'WW-500',kind:'kit',title:'Kit solar 500 kWh/mês',price:8527.68,
  active:true,approved:true,payload:{potenciaKwp:4.2}};
 const project={id:'PRJ-B-010',kind:'piece',title:'Projeto elétrico fotovoltaico Grupo B — acima de 3 e abaixo de 10 kW (TRT não inclusa; paga pelo contratante)',
  price:400,active:true,approved:true,payload:{categoria:'projetos'}};
 const result=C.sumCart([{id:kit.id,qty:1},{id:project.id,qty:1}],[kit,project]);
 assert.equal(result.cents,892768);
 const message=C.buildMessage('teste@exemplo.com',result.selected,result.cents);
 assert.match(message,/TRT não inclusa; paga pelo contratante/);
 assert.match(message,/R\$\s*8\.927,68/);
});
