'use strict';
(function(root){
const policy=typeof module==='object'&&module.exports?require('./economia-solar-tarifas.js'):root.WWSolarTariff;
function tariffFor(year,gd,competence){
 if(!Number.isInteger(year)||![1,2].includes(gd)||!Object.hasOwn(policy.transition,year))return null;
 const ref=competence??policy.reference;
 if(typeof ref!=='string'||!Object.hasOwn(policy.profiles,ref))return null;
 if(competence!==undefined&&Number(ref.slice(0,4))!==year)return null;
 const profile=policy.profiles[ref];
 const incidence=gd===1?0:policy.transition[year];
 return {...profile,incidence,tusdCredit:profile.tusd-profile.fioB*incidence,scenario:year!==Number(ref.slice(0,4))};
}
function validEnergy(n){return Number.isFinite(n)&&n>=0&&n<=1e9;}
function calculate(v,year=policy.baseYear,competence){return calculateInternal(v,year,competence,null);}
function calculateInternal(v,year,competence,profile){
 const previous=v.creditsPrevious??0, received=v.creditsReceived??0;
 if(![v.consumo,v.geracao,v.cip,previous,received].every(validEnergy)||!Number.isFinite(v.sim)||v.sim<0||v.sim>100||![30,50,100].includes(v.min)||![1,2].includes(v.gd))throw new RangeError('Parametros invalidos');
 const tariff=profile?{...profile,incidence:v.gd===1?0:policy.transition[year],tusdCredit:profile.tusd-profile.fioB*(v.gd===1?0:policy.transition[year])}:tariffFor(year,v.gd,competence);
 if(!tariff||!Object.hasOwn(policy.transition,year))return null;
 const flag=v.flag??tariff.flag;
 if(typeof flag!=='string'||!Object.hasOwn(policy.flags,flag))throw new RangeError('Bandeira invalida');
 const federal=1-tariff.pis-tariff.cofins;
 const full=(tariff.te+tariff.tusd)/((1-tariff.icms)*federal);
 const credit=tariff.te/((1-tariff.icms)*federal)+tariff.tusdCredit/federal;
 const self=Math.min(v.consumo,v.geracao*v.sim/100), grid=v.consumo-self, injected=v.geracao-self;
 // Approximate regulatory floor, computed before taxes; empirical fiscal model.
 const base=tariff.te+tariff.tusd, transport=tariff.tusd-tariff.tusdCredit;
 const maxComp=Math.max(0,(grid*base-v.min*base)/(base-transport));
 // Single-regime scenario. Source allocation is illustrative, not a regulatory credit ledger.
 const compensated=Math.min(grid,injected+received+previous,maxComp);
 const usedOwn=Math.min(injected,compensated);
 const usedReceived=Math.min(received,Math.max(0,compensated-usedOwn));
 const usedPrevious=Math.min(previous,Math.max(0,compensated-usedOwn-usedReceived));
 const excess=Math.max(0,injected-usedOwn), remainingReceived=received-usedReceived, remainingPrevious=previous-usedPrevious;
 const uncredited=grid-compensated, residual=full-credit;
 const nonCompensatedCost=uncredited*full, residualCost=compensated*residual;
 const raw=nonCompensatedCost+residualCost;
 const floor=v.min*full, energy=Math.max(floor,raw);
 // Bandeira: scenario with one flag for the entire cycle, no surcharge on compensated kWh.
 // Minimum billing interaction and tax treatment require validation against non-green invoices.
 const flagRate=policy.flags[flag]/((1-tariff.icms)*federal);
 const flagBefore=Math.max(v.consumo,v.min)*flagRate;
 const flagAfter=(grid<v.min?v.min:uncredited)*flagRate;
 const before=Math.max(v.consumo,v.min)*full+v.cip+flagBefore, after=energy+v.cip+flagAfter;
 return {before,after,saving:before-after,self,grid,injected,compensated,uncredited,excess,usedOwn,usedReceived,usedPrevious,remainingReceived,remainingPrevious,creditBalance:excess+remainingReceived+remainingPrevious,wire:v.gd===2?compensated*transport:0,floorAdjustment:energy-raw,residual:residualCost,nonCompensatedCost,energy:energy+flagAfter,flag,flagBefore,flagAfter,reference:tariff.reference,incidence:tariff.incidence};
}
// Pure percentage allocation for a hypothetical available surplus; no persistence or transfer.
// Input percentages must total at most 100; unallocated energy remains with the source.
function allocateExcess(kwh,percentages){
 if(!validEnergy(kwh)||!Array.isArray(percentages)||!percentages.every(x=>Number.isFinite(x)&&x>=0&&x<=100))throw new RangeError('Rateio invalido');
 const total=percentages.reduce((a,b)=>a+b,0);
 if(total>100+1e-9)throw new RangeError('Rateio acima de 100%');
 const allocations=percentages.map(p=>kwh*p/100);
 return {allocations,remaining:Math.max(0,kwh-allocations.reduce((a,b)=>a+b,0))};
}
// Draft only: validates a complete monthly reference; never activates or persists it.
function validateTariffDraft(d){
 if(!d||typeof d.reference!=='string'||!/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(d.reference))throw new RangeError('Competencia invalida');
 const {te,tusd,fioB,icms,pis,cofins,flag}=d;
 if(![te,tusd,fioB,icms,pis,cofins].every(Number.isFinite)||te<=0||te>10||tusd<=0||tusd>10||fioB<0||fioB>tusd||icms<0||icms>=.5||pis<0||cofins<0||pis+cofins>=.3||typeof flag!=='string'||!Object.hasOwn(policy.flags,flag))throw new RangeError('Parametros tarifarios fora dos limites');
 const source=typeof d.source==='string'?d.source.trim():'';
 if(source.length<5||source.length>300)throw new RangeError('Informe a referencia documental');
 const norm=n=>Number(n.toFixed(12));
 return {reference:d.reference,te:norm(te),tusd:norm(tusd),fioB:norm(fioB),icms:norm(icms),pis:norm(pis),cofins:norm(cofins),flag,source,status:'rascunho'};
}
// Simulates one generator and beneficiary units, same regime and reference.
// Only the current generator surplus is allocated; no reallocation of old credits.
function calculateGroup(generator,beneficiaries,year=policy.baseYear,competence){
 if(!Array.isArray(beneficiaries)||beneficiaries.length>100)throw new RangeError('Beneficiarias invalidas');
 const source=calculate(generator,year,competence);
 if(!source)return null;
 const distribution=allocateExcess(source.excess,beneficiaries.map(b=>b.percent));
 const units=beneficiaries.map((b,i)=>{
  if(b.geracao!==undefined&&b.geracao!==0)throw new RangeError('Beneficiaria com geracao propria nao suportada');
  if(b.creditsReceived!==undefined&&b.creditsReceived!==0)throw new RangeError('Credito recebido deve vir do rateio');
  return calculate({...b,gd:generator.gd,geracao:0,sim:0,creditsReceived:distribution.allocations[i],flag:generator.flag},year,competence);
 });
 const totals=[source,...units].reduce((a,r)=>({before:a.before+r.before,after:a.after+r.after,saving:a.saving+r.saving}),{before:0,after:0,saving:0});
 return {source,units,distribution,sourceRemaining:source.creditBalance-(source.excess-distribution.remaining),totals};
}
// Online source is a draft only. Never substitutes taxes from another month.
function prepareOnlineDraft(r,monthlyTaxes,queriedAt){
 if(!r||typeof r.month!=='string'||!/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(r.month)||!r.period||!Array.isArray(r.periods)||r.periods.length!==1)throw new RangeError('Vigência online incompleta ou ambígua');
 const p=r.period,year=Number(r.month.slice(0,4)),m=Number(r.month.slice(5));
 const start=r.month+'-01',end=r.month+'-'+String(new Date(Date.UTC(year,m,0)).getUTCDate()).padStart(2,'0');
 if(![p.te,p.tusd,p.fioB].every(Number.isFinite)||p.te<=0||p.te>10||p.tusd<=0||p.tusd>10||p.fioB<0||p.fioB>p.tusd||typeof p.start!=='string'||typeof p.end!=='string'||p.start>start||p.end<end||p.start!==r.periods[0].start||p.end!==r.periods[0].end||typeof p.reh!=='string'||!p.reh.trim())throw new RangeError('Referência online inválida');
 const date=new Date(queriedAt);
 if(!Number.isFinite(date.getTime()))throw new RangeError('Data da consulta inválida');
 const flag=r.flag?.name??null;
 if(flag!==null&&(!Object.hasOwn(policy.flags,flag)||!Number.isFinite(r.flag.rate)||Math.abs(r.flag.rate-policy.flags[flag])>1e-9))throw new RangeError('Adicional da bandeira exige revisão técnica');
 // Only same-month taxes from the configured reference are trusted.
 const taxes=policy.taxes[r.month]??null;
 const source=('ANEEL online '+date.toISOString().slice(0,10)+'; '+p.reh+(taxes?'; tributos observados em fatura da mesma competência':'')).slice(0,300);
 const norm=n=>Number(n.toFixed(12));
 return {reference:r.month,te:norm(p.te),tusd:norm(p.tusd),fioB:norm(p.fioB),flag,taxes,source,status:'rascunho'};
}
// Explicit sandbox profile; never changes the public reference or policy.
function calculateDraft(v,d,year=policy.baseYear){return calculateInternal(v,year,undefined,validateTariffDraft(d));}
const api=Object.freeze({policy,tariffFor,calculate,allocateExcess,validateTariffDraft,calculateGroup,prepareOnlineDraft,calculateDraft});
if(typeof module==='object'&&module.exports)module.exports=api;else root.WWSolarEconomia=api;
})(typeof globalThis==='object'?globalThis:this);
