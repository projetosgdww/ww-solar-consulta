(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C=window.WWSolarClienteCore, cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
  const S={db:null,user:null,admin:false,catalog:[],lines:[],kind:'kit',category:'all',query:'',target:300,cartUpdatedAt:null,cartInvalid:false,saveQueue:Promise.resolve(),timer:null,toastTimer:null,drawerOpen:false,expiryNotified:false,checkoutPending:false,orderKey:null};
  const status=(m,id='client-action-status')=>{$(id).textContent=m;};
  const show=(id,visible)=>{$(id).hidden=!visible;};
  const euro = v => C.money(v);
  function el(tag,text,cls){
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=String(text);
    if(cls)node.className=cls;
    return node;
  }
  function btn(text,fn,cls='button button-outline'){
    const b=el('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;
  }
  const configOK=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||'')
     && /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(cfg.publishableKey||'')
     && /^55\d{10,11}$/.test(cfg.whatsapp||'');
  function available(){return S.catalog.filter(p=>p.active===true&&p.approved===true&&Number(p.price)>0);}
  async function authorized(user){
    if(user?.app_metadata?.wwsolar_role==='admin')return true;
    const {data,error}=await S.db.from('wwsolar_client_access')
      .select('active').eq('user_id',user.id).maybeSingle();
    return !error&&data?.active===true;
  }
  async function enter(user){
    if(!(await authorized(user))){
      await S.db.auth.signOut();
      status('Acesso não autorizado ou suspenso. Entre em contato com a WW Solar.','client-login-status');
      return;
    }
    try{
      const {data,error}=await S.db.from('wwsolar_catalog')
        .select('id,kind,title,price,payload,active,approved')
        .eq('active',true).eq('approved',true).order('title');
      if(error)throw error;
      const {data:cart,error:cartError}=await S.db.from('wwsolar_carts')
        .select('lines,updated_at').eq('user_id',user.id).maybeSingle();
      if(cartError)throw cartError;
      S.user=user;S.admin=user.app_metadata?.wwsolar_role==='admin';
      S.catalog=data||[];S.lines=C.cleanLines(cart?.lines||[]);S.cartUpdatedAt=cart?.updated_at||null;
      show('client-entry',false);show('client-app',true);show('client-nav',true);show('client-cart-top',true);
      show('client-admin-link',S.admin);
      $('client-identity').textContent=user.email||'Conta autorizada';
      renderAll();
      if(S.timer)clearInterval(S.timer);
      S.timer=setInterval(updateClock,1000);
    }catch(e){
      S.user=null;S.catalog=[];S.lines=[];
      await S.db.auth.signOut();
      show('client-entry',true);show('client-app',false);show('client-nav',false);show('client-cart-top',false);
      status('Não foi possível carregar os produtos. Solicite atendimento.','client-login-status');
    }
  }
  async function init(){
    if(!configOK()||!window.supabase?.createClient||!C){
      $('client-login-submit').disabled=true;
      status('Ambiente DEV ainda não configurado. Não informe senha nesta etapa.','client-login-status');
      return;
    }
    S.db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data,error}=await S.db.auth.getUser();
    if(!error&&data?.user)await enter(data.user);
  }
  async function login(event){
    event.preventDefault();
    if(!S.db)return;
    $('client-login-submit').disabled=true;
    status('Conferindo acesso...','client-login-status');
    try{
      const {data,error}=await S.db.auth.signInWithPassword({
        email:$('client-email').value.trim().toLowerCase(),
        password:$('client-password').value
      });
      if(error||!data?.user)throw Error('Invalid');
      $('client-password').value='';
      await enter(data.user);
    }catch(e){status('E-mail ou senha não conferem, ou acesso não autorizado.','client-login-status');}
    finally{$('client-login-submit').disabled=false;}
  }
  async function logout(){
    if(S.db)await S.db.auth.signOut();
    S.user=null;S.catalog=[];S.lines=[];S.admin=false;S.cartUpdatedAt=null;S.orderKey=null;
    if(S.timer){clearInterval(S.timer);S.timer=null;}
    closeDrawer();
    show('client-app',false);show('client-entry',true);show('client-nav',false);show('client-cart-top',false);
    $('client-password').value='';status('','client-login-status');
  }
  const number=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(Number(n)||0);
  const decimal=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
  function setTarget(v){
    const n=Number(v);if(!Number.isFinite(n))return;
    S.target=Math.max(300,Math.min(2200,Math.round(n)));
    $('client-target').value=S.target;$('client-target-slider').value=S.target;
    $('client-target-slider').style.setProperty('--range-progress',((S.target-300)/(2200-300)*100)+'%');
    renderRecommendation();
    if(S.kind==='kit')renderProducts();
  }
  function renderRecommendation(){
    const kit=C.recommendedKit(available(),S.target);
    const hasKits=available().some(p=>p.kind==='kit');
    $('client-result-button').disabled=!kit;

    const custom=$('client-custom-kit-cta');
    custom.hidden=Boolean(kit);
    if(!kit){
      const phone=String(cfg.whatsapp||'5585992723637');
      const message='Olá! Não encontrei um kit para a geração de '+number(S.target)+' kWh/mês no catálogo WW Solar. Gostaria de uma cotação personalizada.';
      $('client-custom-kit-whatsapp').href='https://wa.me/'+phone+'?text='+encodeURIComponent(message);
    }
    if(!kit){
      $('result-title').textContent=hasKits?'Nenhum kit atende à geração informada':'Kits em preparação';
      $('result-description').textContent=hasKits?'Não temos um kit nessa faixa no momento, mas podemos preparar uma proposta personalizada.':'Podemos preparar um kit personalizado para sua necessidade.';
      $('result-status').textContent=hasKits?'SEM KIT NA FAIXA':'AGUARDANDO HOMOLOGAÇÃO';
      $('result-generation').textContent='—';
      $('result-power').textContent='—';
      $('result-panels').textContent='—';
      $('result-inverter').textContent='—';
      $('result-price').textContent='Sob consulta';
      return;
    }
    const x=kit.payload||{};
    const target=C.estimatedGeneration(kit)||0;
    $('result-status').textContent=target>=S.target?'ATENDE À REFERÊNCIA':'ABAIXO DO SOLICITADO';
    $('result-title').textContent=kit.title;
    $('result-description').textContent='Geração média mensal estimada · '+number(x.moduloWp)+' W por módulo · confirmar instalação';
    $('result-generation').textContent=number(target);
    $('result-power').textContent=decimal(x.potenciaKwp)+' kWp';
    $('result-panels').textContent=number(x.placas)+' × '+number(x.moduloWp)+' Wp';
    $('result-inverter').textContent=String(x.inversor||'A confirmar');
    $('result-price').textContent=euro(kit.price);

  }
  function setKind(kind){
    S.kind=kind;
    S.category='all';
    for(const x of document.querySelectorAll('[data-kind]')){
      const active=x.dataset.kind===kind;
      x.classList.toggle('active',active);
      x.setAttribute('aria-pressed',String(active));
    }
    renderCategories();renderProducts();
  }
  const CATEGORY_LABELS={
    modulos:'Módulos solares',inversores:'Inversores on-grid',microinversores:'Microinversores',
    estruturas:'Estruturas',cabos:'Cabos',componentes:'Componentes elétricos'
  };
  function setCategory(category){
    S.category=category;
    renderCategories();
    renderProducts();
  }
  function renderCategories(){
    const wrap=$('client-category-tabs');
    wrap.hidden=S.kind!=='piece';
    wrap.replaceChildren();
    if(S.kind!=='piece')return;
    const all=available().filter(p=>p.kind==='piece'&&p.payload?.categoria!=='projetos');
    const groups=new Map();
    for(const p of all){
      const category=String(p.payload?.categoria||'').toLowerCase();
      if(Object.prototype.hasOwnProperty.call(CATEGORY_LABELS,category))
        groups.set(category,(groups.get(category)||0)+1);
    }
    const mk=(key,title,count)=>{
      const b=btn(title+' ('+count+')',()=>setCategory(key));
      b.setAttribute('aria-pressed',String(S.category===key));
      return b;
    };
    wrap.append(mk('all','Todas',all.length));
    for(const category of Object.keys(CATEGORY_LABELS)){
      if(groups.has(category))wrap.append(mk(category,CATEGORY_LABELS[category],groups.get(category)));
    }
  }
  function renderProducts(){
    const q=S.query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const products=(S.kind==='kit'?C.matchingKits(available(),S.target):available().filter(p=>p.kind==='piece'&&p.payload?.categoria!=='projetos'))
      .filter(p=>S.kind==='kit'||S.category==='all'||String(p.payload?.categoria||'').toLowerCase()===S.category)
      .filter(p=>!q||[p.id,p.title,p.payload?.inversor,p.payload?.categoria]
        .some(v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)))
      .slice(0,150);
    const grid=$('client-product-grid');grid.replaceChildren();
    $('client-result-count').textContent=products.length+' '+(products.length===1?'equipamento encontrado':'equipamentos encontrados')+(S.kind==='kit'?' · geração média estimada ≥ '+number(S.target)+' kWh/mês':'')+' · preço sujeito a confirmação';
    if(!products.length){
      const box=el('div',undefined,'empty-state');
      box.append(el('h3',S.kind==='kit'?'Kits em preparação':'Nenhum equipamento encontrado'));
      box.append(el('p',S.kind==='kit'
        ?(available().some(p=>p.kind==='kit')?'Nenhum kit atende à geração informada. Escolha outra faixa ou solicite orientação. Reduza a geração desejada ou consulte as peças avulsas.':'As opções estão sendo preparadas para cotação. Consulte também as peças avulsas.')
        :'Experimente outra potência, fabricante ou nome.'));
      if(S.kind==='kit')box.append(btn('Ver peças avulsas ↗',()=>setKind('piece'),'button button-accent'));
      grid.append(box);return;
    }
    for(const p of products){
      const card=el('article',undefined,'kit-card');
      const top=el('div',undefined,'kit-top');
      top.append(el('span',p.kind==='kit'?'Kit solar':'Peça avulsa','kit-id'),el('span','Cotação a confirmar','kit-status'));
      card.append(top);
      const heading=el('h3',p.title);
      card.append(heading);
      if(p.kind==='kit'){
        const x=p.payload||{};
        const gen=el('p',undefined,'kit-generation');
        gen.append(el('strong',number(C.estimatedGeneration(p))+' kWh/mês'),document.createTextNode(' estimados*'));
        card.append(gen);
        const facts=el('div',undefined,'kit-facts');
        for(const [title,value] of [
          ['Módulos',number(x.placas)+' × '+number(x.moduloWp)+' Wp'],
          ['Inversor',String(x.inversor||'A confirmar')],
          ['Tipo de ligação',String(x.tipoRede||'Conforme avaliação do local')]
        ]){
          const row=el('div');row.append(el('span',title),el('strong',value));facts.append(row);
        }
        card.append(facts);
        card.append(el('small','Inclui módulos, inversor, fixação, perfis, cabos e conectores.','client-muted'));
      }else{
        const facts=el('div',undefined,'kit-facts');
        const row=el('div');row.append(el('span','Categoria'),el('strong',String(p.payload?.categoria||'Equipamento')));
        facts.append(row);card.append(facts);
      }
      const bottom=el('div',undefined,'kit-bottom');
      const price=el('div');price.append(el('small','Valor dos equipamentos'),el('b',euro(p.price)));
      bottom.append(price,btn(p.kind==='kit'?'Solicitar cotação +':'Adicionar ao carrinho +',()=>add(p.id),'details-button'));
      card.append(bottom);
      if(p.kind==='kit')card.append(el('small','Estimativa de geração. Equipamentos, compatibilidade e instalação sujeitos à validação técnica antes da contratação.','client-muted'));
      grid.append(card);
    }
  }

  function showToast(message){
    $('client-toast-text').textContent=message;
    $('client-toast').hidden=false;
    if(S.toastTimer)clearTimeout(S.toastTimer);
    S.toastTimer=setTimeout(()=>{ $('client-toast').hidden=true;},3200);
  }
  function remaining(){
    return S.lines.length&&S.cartUpdatedAt?C.quoteRemainingMs(S.cartUpdatedAt,Date.now()):25*60*1000;
  }
  function expired(){
    return S.lines.length>0&&Boolean(S.cartUpdatedAt)&&remaining()===0;
  }
  function updateClock(){
    const text=S.lines.length?C.quoteClock(remaining()):'25:00';
    for(const id of ['client-top-clock','client-cart-timer','client-drawer-timer'])
      $(id).textContent=text;
    const ok=S.lines.length>0&&!S.cartInvalid&&!expired()&&!S.checkoutPending;
    $('client-checkout').disabled=!ok;
    $('client-drawer-checkout').disabled=!ok;
    // Sincroniza o botão em todo tick, inclusive após trocas de sessão/cache.
    $('client-drawer-clear').disabled=!S.user||S.lines.length===0;
    $('client-cart-refresh').textContent=expired()?'Renovar cotação':'Atualizar preços';
    $('client-drawer-refresh').textContent=expired()?'↻ Renovar cotação':'↻ Atualizar valores';
    for(const id of ['client-top-clock','client-cart-timer','client-drawer-timer'])
      $(id).classList.toggle('client-clock-expired',expired());
    if(expired()&&!S.expiryNotified){
      S.expiryNotified=true;
      status('Cotação de 25 minutos expirada. Atualize os preços antes de solicitar pelo WhatsApp.');
    }
    if(!expired())S.expiryNotified=false;
  }
  function openDrawer(){
    if(!S.user)return;
    S.drawerOpen=true;
    $('client-cart-shade').hidden=false;
    $('client-cart-drawer').hidden=false;
    $('client-cart-drawer').setAttribute('aria-hidden','false');
    $('client-cart-trigger').setAttribute('aria-expanded','true');
    document.body.classList.add('client-drawer-open');
    $('client-cart-close').focus();
  }
  function closeDrawer(){
    if(!S.drawerOpen)return;
    S.drawerOpen=false;
    $('client-cart-shade').hidden=true;
    $('client-cart-drawer').hidden=true;
    $('client-cart-drawer').setAttribute('aria-hidden','true');
    $('client-cart-trigger').setAttribute('aria-expanded','false');
    document.body.classList.remove('client-drawer-open');
    $('client-cart-trigger').focus();
  }
  async function getFreshCatalog(){
    const {data,error}=await S.db.from('wwsolar_catalog')
      .select('id,kind,title,price,payload,active,approved')
      .eq('active',true).eq('approved',true).order('title');
    if(error)throw error;
    return data||[];
  }
  async function save(next,feedback='Carrinho atualizado.'){
    if(!S.user)return;
    let clean;
    try{clean=C.cleanLines(next);}
    catch(e){status('Revise quantidades ou produtos no carrinho.');return;}
    S.lines=clean;
    S.orderKey=null;
    S.cartUpdatedAt=new Date().toISOString();
    renderCart();
    if(feedback){showToast(feedback);status(feedback);}
    // Serializa escritas para evitar que cliques rápidos sobrescrevam o carrinho fora de ordem.
    S.saveQueue=S.saveQueue.catch(()=>{}).then(async()=>{
      const {data,error}=await S.db.from('wwsolar_carts').upsert({
        user_id:S.user.id,lines:clean,updated_at:new Date().toISOString()
      },{onConflict:'user_id'}).select('updated_at').single();
      if(error)throw error;
      S.cartUpdatedAt=data?.updated_at||S.cartUpdatedAt;
      updateClock();
    }).catch(async()=>{
      status('Não foi possível salvar a alteração. Seu carrinho será recarregado.');
      showToast('Falha ao salvar; verifique sua conexão.');
      try{
        const {data}=await S.db.from('wwsolar_carts').select('lines,updated_at')
          .eq('user_id',S.user.id).maybeSingle();
        S.lines=C.cleanLines(data?.lines||[]);
        S.cartUpdatedAt=data?.updated_at||null;
        renderCart();
      }catch(_){/* Sem cache divergente para confirmar cotação. */}
    });
    return S.saveQueue;
  }
  function add(id){
    if(!available().some(p=>p.id===id)){status('Este produto não está disponível.');return;}
    const next=S.lines.map(x=>({...x}));
    const row=next.find(x=>x.id===id);
    if(row){if(row.qty>=99){status('Limite por produto: 99 unidades.');return;}row.qty++;}
    else{if(next.length>=25){status('Máximo de 25 tipos de produto.');return;}next.push({id,qty:1});}
    const linked=next.find(x=>x.id==='PRJ-'+id);
    if(linked)linked.qty=next.find(x=>x.id===id).qty;
    save(next,'Produto adicionado ao carrinho!');
  }
  // Cada kit tem uma referência própria de projeto; isso evita misturar
  // seleções quando dois kits utilizam a mesma faixa de preço.
  function projectForKit(kit){
    if(!kit||kit.kind!=='kit'||!/^WW-(300|500|800|1000|1200|1500|1800|2000)$/.test(kit.id))return null;
    return available().find(p=>p.id==='PRJ-'+kit.id &&
      p.payload?.categoria==='projetos' && p.payload?.kitCodigo===kit.id)||null;
  }
  function setKitProject(kitId,include){
    const kit=available().find(p=>p.kind==='kit'&&p.id===kitId);
    const line=S.lines.find(x=>x.id===kitId);
    const project=projectForKit(kit);
    if(!line||!project){status('Confira o kit e tente novamente.');return;}
    let next=S.lines.map(x=>({...x})).filter(x=>x.id!==project.id);
    if(include){
      if(next.length>=25){status('Limite de 25 produtos por cotação.');return;}
      next.push({id:project.id,qty:line.qty});
    }
    save(next,include?
      'Projeto incluído. TRT não inclusa; paga pelo contratante.':
      'Projeto retirado da cotação.');
  }
  function addWithProject(kitId){
    const kit=available().find(p=>p.kind==='kit'&&p.id===kitId);
    const project=projectForKit(kit);
    if(!kit||!project){status('Projeto para esta faixa sob consulta. Fale conosco.');return;}
    const next=S.lines.map(x=>({...x}));
    const row=next.find(x=>x.id===kitId);
    if(row){if(row.qty>=99){status('Limite por produto: 99 unidades.');return;}row.qty++;}
    else{if(next.length>=24){status('Máximo de 25 tipos de produto.');return;}next.push({id:kitId,qty:1});}
    const projectLine=next.find(x=>x.id===project.id);
    if(projectLine)projectLine.qty=row?row.qty:1;
    else if(next.length<25)next.push({id:project.id,qty:row?row.qty:1});
    else {status('Limite de 25 tipos de produto.');return;}
    save(next,'Kit e projeto incluídos. TRT não inclusa; paga pelo contratante.');
  }
  function removeCartItem(id){
    const next=S.lines.filter(x=>x.id!==id && x.id!=='PRJ-'+id);
    save(next,'Item removido.');
  }
  function quantity(id,delta){
    const next=S.lines.map(x=>({...x})),r=next.find(x=>x.id===id);if(!r)return;
    // Serviços vinculados acompanham a quantidade de kits.
    if(id.startsWith('PRJ-WW-'))return;
    r.qty=Math.max(0,Math.min(99,r.qty+delta));
    const service=next.find(x=>x.id==='PRJ-'+id);
    if(service)service.qty=r.qty;
    save(next.filter(x=>x.qty>0),'Quantidade atualizada.');
  }
  function makeCartRow(x,missing=false,inDrawer=false){
    const row=el('div',undefined,'client-cart-line'),label=el('div'),tools=el('div',undefined,'client-qty');
    const isLinkedService=x.id.startsWith('PRJ-WW-');
    const itemName=isLinkedService?'Projeto elétrico do kit ('+x.id.slice(7)+')':x.title;
    label.append(el('strong',itemName),el('p',missing?'Indisponível — remova este item':euro(x.unit/100)+' por unidade','client-muted'));
    if(inDrawer&&!missing&&x.id.startsWith('WW-')){
      const kit=available().find(p=>p.id===x.id),project=projectForKit(kit);
      if(project){
        const option=el('label',undefined,'client-project-option');
        const checkbox=el('input');checkbox.type='checkbox';
        checkbox.checked=S.lines.some(item=>item.id===project.id);
        checkbox.setAttribute('aria-label','Incluir projeto elétrico para '+x.title);
        checkbox.addEventListener('change',()=>setKitProject(x.id,checkbox.checked));
        const caption=el('span');
        caption.append(el('strong','Incluir projeto elétrico · '+euro(project.price)),
          el('small','Não incluído no kit · TRT paga pelo contratante'));
        option.append(checkbox,caption);label.append(option);
      }
    }
    if(!isLinkedService){
      tools.append(btn('−',()=>quantity(x.id,-1)),el('output',x.qty),btn('+',()=>quantity(x.id,1)));
    }else{
      tools.append(el('small','Serviço opcional','client-muted'));
    }
    row.append(label,tools,el('strong',missing?'Indisponível':euro(x.amount/100)),
      btn('Remover',()=>removeCartItem(x.id),'client-remove'));
    if(inDrawer)row.classList.add('client-drawer-item-compact');
    if(isLinkedService)row.classList.add('client-linked-project-item');
    return row;
  }
  function renderCart(){
    const area=$('client-cart-lines'),drawer=$('client-drawer-lines'),preview=$('client-preview-lines');
    area.replaceChildren();drawer.replaceChildren();preview.replaceChildren();
    const products=available();
    const valid=[],bad=[];
    let cents=0;
    for(const line of S.lines){
      try{
        const item=C.sumCart([line],products).selected[0];valid.push(item);cents+=item.amount;
      }catch(e){bad.push({id:line.id,title:'Produto '+line.id,qty:line.qty,unit:0,amount:0});}
    }
    S.cartInvalid=bad.length>0;
    const count=S.lines.reduce((n,x)=>n+x.qty,0);
    $('client-cart-count').textContent=String(count);
    $('client-top-count').textContent=String(count);
    $('client-drawer-clear').disabled=S.lines.length===0;
    const sumText=S.cartInvalid?'A revisar':euro(cents/100);
    for(const id of ['client-cart-total','client-top-total','client-preview-total','client-drawer-total'])
      $(id).textContent=sumText;
    for(const x of [...valid,...bad]){
      const missing=bad.includes(x);
      area.append(makeCartRow(x,missing));drawer.append(makeCartRow(x,missing,true));
    }
    if(!S.lines.length){
      area.append(el('p','Seu carrinho está vazio.','client-muted'));
      drawer.append(el('p','Seu carrinho está vazio. Escolha peças ou kits para solicitar uma cotação.','client-muted'));
      preview.append(el('p','Nenhum item adicionado.','client-muted'));
    }else{
      for(const x of [...valid,...bad].slice(0,3)){
        const line=el('div',undefined,'client-preview-row');
        line.append(el('span',x.qty+' × '+x.title),el('b',bad.includes(x)?'Indisponível':euro(x.amount/100)));
        preview.append(line);
      }
      if(S.lines.length>3)preview.append(el('p','E mais '+(S.lines.length-3)+' produto(s)...','client-muted'));
    }
    if(S.cartInvalid)status('Há produtos indisponíveis no carrinho. Remova-os antes de finalizar.');
    updateClock();
  }
  function renderAll(){
    $('client-available-count').textContent=String(available().filter(p=>p.payload?.categoria!=='projetos').length);
    renderRecommendation();renderCategories();renderProducts();renderCart();setTarget(S.target);
  }
  async function refreshQuote(){
    if(!S.user)return;
    const buttons=[$('client-cart-refresh'),$('client-drawer-refresh')];
    buttons.forEach(b=>b.disabled=true);
    status('Consultando os preços atuais...');
    try{
      await S.saveQueue;
      const newCatalog=await getFreshCatalog();
      S.catalog=newCatalog;
      const invalid=S.lines.filter(line=>!newCatalog.some(p=>p.id===line.id));
      renderProducts();
      renderRecommendation();
      renderCategories();
      if(invalid.length){
        renderCart();
        status('Alguns itens saíram do catálogo. Remova-os antes de renovar sua cotação.');
        showToast('Confira os produtos indisponíveis.');
        return;
      }
      await save(S.lines,'Preços consultados e prazo renovado.');
      renderCart();
      status('Preços atualizados. O total é de referência; estoque e frete sujeitos à confirmação.');
    }catch(e){
      status('Não foi possível conferir os preços atuais. Tente novamente.');
      showToast('Não foi possível atualizar a cotação.');
    }finally{buttons.forEach(b=>b.disabled=false);}
  }
  async function checkout(){
    if(!S.user||!S.lines.length||S.cartInvalid||S.checkoutPending||expired())return;
    S.checkoutPending=true;updateClock();
    status('Conferindo o carrinho e registrando a solicitação...');
    try{
      await S.saveQueue;
      const {data:cart,error:cartError}=await S.db.from('wwsolar_carts')
        .select('lines,updated_at').eq('user_id',S.user.id).single();
      if(cartError)throw cartError;
      if(!cart||!cart.updated_at||C.quoteRemainingMs(cart.updated_at,Date.now())===0){
        S.cartUpdatedAt=cart?.updated_at||S.cartUpdatedAt;
        status('A cotação expirou. Clique em Atualizar preços antes de solicitar.');
        renderCart();
        return;
      }
      const storedLines=C.cleanLines(cart.lines||[]);
      if(JSON.stringify(storedLines)!==JSON.stringify(S.lines)){
        S.lines=storedLines;S.cartUpdatedAt=cart.updated_at;S.orderKey=null;
        renderCart();
        status('Seu carrinho mudou. Confira os itens antes de solicitar a cotação.');
        return;
      }
      const {data:fresh,error:catalogError}=await S.db.from('wwsolar_catalog')
        .select('id,title,price,kind,active,approved,payload')
        .in('id',S.lines.map(x=>x.id)).eq('active',true).eq('approved',true);
      if(catalogError)throw catalogError;
      const current=C.sumCart(S.lines,fresh||[]);
      const local=C.sumCart(S.lines,available());
      const known=new Map(local.selected.map(x=>[x.id,x.unit]));
      if(current.cents!==local.cents||current.selected.some(x=>known.get(x.id)!==x.unit)){
        const latest=new Map((fresh||[]).map(x=>[x.id,x]));
        S.catalog=S.catalog.map(p=>latest.get(p.id)||p);S.orderKey=null;
        renderProducts();renderCart();
        status('Um ou mais preços mudaram. Confira o novo total e atualize a cotação.');
        showToast('Preço alterado. Revise seu pedido.');
        return;
      }
      if(!S.orderKey)S.orderKey=crypto.randomUUID();
      const {data,error}=await S.db.functions.invoke('wwsolar-quote',{
        body:{action:'submit',request_key:S.orderKey,expected_total_cents:current.cents}
      });
      if(error||!data?.order?.id||!data?.message){
        let code='';
        try{code=(await error?.context?.json?.())?.error||'';}catch(_){/*sem detalhe*/}
        if(code==='quote_expired'){
          status('Cotação expirada. Clique em Atualizar preços antes de enviar.');
        }else if(code==='price_changed'||code==='product_unavailable'){
          S.orderKey=null;
          status('Os preços ou a disponibilidade mudaram. Clique em Atualizar preços e confira o carrinho.');
        }else if(code==='client_inactive'){
          status('Seu acesso foi suspenso. Entre em contato com a WW Solar.');
        }else{
          status('Não foi possível registrar sua solicitação. Nenhum pedido confirmado; tente novamente.');
        }
        return;
      }
      const message=String(data.message);
      if(message.length>4000)throw Error('message_length');
      const reference=String(data.order.id).slice(0,8).toUpperCase();
      status('Solicitação '+reference+' registrada no histórico. O envio da mensagem deve ser confirmado no WhatsApp.');
      showToast('Solicitação registrada! Abrindo WhatsApp...');
      const hasProject=S.lines.some(line=>available().some(p=>p.id===line.id&&p.payload?.categoria==='projetos'));
      const destination=hasProject&&/^55\\d{10,11}$/.test(cfg.projectWhatsapp||'')?cfg.projectWhatsapp:cfg.whatsapp;
      window.location.assign('https://wa.me/'+destination+'?text='+encodeURIComponent(message));
    }catch(e){
      status('Não foi possível completar a operação. Confira a conexão ou consulte seu atendimento.');
    }finally{S.checkoutPending=false;updateClock();}
  }
  $('client-login-form').addEventListener('submit',login);
  $('client-logout').addEventListener('click',logout);
  // O campo numérico só aplica após confirmar; permite digitar 1200 sem ser forçado a 300 a cada tecla.
  $('client-target').addEventListener('change',ev=>setTarget(ev.target.value));
  $('client-target').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();setTarget(ev.target.value);}});
  $('client-target-apply').addEventListener('click',()=>{
    setTarget($('client-target').value);
    if(C.recommendedKit(available(),S.target)){
      setKind('kit');
      document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth',block:'start'});
    }else{
      document.querySelector('.result-card')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  });
  $('client-target-slider').addEventListener('input',ev=>setTarget(ev.target.value));
  $('client-search').addEventListener('input',ev=>{S.query=ev.target.value;renderProducts();});
  for(const tab of document.querySelectorAll('[data-kind]'))
    tab.addEventListener('click',()=>setKind(tab.dataset.kind));
  $('client-pieces-link').addEventListener('click',()=>setKind('piece'));
  $('client-result-button').addEventListener('click',()=>{
    const kit=C.recommendedKit(available(),S.target);
    if(kit)add(kit.id);
  });
  $('client-checkout').addEventListener('click',checkout);
  $('client-drawer-checkout').addEventListener('click',checkout);
  $('client-cart-refresh').addEventListener('click',refreshQuote);
  $('client-drawer-refresh').addEventListener('click',refreshQuote);
  $('client-drawer-clear').addEventListener('click',()=>{
    if(!S.user||S.lines.length===0)return;
    if(!window.confirm('Limpar todos os itens do carrinho? Os pedidos já registrados permanecerão no histórico.'))return;
    void save([],'Carrinho limpo.');
  });
  $('client-cart-trigger').addEventListener('click',openDrawer);
  $('client-cart-close').addEventListener('click',closeDrawer);
  $('client-cart-shade').addEventListener('click',closeDrawer);
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&S.drawerOpen)closeDrawer();
  });
  init();
})();
