/* Cálculo solarimétrico independente — não modifica preços, catálogo ou seleção comercial.
   Valores nulos em cidades sem fonte, sem HSP substituta. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WWSolarSolarCore=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const PERFORMANCE_RATIO=0.77;
 const MONTH_LABELS=Object.freeze(['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']);
 const KEYS=Object.freeze(['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']);
 function days(year,monthIndex){
   if(!Number.isInteger(year)||year<1900||year>2200||!Number.isInteger(monthIndex)||monthIndex<0||monthIndex>11)return null;
   return new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();
 }
 function calculate(kwp,location,year=2025,ratio=PERFORMANCE_RATIO){
   if(!Number.isFinite(kwp)||kwp<=0||!location||!location.hsp||
      !Number.isFinite(ratio)||ratio<=0||ratio>1)return null;
   const monthly=[];
   for(let i=0;i<12;i++){
     const hsp=location.hsp[KEYS[i]],count=days(year,i);
     if(!Number.isFinite(hsp)||hsp<=0||count===null)return null;
     const kwh=kwp*hsp*count*ratio;
     monthly.push({key:KEYS[i],label:MONTH_LABELS[i],days:count,hsp,kwh});
   }
   const annualKwh=monthly.reduce((total,row)=>total+row.kwh,0);
   return {city:location.name,uf:location.uf,kwp,year,ratio,monthly,annualKwh,averageMonthlyKwh:annualKwh/12};
 }
 return Object.freeze({PERFORMANCE_RATIO,MONTH_LABELS,KEYS,days,calculate});
});
