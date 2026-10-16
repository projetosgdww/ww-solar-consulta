(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {kits:[],config:{whatsappNumero:''},meta:{},target:750,mode:'geracao',query:'',inverter:'todos',visible:9,recommended:null,current:null};
  const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
  const number = n => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(n);
  const decimal = n => new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isApproved = kit => kit.precoAprovado === true && Number.isFinite(kit.precoVendaAvista) && kit.precoVendaAvista > 0;
  const phone = () => String(state.config.whatsappNumero || '').replace(/\D/g,'');
  const availableForRecommendation = kit => kit.disponibilidade !== 'indisponivel';
  const priceText = kit => isApproved(kit) ? money(kit.precoVendaAvista) : 'Sob consulta';
  const statusText = kit => ({disponivel:'Disponível',indisponivel:'Indisponível',a_confirmar:'A confirmar',sob_consulta:'Sob consulta'})[kit.disponibilidade] || 'A confirmar';
  const power = kit => decimal(kit.potenciaKwp) + ' kWp';
  const inverter = kit => `${kit.inversor} · ${number(kit.quantidadeInversores)} × ${decimal(kit.inversorKwUnidade)} kW`;
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let toastTimeout;
  function toast(message){ const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),3500); }
  function matchingKit() {
    const ordered = state.kits.filter(availableForRecommendation).sort((a,b)=>a.geracaoMensalKwh-b.geracaoMensalKwh || a.potenciaKwp-b.potenciaKwp);
    return ordered.find(k=>k.geracaoMensalKwh>=state.target) || ordered.at(-1) || null;
  }
  function setTarget(v) {
    const input=Number(v);
    if(!Number.isFinite(input)) return;
    state.target=Math.max(300,Math.min(14600,Math.round(input)));
    $('target-input').value=state.target;
    $('target-slider').value=state.target;
    $('target-slider').style.setProperty('--range-progress',((state.target-300)/(14600-300)*100)+'%');
    updateResult();
  }
  function updateResult(){
    const kit=matchingKit();state.recommended=kit;
    if(!kit){$('result-title').textContent='Nenhum kit encontrado';$('result-description').textContent='Não há configurações cadastradas.';$('result-button').disabled=true;return;}
    $('result-button').disabled=false;
    const covers=kit.geracaoMensalKwh>=state.target;
    $('result-status').textContent=covers?'ATENDE À REFERÊNCIA':'ABAIXO DO SOLICITADO';
    $('result-title').textContent=`Kit ${power(kit)}`;
    $('result-description').textContent=`${kit.id} · Módulos de ${number(kit.moduloWp)} Wp`;
    $('result-generation').textContent=number(kit.geracaoMensalKwh);
    $('result-power').textContent=power(kit);
    $('result-panels').textContent=number(kit.placas)+' × '+number(kit.moduloWp)+' Wp';
    $('result-inverter').textContent=kit.inversor;
    $('result-price').textContent=priceText(kit);
  }
  function renderCard(kit){
    const badge=kit.disponibilidade==='indisponivel'?'Indisponível':isApproved(kit)?'Preço confirmado':'Cotação a confirmar';
    return `<article class="kit-card"><div class="kit-top"><span class="kit-id">${escapeHtml(kit.id)}</span><span class="kit-status">${escapeHtml(badge)}</span></div><h3>${decimal(kit.potenciaKwp)} <span>kWp</span></h3><p class="kit-generation"><strong>${number(kit.geracaoMensalKwh)} kWh/mês</strong> estimados*</p><div class="kit-facts"><div><span>Módulos</span><strong>${number(kit.placas)} × ${number(kit.moduloWp)} Wp</strong></div><div><span>Inversor</span><strong>${escapeHtml(kit.inversor)}</strong></div><div><span>Configuração</span><strong>${number(kit.quantidadeInversores)} × ${decimal(kit.inversorKwUnidade)} kW</strong></div></div><div class="kit-bottom"><div><small>Valor dos equipamentos</small><b>${escapeHtml(priceText(kit))}</b></div><button type="button" class="details-button" data-detail="${escapeHtml(kit.id)}" aria-label="Ver detalhes do ${escapeHtml(kit.id)}">Ver detalhes ↗</button></div></article>`;
  }
  function filteredKits(){
    const q=normalize(state.query);
    return state.kits.filter(k => (state.inverter==='todos'||k.inversor===state.inverter) && (!q || normalize(`${k.id} ${k.potenciaKwp} ${decimal(k.potenciaKwp)} ${k.inversor} ${k.geracaoMensalKwh} ${k.placas} ${k.moduloWp}`).includes(q))).sort((a,b)=>a.geracaoMensalKwh-b.geracaoMensalKwh || a.potenciaKwp-b.potenciaKwp);
  }
  function renderCatalog(){
    const kits=filteredKits();
    $('result-count').textContent=`${kits.length} ${kits.length===1?'kit encontrado':'kits encontrados'} · Geração mensal conforme a base técnica*`;
    $('kit-grid').innerHTML=kits.length ? kits.slice(0,state.visible).map(renderCard).join('') : '<div class="empty-state"><h3>Nenhum kit encontrado</h3><p>Tente pesquisar outra potência, inversor ou identificação.</p></div>';
    $('more-kits').hidden=kits.length<=state.visible;
  }
  function buildMessage(kit){
    return [`Olá! Gostaria de consultar o valor e a disponibilidade deste kit fotovoltaico da WW Solar:`,``,`• Referência: ${kit.id}`,`• Potência: ${power(kit)}`,`• Geração mensal estimada na tabela: ${number(kit.geracaoMensalKwh)} kWh`, `• Módulos: ${number(kit.placas)} unidades de ${number(kit.moduloWp)} Wp`,`• Inversor: ${inverter(kit)}`,`• Preço anunciado: ${isApproved(kit)?money(kit.precoVendaAvista):'sob consulta'}`,``,`A cotação é somente de equipamentos, sem instalação, projeto, homologação ou frete. Poderia confirmar o preço atual, estoque e frete?`].join('\n');
  }
  const detail = (label,value) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
  function openDetails(id){
    const kit=state.kits.find(k=>k.id===id);if(!kit)return;
    state.current=kit;
    $('dialog-title').textContent=`Kit ${power(kit)}`;
    $('dialog-subtitle').textContent=`${kit.id} · ${number(kit.moduloWp)} Wp por módulo`;
    $('dialog-details').innerHTML=[detail('Geração mensal estimada',`${number(kit.geracaoMensalKwh)} kWh`),detail('Potência do kit',power(kit)),detail('Módulos fotovoltaicos',`${number(kit.placas)} × ${number(kit.moduloWp)} Wp`),detail('Marca/modelo do inversor',kit.inversor),detail('Quantidade de inversores',number(kit.quantidadeInversores)),detail('Potência por inversor',`${decimal(kit.inversorKwUnidade)} kW`)].join('');
    $('dialog-price').textContent=priceText(kit);
    $('dialog-availability').textContent='Estoque: '+statusText(kit);
    const hasPhone=phone().length>=12 && phone().length<=13;
    $('dialog-contact').innerHTML= hasPhone?'Solicitar via WhatsApp <span>↗</span>':'Copiar solicitação <span>↗</span>';
    $('dialog-hint').textContent=hasPhone?'A confirmação de preço, estoque e frete será feita no atendimento.':'WhatsApp comercial ainda não configurado. Você pode copiar o texto da solicitação.';
    $('kit-dialog').showModal();
  }
  async function contact(){
    if(!state.current)return;
    const text=buildMessage(state.current), num=phone();
    if(num.length>=12 && num.length<=13){window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');return;}
    try{await navigator.clipboard.writeText(text);toast('Solicitação copiada. Envie ao contato comercial.');}
    catch {toast('Não foi possível copiar automaticamente.');}
  }
  function setMode(mode){
    state.mode=mode;
    document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $('target-label').textContent=mode==='consumo'?'Qual é seu consumo mensal?':'Quanto você deseja gerar por mês?';
    $('target-description').textContent=mode==='consumo'?'Informe o consumo médio da sua conta para encontrar um kit de referência.':'Selecione a geração mensal estimada que procura.';
  }
  function bindEvents(){
    $('target-slider').addEventListener('input',e=>setTarget(e.target.value));
    $('target-input').addEventListener('input',e=>{const n=Number(e.target.value);if(e.target.value!==''&&n>=300&&n<=14600){state.target=n;$('target-slider').value=n;$('target-slider').style.setProperty('--range-progress',((n-300)/(14600-300)*100)+'%');updateResult();}});
    $('target-input').addEventListener('change',e=>setTarget(e.target.value));
    document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
    $('result-button').addEventListener('click',()=>state.recommended && openDetails(state.recommended.id));
    $('kit-search').addEventListener('input',e=>{state.query=e.target.value;state.visible=9;renderCatalog();});
    $('inverter-filter').addEventListener('change',e=>{state.inverter=e.target.value;state.visible=9;renderCatalog();});
    $('clear-filters').addEventListener('click',()=>{$('kit-search').value='';$('inverter-filter').value='todos';state.query='';state.inverter='todos';state.visible=9;renderCatalog();});
    $('more-kits').addEventListener('click',()=>{state.visible+=9;renderCatalog();});
    $('kit-grid').addEventListener('click',e=>{const button=e.target.closest('button[data-detail]');if(button)openDetails(button.dataset.detail);});
    $('dialog-close').addEventListener('click',()=>$('kit-dialog').close());
    $('dialog-dismiss').addEventListener('click',()=>$('kit-dialog').close());
    $('dialog-contact').addEventListener('click',contact);
    $('kit-dialog').addEventListener('click',e=>{if(e.target===$('kit-dialog'))$('kit-dialog').close();});
  }
  async function load(){
    try{
      const [catalogResponse,configResponse]=await Promise.all([fetch('./dados/catalogo-publico.json',{cache:'no-store'}),fetch('./dados/config-publica.json',{cache:'no-store'})]);
      if(!catalogResponse.ok||!configResponse.ok)throw new Error('Não foi possível ler os dados.');
      const catalog=await catalogResponse.json(),config=await configResponse.json();
      if(!Array.isArray(catalog.kits))throw new Error('Catálogo inválido.');
      state.kits=catalog.kits.filter(k=> typeof k.id==='string' && Number.isFinite(k.geracaoMensalKwh) && Number.isFinite(k.potenciaKwp));
      state.config=config;state.meta=catalog;
      $('kit-total').textContent=number(state.kits.length);
      $('catalog-date').textContent='Base técnica: '+(catalog.atualizadoEm||'data a confirmar');
      $('target-slider').max=Math.max(300,...state.kits.map(k=>k.geracaoMensalKwh));
      $('target-input').max=$('target-slider').max;
      // Geração definida pela tabela: pode exceder ou ficar abaixo das opções convencionais.
      const max=Number($('target-slider').max);
      const rangeEnd=document.querySelector('.slider-endpoints span:last-child');rangeEnd.textContent=number(max)+' kWh';
      $('target-slider').addEventListener('input',e=>e.target.style.setProperty('--range-progress',((Number(e.target.value)-300)/(max-300)*100)+'%'));
      bindEvents();
      setTarget(state.target);renderCatalog();
    }catch(e){
      $('result-count').textContent='Não foi possível carregar os dados do catálogo.';
      $('kit-grid').innerHTML='<div class="empty-state"><h3>Catálogo temporariamente indisponível</h3><p>Confira a publicação dos arquivos JSON e atualize a página.</p></div>';
      $('result-title').textContent='Não foi possível carregar';
      $('result-description').textContent='Confira a conexão e tente novamente.';
      $('result-button').disabled=true;
      console.error('WW Solar:',e);
    }
  }
  document.addEventListener('DOMContentLoaded',load);
})();