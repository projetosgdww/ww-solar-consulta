'use strict';
(function(root){
const policy = Object.freeze({baseYear:2026,reference:'2026-11',te:.21326,tusd:.48849,fioB:(.48849-.31825)/.60,icms:.20,pis:.0048,cofins:.0219,annualDegradation:.005,transition:Object.freeze({2023:.15,2024:.30,2025:.45,2026:.60,2027:.75,2028:.90})});
function tariffFor(year,gd){
 const incidence=gd===1?0:policy.transition[year];
 if(incidence===undefined)return null;
 return {...policy,incidence,tusdCredit:policy.tusd-policy.fioB*incidence};
}

function calculate(v,year=policy.baseYear){
 const tariff=tariffFor(year,v.gd);
 if(!tariff)return null;
 const federal=1-tariff.pis-tariff.cofins;
 const full=(tariff.te+tariff.tusd)/((1-tariff.icms)*federal);
 const credit=tariff.te/((1-tariff.icms)*federal)+tariff.tusdCredit/federal;
 const self=Math.min(v.consumo,v.geracao*v.sim/100), grid=v.consumo-self, injected=v.geracao-self;
 // Regulatory floor uses tariff components before taxes; fiscal treatment is separate.
 const base=tariff.te+tariff.tusd, transport=tariff.tusd-tariff.tusdCredit;
 const maxComp=Math.max(0,(grid*base-v.min*base)/(base-transport));
 const compensated=Math.min(grid,injected,maxComp), uncredited=grid-compensated, residual=full-credit;
 const raw=uncredited*full+compensated*residual;
 // Approximate monetary floor, not an implementation of REN 1000 art. 655-I.
 const floor=v.min*full, energy=Math.max(floor,raw);
 const before=Math.max(v.consumo,v.min)*full+v.cip, after=energy+v.cip;
 return {before,after,saving:before-after,self,grid,injected,compensated,uncredited,excess:injected-compensated,wire:v.gd===2?compensated*(tariff.tusd-tariff.tusdCredit):0,floorAdjustment:energy-raw,residual:compensated*residual};
}

const api=Object.freeze({policy,tariffFor,calculate});
if(typeof module==='object'&&module.exports)module.exports=api;else root.WWSolarEconomia=api;
})(typeof globalThis==='object'?globalThis:this);
