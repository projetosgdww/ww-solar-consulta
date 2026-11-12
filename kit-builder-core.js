// WW Solar — Motor de pré-composição de kits. Não publica nem homologa materiais.
// Executável em Node (testes) e no navegador da administração.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WWSolarKitBuilder=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const MODULE_SKU='PAV-049';
  const PROFILE_SKU='PAV-024';
  const MC4_SKU='PAV-007'; // Embalagem com 2 PARES, confirmar descrição do fornecedor.
  const ROOFS=Object.freeze({
    ceramica:{label:'Telha cerâmica',sku:'PAV-029',note:'Validar prolongadores, perfis, grampos e telhado'},
    fibrocimento:{label:'Fibrocimento (madeira)',sku:'PAV-028',note:'Verificar se estrutura é de madeira ou metal: outro SKU pode ser necessário'},
    metalica:{label:'Telha metálica — minitrilho',sku:'PAV-032',note:'Minitrilho do kit de fixação substitui perfil longo; verificar quantidade e compatibilidade'}
  });
  const COUNTS=Object.freeze([4,6,8,10,12,14,16,18,20,22,24,26]);
  const PRESETS=Object.freeze(COUNTS.map((panels,i)=>Object.freeze({
    code:'WW-'+String(i+1).padStart(2,'0'),panels,module_id:MODULE_SKU
  })));
  function wattsFromTitle(title){
    const m=String(title||'').match(/\b(\d{3,4})\s*W\b/i);
    return m?Number(m[1]):null;
  }
  function inverterKw(title){
    const text=String(title||'').toUpperCase();
    if(!text.includes('INVERSOR')||/MICRO.?INVERSOR|OFF.?GRID|HIBRID|HÍBRID|BESS/.test(text))return null;
    const m=text.match(/(?:^|[^A-Z0-9])(\d+(?:[.,]\d+)?)\s*K(?:W\b|(?=-)|\b)/);
    return m?Number(m[1].replace(',','.')):null;
  }
  function category(p){return String(p?.payload?.categoria||'').toLowerCase();}
  function approvedPieces(products){
    return (Array.isArray(products)?products:[]).filter(p=>p?.kind==='piece'&&p?.active===true&&p?.approved===true);
  }
  function inverterCandidates(products,dcKwp){
    const target=dcKwp*0.77; // Pré-triagem COMERCIAL, não verifica limite CC/MPPT.
    return approvedPieces(products).filter(p=>category(p)==='inversores').map(p=>({
      sku:p.id,title:p.title,kw:inverterKw(p.title)
    })).filter(p=>p.kw!==null&&p.kw>=target)
      .sort((a,b)=>a.kw-b.kw||a.sku.localeCompare(b.sku));
  }
  function row(sku,qty,label,assumption=''){
    return {sku,qty,label,assumption};
  }
  function roundCents(v){return Math.round(Number(v)*100);}
  function costSummary(rows,costs){
    const map=new Map((costs||[]).map(x=>[String(x.sku),Number(x.unit_cost)]));
    let cents=0;const pending=[];
    const detailed=rows.map(r=>{
      if(!r.sku||!Number.isInteger(r.qty)||r.qty<=0){
        pending.push(r.label+' — quantidade/peça pendente');
        return {...r,unitCost:null,subtotal:null};
      }
      const unit=map.get(r.sku);
      if(!Number.isFinite(unit)||unit<=0){
        pending.push(r.label+' — custo real não informado');
        return {...r,unitCost:null,subtotal:null};
      }
      const sub=roundCents(unit)*r.qty;
      cents+=sub;
      return {...r,unitCost:roundCents(unit)/100,subtotal:sub/100};
    });
    return {rows:detailed,missing:pending,
      cost:pending.length?null:cents/100,
      sellingPrice:pending.length?null:Math.round(cents*1.15)/100,
      markupPercent:15
    };
  }
  function compose({panels,moduleSku=MODULE_SKU,roof='ceramica',
      dcInputs=null,redMeters=null,blackMeters=null,
      inverterSku='',products=[],costs=[]}={}){
    const n=Number(panels);
    if(!COUNTS.includes(n))throw Error('Modelo fora da linha de 12 kits');
    if(!Object.prototype.hasOwnProperty.call(ROOFS,roof))throw Error('Cobertura inválida');
    const pieces=approvedPieces(products);
    const byId=new Map(pieces.map(p=>[p.id,p]));
    const module=byId.get(moduleSku);
    if(!module||category(module)!=='modulos')throw Error('Módulo indisponível ou não aprovado');
    const wp=wattsFromTitle(module.title);
    if(!wp||wp<400||wp>1000)throw Error('Potência do módulo não identificada');
    const kwp=Math.round(n*wp)/1000;
    const recommended=inverterCandidates(pieces,kwp);
    const chosen=inverterSku?recommended.find(i=>i.sku===inverterSku):recommended[0];
    const nominalInverter=chosen||null; // Candidato, NUNCA homologado automaticamente.
    const roofPart=ROOFS[roof];
    const cableGauge=n>14?6:4; // Premissa do cliente; precisa confirmar queda de tensão/corrente.
    const cableSkuRed=cableGauge===6?'PAV-004':'PAV-001';
    const cableSkuBlack=cableGauge===6?'PAV-003':'PAV-002';
    const estimatedTotalMeters=3*n; // Estimativa logística, NÃO comprimento instalado.
    const red=redMeters===null?Math.ceil(estimatedTotalMeters/2):Number(redMeters);
    const black=blackMeters===null?Math.floor(estimatedTotalMeters/2):Number(blackMeters);
    if(!Number.isFinite(red)||!Number.isFinite(black)||red<0||black<0
       ||red+black<estimatedTotalMeters)throw Error('Metros de cabo insuficientes');
    // Quantidades por bobinas de 25 m, não metragem vendida fracionada.
    const countInput=dcInputs===null?null:Number(dcInputs);
    if(countInput!==null&&(!Number.isInteger(countInput)||countInput<1||countInput>24))
      throw Error('Quantidade de entradas CC em uso inválida');
    const rows=[
      row(module.id,n,'Módulos fotovoltaicos','Confirmar ficha técnica do módulo'),
      row(nominalInverter?.sku||null,1,'Inversor on-grid candidato','Fator 0,77 apenas como triagem; validação CC/MPPT e rede pendente'),
      row(roofPart.sku,Math.ceil(n/4),'Kit de fixação (4 módulos)','Arredondamento para cima; validar kit do fabricante'),
      ...(roof==='metalica'?[]:[row(PROFILE_SKU,Math.max(2,n),'Perfis de alumínio 2,36 m','Premissa de 1 perfil/módulo; conferir vão, dimensões e grampos')]),
      row(cableSkuRed,Math.ceil(red/25),'Cabo solar vermelho — rolo 25 m','Distribuição e percurso dependem de medição em campo'),
      row(cableSkuBlack,Math.ceil(black/25),'Cabo solar preto — rolo 25 m','Distribuição e percurso dependem de medição em campo'),
      row(countInput===null?null:MC4_SKU,
        countInput===null?null:Math.ceil(countInput/2),
        'MC4 — pacote de 2 pares','Número de entradas/strings CC usadas exige verificação física; conferir conectores já fornecidos')
    ];
    const missingPieces=rows.filter(r=>r.sku&&!byId.has(r.sku)).map(r=>r.label);
    const priced=costSummary(rows,costs);
    const risks=[
      'Inversor e arranjo: conferir Voc no frio, Vmp, Isc, Imp, MPPT, limites CC e rede/ramal',
      'Definir strings e quantidade REAL de entradas CC usadas; verificar MC4 do inversor',
      'Confirmar estrutura e perfis por ficha técnica, vãos e geometria do telhado',
      'Validar se a metragem e bitola dos cabos atendem aos circuitos e à queda de tensão',
      'Proteções CC/CA, aterramento, equipotencialização e dispositivos de manobra pendentes',
      'Verificar estoques, validade dos custos, disponibilidade de cada SKU e frete'
    ];
    if(!nominalInverter)risks.unshift('Nenhum inversor on-grid único atende à triagem 0,77 com os itens disponíveis');
    if(missingPieces.length)risks.unshift('Peças não disponíveis no catálogo: '+missingPieces.join(', '));
    return {
      code:PRESETS.find(x=>x.panels===n).code,panels:n,moduleSku,moduleWp:wp,kwp,
      dcToAcReference:Math.round(kwp*0.77*100)/100,roof,roofLabel:roofPart.label,
      suggestedInverter:nominalInverter,otherCandidates:recommended,
      cableGauge,estimatedTotalMeters,estimatedRedMeters:red,estimatedBlackMeters:black,
      dcInputs:countInput,rows:priced.rows,
      missingCosts:priced.missing,cost:missingPieces.length?null:priced.cost,
      previewPrice:missingPieces.length?null:priced.sellingPrice,
      markupPercent:15,risks,missingPieces,
      engineeringApproved:false,publicationAllowed:false,
      note:'PRÉ-COMPOSIÇÃO — não é projeto executivo nem orçamento aprovado.'
    };
  }
  return Object.freeze({PRESETS,ROOFS,MODULE_SKU,compose,inverterCandidates,
    costSummary,wattsFromTitle,inverterKw});
});