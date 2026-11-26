(()=>{
'use strict';
const $=id=>document.getElementById(id),cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
let db=null,oneTime='',ready=false,orders=[],orderEvents=[];
const statuses={registrado:'Registrada',em_atendimento:'Em atendimento',fechado:'Fechada',cancelado:'Cancelada'};
const status=m=>{$('admin-dev-status').textContent=m;};
const orderStatus=m=>{$('admin-order-status').textContent=m;};
const element=(tag,text,cls)=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=String(text);
 if(cls)e.className=cls;
 return e;
};
const button=(text,onClick,cls='button button-outline')=>{
 const b=element('button',text,cls);b.type='button';b.addEventListener('click',onClick);return b;
};
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
const date=iso=>{
 const n=Date.parse(String(iso||''));
 return Number.isFinite(n)?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(n)):'—';
};
function clearCredentials(){
 oneTime='';$('admin-dev-credentials').textContent='';
 $('admin-dev-created').hidden=true;
}
function showPanel(which){
 if(!ready)return;
 clearCredentials();
 for(const name of ['clients','orders','kits','composer','tariffs'].filter(n=>$('admin-tab-'+n)&&$('admin-'+n+'-panel'))){
   $('admin-'+name+'-panel').hidden=which!==name;
   $('admin-tab-'+name).classList.toggle('active',which===name);
   $('admin-tab-'+name).setAttribute('aria-pressed',String(which===name));
 }
 if(which==='clients')void loadClients();
 if(which==='orders')void loadOrders();
 if(which==='kits')void loadKitPreviews();
 if(which==='composer')void loadCompositionCatalog();
 if(which==='tariffs'){renderTariffs();renderOfficialTariffs();}
}
async function init(){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||'')
    ||!cfg.publishableKey||!window.supabase?.createClient){
   status('Administração DEV não configurada. Nenhuma conta foi alterada.');return;
 }
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);
 const {data,error}=await db.auth.getUser();
 if(error||data?.user?.app_metadata?.wwsolar_role!=='admin'){
   status('Acesso restrito ao administrador. Faça login na área do cliente com sua conta administrativa.');
   return;
 }
 ready=true;
 $('admin-tabs').hidden=false;
 $('admin-dev-form').hidden=false;
 $('admin-client-directory').hidden=false;
 status('Administrador autenticado. Utilize a aba Clientes para administrar acessos.');
 void loadClients();
}
async function functionError(error,fallback){
 if(!error)return fallback;
 let code='';
 try{code=(await error.context?.json())?.error||'';}catch(_){}
 const dictionary={
  client_not_found:'Cliente não encontrado. Verifique o e-mail.',
  cannot_create_customer:'O e-mail já pode ter cadastro. Confira a lista.',
  client_identity_not_valid:'A conta não corresponde a um cliente autorizado.',
  not_authorized:'Sessão administrativa não autorizada. Entre novamente.',
  audit_failed_status_may_have_changed:'O pedido pode ter sido alterado, mas houve falha ao registrar a auditoria. Atualize antes de tentar de novo.',
  concurrent_update:'Este pedido foi alterado em outra sessão. Atualize a lista.'
 };
 return dictionary[code]||fallback;
}
async function sendAction(action){
 if(!ready)return;
 const input=$('admin-dev-email');
 if(!input.reportValidity())return;
 const email=input.value.trim().toLowerCase();
 if(action==='rotate'&&!window.confirm(
   'Reemitir uma senha para '+email+'? A senha anterior deixará de funcionar.'
 ))return;
 $('admin-dev-submit').disabled=true;
 $('admin-dev-rotate').disabled=true;
 status(action==='rotate'?'Reemitindo senha...':'Criando acesso...');
 clearCredentials();
 try{
   const {data,error}=await db.functions.invoke('wwsolar-create-customer',{body:{email,action}});
   if(error)throw new Error(await functionError(error,'Falha ao gerar o acesso. Confira os dados ou tente novamente.'));
   if(!data?.email||!data?.password||data?.action!==action)
      throw Error('O servidor não confirmou a criação da senha. Não envie credenciais.');
   oneTime='WW Solar — Área do cliente\n'
     +'Acesso: '+new URL('./cliente-dev.html',window.location.href).href+'\n'
     +'E-mail: '+data.email+'\nSenha temporária: '+data.password+'\n'
     +'No primeiro acesso, crie sua senha pessoal. Não compartilhe a nova senha.';
   $('admin-dev-credentials').textContent=oneTime;
   $('admin-dev-created').hidden=false;
   input.value='';
   status(action==='rotate'
     ?'Senha temporária reemitida. O cliente deverá trocá-la no acesso.'
     :'Acesso criado. Encaminhe a senha temporária; a troca será obrigatória.');
   void loadClients();
 }catch(e){status(e?.message||'Não foi possível confirmar a operação.');}
 finally{$('admin-dev-submit').disabled=false;$('admin-dev-rotate').disabled=false;}
}
async function loadClients(){
 if(!ready)return;
 const target=$('admin-client-list');
 target.replaceChildren(element('p','Carregando acessos...','client-muted'));
 const {data,error}=await db.from('wwsolar_client_access')
   .select('user_id,email,active,created_at').order('created_at',{ascending:false}).limit(100);
 if(error){
   target.replaceChildren(element('p','Não foi possível consultar os clientes. Verifique a conexão.','client-status'));
   return;
 }
 target.replaceChildren();
 if(!data?.length){target.append(element('p','Nenhum cliente cadastrado.','client-muted'));return;}
 for(const item of data){
   const row=element('div',undefined,'admin-client-row');
   const desc=element('div');
   desc.append(element('strong',item.email));
   desc.append(element('small','Criado em '+date(item.created_at)));
   const state=element('span',item.active?'Ativo':'Bloqueado',item.active?'admin-pill admin-pill-green':'admin-pill');
   const action=button(item.active?'Bloquear':'Reativar',()=>void changeAccess(item,action));
   row.append(desc,state,action);
   target.append(row);
 }
}
async function changeAccess(item,btn){
 if(!ready)return;
 const enabled=!item.active;
 if(!window.confirm((enabled?'Reativar':'Bloquear')+' o acesso de '+item.email+'? O histórico será preservado.'))return;
 btn.disabled=true;
 status('Atualizando situação do cliente...');
 try{
   const {data,error}=await db.functions.invoke('wwsolar-create-customer',{
     body:{action:'set_access',email:item.email,enabled}
   });
   if(error||data?.action!=='set_access'||data?.active!==enabled){
     throw new Error(await functionError(error,'Não foi possível alterar o acesso.'));
   }
   status(enabled?'Acesso reativado com sucesso.':'Acesso bloqueado sem excluir o histórico.');
   await loadClients();
 }catch(e){status(e?.message||'Não foi possível alterar o cliente.');}
 finally{btn.disabled=false;}
}
async function loadOrders(){
 if(!ready)return;
 orderStatus('Consultando solicitações...');
 const {data,error}=await db.from('wwsolar_quote_requests')
   .select('id,user_id,customer_email,items,total_cents,status,created_at,updated_at')
   .order('created_at',{ascending:false}).limit(100);
 if(error){
   orderStatus('Não foi possível ler o histórico. Verifique as permissões ou conexão.');
   return;
 }
 orders=data||[];
 orderEvents=[];
 if(orders.length){
   const {data:events}=await db.from('wwsolar_quote_status_events')
     .select('request_id,old_status,new_status,changed_at,changed_by')
     .in('request_id',orders.map(x=>x.id)).order('changed_at',{ascending:false}).limit(300);
   orderEvents=events||[];
 }
 orderStatus(orders.length+' solicitações encontradas (até 100 mais recentes).');
 renderOrders();
}
function renderOrders(){
 const list=$('admin-order-list'),filter=$('admin-order-filter').value;
 const shown=orders.filter(x=>filter==='todos'||x.status===filter);
 $('admin-order-count').textContent=shown.length+' exibidos';
 list.replaceChildren();
 if(!shown.length){
   list.append(element('p','Nenhuma solicitação encontrada neste filtro.','client-muted'));
   return;
 }
 for(const item of shown){
   const card=element('article',undefined,'admin-order-card');
   const header=element('div',undefined,'admin-order-header');
   const ref=element('div');
   ref.append(element('strong','PED-'+item.id.slice(0,8).toUpperCase()));
   ref.append(element('small',date(item.created_at)+' · '+item.customer_email));
   const sum=element('strong',money(item.total_cents),'admin-order-money');
   const pill=element('span',statuses[item.status]||item.status,'admin-pill');
   header.append(ref,sum,pill);card.append(header);
   const detail=element('details',undefined,'admin-order-detail');
   const summary=element('summary','Conferir equipamentos e histórico');
   detail.append(summary);
   const rows=element('div',undefined,'admin-order-items');
   for(const x of Array.isArray(item.items)?item.items:[]){
     const one=element('div',undefined,'admin-order-item');
     const info=element('div',undefined,'admin-order-item-description');
     info.append(element('span',String(x.qty)+' × '+String(x.title)+' ['+String(x.sku)+']'));
     const links=Array.isArray(x.linked_kits)?x.linked_kits:[];
     if(links.length){
       const names=links.map(kit=>String(kit.title)+' ['+String(kit.sku)+']');
       info.append(element('small','Projeto elétrico vinculado a: '+names.join('; '),'admin-linked-project-hint'));
     }
     if(Number.isInteger(x.standalone_qty)&&x.standalone_qty>0)
       info.append(element('small',x.standalone_qty+' projeto(s) avulso(s) sem kit vinculado.','admin-linked-project-hint'));
     one.append(info,element('strong',money(x.subtotal_cents)));
     rows.append(one);
   }
   detail.append(rows);
   const relevant=orderEvents.filter(x=>x.request_id===item.id);
   if(relevant.length){
     const changes=element('div',undefined,'admin-order-audit');
     changes.append(element('strong','Alterações registradas:'));
     for(const e of relevant){
       changes.append(element('p',date(e.changed_at)+' — '+(statuses[e.old_status]||e.old_status)+
        ' → '+(statuses[e.new_status]||e.new_status)));
     }
     detail.append(changes);
   }
   card.append(detail);
   const actions=element('div',undefined,'admin-order-actions');
   const label=element('label','Situação:');
   const choose=element('select');
   choose.setAttribute('aria-label','Situação do pedido PED-'+item.id.slice(0,8));
   for(const [key,title] of Object.entries(statuses)){
     const option=element('option',title);option.value=key;choose.append(option);
   }
   choose.value=item.status;
   const save=button('Salvar situação',()=>void changeOrder(item,choose,save));
   actions.append(label,choose,save);
   card.append(actions);
   list.append(card);
 }
}
async function changeOrder(item,select,buttonElement){
 const value=select.value;
 if(value===item.status)return;
 if(!window.confirm('Alterar PED-'+item.id.slice(0,8).toUpperCase()+
  ' de "'+(statuses[item.status]||item.status)+'" para "'+(statuses[value]||value)+'"?'))return;
 buttonElement.disabled=true;
 orderStatus('Salvando situação e registrando alteração...');
 try{
   const {data,error}=await db.functions.invoke('wwsolar-quote',{
     body:{action:'status',id:item.id,status:value}
   });
   if(error||data?.status!==value)throw Error(await functionError(error,'Falha ao atualizar o pedido.'));
   await loadOrders();
   orderStatus('Situação atualizada com sucesso; alteração registrada no histórico.');
 }catch(e){
   orderStatus(e?.message||'Falha ao atualizar o pedido. Recarregue antes de tentar novamente.');
 }finally{buttonElement.disabled=false;}
}
// Painel de kits: SOMENTE LEITURA. Nunca publica, aprova ou cadastra produtos.
let kitPreviews=[],kitCatalog=[];
const kitCurrency=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const kitNumber=v=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(Number(v)||0);
const kitLabels={
 candidato_pendente:'Candidato preliminar · homologação pendente',
 ficha_modelo_pendente:'Ficha do inversor pendente',
 sem_inversor_na_base:'Sem inversor na potência de referência',
 incompativel_preliminar:'ALERTA ELÉTRICO: revisão obrigatória antes da homologação'
};
async function loadKitPreviews(){
 if(!ready||!window.WWSolarEightKits)return;
 const K=window.WWSolarEightKits;
 $('admin-kit-status').textContent='Atualizando as oito propostas comerciais...';
 const cat=await db.from('wwsolar_catalog').select('id,kind,title,price,payload,active,approved')
    .eq('kind','piece').eq('active',true).eq('approved',true);
 if(cat.error){$('admin-kit-status').textContent='Erro ao carregar as peças. Verifique as permissões.';return;}
 kitCatalog=cat.data||[];
 kitPreviews=K.specifications.map(p=>K.compose(p,kitCatalog));
 $('admin-kit-status').textContent='8 kits disponíveis para solicitar cotação, sujeitos à conferência técnica da instalação. Os 32 rascunhos antigos continuam preservados.';
 renderKitPreviews();
}
function renderKitPreviews(){
 const filter=$('admin-kit-status-filter').value;
 const shown=kitPreviews.filter(p=>filter==='all'||(filter==='pendente_engenharia'&&p.engineeringPending.length>0));
 $('admin-kit-count').textContent=shown.length+' de '+kitPreviews.length+' kits';
 const target=$('admin-kit-list');target.replaceChildren();
 if(!shown.length){target.append(element('p','Sem kits nesta seleção.','client-muted'));return;}
 const niceItem=row=>{
   if(row.label==='Módulos')return 'Módulos fotovoltaicos';
   if(row.label==='Inversor')return 'Inversor solar';
   if(row.label.startsWith('Fixação'))return 'Kit de fixação para telhado cerâmico';
   if(row.label.startsWith('Perfil'))return 'Perfis de alumínio';
   if(row.label.startsWith('Cabo solar vermelho'))return 'Cabo solar vermelho — rolo de 25 m';
   if(row.label.startsWith('Cabo solar preto'))return 'Cabo solar preto — rolo de 25 m';
   if(row.sku==='PAV-007')return 'Conectores MC4 (2 pares por embalagem)';
   return row.label;
 };
 for(const kit of shown){
   const card=element('article',undefined,'admin-order-card');
   const head=element('div',undefined,'admin-order-header');
   const desc=element('div');
   desc.append(element('strong','Kit '+kitNumber(kit.target)+' kWh/mês'));
   desc.append(element('small',kit.panels+' módulos '+kit.brand+' de '+kit.moduleWp+' W · geração média estimada: '+kitNumber(kit.generationKwhMonth)+' kWh/mês'));
   head.append(desc,element('strong',kit.previewPrice===null?'Sob consulta':kitCurrency(kit.previewPrice),'admin-order-money'),element('span','COTAÇÃO SUJEITA À CONFERÊNCIA','admin-pill'));
   card.append(head);
   card.append(element('p','Inversor: '+kit.inverterName,'client-muted'));
   if(kit.gridRequired==='trifasica_380')
     card.append(element('small','ℹ️ Indicado para instalação com rede trifásica 380 V.','client-muted'));
   const detail=element('details',undefined,'admin-order-detail');
   detail.append(element('summary','Ver o que está incluído no kit'));
   const lines=element('div',undefined,'admin-order-items');
   for(const row of kit.rows){
     const item=element('div',undefined,'admin-order-item');
     const label=niceItem(row);
     const extra=row.label==='Módulos'?' · '+kit.moduleWp+' W':row.label==='Inversor'?' · '+kit.inverterName:'';
     item.append(element('span',row.quantity+' × '+label+extra));
     item.append(element('strong',row.subtotal===null?'Sob consulta':kitCurrency(row.subtotal)));
     lines.append(item);
   }
   detail.append(lines);
   detail.append(element('p','Valor do conjunto: '+(kit.previewPrice===null?'sob consulta':kitCurrency(kit.previewPrice))+'. Preço e disponibilidade sujeitos à confirmação.','client-muted'));
   card.append(detail);
   const internal=element('details',undefined,'admin-order-detail');
   internal.append(element('summary','Análise interna (somente administrador)'));
   internal.append(element('p','Referência interna: '+kit.code+' · Itens: '+kit.rows.map(x=>x.quantity+' × '+x.sku).join(', '),'admin-order-audit'));
   internal.append(element('p',kit.engineeringPending.join(' · '),'admin-order-audit'));
   card.append(internal);target.append(card);
 }
}
// Apenas composição no administrador: custos privados com RLS. Sem INSERT/UPDATE.
let composerCatalog=[],composerLines=[{sku:'',quantity:1}],composerLoaded=false,composerLoading=false;
const composeStatus=m=>{$('admin-compose-status').textContent=m;};
const composeCore=()=>window.WWSolarAdminComposition;
const composeTotal=()=>{
 const core=composeCore();
 if(!core)return;
 const calculated=core.composeRows(composerLines,composerCatalog);
 $('admin-compose-total').textContent=core.money(calculated.totalCents);
 $('admin-compose-power').textContent=calculated.panels
   ?calculated.panels+' módulo(s) · '+(calculated.powerWp/1000).toLocaleString('pt-BR',{maximumFractionDigits:3})+' kWp'
   :'';
 const displayed=$('admin-compose-rows').querySelectorAll('tr');
 calculated.rows.forEach((row,i)=>{
  const tr=displayed[i];if(!tr)return;
  const item=tr.querySelector('[data-compose-unit]');
  const total=tr.querySelector('[data-compose-subtotal]');
  if(item)item.textContent=row.product?core.money(row.product.unitCostCents):'—';
  if(total)total.textContent=row.product&&row.quantity?core.money(row.subtotalCents):'—';
 });
};
const composeCell=(tr,className,text)=>{
 const td=element('td',text,className);tr.append(td);return td;
};
function renderComposition(){
 const core=composeCore();if(!core)return;
 const tbody=$('admin-compose-rows');tbody.replaceChildren();
 const categories=new Map();
 for(const item of composerCatalog){
  if(!categories.has(item.category))categories.set(item.category,[]);
  categories.get(item.category).push(item);
 }
 composerLines.forEach((line,i)=>{
  const p=composerCatalog.find(x=>x.sku===line.sku)||null;
  const tr=document.createElement('tr');
  composeCell(tr,'admin-compose-code',p?.sku||'—');
  composeCell(tr,'',p?.category||'—');
  const productCell=composeCell(tr,'');
  const select=element('select');select.setAttribute('aria-label','Equipamento da linha '+(i+1));
  const placeholder=element('option','Selecione um equipamento...');placeholder.value='';select.append(placeholder);
  for(const [category,items] of categories){
    const group=element('optgroup');group.label=category;
    for(const product of items){
      const option=element('option',product.title);option.value=product.sku;
      if(line.sku===product.sku)option.selected=true;
      group.append(option);
    }
    select.append(group);
  }
  select.value=p?p.sku:'';
  select.addEventListener('change',()=>{
    composerLines[i].sku=select.value;
    if(!core.asQuantity(composerLines[i].quantity))composerLines[i].quantity=1;
    renderComposition();
  });
  productCell.append(select);
  const qtyCell=composeCell(tr,'');
  const qty=element('input');qty.type='number';qty.min='1';qty.max='999';qty.step='1';
  qty.value=String(core.asQuantity(line.quantity)||1);qty.inputMode='numeric';
  qty.setAttribute('aria-label','Quantidade da linha '+(i+1));
  qty.addEventListener('input',()=>{
    composerLines[i].quantity=core.asQuantity(qty.value);
    composeTotal();
  });
  qty.addEventListener('blur',()=>{
    if(!core.asQuantity(qty.value)){composerLines[i].quantity=1;qty.value='1';composeTotal();}
  });
  qtyCell.append(qty);
  const unit=composeCell(tr,'admin-compose-unit','—');unit.dataset.composeUnit='';
  const sub=composeCell(tr,'admin-compose-line','—');sub.dataset.composeSubtotal='';
  const removeCell=composeCell(tr,'');
  const remove=element('button','×','admin-compose-remove');remove.type='button';
  remove.title='Remover item';remove.setAttribute('aria-label','Remover linha '+(i+1));
  remove.addEventListener('click',()=>{
    composerLines.splice(i,1);
    if(!composerLines.length)composerLines.push({sku:'',quantity:1});
    renderComposition();
  });
  removeCell.append(remove);tbody.append(tr);
 });
 composeTotal();
}
async function loadCompositionCatalog(force=false){
 if(!ready||!db||!composeCore())return;
 if(composerLoading)return;
 if(composerLoaded&&!force){renderComposition();return;}
 composerLoading=true;
 composeStatus('Consultando os custos privados cadastrados...');
 try{
  // Esta consulta só retorna linhas do administrador autenticado (RLS owner_id + app_metadata).
  const {data,error}=await db.from('wwsolar_builder_costs')
    .select('sku,title,category,unit_cost_cents,module_wp,source_date')
    .order('title',{ascending:true}).limit(100);
  if(error)throw error;
  const list=composeCore().normalizeCatalog(data);
  if(!list.length)throw Error('Nenhum custo disponível para este acesso administrativo.');
  composerCatalog=list;composerLoaded=true;
  $('admin-compose-workspace').hidden=false;
  const dates=[...new Set(list.map(x=>x.sourceDate).filter(Boolean))].sort();
  const stamp=dates.length===1?new Date(dates[0]+'T12:00:00').toLocaleDateString('pt-BR')
    :'datas de origem diversas';
  composeStatus(list.length+' equipamentos disponíveis · valores de custo cadastrados ('+stamp+').');
  renderComposition();
 }catch(_){
  if(!composerLoaded)$('admin-compose-workspace').hidden=true;
  composeStatus('Não foi possível consultar os custos privados. Confirme a conta administrativa e sua conexão.');
 }finally{composerLoading=false;}
}

