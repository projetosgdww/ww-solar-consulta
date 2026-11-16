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
  // Valores do serviço de projeto informados pelo proprietário (13/11/2026).
  // A TRT não integra estes preços e é paga separadamente pelo contratante.
  const PROJECT_TIERS=Object.freeze([
    Object.freeze({upTo:3,id:'PRJ-B-003',price:300}),
    Object.freeze({upTo:10,id:'PRJ-B-010',price:400}),
    Object.freeze({upTo:20,id:'PRJ-B-020',price:500}),
    Object.freeze({upTo:30,id:'PRJ-B-030',price:600}),
    Object.freeze({upTo:40,id:'PRJ-B-040',price:700}),
    Object.freeze({upTo:50,id:'PRJ-B-050',price:800}),
    Object.freeze({upTo:60,id:'PRJ-B-060',price:900})
  ]);
  function projectForKwp(kwp) {
    const n=Number(kwp);
    if(!Number.isFinite(n)||n<=0)return null;
    if(n<=3)return PROJECT_TIERS[0];
    // Faixas do material: menos de 10, 10 a 20, 20 a 30...
    for(let i=1;i<PROJECT_TIERS.length;i++)
      if(i===PROJECT_TIERS.length-1?n<=PROJECT_TIERS[i].upTo:n<PROJECT_TIERS[i].upTo)
        return PROJECT_TIERS[i];
    return null;
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
  // Cada projeto de faixa pode pertencer a kits diferentes no mesmo carrinho.
  // linkedKits é a associação explícita; standaloneQty guarda projetos avulsos.
  // O SKU continua sendo o produto do catálogo, e a quantidade continua compatível
  // com a validação de preços no servidor.
  function setProjectForKit(input,kitId,projectId,include) {
    const lines=cleanLines(input);
    if(!lines.some(x=>x.id===kitId))throw Error('Kit não está no carrinho');
    if(!/^PRJ-B-[0-9]{3}$/.test(projectId))throw Error('Projeto de faixa inválido');
    const project=lines.find(x=>x.id===projectId);
    const standalone=project?(project.standaloneQty??project.qty):0;
    const linked=project?.linkedKits||[];
    const nextLinks=include
      ?(linked.includes(kitId)?linked:[...linked,kitId])
      :linked.filter(id=>id!==kitId);
    const qty=standalone+nextLinks.length;
    if(qty>99)throw Error('Limite de 99 projetos por faixa');
    const next=lines.filter(x=>x.id!==projectId);
    if(qty>0){
      if(!project&&next.length>=25)throw Error('Limite de 25 tipos de produto');
      next.push({id:projectId,qty,standaloneQty:standalone,linkedKits:nextLinks});
    }
    return cleanLines(next);
  }
  function removeKitProjectLinks(input,kitId) {
    const lines=cleanLines(input);
    const next=[];
    for(const x of lines){
      if(!/^PRJ-B-[0-9]{3}$/.test(x.id)||!x.linkedKits?.includes(kitId)){
        if(x.id!==kitId&&x.id!=='PRJ-'+kitId)next.push(x);
        continue;
      }
      const linkedKits=x.linkedKits.filter(id=>id!==kitId);
      const qty=x.standaloneQty+linkedKits.length;
      if(qty>0)next.push({...x,qty,linkedKits});
    }
    return cleanLines(next);
  }
  // Projetos explicitamente vinculados são ocultados como linha separada.
  // Se houver projeto avulso no mesmo SKU, mostrar só a quantidade avulsa.
  // Um PRJ-B legado sem linkedKits continua avulso, sem associação presumida.
  function cartDisplayRows(selected,catalog,rawLines=[]) {
    const items=Array.isArray(selected)?selected:[];
    const byId=new Map((Array.isArray(catalog)?catalog:[]).map(p=>[p.id,p]));
    const chosen=new Set(items.map(x=>x.id));
    const raw=new Map((Array.isArray(rawLines)?rawLines:[]).map(x=>[x.id,x]));
    return items.flatMap(item=>{
      if(item.id.startsWith('PRJ-WW-')){
        const project=byId.get(item.id),kitId=project?.payload?.kitCodigo;
        if(kitId&&chosen.has(kitId))return [];
      }
      const source=raw.get(item.id);
      if(item.id.startsWith('PRJ-B-')&&Array.isArray(source?.linkedKits)){
        const standalone=Number(source.standaloneQty)||0;
        if(standalone===0)return [];
        return [{...item,qty:standalone,amount:item.unit*standalone}];
      }
      return [item];
    });
  }
  // Complemento de WhatsApp: deixa inequívoco qual kit recebeu cada projeto.
  // O valor permanece no item PRJ-B do carrinho, calculado pelo servidor.
  function linkedProjectNote(input,catalog) {
    const lines=cleanLines(input);
    const byId=new Map((Array.isArray(catalog)?catalog:[]).map(p=>[p.id,p]));
    const notes=[];
    for(const line of lines){
      if(!line.id.startsWith('PRJ-B-')||!line.linkedKits?.length)continue;
      for(const kitId of line.linkedKits){
        const kit=byId.get(kitId),project=byId.get(line.id);
        if(kit?.kind!=='kit'||project?.payload?.categoria!=='projetos')
          throw Error('Vínculo de projeto indisponível');
        notes.push('• '+kit.title+' ['+kit.id+'] — '+line.id);
      }
    }
    return notes.length
      ?'Projetos elétricos associados a cada kit (TRT não inclusa):\n'+notes.join('\n')
      :'';
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
      const qty=quantity(item.qty);
      const line={id,qty};
      if(id.startsWith('PRJ-B-')&&
        (Object.prototype.hasOwnProperty.call(item,'linkedKits')||
         Object.prototype.hasOwnProperty.call(item,'standaloneQty'))){
        if(!Array.isArray(item.linkedKits)||item.linkedKits.length>25)
          throw Error('Vínculos de projeto inválidos');
        const linkedKits=[];
        for(const kitId of item.linkedKits){
          if(typeof kitId!=='string'||!/^[A-Za-z0-9-]{3,64}$/.test(kitId)||
             linkedKits.includes(kitId))throw Error('Vínculo de kit inválido');
          linkedKits.push(kitId);
        }
        const standalone=Number(item.standaloneQty);
        if(!Number.isInteger(standalone)||standalone<0||standalone>99||
           standalone+linkedKits.length!==qty)
          throw Error('Quantidade de projetos inconsistente');
        line.standaloneQty=standalone;
        line.linkedKits=linkedKits;
      }
      byId.set(id,line);
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
  return Object.freeze({quantity,money,sumCart,PROJECT_TIERS,projectForKwp,GENERATION_FACTOR,kitKwp,estimatedGeneration,matchingKits,recommendedKit,cartDisplayRows,setProjectForKit,removeKitProjectLinks,linkedProjectNote,buildMessage,cleanLines,quoteRemainingMs,quoteClock,QUOTE_MINUTES});
});
