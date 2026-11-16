// Montador WW Solar DEV — somente administrador e RLS. Nunca toca tabela de preços comercial.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const C=window.WWSolarMontadorCore,cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const makeButton=(label,fn,cls='button button-outline')=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',fn);return b;};
const categories={todos:'Todos',modulos:'Módulos',inversores:'Inversores',microinversores:'Microinversores',estruturas:'Estruturas',trilhos:'Trilhos e perfis',cabos:'Cabos',componentes:'Componentes',stringbox:'String boxes',outros:'Outros'};
let db,user=null,ready=false,parts=[],costs=[],drafts=[],lines=[],currentId=null,editing=null,category='todos',supplier='Soollar';
// Quantidade escolhida à esquerda, antes de adicionar; depois, os controles editam o kit.
const pendingQuantities=new Map();
const status=m=>$('builder-status').textContent=String(m||'');
const authStatus=m=>$('builder-auth-status').textContent=String(m||'');
const normalizeSupplier=s=>String(s||'').trim().slice(0,64);
const findCost=sku=>costs.find(c=>c.sku===sku&&c.supplier===supplier);
const findPart=sku=>parts.find(p=>p.id===sku);
const partsFromCosts=()=>costs.map(c=>({id:c.sku,title:c.title,payload:{categoria:c.category}}))
 .sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
function parseInput(id){return C.parseBRL($(id).value);}
function draftSnapshot(){
 const freight=parseInput('builder-freight');
 const markup=Number($('builder-markup').value);
 if(freight===null)throw Error('Informe despesas válidas.');
 return C.calculate(lines,freight,markup);
}
function itemCategory(p){return String(p.payload?.categoria||'outros').toLowerCase();}
 // Classificação visual, sem alterar os preços nem criar produtos duplicados.
 // Perfis de 2,36 m e mini-trilhos continuam registrados em "estruturas".
 const isRail=p=>itemCategory(p)==='estruturas' && /trilho|perfil/i.test(String(p.title||''));