$('admin-dev-form').addEventListener('submit',ev=>{ev.preventDefault();void sendAction('create');});
$('admin-dev-rotate').addEventListener('click',()=>void sendAction('rotate'));
$('admin-dev-copy').addEventListener('click',async()=>{
 if(!oneTime)return;
 try{await navigator.clipboard.writeText(oneTime);status('Credenciais copiadas.');}
 catch(e){status('Selecione e copie o texto apresentado.');}
});
$('admin-dev-clear').addEventListener('click',()=>{clearCredentials();status('Credenciais retiradas da tela.');});
$('admin-tab-clients').addEventListener('click',()=>showPanel('clients'));
$('admin-tab-orders').addEventListener('click',()=>showPanel('orders'));
$('admin-tab-kits').addEventListener('click',()=>showPanel('kits'));
$('admin-tab-composer').addEventListener('click',()=>showPanel('composer'));
$('admin-compose-refresh').addEventListener('click',()=>void loadCompositionCatalog(true));
$('admin-compose-add').addEventListener('click',()=>{if(composerLines.length>=80){composeStatus('Limite de 80 linhas atingido.');return;}composerLines.push({sku:'',quantity:1});renderComposition();$('admin-compose-rows').querySelector('tr:last-child select')?.focus();});
$('admin-compose-clear').addEventListener('click',()=>{if(composerLines.some(x=>x.sku)&&!window.confirm('Limpar esta composição?'))return;composerLines=[{sku:'',quantity:1}];renderComposition();composeStatus('Composição limpa. Custos cadastrados preservados.');});
$('admin-compose-copy').addEventListener('click',async()=>{const txt=composeCore()?.summary(composerLines,composerCatalog);if(!txt){composeStatus('Selecione ao menos um equipamento antes de copiar.');return;}try{await navigator.clipboard.writeText(txt);composeStatus('Composição copiada. Você pode enviar o resumo para revisão.');}catch(_){composeStatus('Não foi possível copiar automaticamente neste navegador.');}});
$('admin-refresh-kits').addEventListener('click',()=>void loadKitPreviews());

