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
 for(const name of ['sales','composer','tariffs']){
  $('admin-'+name+'-panel').hidden=which!==name;
  $('admin-tab-'+name).classList.toggle('active',which===name);
  $('admin-tab-'+name).setAttribute('aria-pressed',String(which===name));
 }
 if(which==='sales')void loadSales();
 if(which==='composer')void loadCompositionCatalog();
 if(which==='tariffs'){renderTariffs();renderOfficialTariffs();void loadCentralTariffs();}
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
 $('admin-tariffs-panel').hidden=true;centralState=null;$('admin-tariff-central-list').replaceChildren();
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

function renderTariffs(){
 if(!ready||!$('admin-tariffs-rows'))return;
 const core=window.WWSolarEconomia;
 if(!core){$('admin-tariff-status').textContent='Motor tarifario indisponivel. Atualize a pagina.';return;}
 const tbody=$('admin-tariffs-rows');tbody.replaceChildren();
 const fmt=x=>Number(x).toLocaleString('pt-BR',{minimumFractionDigits:5,maximumFractionDigits:5});
 for(const p of Object.values(core.policy.profiles)){
  const row=element('tr');
  for(const x of [p.reference,fmt(p.te),fmt(p.tusd),fmt(p.fioB),String(p.icms*100)+'%',(p.pis*100).toFixed(2)+'%',(p.cofins*100).toFixed(2)+'%',p.flag,p.fioBSource,p.reference===core.policy.reference?'Referência padrão':'Histórica'])row.append(element('td',x));
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
let tariffConsultedMonth=null,tariffOnlineResult=null,tariffRequestVersion=0;
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
 tariffRequestVersion++;tariffOnlineResult=null;tariffConsultedMonth=null;clearTariffFields(form);setTariffActions(false);
 if($('admin-tariff-online-result'))$('admin-tariff-online-result').textContent='';
 $('admin-tariff-status').textContent='Competência alterada. Consulte a base novamente antes de validar.';
}
function renderTariffPreview(d){
 const out=$('admin-tariff-preview');out.replaceChildren();
 const core=window.WWSolarEconomia,active=centralState?.versions.find(v=>v.id===centralState.active)?.draft??core.policy.profiles[core.policy.reference];
 const fmt=(n,max=12)=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:max});
 const rows=[['TE (R$/kWh)','te',1],['TUSD (R$/kWh)','tusd',1],['Fio B integral (R$/kWh)','fioB',1],['ICMS (%)','icms',100],['PIS (%)','pis',100],['COFINS (%)','cofins',100]];
 out.append(element('h3','Rascunho validado — '+d.reference));
 out.append(element('p','Comparação com '+(centralState?'a referência atual do simulador comercial':'a referência padrão (banco não confirmado)')+': '+active.reference+'. Nenhum valor foi ativado.'));
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
  tariffRequestVersion++;tariffOnlineResult=null;$('admin-tariff-online-result').textContent='';
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
 const month=form.elements.reference.value,version=++tariffRequestVersion;
 tariffOnlineResult=null;
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
  if(version!==tariffRequestVersion||form.elements.reference.value!==month)return;
  out.replaceChildren();
  out.append(element('h3','Consulta online experimental — '+month));
  const local=window.WWSolarEconomia.policy.lookupMonth(month);
  if(r.period){
   const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:12});
   for(const [label,k] of [['TE','te'],['TUSD','tusd'],['Fio B integral','fioB']]){
    const prev=local.period?.[k],same=typeof prev==='number'&&Math.abs(prev-r.period[k])<1e-9;
    out.append(element('p',label+': R$ '+fmt(r.period[k])+'/kWh · '+(prev==null?'Sem referência local':same?'Igual à base local':'Base local: R$ '+fmt(prev)+'/kWh')));
   }
   const br=x=>x.split('-').reverse().join('/');
   out.append(element('p','Vigência: '+br(r.period.start)+' a '+br(r.period.end)+' · '+r.period.reh));
  }else{
   out.append(element('p',r.periods.length>1?'Mais de uma vigência no mês; revisão do ciclo necessária.':'Sem vigência completa na fonte consultada.'));
  }
  out.append(element('p',r.flag?'Bandeira: '+r.flag.name+' · R$ '+r.flag.rate.toLocaleString('pt-BR',{maximumFractionDigits:6})+'/kWh':'Bandeira sem registro para o mês.'));
  out.append(element('p','Consulta informativa. Tributos não são obtidos pela ANEEL nesta consulta. A base local e o rascunho permanecem inalterados.'));
  if(r.period){
   tariffOnlineResult={month,result:r,queriedAt:payload.queriedAt};
   const apply=element('button','Usar dados online no rascunho');apply.type='button';apply.className='button button-outline';apply.addEventListener('click',applyOnlineTariff);out.append(apply);
  }
 }catch(err){if(version===tariffRequestVersion&&form.elements.reference.value===month){const labels={UPSTREAM_TIMEOUT:'Tempo limite da ANEEL',UPSTREAM_HTTP:'Resposta HTTP da ANEEL indisponível',UPSTREAM_DATA:'Dados da ANEEL incompletos ou inconsistentes',UPSTREAM_UNAVAILABLE:'Comunicação com a ANEEL indisponível',INVALID_MONTH:'Consulta disponível somente para 2026',PROD_ONLY:'Consulta restrita ao catálogo oficial',INVALID_RESPONSE:'Resposta inválida do intermediário'};const detail=labels[err.message]??'Falha na comunicação com o intermediário';const stage={componentes:'Componentes tarifárias',bandeiras:'Bandeiras tarifárias',validacao:'Validação dos dados',consulta:'Consulta'}[err.source];const http=Number.isInteger(err.httpStatus)?' (HTTP '+err.httpStatus+')':'';out.textContent=(stage?stage+' — ':'')+detail+http+'. Utilize a base importada. Nenhuma tarifa foi alterada.';}}
 finally{btn.disabled=false;}
});
function applyOnlineTariff(){
 if(!ready||!tariffOnlineResult)return;
 const form=$('admin-tariff-draft'),status=$('admin-tariff-status'),snapshot=tariffOnlineResult;
 if(snapshot.month!==form.elements.reference.value)return;
 try{
  const local=window.WWSolarEconomia.policy.lookupMonth(snapshot.month);
  const d=window.WWSolarEconomia.prepareOnlineDraft(snapshot.result,local.taxes,snapshot.queriedAt);
  clearTariffFields(form);
  for(const k of ['te','tusd','fioB','flag','source'])if(d[k]!=null)form.elements[k].value=typeof d[k]==='number'?String(Number(d[k].toFixed(12))):String(d[k]);
  if(d.taxes)for(const k of ['icms','pis','cofins'])form.elements[k].value=String(Number((d.taxes[k]*100).toFixed(4)));
  tariffConsultedMonth=snapshot.month;setTariffActions(true);
  status.textContent='Rascunho preenchido com dados online da ANEEL. '+(d.taxes?'Tributos da mesma competência, conforme base local. ':'Tributos mensais pendentes. ')+(d.flag?'':'Bandeira pendente. ')+'Nenhuma tarifa ativa foi alterada.';
 }catch(err){status.textContent=err.message;}
}
// D1 PROD: the server checks the authenticated role for each request.
let centralState=null,centralBusy=false;
const centralHost=()=>location.hostname==='catalogo.wwplatform.com.br';
async function centralRequest(body){
 const {data,error}=await db.auth.getSession();
 if(error||!data?.session?.access_token)throw Error('Sessão expirada. Entre novamente.');
 const headers={Authorization:'Bearer '+data.session.access_token};
 if(body)headers['Content-Type']='application/json';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const r=await fetch('/api/tarifas-prod',{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});
  const d=await r.json();
  if(!r.ok||d?.ok!==true){const labels={AUTH_UNAVAILABLE:'Verificação administrativa indisponível.',AUTH_CONFIG:'Configuração de autenticação ausente no deploy.',AUTH_HTTP:'Supabase retornou erro HTTP na validação.',AUTH_TIMEOUT:'Tempo limite na validação Supabase.',AUTH_NETWORK:'Falha de conexão com Supabase.',AUTH_RESPONSE:'Resposta de autenticação inválida.',NOT_AUTHORIZED:'Acesso administrativo não autorizado.',STORAGE_UNAVAILABLE:'Banco tarifário ainda não conectado.',REFRESH_REQUIRED:'Outra sessão alterou o histórico. Atualize antes de repetir.',WRITE_NOT_CONFIRMED_REFRESH:'Gravação não confirmada. Atualize o histórico antes de repetir.',INVALID_TRANSITION:'Operação não permitida para esta versão.',DUPLICATE_TARIFF:'Já existe uma versão com os mesmos parâmetros. Utilize a versão cadastrada.'};throw Error((labels[d?.code]??'Operação não confirmada. Atualize o histórico antes de repetir.')+(Number.isInteger(d?.httpStatus)?' HTTP '+d.httpStatus:''));}
  if(!Number.isSafeInteger(d.state?.revision)||!Array.isArray(d.state?.versions)||!Array.isArray(d.state?.events))throw Error('Resposta inválida do banco tarifário.');
  return d.state;
 }finally{clearTimeout(timer);}
}
function centralStatus(t){$('admin-tariff-central-status').textContent=t;}
async function loadCentralTariffs(){
 const section=$('admin-tariff-central');if(!ready||!centralHost()||!section||centralBusy)return;
 section.hidden=false;centralBusy=true;centralState=null;renderCentralTariffs();centralStatus('Consultando banco tarifário...');
 try{centralState=await centralRequest();centralStatus('Banco tarifário conectado. A referência ativa é utilizada somente pelo simulador comercial.');}
 catch(err){centralStatus(err.message);}
 finally{centralBusy=false;renderCentralTariffs();}
}
async function centralAction(action,id,draft,expected){
 if(!ready||!centralHost()||centralBusy||!centralState||centralState.revision!==expected)return;
 if(!confirm('Confirmar operação? Ativar ou restaurar muda a referência utilizada nas novas simulações comerciais.'))return;
 centralBusy=true;renderCentralTariffs();centralStatus('Registrando no banco tarifário...');
 try{centralState=await centralRequest({action,id,draft,expectedRevision:expected,requestId:crypto.randomUUID()});centralStatus('Operação confirmada pelo servidor.');}
 catch(err){centralState=null;centralStatus(err.message);}
 finally{centralBusy=false;renderCentralTariffs();}
}
function renderCentralTariffs(){
 const out=$('admin-tariff-central-list');if(!out)return;out.replaceChildren();
 const s=centralState;if(!s||centralBusy)return;
 const selected=s.versions.find(v=>v.id===s.active);
 out.append(element('p','Referência ativa do simulador comercial: '+(selected?selected.draft.reference+' · '+selected.id.slice(0,8):'padrão do código')));
 if(selected)out.append(button('Restaurar padrão central',()=>void centralAction('restore_default',null,null,s.revision)));
 if(!s.versions.length)out.append(element('p','Nenhuma versão central salva.'));
 for(const v of [...s.versions].reverse()){
  const row=element('div',undefined,'eco-sandbox-entry');
  row.append(element('strong',v.draft.reference+' · '+v.id.slice(0,8)+' · '+(s.active===v.id?'Ativa no simulador comercial':v.state)));
  row.append(element('p','TE '+v.draft.te+' | TUSD '+v.draft.tusd+' | Fio B '+v.draft.fioB+' | '+v.draft.flag));
  row.append(element('p','Fonte: '+v.draft.source));
  if(v.state==='salvo')row.append(button('Aprovar no banco tarifário',()=>void centralAction('approve',v.id,null,s.revision)));
  if(v.state==='aprovado'&&v.id!==s.active)row.append(button('Ativar / restaurar no banco tarifário',()=>void centralAction('activate',v.id,null,s.revision)));
  out.append(row);
 }
 if(s.events.length){out.append(element('h3','Histórico central — últimas 50 ações'));const labels={save:'Salvou',approve:'Aprovou',activate:'Ativou / restaurou',restore_default:'Restaurou padrão'};
  for(const e of [...s.events].reverse())out.append(element('p',date(e.at)+' · '+labels[e.action]+' · '+(e.id?.slice(0,8)??'padrão')+' · Administrador '+e.actor.slice(0,8)));
 }
}
function addCentralSave(d,out){
 if(!centralHost())return;
 const b=button('Salvar versão no banco tarifário',()=>{try{
  if(!centralState||centralBusy)throw Error('Consulte o banco tarifário antes de salvar.');
  if(centralState.versions.some(v=>['reference','te','tusd','fioB','icms','pis','cofins','flag'].every(k=>v.draft[k]===d[k])))throw Error('Já existe uma versão com os mesmos parâmetros. Utilize a versão cadastrada.');
  const current=tariffDraft();if(!current||JSON.stringify(current)!==JSON.stringify(d))throw Error('Valide novamente o rascunho.');
  void centralAction('save',null,current,centralState.revision);
 }catch(err){centralStatus(err.message);$('admin-tariff-status').textContent=err.message;}});
 out.append(b);
}
$('admin-tariff-central-refresh')?.addEventListener('click',()=>void loadCentralTariffs());
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
 try{const d=tariffDraft();if(!d)return;renderTariffPreview(d);addCentralSave(d,out);status.textContent='Rascunho validado. Nenhuma tarifa ativa foi alterada.';}
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
