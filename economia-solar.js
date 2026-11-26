(() => {
'use strict';
// Preliminary empirical tariff model; not a validated regulatory billing engine.
// Public tariff reference, not a future tariff forecast.
const {calculate,calculateDraft,validateTariffDraft,policy}=globalThis.WWSolarEconomia;
const isDev=location.hostname==='ww-solar-economia-dev.pages.dev';
let activeProfile=null,referenceState=isDev?'loading':'default',revision=null,requestVersion=0;
const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty = n => n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const form = document.getElementById('form');
function render(){
 if(!form.checkValidity()) return;
 const v=Object.fromEntries([...new FormData(form)].map(([k,x])=>[k,Number(x)]));
 if(Object.values(v).some(n=>!Number.isFinite(n)||n<0)) return;
 const year=Number(document.getElementById('eco-year').value);
 const r=activeProfile?calculateDraft(v,activeProfile,year):calculate(v,year);
 if(!r)return;
 const ref=activeProfile?.reference??policy.reference;
 const month=ref.slice(5)+'/'+ref.slice(0,4);
 const messages={loading:'Consultando referência central; cálculo provisório.',central:'Tarifa aprovada no banco DEV · revisão '+revision+'.',default:'Referência padrão do código.',unavailable:'Banco indisponível: referência padrão do código; confirme antes de usar.'};
 document.getElementById('eco-year-note').textContent='Fio B: '+qty(r.incidence*100)+'% · Referência '+month+' mantida constante; valores estimados. '+messages[referenceState];
 for(const k of ['before','after','saving']) document.getElementById(k).textContent=money(r[k]);
 const rows=[['Economia anual (12 meses)',money(r.saving*12)],['Redução estimada',qty(r.before>0?r.saving/r.before*100:0)+'%'],['Autoconsumo',qty(r.self)+' kWh'],['Consumo da rede',qty(r.grid)+' kWh'],['Energia injetada',qty(r.injected)+' kWh'],['Compensação estimada',qty(r.compensated)+' kWh'],['Energia não compensada',qty(r.uncredited)+' kWh'],['Excedente não utilizado',qty(r.excess)+' kWh'],['Fio B estimado sem tributos (incluído no residual)',money(r.wire)],['Energia não compensada com tributos',money(r.nonCompensatedCost)],['Adicional de bandeira após instalação (estimado)',money(r.flagAfter)],['Iluminação pública',money(v.cip)],['Custo residual total da compensação',money(r.residual)],['Ajuste mínimo aproximado',money(r.floorAdjustment)],['Payback simples (economia constante)',v.invest>0&&r.saving>0?qty(v.invest/(12*r.saving))+' anos':'Não calculado']];
 if(form.elements.atual.value!=='')rows.push(['Fatura atual informada (não usada no cálculo)',money(v.atual)]);
 const dl=document.getElementById('details');dl.replaceChildren();
 for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
 document.getElementById('kit').textContent='Potência de referência: '+qty(v.geracao/132)+' kWp (produtividade hipotética de 132 kWh/kWp/mês).';
}
async function refreshReference(){
 if(!isDev)return;
 const version=++requestVersion,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('/api/tarifa-ativa-dev',{signal:controller.signal,cache:'no-store',credentials:'omit'});
  const data=await response.json();
  if(!response.ok||data?.ok!==true||!Number.isSafeInteger(data.revision)||data.revision<0||!Object.hasOwn(data,'profile'))throw Error('invalid_reference');
  const p=data.profile===null?null:validateTariffDraft({...data.profile,source:'Referência central DEV'});
  if(version!==requestVersion)return;
  activeProfile=p;revision=data.revision;referenceState=p?'central':'default';
 }catch{if(version!==requestVersion)return;activeProfile=null;revision=null;referenceState='unavailable';}
 finally{clearTimeout(timer);if(version===requestVersion)render();}
}
form.addEventListener('submit',e=>{e.preventDefault();render();void refreshReference();});form.addEventListener('input',render);document.getElementById('eco-year').addEventListener('change',render);render();void refreshReference();window.addEventListener('pageshow',e=>{if(e.persisted)void refreshReference();});
})();