/* WW Solar — consumo simples V1. Potências ilustrativas, substituíveis pelo usuário. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WWSolarConsumo=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const appliances=Object.freeze([
  {id:'tv',label:'Televisão LED',watts:100},
  {id:'ventilador',label:'Ventilador',watts:70},
  {id:'computador',label:'Computador',watts:200},
  {id:'notebook',label:'Notebook',watts:65},
  {id:'lampada',label:'Lâmpada LED',watts:10},
  {id:'microondas',label:'Micro-ondas',watts:1200},
  {id:'airfryer',label:'Air fryer',watts:1500},
  {id:'chuveiro',label:'Chuveiro elétrico',watts:5500},
  {id:'bomba',label:'Bomba d’água',watts:750},
  {id:'arcondicionado',label:'Ar-condicionado (potência elétrica ajustável)',watts:1000},
  {id:'geladeira',label:'Geladeira (consulte a etiqueta)',watts:150},
  {id:'freezer',label:'Freezer (consulte a etiqueta)',watts:200},
  {id:'outro',label:'Outro equipamento',watts:100}
 ]);
 const format=value=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(value);
 function calculate(input){
  const watts=Number(input?.watts),quantity=Number(input?.quantity),
    hours=Number(input?.hours),days=Number(input?.days);
  if(!Number.isFinite(watts)||watts<=0||watts>100000
     ||!Number.isSafeInteger(quantity)||quantity<1||quantity>100
     ||!Number.isFinite(hours)||hours<=0||hours>24
     ||!Number.isSafeInteger(days)||days<1||days>7)return null;
  const kwh=watts*quantity*hours*days*30/7/1000;
  return Number.isFinite(kwh)&&kwh<=1000000?kwh:null;
 }
 function total(rows){
  return (Array.isArray(rows)?rows:[]).reduce((sum,row)=>sum+(Number(row?.kwh)||0),0);
 }
 return Object.freeze({appliances,format,calculate,total});
});
