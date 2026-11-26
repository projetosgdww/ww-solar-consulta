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
function calculate(v,year=policy.baseYear,competence){
 const previous=v.creditsPrevious??0, received=v.creditsReceived??0;
 if(![v.consumo,v.geracao,v.cip,previous,received].every(validEnergy)||!Number.isFinite(v.sim)||v.sim<0||v.sim>100||![30,50,100].includes(v.min)||![1,2].includes(v.gd))throw new RangeError('Parametros invalidos');
 const tariff=tariffFor(year,v.gd,competence);
 if(!tariff)return null;
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
 const before=Math.max(v.consumo,v.min)*full+v.cip, after=energy+v.cip;
 return {before,after,saving:before-after,self,grid,injected,compensated,uncredited,excess,usedOwn,usedReceived,usedPrevious,remainingReceived,remainingPrevious,creditBalance:excess+remainingReceived+remainingPrevious,wire:v.gd===2?compensated*transport:0,floorAdjustment:energy-raw,residual:residualCost,nonCompensatedCost,energy,reference:tariff.reference,incidence:tariff.incidence};
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
const api=Object.freeze({policy,tariffFor,calculate,allocateExcess});
if(typeof module==='object'&&module.exports)module.exports=api;else root.WWSolarEconomia=api;
})(typeof globalThis==='object'?globalThis:this);
