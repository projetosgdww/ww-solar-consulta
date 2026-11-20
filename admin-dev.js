(()=>{
'use strict';
const $=id=>document.getElementById(id),cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
let db=null,ready=false,saleKits=[];
const status=m=>{$('admin-sale-status').textContent=m;};
const element=(tag,content,cls)=>{
 const e=document.createElement(tag);
 if(content!==undefined)e.textContent=String(content);
 if(cls)e.className=cls;
 return e;
};
const button=(text,fn,cls='button button-outline')=>{
 const b=element('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;
};
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
const date=iso=>{
 const n=Date.parse(String(iso||''));return Number.isFinite(n)?
 new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(n)):'—';
};
function showPanel(which){
 if(!ready)return;
 for(const name of ['sales','composer']){
  $('admin-'+name+'-panel').hidden=which!==name;
  $('admin-tab-'+name).classList.toggle('active',which===name);
  $('admin-tab-'+name).setAttribute('aria-pressed',String(which===name));
 }
 if(which==='sales')void loadSales();
 if(which==='composer')void loadCompositionCatalog();
}
async function init(){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||'')||
   !cfg.publishableKey||!window.supabase?.createClient){
  $('admin-signin').hidden=false;
  $('admin-signin-status').textContent='Configuração indisponível. Não informe credenciais.';
  return;
 }
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);
 const {data,error}=await db.auth.getUser();
 if(error||data?.user?.app_metadata?.wwsolar_role!=='admin'){
  $('admin-signin').hidden=false;
  return;
 }
 enableAdmin();
}
function enableAdmin(){
 ready=true;
 $('admin-signin').hidden=true;
 $('admin-signin-password').value='';
 $('admin-session-actions').hidden=false;
 $('admin-tabs').hidden=false;
 $('sale-date').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 showPanel('sales');
 void loadSaleKits();
}
async function signInAdmin(event){
 event.preventDefault();
 const submit=$('admin-signin-submit');submit.disabled=true;
 $('admin-signin-status').textContent='Conferindo acesso...';
 try{
  const email=$('admin-signin-email').value.trim().toLowerCase();
  const password=$('admin-signin-password').value;
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error||!data?.user||data.user.app_metadata?.wwsolar_role!=='admin'){
   if(data?.user)await db.auth.signOut();
   throw Error('E-mail ou senha inválidos, ou usuário sem permissão administrativa.');
  }
  $('admin-signin-status').textContent='';
  enableAdmin();
 }catch(e){
  $('admin-signin-password').value='';
  $('admin-signin-status').textContent=e.message||'Não foi possível autenticar.';
 }finally{submit.disabled=false;}
}
async function signOutAdmin(){
 if(db)await db.auth.signOut();
 ready=false;
 $('admin-tabs').hidden=true;
 $('admin-session-actions').hidden=true;
 $('admin-sales-panel').hidden=true;
 $('admin-composer-panel').hidden=true;
 $('admin-signin').hidden=false;
 $('admin-signin-password').value='';
 $('admin-signin-status').textContent='Sessão encerrada.';
}
function parseBrlCents(value){
 const input=String(value||'').trim().replace(/\s|R\$/gi,'');
 if(!input||!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(input))throw Error('Informe o valor em reais, por exemplo 8.260,98.');
 const normalized=input.replace(/\./g,'').replace(',','.');
 const cents=Math.round(Number(normalized)*100);
 if(!Number.isSafeInteger(cents)||cents<1||cents>1e9)throw Error('Valor fora do limite permitido.');
 return cents;
}
async function loadSaleKits(){
 if(!ready)return;
 const select=$('sale-kit');select.replaceChildren();
 const placeholder=element('option','Selecione um kit do catálogo...');placeholder.value='';select.append(placeholder);
 const {data,error}=await db.from('wwsolar_catalog')
  .select('id,title,price,payload,active,approved')
  .eq('kind','kit').eq('active',true).eq('approved',true).order('title').limit(200);
 if(error){status('Não foi possível carregar os kits. Atualize a página.');return;}
 saleKits=(data||[]).filter(p=>Number(p.price)>0);
 for(const p of saleKits){
  const opt=element('option',p.title+' · '+p.id+' · '+money(Math.round(p.price*100)));
  opt.value=p.id;select.append(opt);
 }
}
async function saveSale(event){
 event.preventDefault();
 if(!ready||!db)return;
 const submit=$('sale-submit');submit.disabled=true;status('Registrando venda...');
 try{
  const name=$('sale-name').value.trim(),phone=$('sale-phone').value.trim();
  const sku=$('sale-kit').value,kit=saleKits.find(x=>x.id===sku);
  const quantity=Number($('sale-qty').value),total=parseBrlCents($('sale-total').value);
  const closed=$('sale-date').value,notes=$('sale-notes').value.trim();
  if(name.length<2||name.length>120||!/^[0-9+() -]{10,24}$/.test(phone)||
     !kit||!Number.isInteger(quantity)||quantity<1||quantity>99||
     !/^\d{4}-\d{2}-\d{2}$/.test(closed)||notes.length>500)
   throw Error('Confira os campos da venda.');
  if(!window.confirm('Confirmar venda fechada para '+name+' no valor de '+money(total)+'?'))
   {status('Registro cancelado.');return;}
  const {data:user,error:authError}=await db.auth.getUser();
  if(authError||user?.user?.app_metadata?.wwsolar_role!=='admin')throw Error('Sessão administrativa inválida.');
  const {data,error}=await db.from('wwsolar_manual_sales_dev').insert({
   customer_name:name,customer_phone:phone,kit_sku:sku,kit_title:kit.title,
   quantity,agreed_total_cents:total,closed_on:closed,notes
  }).select('id').single();
  if(error||!data?.id)throw Error('Falha ao registrar. Confira a conexão e as permissões.');
  $('admin-sale-form').reset();
  $('sale-date').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  status('Venda registrada com sucesso. Código: '+data.id.slice(0,8).toUpperCase()+'.');
  await loadSales(true);
 }catch(e){status(e.message||'Não foi possível registrar a venda.');}
 finally{submit.disabled=false;}
}
async function loadSales(keepStatus=false){
 if(!ready||!db)return;
 if(!keepStatus)status('Consultando vendas...');
 const {data,error}=await db.from('wwsolar_manual_sales_dev')
  .select('id,customer_name,customer_phone,kit_sku,kit_title,quantity,agreed_total_cents,closed_on,notes,created_at')
  .order('created_at',{ascending:false}).limit(100);
 const target=$('admin-sales-list');target.replaceChildren();
 if(error){status('Não foi possível consultar o histórico de vendas.');return;}
 if(!keepStatus)status((data||[]).length+' venda(s) registrada(s).');
 if(!data?.length){target.append(element('p','Nenhuma venda registrada neste ambiente.','client-muted'));return;}
 for(const s of data){
  const card=element('article',undefined,'admin-order-card');
  const head=element('div',undefined,'admin-order-header');
  const info=element('div');
  info.append(element('strong',s.customer_name));
  info.append(element('small',s.customer_phone+' · '+s.closed_on.split('-').reverse().join('/')));
  head.append(info,element('strong',money(s.agreed_total_cents),'admin-order-money'),element('span','Fechada','admin-pill admin-pill-green'));
  card.append(head);
  const details=element('div',undefined,'admin-sale-summary');
  details.append(element('strong',s.quantity+' × '+s.kit_title),element('small',s.kit_sku));
  if(s.notes)details.append(element('p',s.notes));
  card.append(details);target.append(card);
 }
}
$('admin-signin-form').addEventListener('submit',signInAdmin);
$('admin-session-logout').addEventListener('click',()=>void signOutAdmin());
$('admin-tab-sales').addEventListener('click',()=>showPanel('sales'));
$('admin-tab-composer').addEventListener('click',()=>showPanel('composer'));
$('admin-sale-form').addEventListener('submit',saveSale);
$('sale-refresh').addEventListener('click',()=>void loadSales());

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
// Menu na camada superior do navegador: não aumenta a altura da tabela.
let activeComposePopup=null;
function closeComposePopup(){
 if(!activeComposePopup)return;
 const {chooser,menu}=activeComposePopup;
 if(menu.matches(':popover-open'))menu.hidePopover();
 chooser.open=false;
 activeComposePopup=null;
}
function positionComposePopup(){
 if(!activeComposePopup)return;
 const {summary,menu}=activeComposePopup;
 const rect=summary.getBoundingClientRect();
 const viewportW=document.documentElement.clientWidth;
 const viewportH=document.documentElement.clientHeight;
 const width=Math.min(Math.max(rect.width,620),Math.max(120,viewportW-16));
 const left=Math.max(8,Math.min(rect.left,viewportW-width-8));
 const roomBelow=viewportH-rect.bottom-8;
 const roomAbove=rect.top-8;
 const above=roomBelow<160&&roomAbove>roomBelow;
 const height=Math.max(80,Math.min(230,above?roomAbove:roomBelow));
 menu.style.left=left+'px';
 menu.style.width=width+'px';
 menu.style.maxHeight=height+'px';
 menu.style.top=(above?Math.max(8,rect.top-height-2):rect.bottom+2)+'px';
}
window.addEventListener('scroll',positionComposePopup,true);
window.addEventListener('resize',positionComposePopup);
function renderComposition(){
 closeComposePopup();
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
  const categoryCell=composeCell(tr,'');
  const categorySelect=element('select');
  categorySelect.setAttribute('aria-label','Categoria da linha '+(i+1));
  const categoryPlaceholder=element('option','Selecione a categoria...');categoryPlaceholder.value='';
  categorySelect.append(categoryPlaceholder);
  for(const category of categories.keys()){
    const option=element('option',category);option.value=category;
    categorySelect.append(option);
  }
  const selectedCategory=p?.category||line.category||'';
  categorySelect.value=categories.has(selectedCategory)?selectedCategory:'';
  categorySelect.addEventListener('change',()=>{
    composerLines[i].category=categorySelect.value;
    composerLines[i].sku='';
    renderComposition();
  });
  categoryCell.append(categorySelect);
  const productCell=composeCell(tr,'');
  // O <select> nativo fecha ao alternar entre janelas. <details> mantém a
  // lista aberta mesmo quando o navegador perde o foco, até o usuário fechá-la.
  const productChooser=element('details',undefined,'admin-compose-product-chooser');
  const productSummary=element('summary',p?p.title+' — '+core.money(p.unitCostCents):'Selecione um equipamento...');
  productSummary.setAttribute('aria-label','Equipamento da linha '+(i+1));
  productChooser.append(productSummary);
  const productChoices=element('div',undefined,'admin-compose-product-choices');
  productChoices.setAttribute('role','group');
  productChoices.setAttribute('aria-label','Produtos disponíveis da linha '+(i+1));
  const listedProducts=categorySelect.value?(categories.get(categorySelect.value)||[]):composerCatalog;
  for(const product of listedProducts){
    const option=element('button',product.title+' — '+core.money(product.unitCostCents),'admin-compose-product-option');
    option.type='button';option.dataset.sku=product.sku;
    option.setAttribute('aria-pressed',String(line.sku===product.sku));
    option.addEventListener('click',()=>{
      composerLines[i].sku=product.sku;
      composerLines[i].category=categorySelect.value;
      if(!core.asQuantity(composerLines[i].quantity))composerLines[i].quantity=1;
      renderComposition();
    });
    productChoices.append(option);
  }
  // Popover manual permanece visível ao alternar janelas e não afeta o fluxo.
  productChoices.popover='manual';
  productSummary.addEventListener('click',event=>{
    event.preventDefault();
    if(activeComposePopup?.menu===productChoices){closeComposePopup();return;}
    closeComposePopup();
    productChooser.open=true;
    activeComposePopup={chooser:productChooser,summary:productSummary,menu:productChoices};
    productChoices.showPopover();
    positionComposePopup();
  });
  productCell.append(productChooser,productChoices);
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


$('admin-compose-refresh').addEventListener('click',()=>void loadCompositionCatalog(true));
$('admin-compose-add').addEventListener('click',()=>{if(composerLines.length>=80){composeStatus('Limite de 80 linhas atingido.');return;}composerLines.push({sku:'',quantity:1});renderComposition();$('admin-compose-rows').querySelector('tr:last-child select')?.focus();});
$('admin-compose-clear').addEventListener('click',()=>{if(composerLines.some(x=>x.sku)&&!window.confirm('Limpar esta composição?'))return;composerLines=[{sku:'',quantity:1}];renderComposition();composeStatus('Composição limpa. Custos cadastrados preservados.');});
$('admin-compose-copy').addEventListener('click',async()=>{const txt=composeCore()?.summary(composerLines,composerCatalog);if(!txt){composeStatus('Selecione ao menos um equipamento antes de copiar.');return;}try{await navigator.clipboard.writeText(txt);composeStatus('Composição copiada. Você pode enviar o resumo para revisão.');}catch(_){composeStatus('Não foi possível copiar automaticamente neste navegador.');}});

void init();
})();
