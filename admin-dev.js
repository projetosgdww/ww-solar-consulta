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
 for(const name of ['clients','orders','kits']){
   $('admin-'+name+'-panel').hidden=which!==name;
   $('admin-tab-'+name).classList.toggle('active',which===name);
   $('admin-tab-'+name).setAttribute('aria-pressed',String(which===name));
 }
 if(which==='clients')void loadClients();
 if(which==='orders')void loadOrders();
 if(which==='kits')void loadKitPreviews();
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
     one.append(element('span',String(x.qty)+' × '+String(x.title)+' ['+String(x.sku)+']'));
     one.append(element('strong',money(x.subtotal_cents)));
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
$('admin-refresh-kits').addEventListener('click',()=>void loadKitPreviews());

$('admin-kit-status-filter').addEventListener('change',renderKitPreviews);
$('admin-refresh-clients').addEventListener('click',()=>void loadClients());
$('admin-refresh-orders').addEventListener('click',()=>void loadOrders());
$('admin-order-filter').addEventListener('change',renderOrders);
void init();
})();