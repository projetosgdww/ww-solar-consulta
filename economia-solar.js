(() => {
'use strict';
// Preliminary empirical tariff model; not a validated regulatory billing engine.
// Public tariff reference, not a future tariff forecast.
const {calculate,calculateDraft,validateTariffDraft,policy}=globalThis.WWSolarEconomia;
const isCommercial=location.hostname==='catalogo.wwplatform.com.br';
let activeProfile=null,referenceState=isCommercial?'loading':'default',revision=null,requestVersion=0;
const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty = n => n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const form = document.getElementById('form');
const kitLink=document.getElementById('eco-kit-link');
let centralEcr=null,ecrReferenceState=isCommercial?'loading':'default',ecrRequestVersion=0;
async function refreshEcr(){
 if(!isCommercial)return;
 const version=++ecrRequestVersion,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('/api/ecr-ativo-prod',{signal:controller.signal,cache:'no-store',credentials:'omit'}),data=await response.json();
  if(!response.ok||data?.ok!==true||!Number.isSafeInteger(data.revision)||data.revision<0||!Object.hasOwn(data,'profile'))throw Error('invalid_reference');
  const engine=globalThis.WWSolarECR,p=data.profile===null?null:engine.validateStudyDraft({...data.profile,source:'Despacho / referência central de estudo'});
  if(version!==ecrRequestVersion)return;
  centralEcr=p;ecrReferenceState=p?'central':'default';
  document.getElementById('eco-ecr-factor').value=String(Number(((p?.factor??engine.reference.factor)*100).toFixed(12)));
 }catch{if(version!==ecrRequestVersion)return;centralEcr=null;ecrReferenceState='unavailable';document.getElementById('eco-ecr-factor').value=String(Number((globalThis.WWSolarECR.reference.factor*100).toFixed(12)));}
 finally{clearTimeout(timer);if(version===ecrRequestVersion)render();}
}
function renderEcrImpact(base,ecr,investment){
 const impact=globalThis.WWSolarECR.impact(base,ecr,investment);
 const put=(id,text)=>{document.getElementById('eco-impact-'+id).textContent=text;};
 const percent=n=>n===null?'Não calculável':qty(n)+'%';
 put('before',money(impact.annualBefore));put('after',money(impact.annualAfter));
 put('reduction',percent(impact.savingReduction));put('loss',money(impact.annualLoss)+' a menos por ano');
 put('months',impact.paybackMonths===null?'Não calculável':impact.paybackMonths.toLocaleString('pt-BR',{maximumFractionDigits:1})+' meses');
 put('bill',percent(impact.billIncrease));put('payback',percent(impact.paybackIncrease));
 document.getElementById('eco-impact-bar-before').style.width=impact.barBefore+'%';
 document.getElementById('eco-impact-bar-after').style.width=impact.barAfter+'%';
 document.getElementById('eco-ecr-impact').hidden=false;
}
function renderEcr(v,year,r){
 const box=document.getElementById('eco-ecr-study'),out=document.getElementById('eco-ecr-details'),status=document.getElementById('eco-ecr-status'),field=document.getElementById('eco-ecr-factor');
 document.getElementById('eco-ecr-impact').hidden=true;
 box.hidden=year<2027;out.replaceChildren();document.getElementById('eco-ecr-comparison').replaceChildren();status.textContent='';
 if(box.hidden)return;
 if(isCommercial&&ecrReferenceState!=='central'){field.disabled=true;status.textContent=ecrReferenceState==='loading'?'Consultando cenário de estudo.':'Cenário ECR não ativado ou indisponível; consulte a regulamentação vigente.';return;}
 field.disabled=isCommercial||year!==2027||v.gd!==2;
 if(!field.disabled&&(field.value===''||!field.checkValidity())){status.textContent='Informe um fator entre 0 e 100%.';return;}
 try{
  const engine=globalThis.WWSolarECR,profile=activeProfile??policy.profiles[policy.reference];
  const result=engine.estimate({year,gd:v.gd,compensated:r.compensated,profile},{...engine.reference,...centralEcr,factor:isCommercial?centralEcr.factor:Number(field.value)/100});
  if(result.status!=='provisional'){status.textContent=result.reason;return;}
  status.textContent='Projeção ilustrativa — não homologada para faturamento. Energia compensada do modelo base: '+qty(result.compensated)+' kWh. '+(ecrReferenceState==='central'?'Referência central de estudo; situação declarada: '+centralEcr.regulatoryStatus+'.':ecrReferenceState==='unavailable'?'Banco ECR indisponível; usando referência de contingência.':ecrReferenceState==='loading'?'Consultando referência central.':'Referência de estudo padrão.')+(isCommercial?' Fator definido no cadastro de estudo.':' Fator editável apenas nesta simulação.');
  for(const [label,value] of [['Tarifa SCEE',result.scee.toLocaleString('pt-BR',{minimumFractionDigits:5,maximumFractionDigits:5})+' R$/kWh'],['Fio B de 2027 sem tributos',money(result.wire)],['Benefício bruto estimado CDE',money(result.benefit)],['Fator ECR de estudo',qty(result.factor*100)+'%'],['ECR adicional estimado (sem tributos)',money(result.ecr)],['Benefício restante CDE',money(result.remainingBenefit)],['Fio B + ECR (sem tributos)',money(result.combined)],['ECR anual isolado',money(result.ecr*12)]]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;out.append(dt,dd);
  }
  const comparison=engine.sensitivity(r,result.ecr,v.invest);
  const extra=document.getElementById('eco-ecr-comparison');extra.replaceChildren();
  for(const [label,value] of [['Fatura base sem ECR',money(r.after)],['Fatura ilustrativa com ECR sem tributos adicionais',money(comparison.after)],['Economia mensal sem ECR',money(r.saving)],['Economia mensal ilustrativa com ECR',money(comparison.saving)],['Economia anual ilustrativa com ECR',money(comparison.annual)],['Payback ilustrativo com ECR',comparison.payback===null?'Não calculado':qty(comparison.payback)+' anos']]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;extra.append(dt,dd);
  }
  renderEcrImpact(r,result.ecr,v.invest);
 }catch{document.getElementById('eco-ecr-impact').hidden=true;status.textContent='Cenário ECR indisponível; confira os parâmetros.';}
}
function updateKitLink(generation){
 const target=Math.ceil(generation);
 const valid=Number.isSafeInteger(target)&&target>0&&target<=100000;
 kitLink.hidden=!valid;kitLink.setAttribute('aria-disabled',String(!valid));
 if(valid)kitLink.href='./?economia_kwh='+target+'#catalogo';
 else kitLink.removeAttribute('href');
}
function render(){
 if(!form.checkValidity()){updateKitLink(0);document.getElementById('eco-ecr-study').hidden=true;return;}
 const v=Object.fromEntries([...new FormData(form)].map(([k,x])=>[k,Number(x)]));
 if(Object.values(v).some(n=>!Number.isFinite(n)||n<0)){updateKitLink(0);document.getElementById('eco-ecr-study').hidden=true;return;}
 const year=Number(document.getElementById('eco-year').value);
 const r=activeProfile?calculateDraft(v,activeProfile,year):calculate(v,year);
 if(!r){updateKitLink(0);return;}
 const ref=activeProfile?.reference??policy.reference;
 const month=ref.slice(5)+'/'+ref.slice(0,4);
 const messages={loading:'Consultando referência central; cálculo provisório.',central:'Tarifa aprovada · revisão '+revision+'.',default:'Referência padrão do código.',unavailable:'Consulta tarifária indisponível: estimativa com referência de contingência; confirme antes de usar.'};
 document.getElementById('eco-year-note').textContent='Fio B: '+qty(r.incidence*100)+'% · Referência '+month+' mantida constante; valores estimados. '+(year>=2027?'Cenário com tributos históricos de 2026, sem adequação à CBS/IBS e sem ECR na fatura principal. ':'')+messages[referenceState];
 for(const k of ['before','after','saving']) document.getElementById(k).textContent=money(r[k]);
 const rows=[['Economia anual (12 meses)',money(r.saving*12)],['Redução estimada',qty(r.before>0?r.saving/r.before*100:0)+'%'],['Autoconsumo',qty(r.self)+' kWh'],['Consumo da rede',qty(r.grid)+' kWh'],['Energia injetada',qty(r.injected)+' kWh'],['Compensação estimada',qty(r.compensated)+' kWh'],['Energia não compensada',qty(r.uncredited)+' kWh'],['Excedente não utilizado',qty(r.excess)+' kWh'],['Fio B estimado sem tributos (incluído no residual)',money(r.wire)],['Energia não compensada com tributos',money(r.nonCompensatedCost)],['Adicional de bandeira após instalação (estimado)',money(r.flagAfter)],['Iluminação pública',money(v.cip)],['Custo residual total da compensação',money(r.residual)],['Ajuste mínimo aproximado',money(r.floorAdjustment)],['Payback simples (economia constante)',v.invest>0&&r.saving>0?qty(v.invest/(12*r.saving))+' anos':'Não calculado']];
 if(form.elements.atual.value!=='')rows.push(['Fatura atual informada (não usada no cálculo)',money(v.atual)]);
 const groups={details:[...rows.slice(0,2),rows[14],...rows.slice(15)],'details-energy':rows.slice(2,8),'details-finance':rows.slice(8,14)};
 for(const [id,items] of Object.entries(groups)){
  const dl=document.getElementById(id);dl.replaceChildren();
  for(const [label,value] of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
 }
 renderEcr(v,year,r);
 updateKitLink(v.geracao);
 document.getElementById('kit').textContent='Potência de referência: '+qty(v.geracao/132)+' kWp (produtividade hipotética de 132 kWh/kWp/mês).';
}
async function refreshReference(){
 if(!isCommercial)return;
 const version=++requestVersion,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('/api/tarifa-ativa-prod',{signal:controller.signal,cache:'no-store',credentials:'omit'});
  const data=await response.json();
  if(!response.ok||data?.ok!==true||!Number.isSafeInteger(data.revision)||data.revision<0||!Object.hasOwn(data,'profile'))throw Error('invalid_reference');
  const p=data.profile===null?null:validateTariffDraft({...data.profile,source:'Referência central'});
  if(version!==requestVersion)return;
  activeProfile=p;revision=data.revision;referenceState=p?'central':'default';
 }catch{if(version!==requestVersion)return;activeProfile=null;revision=null;referenceState='unavailable';}
 finally{clearTimeout(timer);if(version===requestVersion)render();}
}
document.getElementById('eco-ecr-factor').addEventListener('input',render);
form.addEventListener('submit',e=>{e.preventDefault();render();void refreshReference();});form.addEventListener('input',render);document.getElementById('eco-year').addEventListener('change',render);render();void refreshReference();void refreshEcr();window.addEventListener('pageshow',e=>{if(e.persisted){void refreshReference();void refreshEcr();}});
})();