function fromPart(p,qty=1){
 const cost=findCost(p.id);
 if(!cost)throw Error('Cadastre o custo do fornecedor antes de adicionar a peça.');
 return {sku:p.id,title:p.title,category:itemCategory(p),qty,
  unit_cost_cents:Number(cost.unit_cost_cents),module_wp:Number(cost.module_wp||0),inverter_w:Number(cost.inverter_w||0)};
}
function selectCategory(value){category=value;renderParts();}
function renderCategories(){
 const host=$('builder-categories');host.replaceChildren();
 for(const [key,title] of Object.entries(categories)){
   const label=key==='trilhos'?title+' ('+parts.filter(isRail).length+')':title;
   const b=makeButton(label,()=>selectCategory(key),'builder-chip'+(category===key?' active':''));
   b.setAttribute('aria-pressed',String(category===key));host.append(b);
 }
}
function renderParts(){
 renderCategories();
 const q=$('builder-search').value.trim().toLocaleLowerCase('pt-BR');
 const filtered=parts.filter(p=>(category==='todos'||(category==='trilhos'?isRail(p):itemCategory(p)===category))&&
   (p.title.toLocaleLowerCase('pt-BR').includes(q)||p.id.toLowerCase().includes(q)));
 $('builder-piece-count').textContent=filtered.length+' peças';
 const list=$('builder-parts-list');list.replaceChildren();
 if(!filtered.length){list.append(el('p','Nenhuma peça encontrada.','builder-help'));return;}
 for(const p of filtered){
   const cost=findCost(p.id);
   const card=el('article',undefined,'builder-part');
   const info=el('div');
   info.append(el('strong',p.title),el('small',p.id+' · '+(categories[itemCategory(p)]||'Outros')));
   info.append(el('span',cost?'Custo: '+C.money(cost.unit_cost_cents):'Custo ainda não cadastrado',cost?'builder-price':'builder-missing'));
   if(cost?.source_date)info.append(el('small','Cotação: '+String(cost.source_date).slice(0,10).split('-').reverse().join('/')+' · Soollar'));
   if(itemCategory(p)==='stringbox')info.append(el('small','Opcional · valor do PDF · sem acréscimo'));
   const actions=el('div',undefined,'builder-part-actions');
   const costButton=makeButton(cost?'Editar custo':'Cadastrar custo',()=>openCost(p));
   actions.append(costButton);
   const qtyRow=el('div',undefined,'builder-pick-row');
   const qtyLabel=el('span','Quantidade','builder-pick-caption');
   const qtyControls=el('div',undefined,'builder-pick-controls');
   const minus=makeButton('−',()=>setQuantity(partQuantity(p)-1),'builder-qty');
   minus.setAttribute('aria-label','Diminuir quantidade de '+p.title);
   const qty=el('input',undefined,'builder-pick-input');
   qty.type='number';qty.min='1';qty.max='99';qty.step='1';qty.inputMode='numeric';
   qty.setAttribute('aria-label','Quantidade de '+p.title);
   const plus=makeButton('+',()=>setQuantity(partQuantity(p)+1),'builder-qty');
   plus.setAttribute('aria-label','Aumentar quantidade de '+p.title);
   qtyControls.append(minus,qty,plus);
   qtyRow.append(qtyLabel,qtyControls);
   const add=makeButton('Adicionar ao kit',()=>{
     const value=Number(qty.value);
     if(!setQuantity(value))return;
     if(addToKit(p,value))syncPartControls();
   },'button button-accent builder-add-part');
   const setQuantity=value=>{
     if(!Number.isSafeInteger(value)||value<1||value>99){
       qty.value=String(partQuantity(p));
       status('Informe uma quantidade inteira entre 1 e 99.');return false;
     }
     const existing=lines.find(x=>x.sku===p.id);
     if(existing){
       existing.qty=value;
       renderLines();
       status('Quantidade de '+p.title+' atualizada para '+value+'. Salve o rascunho para preservar a alteração.');
     }else pendingQuantities.set(p.id,value);
     syncPartControls();
     return true;
   };
   const syncPartControls=()=>{
     const current=partQuantity(p);
     const inKit=lines.some(x=>x.sku===p.id);
     qty.value=String(current);
     minus.disabled=!cost||current<=1;plus.disabled=!cost||current>=99;
     qty.disabled=!cost;
     add.disabled=!cost||inKit;
     add.textContent=inKit?'✓ No kit — altere aqui':'+ Adicionar '+current+' ao kit';
     qtyRow.classList.toggle('builder-pick-added',inKit);
   };
   qty.addEventListener('change',()=>setQuantity(Number(qty.value)));
   qty.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();qty.blur();}});
   actions.append(qtyRow,add);
   syncPartControls();
   card.append(info,actions);list.append(card);
 }
}
function openCost(part){
 editing=part;$('builder-cost-name').textContent=part.title;
 const current=findCost(part.id);
 $('builder-cost-value').value=current?(Number(current.unit_cost_cents)/100).toFixed(2):'';
 $('builder-module-wp').value=current?current.module_wp:C.extractModuleWp(part.title);
 $('builder-inverter-w').value=current?current.inverter_w:C.extractInverterW(part.title,itemCategory(part));
 $('builder-cost-panel').hidden=false;
 $('builder-cost-value').focus();
}
function hideCost(){editing=null;$('builder-cost-panel').hidden=true;}
async function saveCost(ev){
 ev.preventDefault();
 if(!ready||!editing)return;
 const part=editing;
 const value=parseInput('builder-cost-value');
 const wp=Number($('builder-module-wp').value||0),inv=Number($('builder-inverter-w').value||0);
 if(value===null||value<1||!Number.isInteger(wp)||wp<0||wp>2000||!Number.isInteger(inv)||inv<0||inv>200000){
   status('Custo ou potência inválida. Confira os campos.');return;
 }
 const save=$('builder-cost-form').querySelector('button[type="submit"]');save.disabled=true;
 try{
   const data={owner_id:user.id,supplier,sku:part.id,title:part.title,category:itemCategory(part),
     unit_cost_cents:value,module_wp:wp,inverter_w:inv,
     source_date:new Date().toISOString().slice(0,10),source_reference:'Atualização manual no Montador DEV',
     updated_at:new Date().toISOString()};
   const {data:saved,error}=await db.from('wwsolar_builder_costs').upsert(data,{onConflict:'owner_id,supplier,sku'}).select().single();
   if(error||!saved)throw Error('Não foi possível registrar custo. Verifique o login ou as permissões.');
   costs=costs.filter(c=>!(c.sku===saved.sku&&c.supplier===supplier));costs.push(saved);
   parts=partsFromCosts();hideCost();renderParts();renderLines();
   status('Custo de '+part.id+' atualizado. Rascunhos salvos continuam com valores históricos; atualize a linha manualmente quando necessário.');
 }catch(e){status(e.message||'Erro ao salvar custo.');}
 finally{save.disabled=false;}
}
function partQuantity(part){
 const existing=lines.find(x=>x.sku===part.id);
 return existing?existing.qty:(pendingQuantities.get(part.id)||1);
}
function addToKit(part,quantity=1){
 try{
   if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)
     throw Error('Informe uma quantidade inteira entre 1 e 99.');
   if(lines.some(x=>x.sku===part.id))
     throw Error('Este item já está no kit. Ajuste a quantidade nos controles à esquerda.');
   if(lines.length>=80)throw Error('Máximo de 80 linhas.');
   lines.push(fromPart(part,quantity));
   renderLines();
   status(quantity+' × '+part.title+' adicionados ao kit. Continue ajustando a quantidade à esquerda.');
   return true;
 }catch(e){status(e.message||'Não foi possível adicionar.');return false;}
}
function updateLine(sku,quantity){
 const line=lines.find(x=>x.sku===sku);
 if(!line)return;
 if(quantity<=0){
   lines=lines.filter(x=>x.sku!==sku);
   pendingQuantities.delete(sku);
   renderLines();renderParts();return;
 }
 if(!Number.isSafeInteger(quantity)||quantity>99)return;
 line.qty=quantity;renderLines();renderParts();
}
function updateSnapshotCost(sku){
 const current=findCost(sku),line=lines.find(x=>x.sku===sku);
 if(!line||!current)return;
 if(!window.confirm('Substituir nesta composição o custo e as potências de '+sku+'? O rascunho salvo só mudará quando clicar em Salvar.'))return;
 line.unit_cost_cents=Number(current.unit_cost_cents);
 line.module_wp=Number(current.module_wp||0);line.inverter_w=Number(current.inverter_w||0);
 renderLines();status('Preço atualizado na composição atual. Salve o rascunho para preservar essa revisão.');
}
function renderLines(){
 const list=$('builder-lines');list.replaceChildren();
 for(const line of lines){
   const row=el('div',undefined,'builder-line');
   const info=el('div',undefined,'builder-line-info');
   info.append(el('strong',line.title),el('small',line.sku+' · '+C.money(line.unit_cost_cents)+' por unidade'));
   const newer=findCost(line.sku);
   if(newer&&(Number(newer.unit_cost_cents)!==line.unit_cost_cents||Number(newer.module_wp)!==line.module_wp||Number(newer.inverter_w)!==line.inverter_w)){
     info.append(makeButton('↻ Atualizar custo deste item',()=>updateSnapshotCost(line.sku),'builder-update-cost'));
   }
   const controls=el('div',undefined,'builder-line-controls');
   controls.append(el('strong','Quantidade: '+line.qty,'builder-selected-badge'));
   controls.append(makeButton('Remover',()=>updateLine(line.sku,0),'builder-remove'));
   row.append(info,controls,el('strong',C.money(line.qty*line.unit_cost_cents),'builder-line-total'));
   list.append(row);
 }
 if(!lines.length)list.append(el('p','Escolha os equipamentos à esquerda para montar o kit.','builder-help'));
 try{
   const c=draftSnapshot();
   $('builder-cost-total').textContent=C.money(c.parts_cents);
   $('builder-base-total').textContent=C.money(c.base_cents);
   $('builder-profit').textContent=C.money(c.markup_cents);
   $('builder-stringbox-pass').textContent=C.money(c.pass_through_cents);
   $('builder-final-price').textContent=C.money(c.total_cents);
   $('builder-power').textContent=(c.dc_wp/1000).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' kWp';
   $('builder-generation').textContent=c.monthly_kwh.toLocaleString('pt-BR')+' kWh/mês';
   $('builder-inverter-power').textContent=c.ac_w? (c.ac_w/1000).toLocaleString('pt-BR')+' kW':'—';
   $('builder-technical').textContent=C.technicalAlert(c);
 }catch(e){$('builder-technical').textContent='Verifique frete, acréscimo e quantidades: valores inválidos.';}
}
function newDraft(ask=true){
 if(ask&&lines.length&&!window.confirm('Iniciar um novo rascunho? Alterações não salvas serão descartadas.'))return;
 lines=[];currentId=null;pendingQuantities.clear();
 $('builder-title').value='';$('builder-notes').value='';$('builder-freight').value='0.00';$('builder-markup').value='25';
 renderLines();renderParts();status('Novo rascunho iniciado. Nenhum kit foi publicado.');
}
async function loadData(){
 if(!ready)return;
 const [c,d]=await Promise.all([
   db.from('wwsolar_builder_costs').select('id,owner_id,supplier,sku,title,category,unit_cost_cents,module_wp,inverter_w,source_date,source_reference,updated_at').eq('owner_id',user.id).eq('supplier',supplier).order('category',{ascending:true}).order('sku',{ascending:true}).limit(500),
   db.from('wwsolar_builder_drafts').select('id,owner_id,supplier,title,notes,lines,total_cost_cents,freight_cents,markup_percent,status,updated_at,created_at').eq('owner_id',user.id).eq('supplier',supplier).order('updated_at',{ascending:false}).limit(100)
 ]);
 if(c.error||d.error){status('Falha ao carregar custos ou rascunhos privados. Atualize ou confira as permissões.');return;}
 costs=c.data||[];drafts=d.data||[];
 parts=partsFromCosts();
 renderParts();renderDrafts();renderLines();
 status('Dados carregados. Preços de custo cadastrados: '+costs.length+'. Rascunhos salvos: '+drafts.length+'.');
}
function renderDrafts(){
 const list=$('builder-drafts-list');list.replaceChildren();
 if(!drafts.length){list.append(el('p','Nenhum rascunho deste fornecedor ainda.','builder-help'));return;}
 for(const d of drafts){
   const card=el('article',undefined,'builder-draft-row');
   const info=el('div');
   const total=C.money(d.total_cost_cents);
   info.append(el('strong',d.title),el('small','Rascunho · '+d.lines.length+' tipos de peças · custo histórico '+total));
   info.append(el('small','Atualizado: '+new Date(d.updated_at).toLocaleString('pt-BR')));
   const actions=el('div',undefined,'builder-part-actions');
   actions.append(makeButton('Abrir',()=>openDraft(d)));
   card.append(info,actions);list.append(card);
 }
}
function openDraft(d){
 if(lines.length&&!window.confirm('Abrir '+d.title+'? Alterações não salvas serão descartadas.'))return;
 const clean=C.normalizedLines(d.lines);
 if(!clean||!clean.length){status('Rascunho inválido ou vazio.');return;}
 currentId=d.id;lines=clean;pendingQuantities.clear();
 $('builder-title').value=d.title;
 $('builder-notes').value=d.notes||'';
 $('builder-freight').value=(Number(d.freight_cents)/100).toFixed(2);
 $('builder-markup').value=Number(d.markup_percent);
 renderLines();renderParts();status('Rascunho carregado. Custos históricos preservados.');
 window.scrollTo({top:0,behavior:'smooth'});
}
async function saveDraft(){
 if(!ready)return;
 const title=$('builder-title').value.trim();
 if(title.length<3||title.length>180){status('Informe um nome de kit com pelo menos três caracteres.');return;}
 if(lines.length<1){status('Adicione componentes antes de salvar.');return;}
 let values;
 try{values=draftSnapshot();}catch(e){status('Valores ou quantidades inválidos.');return;}
 if(values.parts_cents===0){status('Cadastre custos válidos antes de salvar.');return;}
 const button=$('builder-save');button.disabled=true;
 try{
   const payload={owner_id:user.id,supplier,title,notes:$('builder-notes').value.trim(),lines:values.lines,
     total_cost_cents:values.parts_cents,freight_cents:values.freight_cents,markup_percent:values.markup_percent,
     status:'rascunho',updated_at:new Date().toISOString()};
   if(currentId)payload.id=currentId;
   const {data,error}=await db.from('wwsolar_builder_drafts').upsert(payload,{onConflict:'id'}).select().single();
   if(error||!data)throw Error('O servidor não confirmou o salvamento. Nenhum catálogo público foi atualizado.');
   currentId=data.id;
   await loadDraftsOnly();
   status('Rascunho salvo! '+data.title+' · ID '+String(data.id).slice(0,8).toUpperCase()+'. Não publicado.');
 }catch(e){status(e.message||'Erro ao salvar rascunho.');}finally{button.disabled=false;}
}
async function loadDraftsOnly(){
 const {data,error}=await db.from('wwsolar_builder_drafts')
   .select('id,owner_id,supplier,title,notes,lines,total_cost_cents,freight_cents,markup_percent,status,updated_at,created_at')
   .eq('owner_id',user.id).eq('supplier',supplier).order('updated_at',{ascending:false}).limit(100);
 if(error){status('Não foi possível atualizar o histórico.');return;}
 drafts=data||[];renderDrafts();
}
function exportDraft(){
 try{
   const c=draftSnapshot();
   if(!c.lines.length){status('Inclua componentes para exportar.');return;}
   const data={format:'wwsolar-montador-v1',status:'rascunho_nao_publicado',
     fornecedor:supplier,titulo:$('builder-title').value.trim()||'Kit sem nome',
     observacoes:$('builder-notes').value.trim(),itens:c.lines,custo_pecas_centavos:c.parts_cents,
     frete_centavos:c.freight_cents,acrescimo_percentual:c.markup_percent,preco_sugerido_centavos:c.total_cents,
     potencia_fv_wp:c.dc_wp,geracao_mensal_estimada_kwh:c.monthly_kwh,exportado_em:new Date().toISOString()};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
   const u=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=u;a.download='wwsolar-rascunho-'+new Date().toISOString().slice(0,10)+'.json';a.click();
   setTimeout(()=>URL.revokeObjectURL(u),1000);
   status('Arquivo de rascunho exportado. Nenhum kit publicado.');
 }catch(e){status('Revise os valores antes de exportar.');}
}
async function changeSupplier(){
 const next=normalizeSupplier($('builder-supplier').value);
 if(!next){$('builder-supplier').value=supplier;return;}
 if(next===supplier)return;
 if(lines.length&&!window.confirm('Trocar fornecedor e iniciar composição nova? Alterações não salvas serão descartadas.')){
   $('builder-supplier').value=supplier;return;
 }
 supplier=next;newDraft(false);hideCost();costs=[];drafts=[];parts=[];renderParts();
 await loadData();
}
async function init(){
 if(!C||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||'')||!cfg.publishableKey||!window.supabase?.createClient){
  authStatus('Ambiente DEV não configurado. Nenhum custo foi carregado.');return;
 }
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);
 const {data,error}=await db.auth.getUser();
 const u=data?.user;
 if(error||!u||u.app_metadata?.wwsolar_role!=='admin'||u.app_metadata?.wwsolar_password_change_required===true){
   authStatus('Acesso exclusivo do administrador. Entre primeiro no catálogo DEV com sua conta administrativa.');return;
 }
 user=u;ready=true;authStatus('Administrador autenticado · custos privados e rascunhos protegidos.');
 $('builder-app').hidden=false;renderLines();await loadData();
}
$('builder-search').addEventListener('input',renderParts);
$('builder-cost-form').addEventListener('submit',saveCost);
$('builder-cancel-cost').addEventListener('click',hideCost);
$('builder-new').addEventListener('click',()=>newDraft());
$('builder-save').addEventListener('click',()=>void saveDraft());
$('builder-duplicate').addEventListener('click',()=>{
 if(!lines.length){status('Monte um kit antes de duplicar.');return;}
 currentId=null;$('builder-title').value=$('builder-title').value.trim()+' (cópia)';
 status('Cópia pronta para salvar como novo rascunho.');});
$('builder-reload').addEventListener('click',()=>void loadDraftsOnly());
$('builder-export').addEventListener('click',exportDraft);
$('builder-print').addEventListener('click',()=>window.print());
$('builder-supplier').addEventListener('change',()=>void changeSupplier());
for(const id of ['builder-freight','builder-markup'])$(id).addEventListener('input',renderLines);
void init();
})();
