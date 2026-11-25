(() => {
'use strict';
// Preliminary empirical tariff model; not a validated regulatory billing engine.
// Public tariff reference, not a future tariff forecast.
const policy = Object.freeze({baseYear:2026,reference:'2026-11',te:.21326,tusd:.48849,fioB:(.48849-.31825)/.60,icms:.20,pis:.0048,cofins:.0219,annualDegradation:.005,transition:Object.freeze({2023:.15,2024:.30,2025:.45,2026:.60,2027:.75,2028:.90})});
function tariffFor(year,gd){
 const incidence=gd===1?0:policy.transition[year];
 if(incidence===undefined)return null;
 return {...policy,incidence,tusdCredit:policy.tusd-policy.fioB*incidence};
}
const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty = n => n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const form = document.getElementById('form');
function calculate(v,year=policy.baseYear){
 const tariff=tariffFor(year,v.gd);
 if(!tariff)return null;
 const federal=1-tariff.pis-tariff.cofins;
 const full=(tariff.te+tariff.tusd)/((1-tariff.icms)*federal);
 const credit=tariff.te/((1-tariff.icms)*federal)+tariff.tusdCredit/federal;
 const self=Math.min(v.consumo,v.geracao*v.sim/100), grid=v.consumo-self, injected=v.geracao-self;
 const compensated=Math.min(grid,injected), uncredited=grid-compensated, residual=full-credit;
 const raw=uncredited*full+compensated*residual;
 // Approximate monetary floor, not an implementation of REN 1000 art. 655-I.
 const floor=v.min*full, energy=Math.max(floor,raw);
 const before=Math.max(v.consumo,v.min)*full+v.cip, after=energy+v.cip;
 return {before,after,saving:before-after,self,grid,injected,compensated,uncredited,excess:injected-compensated,wire:v.gd===2?compensated*(tariff.tusd-tariff.tusdCredit):0,floorAdjustment:energy-raw,residual:compensated*residual};
}
function projection(v){
 const years=[];let cumulative=0;
 // Constant real reference tariffs; no unsupported GD II regime after 2028.
 for(let i=0;i<25;i++){
  const year=policy.baseYear+i;
  if(year>2028)break; // do not assume future regulation or tariff validity for either regime
  const result=calculate({...v,geracao:v.geracao*(1-policy.annualDegradation)**i},year);
  if(!result)break;
  cumulative+=result.saving*12;
  years.push({year,incidence:tariffFor(year,v.gd).incidence,annual:result.saving*12,cumulative});
 }
 return {years,net:cumulative-v.invest};
}
function render(){
 if(!form.checkValidity()) return;
 const v=Object.fromEntries([...new FormData(form)].map(([k,x])=>[k,Number(x)]));
 if(Object.values(v).some(n=>!Number.isFinite(n)||n<0)) return;
 const r=calculate(v), p=projection(v);
 for(const k of ['before','after','saving']) document.getElementById(k).textContent=money(r[k]);
 const rows=[['Economia anual (12 meses)',money(r.saving*12)],['Redução estimada',qty(r.before>0?r.saving/r.before*100:0)+'%'],['Autoconsumo',qty(r.self)+' kWh'],['Consumo da rede',qty(r.grid)+' kWh'],['Energia injetada',qty(r.injected)+' kWh'],['Compensação teórica',qty(r.compensated)+' kWh'],['Energia não compensada',qty(r.uncredited)+' kWh'],['Excedente nominal',qty(r.excess)+' kWh'],['Fio B estimado sem tributos (incluído no residual)',money(r.wire)],['Energia não compensada com tributos',money(r.uncredited*(policy.te+policy.tusd)/((1-policy.icms)*(1-policy.pis-policy.cofins)))],['Iluminação pública',money(v.cip)],['Custo residual total da compensação',money(r.residual)],['Ajuste mínimo aproximado',money(r.floorAdjustment)],['Payback simples',v.invest>0&&r.saving>0?qty(v.invest/(12*r.saving))+' anos':'Não calculado'],['Economia acumulada 2026–2028 (cenário)',money(p.years.at(-1)?.cumulative??0)],['Saldo após investimento até 2028',money(p.net)],['Projeção de 25 anos','Pendente de parâmetros futuros']];
 for(const y of p.years)rows.push(['Economia anual '+y.year+' · Fio B '+qty(y.incidence*100)+'%',money(y.annual)]);
 rows.push(['Premissas da projeção','Tarifa-base constante; degradação 0,5%/ano; sem manutenção ou reajustes']);
 if(form.elements.atual.value!=='')rows.push(['Fatura atual informada (não usada no cálculo)',money(v.atual)]);
 const dl=document.getElementById('details');dl.replaceChildren();
 for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
 document.getElementById('kit').textContent='Potência de referência: '+qty(v.geracao/132)+' kWp (produtividade hipotética de 132 kWh/kWp/mês).';
}
form.addEventListener('submit',e=>{e.preventDefault();render();});form.addEventListener('input',render);render();
})();