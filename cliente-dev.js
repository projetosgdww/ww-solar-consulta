(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C=window.WWSolarClienteCore, cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
  const S={db:null,user:null,admin:false,catalog:[],lines:[],kind:'kit',category:'all',query:'',target:300,cartUpdatedAt:null,cartInvalid:false,saveQueue:Promise.resolve(),timer:null,toastTimer:null,drawerOpen:false,expiryNotified:false,checkoutPending:false,orderKey:null,recoveryMode:false,pendingProductId:null};
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
  // A vitrine oficial vende kits geradores; serviços PRJ-B continuam opcionais.
  // As peças avulsas permanecem no banco para o montador interno, jamais no checkout.
  const quotableProduct=p=>p?.kind==='kit' ||
    (p?.kind==='piece'&&p?.payload?.categoria==='projetos'&&/^PRJ-B-/.test(p.id));
  function available(){return S.catalog.filter(p=>p.active===true&&p.approved===true&&Number(p.price)>0&&quotableProduct(p));}
  // O mesmo título/geração pode corresponder a inversores de fabricantes ou potências diferentes.
  // O SKU é a fonte da identidade comercial da composição selecionada.
  function kitVariantLabel(kit){
    if(!kit||kit.kind!=='kit')return '';
    const inverter=typeof kit.payload?.inversor==='string'?kit.payload.inversor.trim():'';
    return (inverter?'Inversor: '+inverter+' · ':'')+'SKU: '+kit.id;
  }
  async function authorized(user){
    if(user?.app_metadata?.wwsolar_role==='admin')return true;
    const {data,error}=await S.db.from('wwsolar_client_access')
      .select('active').eq('user_id',user.id).maybeSingle();
    return !error&&data?.active===true;
  }
  function showPasswordSetup(mode){
    show('client-entry',true);show('client-login',false);show('client-password-setup',true);
    show('client-app',false);show('client-nav',false);show('client-cart-top',false);
    show('client-logout',false);show('client-login-open',false);show('client-preview-disclaimer',false);
    S.recoveryMode=mode==='recovery';
    $('client-password-setup-title').textContent=S.recoveryMode?'Defina uma nova senha':'Crie sua senha pessoal';
    $('client-password-setup-description').textContent=S.recoveryMode
      ?'Escolha uma senha pessoal para recuperar o acesso à sua conta.'
      :'Antes de utilizar o catálogo, substitua a senha temporária por uma senha pessoal.';
    $('client-new-password').value='';$('client-confirm-password').value='';
    status('','client-password-setup-status');
  }
  function showLogin(){
    show('client-entry',true);show('client-login',true);show('client-password-setup',false);
    show('client-app',false);show('client-nav',false);show('client-cart-top',false);
    show('client-logout',false);show('client-login-open',false);show('client-preview-disclaimer',false);
    show('client-back-to-catalog',!S.user&&S.catalog.length>0);
  }
  // A vitrine só recebe os campos comerciais explicitamente públicos.
  // A RPC comercial foi ativada no Supabase; a tabela original permanece protegida.
  // Snapshot apenas para falhas temporárias na prévia DEV; produção falha fechada.
  const PUBLIC_KIT_FIELDS=['potenciaKwp','faixaGeracaoKwh','geracaoMensalKwh',
    'freteInclusoParaCaninde','prazoEntregaDiasUteis','prazoAdicionalDiasUteis'];
  const PUBLIC_CATEGORIES=new Set(['projetos']);
  const PREVIEW_HOST=/(^localhost$|^127\.0\.0\.1$|^[a-z0-9]{8}\.ww-solar\.pages\.dev$)/.test(window.location.hostname);
  function validatePublicItems(rows){
    if(!Array.isArray(rows)||rows.length===0||rows.length>200)
      throw Error('Resposta pública inválida');
    const ids=new Set(),clean=[];
    for(const item of rows){
      if(!item||typeof item.id!=='string'||!/^[-A-Za-z0-9]+$/.test(item.id)||
         !['kit','piece'].includes(item.kind)||typeof item.title!=='string'||
         item.title.length>300||item.active!==true||item.approved!==true||
         !Number.isFinite(Number(item.price))||Number(item.price)<=0||
         ids.has(item.id))throw Error('Registro público não autorizado');
      // Compatibilidade durante o corte: ignora peças que possam vir de cache/RPC legado.
      if(item.kind==='piece'&&item.payload?.categoria!=='projetos')continue;
      if(item.kind==='piece'&&(
         !PUBLIC_CATEGORIES.has(item.payload?.categoria)||
         (item.payload.categoria==='projetos'&&!/^PRJ-B-/.test(item.id))
      ))throw Error('Serviço fora da vitrine permitida');
      if(item.kind==='kit'&&!/^([A-Z0-9]+-)/.test(item.id))
        throw Error('Kit com identificação inesperada');
      ids.add(item.id);
      const payload={};
      if(item.kind==='kit'){
        for(const field of PUBLIC_KIT_FIELDS){
          if(Object.prototype.hasOwnProperty.call(item.payload||{},field))
            payload[field]=item.payload[field];
        }
      }else payload.categoria=item.payload.categoria;
      clean.push({
        id:item.id,kind:item.kind,title:item.title,
        price:Number(item.price),payload,active:true,approved:true
      });
    }
    return clean;
  }
  async function readPublicCatalog(){
    if(!S.db)throw Error('Conexão não configurada');
    const {data,error}=await S.db.rpc('wwsolar_public_catalog');
    if(error)throw error;
    return validatePublicItems(data);
  }
  async function readPreviewSnapshot(){
    const response=await fetch('./dados/vitrine-preview.json',{cache:'no-store'});
    if(!response.ok)throw Error('Vitrine de prévia indisponível');
    const snapshot=await response.json();
    if(snapshot.previewOnly!==true)throw Error('Snapshot não autorizado');
    return {items:validatePublicItems(snapshot.items),date:snapshot.generatedOn||'16/11/2026'};
  }
  async function showPublicCatalog(){
    let publicItems,source='rpc',snapshotDate='';
    try{publicItems=await readPublicCatalog();}
    catch(error){
      // O snapshot só pode ser usado nas prévias e nos testes locais.
      // No domínio oficial, falhar fechado é mais seguro do que anunciar valores antigos.
      if(!PREVIEW_HOST)throw error;
      const snapshot=await readPreviewSnapshot();
      publicItems=snapshot.items;source='snapshot';snapshotDate=snapshot.date;
    }
    S.user=null;S.admin=false;S.catalog=publicItems;S.lines=[];S.cartUpdatedAt=null;
    show('client-entry',false);show('client-app',true);show('client-nav',true);
    show('client-cart-top',false);show('client-admin-link',false);
    show('client-logout',false);show('client-login-open',true);
    show('client-preview-disclaimer',PREVIEW_HOST);
    if(PREVIEW_HOST)$('client-preview-disclaimer').textContent=source==='snapshot'
      ?'Prévia DEV · preços de '+snapshotDate+' (não atualizados em tempo real). Confirme os valores antes de solicitar cotação.'
      :'Prévia DEV · preços públicos consultados no Supabase. Cotação sujeita à confirmação.';
    $('client-identity').textContent='Consulte preços livremente. Para detalhes completos e cotação, entre na sua conta.';
    renderAll();
  }
  function requestLoginFor(id){
    S.pendingProductId=id||null;
    showLogin();
    status('Entre na sua conta para consultar detalhes e solicitar cotação. Ainda não tem acesso? Solicite pelo WhatsApp abaixo.','client-login-status');
    window.scrollTo({top:0,behavior:'smooth'});
    $('client-email').focus({preventScroll:true});
  }
  async function enter(user){
    if(!(await authorized(user))){
      await S.db.auth.signOut();
      S.user=null;S.catalog=[];S.lines=[];
      try{
        await showPublicCatalog();
        $('client-identity').textContent='Seu acesso está suspenso. Você pode consultar a vitrine; solicite orientação à WW Solar para fazer uma cotação.';
      }catch(_){
        showLogin();
        status('Acesso não autorizado ou suspenso. Entre em contato com a WW Solar.','client-login-status');
      }
      return;
    }
    if(S.recoveryMode||user.app_metadata?.wwsolar_password_change_required===true){
      S.user=user;
      showPasswordSetup(S.recoveryMode?'recovery':'first');
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
      show('client-logout',true);show('client-login-open',false);show('client-preview-disclaimer',false);
      $('client-identity').textContent=user.email||'Conta autorizada';
      renderAll();
      if(S.pendingProductId){
        const requested=S.pendingProductId;S.pendingProductId=null;
        if(requested.startsWith('PRJ-B-')){
          document.getElementById('projetos')?.scrollIntoView({behavior:'smooth'});
        }else{
          const product=available().find(p=>p.id===requested);
          setKind(product?.kind==='kit'?'kit':'piece');
          const returned=Array.from($('client-product-grid').children)
            .find(node=>node.dataset.productId===requested);
          if(returned){
            returned.classList.add('client-returned-item');
            returned.scrollIntoView({behavior:'smooth',block:'center'});
          }else document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'});
        }
      }
      if(S.timer)clearInterval(S.timer);
      S.timer=setInterval(updateClock,1000);
    }catch(e){
      S.user=null;S.catalog=[];S.lines=[];
      await S.db.auth.signOut();
      showLogin();
      status('Não foi possível carregar os produtos. Solicite atendimento.','client-login-status');
    }
  }
  async function init(){
    if(!configOK()||!window.supabase?.createClient||!C){
      $('client-login-submit').disabled=true;
      status('Ambiente DEV ainda não configurado. Não informe senha nesta etapa.','client-login-status');
      return;
    }
    // Um marcador explícito acompanha o link de recuperação mesmo depois
    // de o Supabase retirar os tokens de acesso da URL.
    const hashParams=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const queryParams=new URLSearchParams(window.location.search);
    S.recoveryMode=hashParams.get('type')==='recovery'||queryParams.get('wwsolar_recovery')==='1';
    S.db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    S.db.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY'){
        S.recoveryMode=true;
        queueMicrotask(async()=>{
          const {data,error}=await S.db.auth.getUser();
          if(!error&&data?.user)await enter(data.user);
        });
      }
    });
    const {data,error}=await S.db.auth.getUser();
    if(!error&&data?.user)await enter(data.user);
    else{
      try{await showPublicCatalog();}
      catch(_){
        showLogin();
        status('A vitrine de prévia está temporariamente indisponível. Entre com sua conta para continuar.','client-login-status');
      }
    }
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
  async function requestReset(){
    const input=$('client-email');
    const email=input.value.trim().toLowerCase();
    if(!input.reportValidity())return;
    if(!email){status('Informe seu e-mail para solicitar recuperação.','client-login-status');return;}
    $('client-forgot-password').disabled=true;
    try{
      // A URL precisa constar da lista permitida em Authentication > URL Configuration.
      const recoveryUrl=new URL('./cliente.html',window.location.href);
      recoveryUrl.search='';
      recoveryUrl.searchParams.set('wwsolar_recovery','1');
      recoveryUrl.hash='';
      const {error}=await S.db.auth.resetPasswordForEmail(email,{
        redirectTo:recoveryUrl.href
      });
      if(error)console.warn('WW Solar: recuperação não enviada. Confira a configuração de e-mail.');
      status('Se este e-mail estiver habilitado, você receberá instruções para criar outra senha.','client-login-status');
    }catch(e){
      status('Não foi possível solicitar a recuperação. Entre em contato com a WW Solar.','client-login-status');
    }finally{$('client-forgot-password').disabled=false;}
  }
  async function savePersonalPassword(event){
    event.preventDefault();
    if(!S.db||!S.user)return;
    const first=$('client-new-password').value,second=$('client-confirm-password').value;
    if(first.length<12||first.length>128){status('Use uma senha com 12 a 128 caracteres.','client-password-setup-status');return;}
    if(/^GDWW-/i.test(first)){status('Escolha uma senha pessoal diferente da senha temporária.','client-password-setup-status');return;}
    if(first!==second){status('As duas senhas não coincidem.','client-password-setup-status');return;}
    const submit=$('client-save-password');submit.disabled=true;
    status('Atualizando sua senha com segurança...','client-password-setup-status');
    try{
      if(S.user.app_metadata?.wwsolar_password_change_required===true){
        // O servidor atualiza senha + estado obrigatório atomicamente.
        const {data:result,error:completeError}=await S.db.functions.invoke('wwsolar-create-customer',{
          body:{action:'complete_setup',new_password:first}
        });
        if(completeError||result?.completed!==true)
          throw Error('Não foi possível finalizar a troca de senha. Tente novamente ou fale com o atendimento.');
      }else{
        // Recuperação de uma conta que já usa senha pessoal.
        const {error}=await S.db.auth.updateUser({password:first});
        if(error)throw error;
      }
      // O Supabase pode revogar o refresh token ao alterar a senha.
      // Criar uma sessão NOVA com a senha pessoal, sem usar refreshSession().
      const email=S.user.email;
      $('client-new-password').value='';$('client-confirm-password').value='';
      S.recoveryMode=false;
      // Evita que um refresh da página repita a tela de recuperação.
      if(new URLSearchParams(window.location.search).has('wwsolar_recovery')){
        const clean=new URL(window.location.href);
        clean.searchParams.delete('wwsolar_recovery');
        clean.hash='';
        window.history.replaceState(window.history.state,'',clean.pathname+clean.search);
      }
      const {data:session,error:signInError}=await S.db.auth.signInWithPassword({
        email,password:first
      });
      if(signInError||!session?.user){
        S.user=null;
        showLogin();
        status('Sua senha foi atualizada. Entre novamente usando o seu e-mail e a nova senha.','client-login-status');
        return;
      }
      if(session.user.app_metadata?.wwsolar_password_change_required===true)
        throw Error('A liberação do acesso ainda está pendente. Entre em contato com o atendimento.');
      S.user=session.user;
      show('client-password-setup',false);show('client-login',true);
      await enter(session.user);
    }catch(e){
      status(e?.message||'Não foi possível concluir a troca de senha. Tente novamente ou fale conosco.','client-password-setup-status');
    }finally{submit.disabled=false;}
  }
  async function cancelPasswordSetup(){
    if(S.db)await S.db.auth.signOut();
    S.user=null;S.recoveryMode=false;
    if(new URLSearchParams(window.location.search).has('wwsolar_recovery')){
      const clean=new URL(window.location.href);
      clean.searchParams.delete('wwsolar_recovery');
      clean.hash='';
      window.history.replaceState(window.history.state,'',clean.pathname+clean.search);
    }
    showLogin();
    $('client-password').value='';
  }
  async function logout(){
    if(S.db)await S.db.auth.signOut();
    S.user=null;S.catalog=[];S.lines=[];S.admin=false;S.cartUpdatedAt=null;S.orderKey=null;
    if(S.timer){clearInterval(S.timer);S.timer=null;}
    closeDrawer();
    try{await showPublicCatalog();}
    catch(_){showLogin();status('A vitrine está temporariamente indisponível.','client-login-status');}
    $('client-password').value='';
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
      // Explica a faixa atendida pelo catálogo REAL, sem prometer kits inativos.
      const generations=available().filter(p=>p.kind==='kit')
        .map(p=>C.estimatedGeneration(p)).filter(n=>Number.isFinite(n)&&n>0);
      const maxGeneration=generations.length?Math.max(...generations):null;
      $('result-title').textContent=hasKits?'Nenhum kit atende à geração informada':'Kits em preparação';
      $('result-description').textContent=hasKits&&maxGeneration!==null
        ?'Os kits disponíveis atualmente geram até cerca de '+number(maxGeneration)+' kWh/mês. Para '+number(S.target)+' kWh/mês, consulte uma cotação personalizada.'
        :'Podemos preparar um kit personalizado para sua necessidade.';
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
    $('client-result-button').textContent=S.user?'Adicionar à cotação ↗':'Ver detalhes ↗';
    if(!S.user){
      $('result-description').textContent='Geração média mensal estimada · detalhes técnicos completos após login';
      $('result-panels').textContent='Após login';
      $('result-inverter').textContent='Após login';
    }

  }
  function setKind(kind){
    S.kind='kit';
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

  // Ícones vetoriais fixos, sem dados do catálogo em HTML.
  function wwKitIcon(type){
    const ns='http://www.w3.org/2000/svg';
    const icon=document.createElementNS(ns,'svg');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('fill','none');
    icon.setAttribute('stroke','currentColor');
    icon.setAttribute('stroke-width','1.8');
    icon.setAttribute('stroke-linecap','round');
    icon.setAttribute('stroke-linejoin','round');
    icon.setAttribute('aria-hidden','true');
    const shapes={
      truck:[['path',{d:'M2 6h12v11H2z'}],['path',{d:'M14 10h4l3 3v4h-7z'}],['circle',{cx:'6.5',cy:'18',r:'1.5'}],['circle',{cx:'17.5',cy:'18',r:'1.5'}]],
      power:[['path',{d:'m13 2-9 11h7l-1 9 10-13h-7l0-7z'}]],
      chart:[['rect',{x:'3',y:'13',width:'3',height:'7',rx:'1'}],['rect',{x:'9',y:'9',width:'3',height:'11',rx:'1'}],['rect',{x:'15',y:'5',width:'3',height:'15',rx:'1'}]],
      info:[['circle',{cx:'12',cy:'12',r:'9'}],['path',{d:'M12 11v5M12 8h.01'}]]
    };
    for(const [tag,attrs] of (shapes[type]||[])){
      const shape=document.createElementNS(ns,tag);
      for(const [key,value] of Object.entries(attrs))shape.setAttribute(key,value);
      icon.append(shape);
    }
    return icon;
  }

  function renderProducts(){
    const q=S.query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const products=C.matchingKits(available(),S.target)
      .filter(p=>!q||[p.id,p.title,p.payload?.inversor,p.payload?.categoria]
        .some(v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)))
      .slice(0,150);
    const grid=$('client-product-grid');grid.replaceChildren();
    $('client-result-count').textContent=products.length+' '+(products.length===1?'equipamento encontrado':'equipamentos encontrados')+(S.kind==='kit'?' · geração média estimada ≥ '+number(S.target)+' kWh/mês':'')+' · preço sujeito a confirmação';
    if(!products.length){
      const box=el('div',undefined,'empty-state');
      box.append(el('h3',S.kind==='kit'?'Kits em preparação':'Nenhum equipamento encontrado'));
      box.append(el('p',S.kind==='kit'
        ?(available().some(p=>p.kind==='kit')?'Nenhum kit atende à geração informada. Escolha outra faixa ou solicite um kit personalizado.':'Os kits geradores estão em preparação. Consulte nossa equipe.')
        :'Experimente outra potência, fabricante ou nome.'));
      if(S.kind==='kit')box.append(btn('Solicitar kit sob medida ↗',()=>document.getElementById('client-custom-kit-cta')?.scrollIntoView({behavior:'smooth',block:'nearest'}),'button button-accent'));
      grid.append(box);return;
    }
    for(const p of products){
      const card=el('article',undefined,'kit-card');
      card.dataset.productId=p.id;
      const top=el('div',undefined,'kit-top');
      top.append(el('span',p.kind==='kit'?'Kit solar':'Peça avulsa','kit-id'),el('span','Cotação a confirmar','kit-status'));
      card.append(top);
      const heading=el('h3',p.title);
      card.append(heading);
      if(p.kind==='kit')card.append(el('div',kitVariantLabel(p),'client-muted'));
      if(p.kind==='kit'){
        const x=p.payload||{};
        const gen=el('p',undefined,'kit-generation');
        gen.append(el('strong',number(C.estimatedGeneration(p))+' kWh/mês'),document.createTextNode(' de média mensal estimada*'));
        card.append(gen);
        const facts=el('div',undefined,'kit-facts');
        for(const [title,value] of [
          ['Módulos',number(x.placas)+' × '+number(x.moduloWp)+' Wp'],
          ['Inversor',String(x.inversor||'A confirmar')],
          ['Tipo de ligação',String(x.tipoRede||'Conforme avaliação do local')]
        ]){
          const row=el('div');row.append(el('span',title),el('strong',value));facts.append(row);
        }
        if(S.user){
          card.append(facts);
          card.append(el('small','Inclui módulos, inversor, fixação, perfis, cabos e conectores.','client-muted'));
        }else{
          card.append(el('p','Potência instalada: '+decimal(x.potenciaKwp)+' kWp · Consulte os detalhes após entrar.','client-muted'));
          if(x.freteInclusoParaCaninde)card.append(el('small','Frete incluso para Canindé/CE. Outras cidades sob consulta.','client-muted'));
        }
        if(x.origemKit==='fotus_pronto'){
          card.append(el('small','Kit pronto do fornecedor · Frete incluso para Canindé/CE. Prazo previsto: até 15 dias úteis, podendo acrescentar até 5 dias úteis após confirmação do pedido e da disponibilidade. Para outras cidades, frete sob consulta.','client-muted'));
        }
      }else{
        const facts=el('div',undefined,'kit-facts');
        const row=el('div');row.append(el('span','Categoria'),el('strong',String(p.payload?.categoria||'Equipamento')));
        facts.append(row);card.append(facts);
      }
      const bottom=el('div',undefined,'kit-bottom');
      const price=el('div');price.append(el('small','Valor dos equipamentos'),el('b',euro(p.price)));
      bottom.append(price,btn(!S.user?'Ver detalhes ↗':(p.kind==='kit'?'Solicitar cotação +':'Adicionar ao carrinho +'),
        ()=>S.user?add(p.id):requestLoginFor(p.id),'details-button'));
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
    $('client-drawer-checkout').textContent=PREVIEW_HOST?'Simular cotação (sem registrar)':'Enviar pelo WhatsApp ↗';
    $('client-checkout').textContent=PREVIEW_HOST?'Simular cotação':'Solicitar cotação';
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
    if(!S.user){requestLoginFor(id);return;}
    if(!available().some(p=>p.id===id)){status('Este produto não está disponível.');return;}
    const next=S.lines.map(x=>({...x}));
    const row=next.find(x=>x.id===id);
    if(row){if(row.qty>=99){status('Limite por produto: 99 unidades.');return;}row.qty++;}
    else{if(next.length>=25){status('Máximo de 25 tipos de produto.');return;}next.push({id,qty:1});}
    const linked=next.find(x=>x.id==='PRJ-'+id);
    if(linked)linked.qty=next.find(x=>x.id===id).qty;
    // Projetos avulsos são independentes dos projetos vinculados a kits.
    if(id.startsWith('PRJ-B-')&&row?.linkedKits){
      row.standaloneQty+=1;
    }
    save(next,'Produto adicionado ao carrinho!');
  }
  // Um projeto PRJ-B pode ser usado por vários kits com a mesma faixa de potência.
  // O vínculo agora é feito por SKU de kit e não pela faixa compartilhada.
  function projectForKit(kit){
    if(!kit||kit.kind!=='kit')return null;
    const dedicated=available().find(p=>p.id==='PRJ-'+kit.id &&
      p.payload?.categoria==='projetos' && p.payload?.kitCodigo===kit.id);
    if(dedicated)return dedicated;
    const tier=C.projectForKwp(C.kitKwp(kit));
    return tier?available().find(p=>p.id===tier.id && p.kind==='piece' &&
      p.payload?.categoria==='projetos' && !p.payload?.kitCodigo)||null:null;
  }
  function setKitProject(kitId,include){
    const kit=available().find(p=>p.kind==='kit'&&p.id===kitId);
    const line=S.lines.find(x=>x.id===kitId);
    const project=projectForKit(kit);
    if(!line||!project){status('Confira o kit e tente novamente.');return;}
    try{
      let next;
      if(project.id==='PRJ-'+kitId){
        next=S.lines.map(x=>({...x})).filter(x=>x.id!==project.id);
        if(include){
          if(next.length>=25)throw Error('Limite de 25 tipos de produto');
          next.push({id:project.id,qty:line.qty});
        }
      }else{
        next=C.setProjectForKit(S.lines,kitId,project.id,include);
      }
      save(next,include?
        'Projeto incluído somente para este kit. TRT não inclusa; paga pelo contratante.':
        'Projeto retirado somente deste kit.');
    }catch(e){status(e?.message||'Não foi possível alterar este projeto.');renderCart();}
  }
  function addWithProject(kitId){
    const kit=available().find(p=>p.kind==='kit'&&p.id===kitId);
    const project=projectForKit(kit);
    if(!kit||!project){status('Projeto para esta faixa sob consulta. Fale conosco.');return;}
    const next=S.lines.map(x=>({...x}));
    const row=next.find(x=>x.id===kitId);
    if(row){if(row.qty>=99){status('Limite por produto: 99 unidades.');return;}row.qty++;}
    else{if(next.length>=25){status('Máximo de 25 tipos de produto.');return;}next.push({id:kitId,qty:1});}
    try{
      if(project.id==='PRJ-'+kitId){
        const dedicated=next.find(x=>x.id===project.id);
        if(dedicated)dedicated.qty=next.find(x=>x.id===kitId).qty;
        else next.push({id:project.id,qty:next.find(x=>x.id===kitId).qty});
      }else{
        const selected=C.setProjectForKit(next,kitId,project.id,true);
        save(selected,'Kit e projeto incluídos somente para este kit. TRT não inclusa.');
        return;
      }
      save(next,'Kit e projeto incluídos somente para este kit. TRT não inclusa.');
    }catch(e){status(e?.message||'Limite de itens atingido.');}
  }
  function removeCartItem(id){
    const item=S.lines.find(x=>x.id===id);
    if(!item)return;
    const product=available().find(p=>p.id===id);
    let next;
    if(product?.kind==='kit'){
      next=C.removeKitProjectLinks(S.lines,id);
    }else if(id.startsWith('PRJ-B-')&&Array.isArray(item.linkedKits)){
      // O botão Remover no serviço avulso não desfaz os projetos de outros kits.
      next=S.lines.filter(x=>x.id!==id);
      if(item.linkedKits.length>0)next.push({
        id,qty:item.linkedKits.length,standaloneQty:0,linkedKits:[...item.linkedKits]
      });
    }else next=S.lines.filter(x=>x.id!==id);
    save(next,'Item removido.');
  }
  function quantity(id,delta){
    const next=S.lines.map(x=>({...x})),r=next.find(x=>x.id===id);if(!r)return;
    if(id.startsWith('PRJ-WW-'))return;
    if(id.startsWith('PRJ-B-')&&Array.isArray(r.linkedKits)){
      // O controle de quantidade atua somente sobre projetos avulsos.
      const standalone=Math.max(0,Math.min(99-r.linkedKits.length,r.standaloneQty+delta));
      r.standaloneQty=standalone;
      r.qty=standalone+r.linkedKits.length;
    }else r.qty=Math.max(0,Math.min(99,r.qty+delta));
    const dedicated=next.find(x=>x.id==='PRJ-'+id);
    if(dedicated)dedicated.qty=r.qty;
    let cleaned=next.filter(x=>x.qty>0);
    if(r.qty===0&&available().some(p=>p.id===id&&p.kind==='kit')){
      cleaned=C.removeKitProjectLinks(cleaned,id);
    }
    save(cleaned,'Quantidade atualizada.');
  }
  function makeCartRow(x,missing=false,inDrawer=false){
    const row=el('div',undefined,'client-cart-line'),label=el('div'),tools=el('div',undefined,'client-qty');
    const isLinkedService=x.id.startsWith('PRJ-WW-');
    const itemName=isLinkedService?'Projeto elétrico do kit ('+x.id.slice(7)+')':x.title;
    label.append(el('strong',itemName));
    const selectedProduct=available().find(p=>p.id===x.id);
    if(selectedProduct?.kind==='kit')label.append(el('div',kitVariantLabel(selectedProduct),'client-muted'));
    label.append(el('p',missing?'Indisponível — remova este item':euro(x.unit/100)+' por unidade','client-muted'));
    if(inDrawer&&!missing&&x.id.startsWith('PRJ-B-')&&
       !S.lines.find(item=>item.id===x.id)?.linkedKits){
      label.append(el('small','Projeto avulso sem kit definido. Para vincular a um kit, remova esta linha e marque a opção no kit desejado.','client-muted'));
    }
    if(inDrawer&&!missing&&available().some(p=>p.id===x.id&&p.kind==='kit')){
      const kit=available().find(p=>p.id===x.id),project=projectForKit(kit);
      if(project){
        const option=el('label',undefined,'client-project-option');
        const checkbox=el('input');checkbox.type='checkbox';
        const projectLine=S.lines.find(item=>item.id===project.id);
        checkbox.checked=project.id==='PRJ-'+x.id
          ?!!projectLine:!!projectLine?.linkedKits?.includes(x.id);
        checkbox.setAttribute('aria-label','Incluir projeto elétrico para '+x.title+' ('+kitVariantLabel(kit)+')');
        checkbox.addEventListener('change',()=>setKitProject(x.id,checkbox.checked));
        const caption=el('span');
        caption.append(el('strong','Incluir projeto elétrico · '+euro(project.price)),
          el('small',project.id==='PRJ-'+x.id
            ?'Projeto opcional vinculado ao kit · TRT paga pelo contratante'
            :'Projeto somente para este kit · TRT paga pelo contratante'));
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
    // Os projetos incorporados ao kit não ocupam outra linha visual.
    // Os itens originais permanecem intactos para valor, persistência e cotação.
    const visibleValid=C.cartDisplayRows(valid,products,S.lines);
    const visibleRows=[...visibleValid,...bad];
    const count=visibleRows.reduce((n,x)=>n+x.qty,0);
    $('client-cart-count').textContent=String(count);
    $('client-top-count').textContent=String(count);
    $('client-drawer-clear').disabled=S.lines.length===0;
    const sumText=S.cartInvalid?'A revisar':euro(cents/100);
    for(const id of ['client-cart-total','client-top-total','client-preview-total','client-drawer-total'])
      $(id).textContent=sumText;
    for(const x of visibleRows){
      const missing=bad.includes(x);
      area.append(makeCartRow(x,missing));drawer.append(makeCartRow(x,missing,true));
    }
    if(!S.lines.length){
      area.append(el('p','Seu carrinho está vazio.','client-muted'));
      drawer.append(el('p','Seu carrinho está vazio. Escolha um kit gerador ou projeto elétrico para solicitar uma cotação.','client-muted'));
      preview.append(el('p','Nenhum item adicionado.','client-muted'));
    }else{
      for(const x of visibleRows.slice(0,3)){
        const line=el('div',undefined,'client-preview-row');
        const selectedProduct=products.find(p=>p.id===x.id);
        const variant=selectedProduct?.kind==='kit'?' · '+kitVariantLabel(selectedProduct):'';
        line.append(el('span',x.qty+' × '+x.title+variant),el('b',bad.includes(x)?'Indisponível':euro(x.amount/100)));
        preview.append(line);
      }
      if(visibleRows.length>3)preview.append(el('p','E mais '+(visibleRows.length-3)+' produto(s)...','client-muted'));
    }
    if(S.cartInvalid)status('Existem peças avulsas ou itens indisponíveis no carrinho antigo. Remova-os antes de finalizar.');
    updateClock();
  }
  // Serviços PRJ-B são avulsos e independentes de qualquer kit (PRJ-WW).
  // O preço exibido acompanha somente o catálogo ativo e aprovado.
  function renderStandaloneProjects(){
    for(const button of document.querySelectorAll('[data-project-id]')){
      const project=available().find(p=>p.id===button.dataset.projectId &&
        p.kind==='piece' && p.payload?.categoria==='projetos' && !p.payload?.kitCodigo);
      const price=button.parentElement?.querySelector('strong');
      if(price)price.textContent=project?euro(project.price):'Sob consulta';
      button.disabled=!project;
      button.textContent=!project?'Indisponível':S.user?'Adicionar +':'Ver detalhes ↗';
    }
    const hint=$('client-projects-hint');
    if(hint)hint.textContent=S.user?
      'Selecione a faixa correspondente à potência instalada. É possível solicitar apenas o projeto; TRT não inclusa.' :
      'Entre na sua conta para adicionar somente o projeto ao carrinho.';
  }
  function renderAll(){
    $('client-available-count').textContent=String(available().filter(p=>p.kind==='kit').length);
    renderRecommendation();renderCategories();renderProducts();renderStandaloneProjects();renderCart();setTarget(S.target);
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
      const invalid=S.lines.filter(line=>!newCatalog.some(p=>p.id===line.id&&quotableProduct(p)));
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
      if(S.lines.some(line=>!(fresh||[]).some(p=>p.id===line.id&&quotableProduct(p)))){
        S.catalog=S.catalog.map(p=>(fresh||[]).find(v=>v.id===p.id)||p);
        renderCart();
        status('Itens avulsos não estão mais disponíveis para cotação. Remova-os do carrinho antes de continuar.');
        return;
      }
      const current=C.sumCart(S.lines,(fresh||[]).filter(quotableProduct));
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
      const quoteFunction=PREVIEW_HOST?'wwsolar-quote-preview':'wwsolar-quote';
      if(!PREVIEW_HOST){
        // Bloqueia a gravação até o backend oficial confirmar suporte ao vínculo por kit.
        const {data:capabilities,error:capabilityError}=await S.db.functions.invoke(quoteFunction,{
          body:{action:'capabilities'}
        });
        if(capabilityError||capabilities?.quote_version!==2||
           capabilities?.project_link_snapshots!==true||
           capabilities?.idempotent_request_key!==true){
          status('O envio está temporariamente indisponível: aguardando a atualização segura do sistema de pedidos. Seu carrinho foi preservado.');
          showToast('Sistema de pedidos aguardando atualização.');
          return;
        }
      }
      const {data,error}=await S.db.functions.invoke(quoteFunction,{
        body:{action:PREVIEW_HOST?'validate':'submit',request_key:S.orderKey,expected_total_cents:current.cents}
      });
      if(PREVIEW_HOST&&!error&&data?.validated===true&&Array.isArray(data.items)){
        if(!C.quoteSnapshotMatches(S.lines,data.items)||
           Number(data.total_cents)!==current.cents){
          status('Simulação rejeitada: associação dos projetos ou total divergente. Nenhum pedido foi criado.');
          return;
        }
        const details=$('client-quote-preview');
        details.hidden=false;
        $('client-quote-preview-text').textContent=String(data.message||'');
        status('Simulação DEV aprovada. Confira o resumo abaixo. Nenhum pedido foi registrado ou enviado ao WhatsApp.');
        showToast('Simulação validada! Nenhum pedido real criado.');
        return;
      }
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
          status('Não foi possível confirmar o registro. Confira o histórico antes de repetir a cotação; se necessário, fale com o atendimento.');
        }
        return;
      }
      // O WhatsApp usa somente o texto do servidor e os vínculos já registrados.
      // Nenhuma anotação do carrinho local pode completar um snapshot ausente.
      if(data.quote_version!==2||
         Number(data.order.total_cents)!==current.cents||
         !C.quoteSnapshotMatches(S.lines,data.order.items)){
        status('O pedido foi registrado, mas o resumo recebido não corresponde ao carrinho. Não abriremos o WhatsApp automaticamente; entre em contato com a WW Solar com a referência do pedido.');
        showToast('Pedido registrado: confira o resumo antes de enviar.');
        return;
      }
      const message=String(data.message);
      if(message.length>4000)throw Error('message_length');
      const reference=String(data.order.id).slice(0,8).toUpperCase();
      status('Solicitação '+reference+' registrada no histórico. O envio da mensagem deve ser confirmado no WhatsApp.');
      showToast('Solicitação registrada! Abrindo WhatsApp...');
      const hasProject=S.lines.some(line=>available().some(p=>p.id===line.id&&p.payload?.categoria==='projetos'));
      const destination=hasProject&&/^55[0-9]{10,11}$/.test(cfg.projectWhatsapp||'')?cfg.projectWhatsapp:cfg.whatsapp;
      window.location.assign('https://wa.me/'+destination+'?text='+encodeURIComponent(message));
    }catch(e){
      status('A operação não pôde ser concluída ou confirmada. Consulte o histórico antes de tentar de novo.');
    }finally{S.checkoutPending=false;updateClock();}
  }
  $('client-login-form').addEventListener('submit',login);
  $('client-forgot-password').addEventListener('click',()=>void requestReset());
  $('client-password-setup-form').addEventListener('submit',event=>void savePersonalPassword(event));
  $('client-password-cancel').addEventListener('click',()=>void cancelPasswordSetup());
  $('client-logout').addEventListener('click',logout);
  $('client-login-open').addEventListener('click',()=>requestLoginFor(null));
  $('client-back-to-catalog').addEventListener('click',()=>{
    S.pendingProductId=null;
    void showPublicCatalog().catch(()=>{
      showLogin();
      status('Não foi possível abrir a vitrine. Tente novamente.','client-login-status');
    });
  });
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
  $('client-kits-link').addEventListener('click',()=>setKind('kit'));
  // A navegação por peças avulsas foi retirada do catálogo comercial.
  $('client-result-button').addEventListener('click',()=>{
    const kit=C.recommendedKit(available(),S.target);
    if(kit)add(kit.id);
  });
  for(const button of document.querySelectorAll('[data-project-id]')){
    button.addEventListener('click',()=>{
      if(button.disabled)return;
      const id=button.dataset.projectId;
      const project=available().find(p=>p.id===id && p.kind==='piece' &&
        p.payload?.categoria==='projetos' && !p.payload?.kitCodigo);
      if(!project){status('Projeto indisponível.');return;}
      if(!S.user){requestLoginFor(id);return;}
      add(id);
      status('Projeto elétrico adicionado. Você pode cotar apenas esse serviço; TRT não inclusa.');
      openDrawer();
    });
  }
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
