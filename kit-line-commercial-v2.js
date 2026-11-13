// WW Solar — montagem comercial V2. Rascunhos; não homologa kits.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WWSolarKitLineV2=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const FAMILY=Object.freeze([
    {prefix:'WW-Z600',moduleSku:'PAV-044',moduleWp:600,min:6,max:26,brand:'ZNSHINE',imp:15.55,isc:16.43,vmp:38.60,voc:45.80,bifacial:false},
    {prefix:'WW-D625',moduleSku:'PAV-049',moduleWp:625,min:6,max:26,brand:'DMEGC',imp:15.25,isc:16.17,vmp:41.05,voc:49.29,bifacial:true},
    {prefix:'WW-D710',moduleSku:'PAV-054',moduleWp:710,min:4,max:22,brand:'DMEGC',imp:17.45,isc:18.52,vmp:40.76,voc:48.82,bifacial:true}
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
        kwp,imp:f.imp,isc:f.isc,vmp:f.vmp,voc:f.voc,bifacial:f.bifacial,generationKwhMonth:Math.round(kwp*generationFactor*100)/100,
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
      // Decisão comercial: excluir inversores de 10 e 10,5 kW dos kits por enquanto.
      // Permanecem disponíveis como peças avulsas; não alterar o catálogo.
      .filter(p=>p.acKw!==null&&p.acKw>=requiredKw&&p.acKw!==10&&p.acKw!==10.5&&p.acKw!==15)
      .sort((a,b)=>a.acKw-b.acKw||Number(a.price)-Number(b.price)||a.id.localeCompare(b.id));
  }
  // Dados obtidos das fichas encaminhadas em 13/11/2026. A descrição comercial
  // não demonstra equivalência exata de variante/modelo; por isso a situação
  // nunca se torna "aprovado" automaticamente.
  const inverterElectricalEvidence=Object.freeze({
    'PAV-036':Object.freeze({datasheet:'SAJ R5-3K-S1-15 (modelo comercial precisa conferência)',maxOperatingCurrentA:15,maxShortCircuitA:18,maxDcWp:5310,mpptMinV:50,mpptMaxV:450,maxDcVoltageV:500,mpptCount:1,startupV:50,modelExact:false}),
    'PAV-038':Object.freeze({datasheet:'Deye SUN-7.3K-G05P1-EU-CM2 (confirmar sufixo do produto)',maxOperatingCurrentA:18,maxShortCircuitA:27,maxDcWp:10950,mpptMinV:70,mpptMaxV:500,maxDcVoltageV:550,mpptCount:2,startupV:80,modelExact:false}),
    'PAV-040':Object.freeze({datasheet:'SAJ R5-7.3K-S2-15 (confirmar variante do produto)',maxOperatingCurrentA:15,maxShortCircuitA:18,maxDcWp:15000,mpptMinV:90,mpptMaxV:550,maxDcVoltageV:600,mpptCount:2,startupV:100,modelExact:false})
  });
  // Planejamento STC de 1 a 2 strings, uma string por MPPT.
  // Reserva de tensão de 15% para favorecer divisão no rascunho NÃO substitui
  // correção obrigatória da Voc com a temperatura mínima do projeto.
  function preliminaryStrings(preset,evidence){
    const count=evidence.mpptCount;
    if(!Number.isInteger(count)||count<1)return null;
    const possibilities=[];
    for(let s=1;s<=Math.min(2,count);s++){
      const base=Math.floor(preset.panels/s),extra=preset.panels%s;
      const lengths=Array.from({length:s},(_,i)=>base+(i<extra?1:0));
      if(lengths.some(n=>n<1))continue;
      const strings=lengths.map((modules,i)=>({
        mppt:i+1,modules,
        vmpStcV:Math.round(modules*preset.vmp*100)/100,
        vocStcV:Math.round(modules*preset.voc*100)/100,
        impStcA:preset.imp,iscStcA:preset.isc
      }));
      const ok=strings.every(x=>x.vmpStcV>=evidence.mpptMinV
        &&x.vmpStcV<=evidence.mpptMaxV
        &&x.vocStcV<=evidence.maxDcVoltageV
        &&x.vmpStcV>=evidence.startupV);
      if(ok)possibilities.push({
        strings,inputsUsed:s,
        headroomStc:Math.min(...strings.map(x=>evidence.maxDcVoltageV-x.vocStcV)),
        prefersColdMargin:strings.every(x=>x.vocStcV<=evidence.maxDcVoltageV*.85)
      });
    }
    return possibilities.find(x=>x.prefersColdMargin)||possibilities[0]||null;
  }
  function electricalScreen(preset,product){
    if(!product)return {status:'sem_inversor',reasons:['Não existe inversor com potência nominal suficiente na base']};
    const evidence=inverterElectricalEvidence[product.id];
    if(!evidence)return {status:'sem_ficha_modelo',reasons:['Ficha elétrica do modelo/SKU não foi associada ao catálogo'],datasheet:null};
    const reasons=[];
    if(preset.imp>evidence.maxOperatingCurrentA)
      reasons.push('Imp do módulo '+preset.imp+' A excede corrente operacional de entrada '+evidence.maxOperatingCurrentA+' A');
    if(evidence.maxShortCircuitA!==null&&preset.isc>evidence.maxShortCircuitA)
      reasons.push('Isc do módulo '+preset.isc+' A excede limite de curto-circuito '+evidence.maxShortCircuitA+' A');
    if(preset.kwp*1000>evidence.maxDcWp)
      reasons.push('Potência CC '+preset.kwp+' kWp excede limite nominal da ficha de '+evidence.maxDcWp+' Wp');
    const planned=preliminaryStrings(preset,evidence);
    if(!planned)reasons.push('Não foi encontrada divisão em até '+evidence.mpptCount+' strings com tensões STC dentro das faixas da ficha');
    // Valores de Voc e Vmp de UMA string, ainda não configurada, não são suficientes
    // para validar inversores. Fica pendente stringing e Voc em baixa temperatura.
    if(reasons.length)return {status:'incompativel_preliminar',reasons,datasheet:evidence.datasheet,plannedStrings:planned};
    const pending=['Confirmar equivalência exata entre o SKU comercial e o modelo da ficha','Configurar strings por MPPT, conferir Vmp, Voc corrigida para temperatura mínima e compatibilidade dos conectores'];
    if(preset.bifacial)pending.push('Verificar ganho bifacial e limites de corrente da entrada nas condições reais');
    return {status:'pendente_engenharia',reasons:pending,datasheet:evidence.datasheet,plannedStrings:planned};
  }
  function screenedOptions(products,preset){
    return options(products,preset.inverterReferenceKw).map(p=>({
      sku:p.id,name:p.title,acKw:p.acKw,price:Number(p.price),
      electrical:electricalScreen(preset,p)
    }));
  }
  function compose(code,products,config={}){
    const preset=allPresets.find(x=>x.code===code);
    if(!preset)throw Error('Configuração fora da linha de 32 kits');
    if(!Array.isArray(products))throw Error('Catálogo inválido');
    const map=new Map(products.filter(p=>p&&p.kind==='piece'&&p.active===true&&p.approved===true)
      .map(p=>[p.id,p]));
    const candidates=screenedOptions(products,preset);
    const validCandidates=candidates.filter(p=>p.electrical.status==='pendente_engenharia');
    const chosen=config.inverterSku?candidates.find(p=>p.sku===config.inverterSku):validCandidates[0];
    const candidateSelectionStatus=chosen?'candidato_pendente':(candidates.length?'ficha_modelo_pendente':'sem_inversor_na_base');
    if(config.inverterSku&&!chosen)throw Error('Inversor fora da triagem mínima de potência');
    if(chosen?.electrical.status==='incompativel_preliminar')throw Error('Inversor incompatível nos parâmetros elétricos preliminares');
    const gauge=preset.panels===4?4:6;
    const eachColorMeters=preset.panels*2.5;
    const rollsPerColor=Math.max(1,Math.ceil(eachColorMeters/25));
    const automaticInputs=chosen?.electrical.plannedStrings?.inputsUsed??null;
    const inputs=config.dcInputsUsed===undefined?automaticInputs:Number(config.dcInputsUsed);
    if(inputs!==null&&(!Number.isInteger(inputs)||inputs<1||inputs>24))
      throw Error('Quantidade de entradas CC inválida');
    const items=[
      ['Módulos',preset.moduleSku,preset.panels],
      ['Inversor candidato (triagem elétrica preliminar)',chosen?.sku||null,1],
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
      inverterCandidate:chosen?{sku:chosen.sku,name:chosen.name,acKw:chosen.acKw,electrical:chosen.electrical}:null,
      candidateOptions:candidates,
      dcInputsUsed:inputs,dcInputsEstimated:config.dcInputsUsed===undefined&&inputs!==null,
      preliminaryStrings:chosen?.electrical.plannedStrings||null,
      candidateSelectionStatus,rows,pending,
      subtotal:pending.length?null:subtotalCents/100,
      previewPrice:pending.length?null:Math.round(subtotalCents*markup)/100,
      commercialMarkupPercent:15,
      engineeringApproved:false,published:false,
      engineeringPending:[
        'Confirmar limites CC/MPPT, Isc e Imp por entrada, Voc corrigida por temperatura e topologia das strings',
        'Validar o percurso real, queda de tensão e bitola (4 ou 6 mm² são premissas comerciais)',
        'Confirmar entradas CC efetivamente usadas e conectores fornecidos pelo inversor; o cálculo automático é SOMENTE estimativa de orçamento',
        'Confirmar grampos, perfis e suporte estrutural para cada módulo (DMEGC 710 W com moldura 33 mm)',
        'Conferir estoque e frete'
      ]};
  }
  return Object.freeze({FAMILY,allPresets,generationFactor,inverterRatio,compose,options,inverterKw,preliminaryStrings,electricalScreen,screenedOptions});
});
