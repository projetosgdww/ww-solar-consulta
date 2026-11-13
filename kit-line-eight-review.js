// WW Solar: linha comercial de oito kits. PRÉVIA ADMINISTRATIVA SOMENTE.
// Não homologa instalações, não escreve no banco e não autoriza venda.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WWSolarEightKits=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const specifications=Object.freeze([
  {code:'WW-300',target:300,module:'PAV-044',panels:4,inverter:'PAV-034',inverterCount:1},
  {code:'WW-500',target:500,module:'PAV-044',panels:7,inverter:'PAV-036',inverterCount:1},
  {code:'WW-800',target:800,module:'PAV-049',panels:10,inverter:'PAV-037',inverterCount:1},
  {code:'WW-1000',target:1000,module:'PAV-044',panels:14,inverter:'PAV-037',inverterCount:1},
  {code:'WW-1200',target:1200,module:'PAV-044',panels:16,inverter:'PAV-040',inverterCount:1},
  {code:'WW-1500',target:1500,module:'PAV-044',panels:20,inverter:'PAV-057',inverterCount:1,grid:'trifasica_380'},
  {code:'WW-1800',target:1800,module:'PAV-044',panels:24,inverter:'PAV-057',inverterCount:1,grid:'trifasica_380'},
  {code:'WW-2000',target:2000,module:'PAV-049',panels:26,inverter:'PAV-057',inverterCount:1,grid:'trifasica_380',candidate:true}
 ]);
 const modules={
  'PAV-044':{wp:600,imp:15.55,isc:16.43,vmp:38.6,voc:45.8,brand:'ZNSHINE'},
  'PAV-049':{wp:625,imp:15.25,isc:16.17,vmp:41.05,voc:49.29,brand:'DMEGC'}
 };
 const inverterData={
  'PAV-034':{kw:2.25,impMax:16,iscMax:24,maxDc:3160,mppts:2,inputs:4,micro:true},
  'PAV-036':{kw:3,impMax:15,iscMax:18,maxDc:null,mppts:1,inputs:1,dcVmax:500,mpptMin:50,mpptMax:450},
  'PAV-037':{kw:6,impMax:15,iscMax:18,maxDc:10200,mppts:2,inputs:2,dcVmax:600,mpptMin:90,mpptMax:550},
  'PAV-040':{kw:7.3,impMax:null,iscMax:null,maxDc:null,mppts:null,inputs:null},
  'PAV-057':{kw:15,impMax:32,iscMax:38.4,maxDc:30000,mppts:2,inputs:4,dcVmax:1100,mpptMin:180,mpptMax:1000}
 };
 const priceCents=p=>Math.round((Number(p)+Number.EPSILON)*100);
 function compose(spec,products){
  const map=new Map(products.filter(p=>p?.kind==='piece'&&p.active===true&&p.approved===true).map(p=>[p.id,p]));
  const m=modules[spec.module],inv=inverterData[spec.inverter];
  const kwp=spec.panels*m.wp/1000,gen=kwp*128;
  const gauge=spec.panels===4?4:6,rolls=Math.ceil(spec.panels*2.5/25);
  // Para micro, não orçar MC4 adicional automaticamente: chicotes próprios do fabricante.
  // Para strings, 1 pack MC4 de 2 pares é somente estimativa comercial.
  const bill=[
   ['Módulos',spec.module,spec.panels],
   ['Inversor',spec.inverter,spec.inverterCount],
   ['Fixação cerâmica para 4 módulos','PAV-029',Math.ceil(spec.panels/4)],
   ['Perfil alumínio 2,36m','PAV-024',spec.panels],
   ['Cabo solar vermelho '+gauge+' mm² (25m)',gauge===4?'PAV-001':'PAV-004',Math.max(1,rolls)],
   ['Cabo solar preto '+gauge+' mm² (25m)',gauge===4?'PAV-002':'PAV-003',Math.max(1,rolls)],
   ...(!inv.micro?[['Kit MC4 2 pares (estimativa)','PAV-007',1]]:[])
  ];
  let subtotalCents=0;const pending=[];
  const rows=bill.map(([label,sku,quantity])=>{
    const p=map.get(sku),price=Number(p?.price);
    if(!p||!Number.isFinite(price)||price<=0){pending.push(sku);return {label,sku,quantity,subtotal:null};}
    const cents=priceCents(price)*quantity;subtotalCents+=cents;
    return {label,sku,quantity,subtotal:cents/100};
  });
  const warnings=[];
  if(m.imp>inv.impMax)warnings.push('Corrente operacional '+m.imp+' A do módulo supera limite de '+inv.impMax+' A do inversor; confirmar aceitação formal do fabricante');
  if(m.isc>inv.iscMax)warnings.push('Corrente de curto '+m.isc+' A do módulo supera o limite '+inv.iscMax+' A da entrada');
  if(inv.impMax===null)warnings.push('Confirmar corrente operacional, Isc e modelo EXATO da variante SAJ 7,3 kW');
  if(inv.maxDc!==null&&kwp*1000>inv.maxDc)warnings.push('Potência FV '+kwp+' kWp acima da potência CC publicada para esta variante');
  if(inv.maxDc===null)warnings.push('Confirmar potência FV máxima da variante exata');
  if(inv.micro)warnings.push('Confirmar que o S2.25K-G4 comercial corresponde à ficha SUN-S225G4-EU-Q0 e conferir conectores e circuito CA');
  else warnings.push('Validar comprimento e distribuição das strings, tensão Vmp/Voc corrigida por temperaturas e conexões MPPT');
  if(spec.grid==='trifasica_380')warnings.push('Necessário padrão/rede trifásica compatível com inversor 380 V; confirmar exigências de conexão com a distribuidora');
  if(spec.candidate)warnings.push('Candidato comercial, inversor ainda não confirmado como escolha definitiva');
  warnings.push('Conferir estoque, proteção, fixação, extensão real dos cabos e dados térmicos da ficha do módulo');
  return {...spec,brand:m.brand,moduleWp:m.wp,kwp,generationKwhMonth:Math.round(gen*100)/100,
    inverterName:map.get(spec.inverter)?.title||spec.inverter,
    rows,pending,subtotal:pending.length?null:subtotalCents/100,
    previewPrice:pending.length?null:Math.round(subtotalCents*1.15)/100,
    engineeringPending:warnings,engineeringApproved:false,published:false,
    candidateSelectionStatus:'pendente_engenharia',gridRequired:spec.grid||'a_confirmar'};
 }
 return Object.freeze({specifications,compose});
});
