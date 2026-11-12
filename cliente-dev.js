(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C=window.WWSolarClienteCore, cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
  const S={db:null,user:null,admin:false,catalog:[],lines:[],kind:'kit',query:'',target:750};
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
        .select('lines').eq('user_id',user.id).maybeSingle();
      if(cartError)throw cartError;
      S.user=user;S.admin=user.app_metadata?.wwsolar_role==='admin';
      S.catalog=data||[];S.lines=C.cleanLines(cart?.lines||[]);
      show('client-login',false);show('client-app',true);
      show('client-admin-link',S.admin);
      $('client-identity').textContent=user.email||'Conta autorizada';
      renderAll();
    }catch(e){
      S.user=null;S.catalog=[];S.lines=[];
      await S.db.auth.signOut();
      show('client-login',true);show('client-app',false);
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
    S.user=null;S.catalog=[];S.lines=[];S.admin=false;
    show('client-app',false);show('client-login',true);
    $('client-password').value='';status('','client-login-status');
  }
  function setTarget(v){
    const n=Number(v);if(!Number.isFinite(n))return;
    S.target=Math.max(300,Math.min(14600,Math.round(n)));
    $('client-target').value=S.target;$('client-target-slider').value=S.target;
    renderRecommendation();
  }
  function renderRecommendation(){
    const a=$('client-recommendation');a.replaceChildren();
    const kit=C.recommendedKit(available(),S.target);
    if(!kit){a.append(el('p','Nenhum kit homologado está disponível neste ambiente.'));return;}
    a.append(el('strong',kit.title));
    a.append(el('span',String(kit.payload?.geracaoMensalKwh||'—')+' kWh/mês estimados'));
    a.append(el('strong',euro(kit.price)));
    a.append(btn('Adicionar kit ao carrinho ↗',()=>add(kit.id),'button button-accent'));
  }
  function renderProducts(){
    const q=S.query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const products=available().filter(p=>p.kind===S.kind)
      .filter(p=>!q||[p.id,p.title,p.payload?.inversor,p.payload?.categoria]
        .some(v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)))
      .slice(0,150);
    const grid=$('client-product-grid');grid.replaceChildren();
    $('client-result-count').textContent=products.length+' produtos disponíveis para consulta';
    if(!products.length){grid.append(el('p','Nenhum produto nesta categoria.','client-muted'));return;}
    for(const p of products){
      const card=el('article',undefined,'client-product');
      card.append(el('span',p.kind==='kit'?'KIT FOTOVOLTAICO':'EQUIPAMENTO AVULSO','section-label'));
      card.append(el('h3',p.title));
      if(p.kind==='kit'){
        const x=p.payload||{};
        card.append(el('p',String(x.placas||'—')+' módulos · '+String(x.potenciaKwp||'—')+' kWp · '+String(x.geracaoMensalKwh||'—')+' kWh/mês estimados','client-meta'));
      }else card.append(el('p',p.payload?.categoria||p.id,'client-meta'));
      card.append(el('strong',euro(p.price)));
      card.append(btn('Adicionar +',()=>add(p.id),'button button-accent'));
      grid.append(card);
    }
  }
  async function save(next){
    if(!S.user)return;
    try{
      const lines=C.cleanLines(next);
      const {error}=await S.db.from('wwsolar_carts').upsert({
        user_id:S.user.id,lines,updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(error)throw error;
      S.lines=lines;renderCart();status('Carrinho atualizado.');
    }catch(e){status('Não foi possível salvar o carrinho. Verifique sua conexão.');}
  }
  function add(id){
    const next=S.lines.map(x=>({...x}));
    const row=next.find(x=>x.id===id);
    if(row){if(row.qty>=99){status('Limite por produto: 99 unidades.');return;}row.qty++;}
    else{if(next.length>=25){status('Máximo de 25 tipos de produto.');return;}next.push({id,qty:1});}
    save(next);
  }
  function quantity(id,delta){
    const next=S.lines.map(x=>({...x})),r=next.find(x=>x.id===id);if(!r)return;
    r.qty=Math.max(0,Math.min(99,r.qty+delta));
    save(next.filter(x=>x.qty>0));
  }
  function renderCart(){
    const area=$('client-cart-lines');area.replaceChildren();
    let result;
    try{result=C.sumCart(S.lines,available());}
    catch(e){status('Itens indisponíveis no carrinho. Remova-os antes de finalizar.');$('client-checkout').disabled=true;return;}
    $('client-cart-count').textContent=String(result.selected.length);
    $('client-cart-total').textContent=euro(result.cents/100);
    $('client-checkout').disabled=result.selected.length===0;
    if(!result.selected.length){area.append(el('p','Seu carrinho está vazio.','client-muted'));return;}
    for(const x of result.selected){
      const row=el('div',undefined,'client-cart-line'),label=el('div'),tools=el('div',undefined,'client-qty');
      label.append(el('strong',x.title),el('p',euro(x.unit/100)+' por unidade','client-muted'));
      tools.append(btn('−',()=>quantity(x.id,-1)),el('output',x.qty),btn('+',()=>quantity(x.id,1)));
      row.append(label,tools,el('strong',euro(x.amount/100)),
        btn('Remover',()=>save(S.lines.filter(z=>z.id!==x.id)),'client-remove'));
      area.append(row);
    }
  }
  function renderAll(){renderRecommendation();renderProducts();renderCart();}
  async function checkout(){
    if(!S.user||!S.lines.length)return;
    $('client-checkout').disabled=true;status('Atualizando valores...');
    try{
      const {data,error}=await S.db.from('wwsolar_catalog')
        .select('id,title,price,kind,active,approved,payload')
        .in('id',S.lines.map(x=>x.id)).eq('active',true).eq('approved',true);
      if(error)throw error;
      const {selected,cents}=C.sumCart(S.lines,data||[]);
      const message=C.buildMessage(S.user.email,selected,cents);
      if(message.length>2500)throw Error('Mensagem longa');
      status('Abrindo WhatsApp; confirme o envio da mensagem por lá.');
      window.location.assign('https://wa.me/'+cfg.whatsapp+'?text='+encodeURIComponent(message));
    }catch(e){status('Não foi possível montar a mensagem. Revise o carrinho.');}
    finally{$('client-checkout').disabled=S.lines.length===0;}
  }
  $('client-login-form').addEventListener('submit',login);
  $('client-logout').addEventListener('click',logout);
  $('client-target').addEventListener('input',ev=>setTarget(ev.target.value));
  $('client-target-slider').addEventListener('input',ev=>setTarget(ev.target.value));
  $('client-search').addEventListener('input',ev=>{S.query=ev.target.value;renderProducts();});
  for(const tab of document.querySelectorAll('[data-kind]')){
    tab.addEventListener('click',()=>{
      S.kind=tab.dataset.kind;
      for(const x of document.querySelectorAll('[data-kind]')){
        const active=x.dataset.kind===S.kind;
        x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));
      }
      renderProducts();
    });
  }
  $('client-checkout').addEventListener('click',checkout);
  init();
})();