$('admin-kit-status-filter').addEventListener('change',renderKitPreviews);
$('admin-refresh-clients').addEventListener('click',()=>void loadClients());
$('admin-refresh-orders').addEventListener('click',()=>void loadOrders());
$('admin-order-filter').addEventListener('change',renderOrders);
function renderTariffs(){
 if(!ready||!$('admin-tariffs-rows'))return;
 const core=window.WWSolarEconomia;
 if(!core){$('admin-tariff-status').textContent='Motor tarifario indisponivel. Atualize a pagina.';return;}
 const tbody=$('admin-tariffs-rows');tbody.replaceChildren();
 const fmt=x=>Number(x).toLocaleString('pt-BR',{minimumFractionDigits:5,maximumFractionDigits:5});
 for(const p of Object.values(core.policy.profiles)){
  const row=element('tr');
  for(const x of [p.reference,fmt(p.te),fmt(p.tusd),fmt(p.fioB),String(p.icms*100)+'%',(p.pis*100).toFixed(2)+'%',(p.cofins*100).toFixed(2)+'%',p.flag,p.fioBSource,p.reference===core.policy.reference?'Ativa na simulação':'Histórica'])row.append(element('td',x));
  tbody.append(row);
 }
}
function renderOfficialTariffs(){
 if(!ready||!$('admin-official-rows')||!window.WWSolarEconomia)return;
 const tbody=$('admin-official-rows');tbody.replaceChildren();
 const fmt=x=>x===null?'Não confirmado':Number(x).toLocaleString('pt-BR',{minimumFractionDigits:5,maximumFractionDigits:9});
 const dateBR=x=>x.split('-').reverse().join('/');
 for(const p of window.WWSolarEconomia.policy.periods){
  const row=element('tr');
  for(const x of [dateBR(p.start),dateBR(p.end),fmt(p.te),fmt(p.tusd),fmt(p.fioB),p.reh])row.append(element('td',x));
  tbody.append(row);
 }
}
// Tarifas: o rascunho pertence a uma competencia consultada explicitamente.
let tariffConsultedMonth=null;
const tariffFields=['te','tusd','fioB','icms','pis','cofins','flag','source'];
function clearTariffFields(form){
 for(const k of tariffFields)form.elements[k].value='';
 const preview=$('admin-tariff-preview');preview.textContent='';preview.hidden=true;
}
function setTariffActions(enabled){
 const form=$('admin-tariff-draft');
 if(!form)return;
 form.querySelector('button[type="submit"]').disabled=!enabled;
 $('admin-tariff-copy').disabled=!enabled;
}
function invalidateTariffMonth(){
 const form=$('admin-tariff-draft');
 if(!form)return;
 tariffConsultedMonth=null;clearTariffFields(form);setTariffActions(false);
 if($('admin-tariff-online-result'))$('admin-tariff-online-result').textContent='';
 $('admin-tariff-status').textContent='Competência alterada. Consulte a base novamente antes de validar.';
}
function renderTariffPreview(d){
 const out=$('admin-tariff-preview');out.replaceChildren();
 const core=window.WWSolarEconomia,active=core.policy.profiles[core.policy.reference];
 const fmt=(n,max=9)=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:max});
 const rows=[['TE (R$/kWh)','te',1],['TUSD (R$/kWh)','tusd',1],['Fio B integral (R$/kWh)','fioB',1],['ICMS (%)','icms',100],['PIS (%)','pis',100],['COFINS (%)','cofins',100]];
 out.append(element('h3','Rascunho validado — '+d.reference));
 out.append(element('p','Comparação com a referência ativa: '+active.reference+'. Nenhum valor foi ativado.'));
 const wrapper=element('div');wrapper.className='admin-compose-table-scroll';
 const table=element('table');table.className='eco-tariff-table';const head=element('thead'),hr=element('tr');
 for(const t of ['Parâmetro','Ativo','Rascunho','Diferença'])hr.append(element('th',t));head.append(hr);table.append(head);
 const body=element('tbody');
 for(const [label,key,scale] of rows){
  const tr=element('tr'),delta=(d[key]-active[key])*scale;
  for(const t of [label,fmt(active[key]*scale),fmt(d[key]*scale),Math.abs(delta)<1e-10?'Sem alteração':(delta>0?'+':'')+fmt(delta)])tr.append(element('td',t));body.append(tr);
 }
 const fr=element('tr');for(const t of ['Bandeira',active.flag,d.flag,active.flag===d.flag?'Sem alteração':'Alterada'])fr.append(element('td',t));body.append(fr);
 table.append(body);wrapper.append(table);out.append(wrapper,element('p','Fonte: '+d.source));out.hidden=false;
}
const tariffForm=$('admin-tariff-draft');
if(tariffForm){
 setTariffActions(false);
 tariffForm.elements.reference.addEventListener('input',invalidateTariffMonth);
 tariffForm.elements.reference.addEventListener('change',()=>{if(tariffConsultedMonth!==tariffForm.elements.reference.value)invalidateTariffMonth();});
}
$('admin-tariff-lookup')?.addEventListener('click',()=>{
 if(!ready||!window.WWSolarEconomia)return;
 const form=$('admin-tariff-draft'),status=$('admin-tariff-status');
 if(!form.elements.reference.reportValidity())return;
 try{
  tariffConsultedMonth=null;setTariffActions(false);clearTariffFields(form);
  const r=window.WWSolarEconomia.policy.lookupMonth(form.elements.reference.value);
  if(r.period){
   for(const k of ['te','tusd','fioB'])if(r.period[k]!==null)form.elements[k].value=String(r.period[k]);
   form.elements.source.value='CSV ANEEL 26/11/2026; REH '+r.period.reh+(r.taxes?'; tributos observados em fatura da competência':'');
  }
  if(r.flag)form.elements.flag.value=r.flag;
  if(r.taxes)for(const k of ['icms','pis','cofins'])form.elements[k].value=String(Number((r.taxes[k]*100).toFixed(4)));
  const missing=[];
  if(!r.period)missing.push(r.reason+' — conferir datas do ciclo');
  else if(r.period.fioB===null)missing.push('Fio B integral não confirmado');
  if(!r.flag)missing.push('bandeira sem registro');
  if(!r.taxes)missing.push('tributos mensais pendentes');
  tariffConsultedMonth=r.month;setTariffActions(true);
  status.textContent=missing.length?'Consulta parcial: '+missing.join('; ')+'. Campos pendentes ficam vazios.':'Referências encontradas. Confira e valide o rascunho. Nada foi publicado.';
 }catch(err){status.textContent=err.message;}
});
$('admin-tariff-online')?.addEventListener('click',async()=>{
 if(!ready||!window.WWSolarAneel)return;
 const form=$('admin-tariff-draft'),btn=$('admin-tariff-online'),out=$('admin-tariff-online-result');
 if(!form.elements.reference.reportValidity())return;
 const month=form.elements.reference.value;
 btn.disabled=true;out.textContent='Consultando a ANEEL. Nenhuma tarifa será alterada.';
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  let response,payload;
  try{
   response=await fetch('/api/aneel?month='+encodeURIComponent(month),{signal:controller.signal,credentials:'omit'});
   payload=await response.json();
  }finally{clearTimeout(timer);}
  if(!response.ok||payload?.ok!==true){const err=new Error(payload?.code??'INVALID_RESPONSE');err.source=payload?.source;err.httpStatus=payload?.httpStatus;throw err;}
  const r=payload.result;
  if(!r||r.month!==month||!Array.isArray(r.periods))throw new Error('INVALID_RESPONSE');
  if(form.elements.reference.value!==month){out.textContent='';return;}
  out.replaceChildren();
  out.append(element('h3','Consulta online experimental — '+month));
  const local=window.WWSolarEconomia.policy.lookupMonth(month);
  if(r.period){
   const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:12});
   for(const [label,k] of [['TE','te'],['TUSD','tusd'],['Fio B integral','fioB']]){
    const prev=local.period?.[k],same=typeof prev==='number'&&Math.abs(prev-r.period[k])<1e-9;
    out.append(element('p',label+': R$ '+fmt(r.period[k])+'/kWh · '+(prev==null?'Sem referência local':same?'Igual à base local':'Base local: R$ '+fmt(prev)+'/kWh')));
   }
   out.append(element('p','Vigência: '+r.period.start+' a '+r.period.end+' · '+r.period.reh));
  }else{
   out.append(element('p',r.periods.length>1?'Mais de uma vigência no mês; revisão do ciclo necessária.':'Sem vigência completa na fonte consultada.'));
  }
  out.append(element('p',r.flag?'Bandeira: '+r.flag.name+' · R$ '+r.flag.rate.toLocaleString('pt-BR',{maximumFractionDigits:6})+'/kWh':'Bandeira sem registro para o mês.'));
  out.append(element('p','Consulta informativa. Tributos não são obtidos por esta consulta. A base local e o rascunho permanecem inalterados.'));
 }catch(err){if(form.elements.reference.value===month){const labels={UPSTREAM_TIMEOUT:'Tempo limite da ANEEL',UPSTREAM_HTTP:'Resposta HTTP da ANEEL indisponível',UPSTREAM_DATA:'Dados da ANEEL incompletos ou inconsistentes',UPSTREAM_UNAVAILABLE:'Comunicação com a ANEEL indisponível',INVALID_MONTH:'Consulta disponível somente para 2026',DEV_ONLY:'Consulta restrita ao DEV',INVALID_RESPONSE:'Resposta inválida do intermediário'};const detail=labels[err.message]??'Falha na comunicação com o intermediário';const stage={componentes:'Componentes tarifárias',bandeiras:'Bandeiras tarifárias',validacao:'Validação dos dados',consulta:'Consulta'}[err.source];const http=Number.isInteger(err.httpStatus)?' (HTTP '+err.httpStatus+')':'';out.textContent=(stage?stage+' — ':'')+detail+http+'. Utilize a base importada. Nenhuma tarifa foi alterada.';}}
 finally{btn.disabled=false;}
});
function tariffDraft(){
 if(!ready||!window.WWSolarEconomia)return null;
 const form=$('admin-tariff-draft');
 if(tariffConsultedMonth!==form.elements.reference.value)throw new Error('Consulte a competência selecionada antes de validar.');
 if(!form.reportValidity())return null;
 const data=Object.fromEntries(new FormData(form));
 const d={reference:data.reference,source:data.source,flag:data.flag};
 for(const key of ['te','tusd','fioB'])d[key]=Number(data[key]);
 for(const key of ['icms','pis','cofins'])d[key]=Number(data[key])/100;
 return window.WWSolarEconomia.validateTariffDraft(d);
}
$('admin-tab-tariffs')?.addEventListener('click',()=>showPanel('tariffs'));
$('admin-tariff-draft')?.addEventListener('submit',ev=>{
 ev.preventDefault();if(!ready)return;
 const out=$('admin-tariff-preview'),status=$('admin-tariff-status');out.textContent='';out.hidden=true;
 try{const d=tariffDraft();if(!d)return;renderTariffPreview(d);status.textContent='Rascunho validado. Nenhuma tarifa ativa foi alterada.';}
 catch(err){status.textContent=err.message;}
});
$('admin-tariff-draft')?.addEventListener('input',()=>{if(!ready)return;$('admin-tariff-preview').textContent='';$('admin-tariff-preview').hidden=true;$('admin-tariff-status').textContent='Valide novamente apos editar.';});
$('admin-tariff-copy')?.addEventListener('click',async()=>{
 if(!ready)return;
 try{const d=tariffDraft();if(!d)return;await navigator.clipboard.writeText(JSON.stringify(d,null,2));$('admin-tariff-status').textContent='Rascunho copiado para revisao. Nao publicado.';}
 catch(err){$('admin-tariff-status').textContent='Nao foi possivel copiar: '+err.message;}
});
void init();
})();