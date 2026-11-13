// WW Solar — regras comerciais puras, sem credenciais ou efeitos colaterais.
(function (root, factory) {
  const api=factory();
  if (typeof module === 'object' && module.exports) module.exports=api;
  else root.WWSolarClienteCore=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  function quantity(value) {
    const n=Number(value);
    if (!Number.isInteger(n)||n<1||n>99) throw Error('Quantidade inválida');
    return n;
  }
  function money(value) {
    const n=Number(value);
    if (!Number.isFinite(n)||n<0) throw Error('Preço inválido');
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
  }
  function sumCart(lines,catalog) {
    const byId=new Map(catalog.filter(p=>p&&p.active===true&&p.approved===true)
      .map(p=>[String(p.id),p]));
    const selected=[];
    let cents=0;
    for(const item of lines){
      const id=String(item.id);
      const qty=quantity(item.qty);
      const product=byId.get(id);
      if(!product) throw Error('Produto indisponível: '+id);
      const price=Number(product.price);
      if (!Number.isFinite(price)||price<=0) throw Error('Preço pendente: '+id);
      const unit=Math.round(price*100);
      if (Math.abs(unit/100-price)>0.001) throw Error('Preço inválido: '+id);
      cents +=unit*qty;
      selected.push({id,title:String(product.title),qty,unit,amount:unit*qty});
    }
    return {selected, cents};
  }
  // Regra comercial WW Solar: kWp instalado × 128 = kWh/mês estimados.
  // Nunca tratar estimativa como produção garantida.
  const GENERATION_FACTOR=128;
  function kitKwp(p) {
    const x=p?.payload||{};
    const kwp=Number(x.potenciaKwp);
    if(Number.isFinite(kwp)&&kwp>0&&kwp<=100)return kwp;
    const panels=Number(x.placas),wp=Number(x.moduloWp);
    if(Number.isInteger(panels)&&panels>0&&Number.isFinite(wp)&&wp>0)
      return panels*wp/1000;
    return null;
  }
  function estimatedGeneration(p) {
    const kwp=kitKwp(p);
    return kwp===null?null:Math.round(kwp*GENERATION_FACTOR*100)/100;
  }
  function matchingKits(products,target) {
    const t=Number(target);
    if(!Number.isFinite(t)||t<=0)return [];
    return (Array.isArray(products)?products:[])
      .filter(p=>p?.kind==='kit'&&p.active===true&&p.approved===true&&Number(p.price)>0)
      .map(p=>({product:p,generation:estimatedGeneration(p)}))
      .filter(x=>x.generation!==null&&x.generation>=t)
      .sort((a,b)=>a.generation-b.generation||Number(a.product.price)-Number(b.product.price)||String(a.product.id).localeCompare(String(b.product.id)))
      .map(x=>x.product);
  }
  function recommendedKit(products,target) {
    return matchingKits(products,target)[0]||null;
  }
  function buildMessage(userEmail,selected,cents) {
    const email=String(userEmail||'').trim();
    if(!email.includes('@')||selected.length<1) throw Error('Pedido incompleto');
    const lines=[
      'Olá! Gostaria de solicitar uma cotação WW Solar.',
      'Cliente: '+email,'',
      ...selected.map(p=>'- '+p.qty+' × '+p.title+(p.id.startsWith('WW-')?'':' ['+p.id+']')+' — '+money(p.amount/100)),
      '', 'Total de referência: '+money(cents/100),
      'Confirmar preço final, disponibilidade, frete e condições de pagamento.',
      'Pedido para negociação; não é compra concluída.'
    ];
    return lines.join('\n');
  }
  function cleanLines(input) {
    if(!Array.isArray(input)||input.length>25) throw Error('Carrinho excedeu limite');
    const byId=new Map();
    for(const item of input){
      const id=String(item.id||'');
      if(!/^[A-Za-z0-9-]{3,64}$/.test(id)) throw Error('Produto inválido');
      if(byId.has(id)) throw Error('Produto duplicado');
      byId.set(id,{id,qty:quantity(item.qty)});
    }
    return [...byId.values()];
  }
  const QUOTE_MINUTES=25;
  function quoteRemainingMs(updatedAt,nowMs) {
    const start=Date.parse(String(updatedAt||''));
    const now=Number(nowMs);
    if(!Number.isFinite(start)||!Number.isFinite(now)) return 0;
    return Math.max(0,(QUOTE_MINUTES*60*1000)-(now-start));
  }
  function quoteClock(remainingMs) {
    const seconds=Math.max(0,Math.ceil(Number(remainingMs||0)/1000));
    return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  }
  return Object.freeze({quantity,money,sumCart,GENERATION_FACTOR,kitKwp,estimatedGeneration,matchingKits,recommendedKit,buildMessage,cleanLines,quoteRemainingMs,quoteClock,QUOTE_MINUTES});
});
