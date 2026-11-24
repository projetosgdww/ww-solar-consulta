(() => {
'use strict';
// Preliminary empirical tariff model; not a validated regulatory billing engine.
const tariff = Object.freeze({te:.21326,tusd:.48849,tusdCreditGD2:.31825,icms:.20,pis:.0048,cofins:.0219,reference:'2026-11'});
const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty = n => n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const form = document.getElementById('form');
function calculate(v){
 const federal=1-tariff.pis-tariff.cofins;
 const full=(tariff.te+tariff.tusd)/((1-tariff.icms)*federal);
 const credit=tariff.te/((1-tariff.icms)*federal)+(v.gd===1?tariff.tusd:tariff.tusdCreditGD2)/federal;
 const self=Math.min(v.consumo,v.geracao*v.sim/100), grid=v.consumo-self, injected=v.geracao-self;
 const compensated=Math.min(grid,injected), uncredited=grid-compensated, residual=full-credit;
 const raw=uncredited*full+compensated*residual;
 // Approximate monetary floor, not an implementation of REN 1000 art. 655-I.
 const floor=v.min*full, energy=Math.max(floor,raw);
 const before=Math.max(v.consumo,v.min)*full+v.cip, after=energy+v.cip;
 return {before,after,saving:before-after,self,grid,injected,compensated,uncredited,excess:injected-compensated,wire:v.gd===2?compensated*(tariff.tusd-tariff.tusdCreditGD2):0,floorAdjustment:energy-raw,residual:compensated*residual};
}
function render(){
 if(!form.checkValidity()) return;
 const v=Object.fromEntries([...new FormData(form)].map(([k,x])=>[k,Number(x)]));
 if(Object.values(v).some(n=>!Number.isFinite(n)||n<0)) return;
 const r=calculate(v);
 for(const k of ['before','after','saving']) document.getElementById(k).textContent=money(r[k]);
 const rows=[['Economia anual (12 meses)',money(r.saving*12)],['Redução estimada',qty(r.before>0?r.saving/r.before*100:0)+'%'],['Autoconsumo',qty(r.self)+' kWh'],['Consumo da rede',qty(r.grid)+' kWh'],['Energia injetada',qty(r.injected)+' kWh'],['Compensação teórica',qty(r.compensated)+' kWh'],['Energia não compensada',qty(r.uncredited)+' kWh'],['Excedente nominal',qty(r.excess)+' kWh'],['Fio B estimado sem tributos (incluído no residual)',money(r.wire)],['Custo residual total da compensação',money(r.residual)],['Ajuste mínimo aproximado',money(r.floorAdjustment)],['Payback simples',v.invest>0&&r.saving>0?qty(v.invest/(12*r.saving))+' anos':'Não calculado'],['Economia em 25 anos, constante, sem despesas',money(r.saving*300-v.invest)]];
 if(form.elements.atual.value!=='')rows.push(['Fatura atual informada (não usada no cálculo)',money(v.atual)]);
 const dl=document.getElementById('details');dl.replaceChildren();
 for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
 document.getElementById('kit').textContent='Potência de referência: '+qty(v.geracao/132)+' kWp (produtividade hipotética de 132 kWh/kWp/mês).';
}
form.addEventListener('submit',e=>{e.preventDefault();render();});form.addEventListener('input',render);render();
})();