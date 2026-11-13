// WW Solar — montagem comercial V2. Rascunhos; não homologa kits.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WWSolarKitLineV2=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const FAMILY=Object.freeze([
    {prefix:'WW-Z600',moduleSku:'PAV-044',moduleWp:600,min:6,max:26,brand:'ZNSHINE'},
    {prefix:'WW-D625',moduleSku:'PAV-049',moduleWp:625,min:6,max:26,brand:'DMEGC'},
    {prefix:'WW-D710',moduleSku:'PAV-054',moduleWp:710,min:4,max:22,brand:'DMEGC'}
  ]);
  const generationFactor=128, inverterRatio=.77, markup=1.15;
  const roundCents=n=>Math.round((Number(n)+Number.EPSILON)*100);
  const allPresets=Object.freeze(FAMILY.flatMap(f=>{
    const rows=[];
    for(let count=f.min;count<=f.max;count+=2){
      const kwp=count*f.moduleWp/1000;
      if(kwp>=2.75&&kwp<=16.25)rows.push(Object.freeze({
        code:f.prefix+'-'+String(count).padStart(2,'0'),panels:count,
        moduleSku:f.moduleSku,moduleWp:f.moduleWp,brand:f.brand,
        kwp,generationKwhMonth:Math.round(kwp*generationFactor*100)/100,
        inverterReferenceKw:Math.round(kwp*inverterRatio*10000)/10000
      }));
    }
    return rows;
  }));
  function inverterKw(title){
    const name=String(title||'').toUpperCase();
    if(!/INVERSOR/.test(name)||/OFF.?GRID|HIBRID|HÍBRID/.test(name))return null;
    // Um microinversor de 2,25 kW não deve ser atribuído automaticamente a uma string.
    if(/MICRO.?INVERSOR/.test(name))return null;
    const m=name.match(/(?:^|[^A-Z0-9])(\d+(?:[.,]\d+)?)\s*K(?:W\b|(?=-)|\b)/);
    return m?Number(m[1].replace(',','.')):null;
  }
  function options(products,requiredKw){
    return products.filter(p=>p&&p.kind==='piece'&&p.active===true&&p.approved===true
      &&String(p.payload?.categoria||'').toLowerCase()==='inversores')
      .map(p=>({...p,acKw:inverterKw(p.title)}))
      .filter(p=>p.acKw!==null&&p.acKw>=requiredKw)
      .sort((a,b)=>a.acKw-b.acKw||Number(a.price)-Number(b.price)||a.id.localeCompare(b.id));
  }
  function compose(code,products,config={}){
    const preset=allPresets.find(x=>x.code===code);
    if(!preset)throw Error('Configuração fora da linha de 32 kits');
    if(!Array.isArray(products))throw Error('Catálogo inválido');
    const map=new Map(products.filter(p=>p&&p.kind==='piece'&&p.active===true&&p.approved===true)
      .map(p=>[p.id,p]));
    const candidates=options(products,preset.inverterReferenceKw);
    const chosen=config.inverterSku?candidates.find(p=>p.id===config.inverterSku):candidates[0];
    if(config.inverterSku&&!chosen)throw Error('Inversor fora da triagem mínima de potência');
    const gauge=preset.panels===4?4:6;
    const eachColorMeters=preset.panels*2.5;
    const rollsPerColor=Math.max(1,Math.ceil(eachColorMeters/25));
    const inputs=config.dcInputsUsed===undefined?null:Number(config.dcInputsUsed);
    if(inputs!==null&&(!Number.isInteger(inputs)||inputs<1||inputs>24))
      throw Error('Quantidade de entradas CC inválida');
    const items=[
      ['Módulos',preset.moduleSku,preset.panels],
      ['Inversor candidato (potência apenas)',chosen?.id||null,1],
      ['Fixação cerâmica para 4 módulos','PAV-029',Math.ceil(preset.panels/4)],
      ['Perfis de alumínio de 2,36 m','PAV-024',preset.panels],
      ['Cabo solar vermelho '+gauge+' mm² — rolo de 25 m',gauge===4?'PAV-001':'PAV-004',rollsPerColor],
      ['Cabo solar preto '+gauge+' mm² — rolo de 25 m',gauge===4?'PAV-002':'PAV-003',rollsPerColor],
      ['Conectores MC4 — embalagem com 2 pares',inputs===null?null:'PAV-007',inputs===null?null:Math.ceil(inputs/2)]
    ];
    let subtotalCents=0;
    const pending=[];
    const rows=items.map(([label,sku,quantity])=>{
      const p=map.get(sku),price=Number(p?.price);
      if(!p||!Number.isFinite(price)||price<=0||!Number.isInteger(quantity)||quantity<=0){
        pending.push(label);
        return {label,sku,quantity,unitPrice:null,subtotal:null};
      }
      const cents=roundCents(price)*quantity;
      subtotalCents+=cents;
      return {label,sku,quantity,unitPrice:roundCents(price)/100,subtotal:cents/100};
    });
    return {...preset,gauge,metersPerColor:eachColorMeters,rollsPerColor,
      inverterCandidate:chosen?{sku:chosen.id,name:chosen.title,acKw:chosen.acKw}:null,
      candidateOptions:candidates.map(x=>({sku:x.id,name:x.title,acKw:x.acKw})),
      dcInputsUsed:inputs,rows,pending,
      subtotal:pending.length?null:subtotalCents/100,
      previewPrice:pending.length?null:Math.round(subtotalCents*markup)/100,
      commercialMarkupPercent:15,
      engineeringApproved:false,published:false,
      engineeringPending:[
        'Confirmar limites CC/MPPT, Isc e Imp por entrada, Voc corrigida por temperatura e topologia das strings',
        'Validar o percurso real, queda de tensão e bitola (4 ou 6 mm² são premissas comerciais)',
        'Confirmar entradas CC efetivamente usadas e conectores fornecidos pelo inversor',
        'Confirmar grampos, perfis e suporte estrutural para cada módulo (DMEGC 710 W com moldura 33 mm)',
        'Conferir estoque e frete'
      ]};
  }
  return Object.freeze({FAMILY,allPresets,generationFactor,inverterRatio,compose,options,inverterKw});
});
