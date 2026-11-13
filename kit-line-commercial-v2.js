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
  // Escolhas comerciais informadas pelo administrador em 13/11/2026.
  // NÃO substituem homologação elétrica. Itens "excluded" seguem como drafts
  // no Supabase, porém não devem ser apresentados como propostas comerciais.
  const KIT_OVERRIDES=Object.freeze({
    'WW-Z600-16':{inverters:[['PAV-038',1]],reason:'7,3 kW solicitado; fator 0,77 exige 7,392 kW'},
    'WW-Z600-18':{excluded:true,reason:'Retirado da oferta nesta revisão'},
    'WW-Z600-20':{inverters:[['PAV-035',1],['PAV-036',1]],grid:'trifasica',reason:'6+3 kW; soma CA 9 kW abaixo de 9,24 kW pelo fator 0,77'},
    'WW-Z600-22':{inverters:[['PAV-035',2]],grid:'trifasica'},
    'WW-Z600-24':{inverters:[['PAV-035',2]],grid:'trifasica'},
    'WW-Z600-26':{inverters:[['PAV-035',2]],grid:'trifasica',reason:'6 kW por inversor; verificar rateio da potência entre os dois'},
    'WW-D625-06':{commerciallyReviewed:true,reason:'Revisão comercial solicitada; corrente de entrada do SAJ 3 kW continua com restrição técnica'},
    'WW-D625-08':{inverters:[['PAV-034',2]],reason:'Dois microinversores Deye; verificar quantidade e limites individuais das entradas'},
    'WW-D625-10':{inverters:[['PAV-035',1]]},
    'WW-D625-12':{inverters:[['PAV-035',1]]},
    'WW-D625-14':{inverters:[['PAV-038',1]]},
    'WW-D625-16':{excluded:true,reason:'Retirado da oferta nesta revisão'},
    'WW-D625-18':{inverters:[['PAV-035',1],['PAV-036',1]],grid:'trifasica'},
    'WW-D625-20':{inverters:[['PAV-035',2]],grid:'trifasica'},
    'WW-D625-22':{inverters:[['PAV-035',2]],grid:'trifasica'},
    'WW-D625-24':{inverters:[['PAV-035',2]],grid:'trifasica'},
    'WW-D625-26':{inverters:[['PAV-057',1]],grid:'trifasica',reason:'Inversor 15 kW trifásico 380 V; homologar variante/entradas CC'}
  });
  const MICRO_SKUS=new Set(['PAV-034']);
  function inverterCommercialPower(p){
    if(MICRO_SKUS.has(p?.id))return 2.25;
    if(p?.id==='PAV-057')return 15;
    return inverterKw(p?.title);
  }
  function allocation(panelCount,units){
    if(!units.length)return [];
    const total=units.reduce((s,u)=>s+u.kw,0);
    const base=units.map(u=>Math.floor(panelCount*u.kw/total));
    let rest=panelCount-base.reduce((s,n)=>s+n,0);
    const ranks=units.map((u,i)=>({i,frac:panelCount*u.kw/total-base[i]}))
      .sort((a,b)=>b.frac-a.frac||a.i-b.i);
    for(let i=0;i<rest;i++)base[ranks[i%ranks.length].i]++;
    return base;
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
    if(!preset)throw Error('Código fora da linha de 32 kits');
    if(!Array.isArray(products))throw Error('Catálogo inválido');
    const rule=KIT_OVERRIDES[code]||{};
    const allowed=products.filter(p=>p?.kind==='piece'&&p.active===true&&p.approved===true);
    const catalog=new Map(allowed.map(p=>[p.id,p]));
    const candidates=screenedOptions(products,preset);
    if(config.inverterSku){
      if(rule.inverters)throw Error('Esta composição possui inversores definidos pela revisão comercial; altere a regra primeiro');
      const manual=candidates.find(p=>p.sku===config.inverterSku);
      if(!manual)throw Error('Inversor fora da triagem mínima comercial');
      if(manual.electrical.status==='incompativel_preliminar')
        throw Error('Inversor incompatível nos parâmetros elétricos preliminares');
    }
    let selected=[];
    if(!rule.excluded){
      if(rule.inverters){
        for(const [sku,qty] of rule.inverters){
          const p=catalog.get(sku);
          if(!p)continue; // preço permanece pendente
          const kw=inverterCommercialPower(p);
          for(let i=0;i<qty;i++)selected.push({sku,kw,name:p.title,price:Number(p.price),
            micro:MICRO_SKUS.has(sku)});
        }
      }else{
        const chosen=config.inverterSku?candidates.find(p=>p.sku===config.inverterSku):candidates[0];
        if(config.inverterSku&&!chosen)throw Error('Inversor fora da triagem mínima comercial');
        if(chosen)selected=[{sku:chosen.sku,kw:chosen.acKw,name:chosen.name,price:chosen.price,micro:false}];
      }
    }
    const selectedCount=selected.length;
    const multiString=selectedCount>1&&selected.some(x=>!x.micro);
    const grid=rule.grid||(multiString?'trifasica':(selected.some(x=>x.sku==='PAV-057')?'trifasica':'a_confirmar'));
    const gridWarning=multiString&&grid!=='trifasica';
    const panelAllocation=allocation(preset.panels,selected);
    const inverterChecks=selected.map((p,i)=>{
      const slice={...preset,panels:panelAllocation[i],kwp:panelAllocation[i]*preset.moduleWp/1000};
      let check;
      if(p.micro){
        check={status:'sem_validacao_micro',reasons:['Validar tensão, corrente e quatro entradas por microinversor na ficha EXATA'],plannedStrings:null};
      }else{
        check=electricalScreen(slice,catalog.get(p.sku));
      }
      const threshold=Math.round(slice.kwp*inverterRatio*10000)/10000;
      return {...p,modules:panelAllocation[i],moduleKwp:slice.kwp,minimumAcKw:threshold,
        belowRatio:p.kw<threshold,electrical:check};
    });
    const gauge=preset.panels===4?4:6;
    const metersPerColor=preset.panels*2.5;
    const rollsPerColor=Math.max(1,Math.ceil(metersPerColor/25));
    const optionsPerInverter=inverterChecks.map(p=>{
      if(p.micro)return 4; // até 4 módulos por micro, confirmado somente na homologação
      const v=p.electrical?.plannedStrings?.inputsUsed;
      if(v)return v;
      const mppt=Number((p.name.match(/(\d+)\s*MPPT/i)||[])[1])||null;
      return mppt?Math.min(mppt,Math.ceil(p.modules/10)):null;
    });
    const hasInputEstimate=optionsPerInverter.length>0&&optionsPerInverter.every(x=>x!==null);
    const estimatedInputs=hasInputEstimate?optionsPerInverter.reduce((s,x)=>s+x,0):null;
    const inputs=config.dcInputsUsed===undefined?estimatedInputs:Number(config.dcInputsUsed);
    if(inputs!==null&&(!Number.isInteger(inputs)||inputs<1||inputs>24))
      throw Error('Quantidade de entradas CC inválida');
    const inverterCounts=new Map();
    for(const x of selected)inverterCounts.set(x.sku,(inverterCounts.get(x.sku)||0)+1);
    const rows=[
      ['Módulos',preset.moduleSku,preset.panels],
      ...[...inverterCounts].map(([sku,qty])=>['Inversor '+(MICRO_SKUS.has(sku)?'micro ':'')+'(candidato)',sku,qty]),
      ...(!selectedCount?[['Inversor pendente',null,1]]:[]),
      ['Fixação cerâmica para 4 módulos','PAV-029',Math.ceil(preset.panels/4)],
      ['Perfis de alumínio de 2,36 m','PAV-024',preset.panels],
      ['Cabo solar vermelho '+gauge+' mm² — rolo de 25 m',gauge===4?'PAV-001':'PAV-004',rollsPerColor],
      ['Cabo solar preto '+gauge+' mm² — rolo de 25 m',gauge===4?'PAV-002':'PAV-003',rollsPerColor],
      ['Conectores MC4 — embalagem 2 pares',inputs===null?null:'PAV-007',
        inputs===null?null:Math.ceil(inputs/2)]
    ];
    const pending=[];
    let totalCents=0;
    const lines=rows.map(([label,sku,quantity])=>{
      const product=catalog.get(sku),price=Number(product?.price);
      if(!product||!Number.isFinite(price)||price<=0||!Number.isInteger(quantity)||quantity<=0){
        pending.push(label);
        return {label,sku,quantity,unitPrice:null,subtotal:null};
      }
      const cents=roundCents(price)*quantity;
      totalCents+=cents;
      return {label,sku,quantity,unitPrice:roundCents(price)/100,subtotal:cents/100};
    });
    const warnings=[
      ...(rule.reason?[rule.reason]:[]),
      ...(gridWarning?['Dois inversores string exigem ligação trifásica']:[]),
      ...inverterChecks.flatMap(p=>[
        ...(p.belowRatio?['INVERSOR '+p.sku+': '+p.kw+' kW inferior a '+p.minimumAcKw+' kW de referência para seu grupo de módulos']:[]),
        ...p.electrical.reasons.map(x=>'INVERSOR '+p.sku+': '+x)
      ]),
      ...(!selectedCount?['Sem inversor incluído; definição pendente']:[]),
      'Confirmar modelos exatos, arranjo de strings/MPPT, Voc em baixa temperatura, Isc, Imp e conexão à rede',
      'Confirmar módulos por inversor; a divisão automática é comercial, não homologação',
      'Validar queda de tensão e seção dos cabos no percurso real',
      'Confirmar componentes mecânicos, conectores por entrada CC e disponibilidade de estoque'
    ];
    const technicallyBlocked=gridWarning||inverterChecks.some(p=>
      p.electrical.status==='incompativel_preliminar'||p.belowRatio);
    const status=rule.excluded?'fora_da_oferta':
      technicallyBlocked?'incompativel_preliminar':
      selectedCount===0?'sem_inversor_na_base':
      inverterChecks.some(p=>p.electrical.status!=='pendente_engenharia')?
        'ficha_modelo_pendente':'candidato_pendente';
    const fullPrice=!rule.excluded&&pending.length===0;
    return {...preset,excluded:rule.excluded===true,commerciallyReviewed:rule.commerciallyReviewed===true,
      ruleReason:rule.reason||null,gridRequired:grid,selectedInverters:inverterChecks,
      inverterCandidate:inverterChecks.length===1?{sku:inverterChecks[0].sku,name:inverterChecks[0].name,
        acKw:inverterChecks[0].kw,electrical:inverterChecks[0].electrical}:null,
      candidateOptions:candidates,
      allocationIsEstimated:inverterChecks.length>1,modulesPerInverter:panelAllocation,
      gauge,metersPerColor,rollsPerColor,
      dcInputsUsed:inputs,dcInputsEstimated:config.dcInputsUsed===undefined&&inputs!==null,
      dcInputsSource:config.dcInputsUsed!==undefined?'informado_manualmente':'estimativa_comercial_nao_homologada',
      preliminaryStrings:inverterChecks.length===1?inverterChecks[0].electrical.plannedStrings||null:null,
      candidateSelectionStatus:status,rows:lines,pending,
      subtotal:fullPrice?totalCents/100:null,
      previewPrice:fullPrice?Math.round(totalCents*markup)/100:null,
      commercialMarkupPercent:15,engineeringApproved:false,published:false,
      technicallyBlocked,engineeringPending:warnings};
  }
  return Object.freeze({FAMILY,KIT_OVERRIDES,allPresets,generationFactor,inverterRatio,compose,options,inverterKw,preliminaryStrings,electricalScreen,screenedOptions});
});
