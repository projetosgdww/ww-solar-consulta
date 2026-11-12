(()=>{
'use strict';
const $=id=>document.getElementById(id);
const cfg=window.WWSOLAR_CLIENTE_CONFIG||{};
const KB=window.WWSolarKitBuilder;
const S={db:null,user:null,products:[],drafts:[],costs:[],result:null,ready:false};
const fmt=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const setStatus=message=>{$('kit-admin-status').textContent=message;};
const el=(tag,text,cl)=>{
  const n=document.createElement(tag);
  if(text!==undefined&&text!==null)n.textContent=String(text);
  if(cl)n.className=cl;
  return n;
};
const cat=x=>String(x?.payload?.categoria||'').toLowerCase();
const addOption=(select,value,label)=>{
  const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);
};
function renderInputs(){
  const select=$('kit-preset');
  select.replaceChildren();
  for(const item of S.drafts){
    addOption(select,item.code,item.code+' · '+item.panels+' módulos · '+(item.panels*0.625).toFixed(2).replace('.',',')+' kWp (ref. 625 W)');
  }
  select.value=S.drafts.some(x=>x.code==='WW-04')?'WW-04':S.drafts[0]?.code||'';
  const modules=$('kit-module');
  modules.replaceChildren();
  for(const p of S.products.filter(x=>cat(x)==='modulos')){
    const power=KB.wattsFromTitle(p.title);
    if(power)addOption(modules,p.id,p.id+' · '+power+' W · '+p.title.replace(/^MODULO\s*/,''));
  }
  modules.value=KB.MODULE_SKU;
  if(!modules.value)modules.selectedIndex=0;
}
function selectedDraft(){
  return S.drafts.find(d=>d.code===$('kit-preset').value);
}
function selectedModule(){
  return S.products.find(p=>p.id===$('kit-module').value);
}
function recalcInverters(){
  const draft=selectedDraft(),p=selectedModule();
  if(!draft||!p)return;
  const kwp=draft.panels*KB.wattsFromTitle(p.title)/1000;
  const list=KB.inverterCandidates(S.products,kwp);
  const select=$('kit-inverter');
  const prev=select.value;
  select.replaceChildren();
  if(!list.length)addOption(select,'','Nenhum inversor único atende à triagem de 0,77');
  for(const x of list)addOption(select,x.sku,x.kw+' kW · '+x.title);
  if(list.some(x=>x.sku===prev))select.value=prev;
}
function render(){
  if(!S.ready)return;
  const draft=selectedDraft();
  if(!draft)return;
  try{
    const dcText=$('kit-dc-inputs').value.trim();
    const redText=$('kit-red-meters').value.trim();
    const blackText=$('kit-black-meters').value.trim();
    const result=KB.compose({
      panels:draft.panels,moduleSku:$('kit-module').value,
      roof:$('kit-roof').value, inverterSku:$('kit-inverter').value,
      dcInputs:dcText?Number(dcText):null,
      redMeters:redText?Number(redText):null,
      blackMeters:blackText?Number(blackText):null,
      products:S.products,costs:S.costs
    });
    S.result=result;
    $('kit-output-heading').textContent=draft.code+' · '+draft.panels+' módulos';
    $('kit-power-line').textContent=result.roofLabel+' · '+result.moduleWp+' W por módulo';
    $('kit-power').textContent=result.kwp.toFixed(2).replace('.',',')+' kWp';
    $('kit-ac-ref').textContent=result.dcToAcReference.toFixed(2).replace('.',',')+' kW';
    $('kit-roof-qty').textContent=String(Math.ceil(draft.panels/4))+' kits';
    $('kit-cable').textContent=result.estimatedTotalMeters+' m / '+result.cableGauge+' mm²';
    const tbody=$('kit-bom-body');tbody.replaceChildren();
    const byId=new Map(S.products.map(p=>[p.id,p]));
    for(const row of result.rows){
      const tr=el('tr'),first=el('td');
      first.append(el('strong',row.label),el('small',row.sku||'SKU pendente'),
        el('small',row.assumption,'kit-sku-note'));
      const qty=el('td',row.qty===null?'A definir':row.qty+' un','kit-qty-cell');
      const cost=el('td');
      if(row.sku&&byId.has(row.sku)&&row.qty!==null){
        const wrap=el('div',undefined,'kit-cost-edit');
        const input=el('input');
        input.type='text';input.inputMode='decimal';input.maxLength=15;
        input.setAttribute('aria-label','Custo unitário do SKU '+row.sku);
        input.value=row.unitCost===null?'':row.unitCost.toFixed(2).replace('.',',');
        input.placeholder='Custo real';
        input.dataset.sku=row.sku;
        const btn=el('button','Salvar');
        btn.type='button';btn.className='kit-cost-save';btn.dataset.sku=row.sku;
        wrap.append(input,btn);cost.append(wrap);
      }else cost.append(el('span','Aguardar confirmação','kit-missing'));
      const subtotal=el('td',row.subtotal===null?'—':fmt(row.subtotal),'kit-subtotal');
      tr.append(first,qty,cost,subtotal);tbody.append(tr);
    }
    $('kit-total-cost').textContent=result.cost===null?'Pendente':fmt(result.cost);
    $('kit-sale-price').textContent=result.previewPrice===null?'Pendente':fmt(result.previewPrice);
    $('kit-price-caveat').textContent=
      result.previewPrice===null
        ?'Preço indisponível: informe custos reais, defina entradas CC e resolva os itens pendentes. Nenhum valor será publicado.'
        :'ESTIMATIVA INTERNA: acréscimo de 15% sobre custos completos, sem frete. Não representa homologação técnica, estoque ou preço liberado.';
    const risks=$('kit-risks');risks.replaceChildren();
    for(const warning of [...result.risks,...result.missingCosts.map(x=>'CUSTO: '+x)])
      risks.append(el('li',warning));
    $('kit-progress').textContent=S.drafts.length+' modelos · 3 coberturas · '+
      S.products.filter(x=>cat(x)==='modulos').length+' módulos disponíveis · RASCUNHOS';
    setStatus('Pré-composição calculada para análise. Nenhum kit foi liberado aos clientes.');
  }catch(err){
    S.result=null;
    setStatus('Não foi possível calcular: '+(err?.message||'parâmetro inválido'));
    $('kit-total-cost').textContent='Pendente';
    $('kit-sale-price').textContent='Pendente';
  }
}
async function saveCost(sku,button){
  if(!S.ready||!S.user)return;
  const row=button.closest('tr');
  const input=row?.querySelector('input[data-sku]');
  if(!input||input.dataset.sku!==sku)return;
  const text=input.value.trim().replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(text)){
    setStatus('Informe o custo unitário em reais, por exemplo 599,90.');return;
  }
  const cost=Number(text);
  if(!Number.isFinite(cost)||cost<=0||cost>1e8){
    setStatus('Custo inválido. Informe valor positivo da compra.');return;
  }
  if(!S.products.some(x=>x.id===sku)){setStatus('SKU indisponível.');return;}
  button.disabled=true;setStatus('Salvando custo real do SKU '+sku+'...');
  try{
    const {data,error}=await S.db.from('wwsolar_piece_costs')
      .upsert({sku,unit_cost:cost,updated_by:S.user.id,updated_at:new Date().toISOString()},
        {onConflict:'sku'}).select('sku,unit_cost').single();
    if(error)throw error;
    S.costs=S.costs.filter(x=>x.sku!==sku).concat(data);
    render();
    setStatus('Custo do SKU '+sku+' salvo apenas na área administrativa. Pré-composição atualizada.');
  }catch(err){
    setStatus('Falha ao registrar custo. Nenhum preço público foi alterado.');
  }finally{button.disabled=false;}
}
async function init(){
  if(!KB||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||'')
     ||!cfg.publishableKey||!window.supabase?.createClient){
    setStatus('Montador DEV indisponível. Verifique a configuração e as dependências.');return;
  }
  S.db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);
  const {data:profile,error:authErr}=await S.db.auth.getUser();
  if(authErr||!profile?.user||profile.user.app_metadata?.wwsolar_role!=='admin'){
    setStatus('Acesso restrito ao administrador. Entre com sua conta administrativa na Área do Cliente.');
    return;
  }
  S.user=profile.user;
  const [drafts,pieces,costs]=await Promise.all([
    S.db.from('wwsolar_kit_drafts').select('code,panels,module_id,status,engineering_approved,published').order('panels'),
    S.db.from('wwsolar_catalog').select('id,kind,title,price,payload,active,approved')
      .eq('kind','piece').eq('active',true).eq('approved',true),
    S.db.from('wwsolar_piece_costs').select('sku,unit_cost')
  ]);
  if(drafts.error||pieces.error||costs.error){
    setStatus('Falha ao consultar os rascunhos e custos privados. Verifique suas permissões no Supabase.');
    return;
  }
  S.drafts=drafts.data||[];S.products=pieces.data||[];S.costs=costs.data||[];
  if(S.drafts.length!==12||S.drafts.some(x=>x.published||x.engineering_approved)){
    setStatus('Os rascunhos não correspondem à configuração segura de 12 modelos. Nenhuma alteração realizada.');
    return;
  }
  S.ready=true;renderInputs();recalcInverters();
  $('kit-admin-app').hidden=false;
  render();
}
$('kit-preset').addEventListener('change',()=>{
  $('kit-dc-inputs').value='';
  $('kit-red-meters').value='';
  $('kit-black-meters').value='';
  recalcInverters();render();
});
$('kit-module').addEventListener('change',()=>{recalcInverters();render();});
$('kit-roof').addEventListener('change',render);
$('kit-inverter').addEventListener('change',render);
$('kit-recalculate').addEventListener('click',render);
$('kit-bom-body').addEventListener('click',ev=>{
  const b=ev.target.closest('button.kit-cost-save');
  if(b)void saveCost(b.dataset.sku,b);
});
void init();
})();