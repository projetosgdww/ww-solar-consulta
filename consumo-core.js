/* WW Solar — V2: referências históricas documentadas, não potência exata de cada modelo.
   Fonte de referência: MME, Soluções Energéticas para a Amazônia, Tabela 8.2
   (potências médias adaptadas de Eletrobras/Procel, publicação antiga).
   Para refrigeradores/freezers: referência histórica de kWh/mês, sem converter
   potência nominal em funcionamento contínuo; confirmar ENCE/Inmetro do modelo. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WWSolarConsumo=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const SOURCE_MME='https://www.mme.gov.br/luzparatodos/downloads/Solucoes_Energeticas_para_a_Amazonia_Biomassa.pdf';
 const SOURCE_PBE='https://pbe.inmetro.gov.br/';
 // watt: potencia média histórica. monthly: kWh/mês histórico, não requer horas/dia.
 const appliances=Object.freeze([
  {id:'ventilador',label:'Ventilador pequeno',mode:'watts',watts:65},
  {id:'ventilador-teto',label:'Ventilador de teto',mode:'watts',watts:120},
  {id:'tv-antiga',label:'Televisão (referência antiga de 29")',mode:'watts',watts:110},
  {id:'computador',label:'Microcomputador (referência antiga)',mode:'watts',watts:120},
  {id:'computador-completo',label:'Computador, impressora e estabilizador',mode:'watts',watts:180},
  {id:'microondas',label:'Micro-ondas',mode:'watts',watts:1200},
  {id:'chuveiro',label:'Chuveiro elétrico (referência 3.500 W)',mode:'watts',watts:3500},
  {id:'cafeteira',label:'Cafeteira elétrica',mode:'watts',watts:600},
  {id:'liquidificador',label:'Liquidificador',mode:'watts',watts:300},
  {id:'lavadora-roupa',label:'Lavadora de roupas (referência antiga)',mode:'watts',watts:500},
  {id:'ferro',label:'Ferro elétrico',mode:'watts',watts:1000},
  {id:'forno-pequeno',label:'Forno elétrico pequeno',mode:'watts',watts:800},
  {id:'forno-grande',label:'Forno elétrico grande',mode:'watts',watts:1500},
  {id:'fritadeira',label:'Fritadeira elétrica (referência antiga)',mode:'watts',watts:1000},
  {id:'secador',label:'Secador de cabelo grande',mode:'watts',watts:1400},
  {id:'bomba-quarto',label:'Bomba d’água 1/4 CV',mode:'watts',watts:335},
  {id:'bomba-meio',label:'Bomba d’água 1/2 CV',mode:'watts',watts:613},
  {id:'bomba-um',label:'Bomba d’água 1 CV',mode:'watts',watts:1051},
  {id:'ar-7500',label:'Ar-condicionado 7.500 BTU (referência antiga)',mode:'watts',watts:1000,variable:true},
  {id:'ar-12000',label:'Ar-condicionado 12.000 BTU (referência antiga)',mode:'watts',watts:1450,variable:true},
  {id:'ar-18000',label:'Ar-condicionado 18.000 BTU (referência antiga)',mode:'watts',watts:2100,variable:true},
  {id:'geladeira-1',label:'Geladeira 1 porta (referência histórica)',mode:'monthly',monthlyKwh:30,variable:true},
  {id:'geladeira-2',label:'Geladeira 2 portas (referência histórica)',mode:'monthly',monthlyKwh:55,variable:true},
  {id:'freezer',label:'Freezer (referência histórica)',mode:'monthly',monthlyKwh:50,variable:true},
  {id:'frigobar',label:'Frigobar (referência histórica)',mode:'monthly',monthlyKwh:25,variable:true},
  {id:'lampada-led',label:'Lâmpada LED — exemplo de 10 W',mode:'watts',watts:10,illustrative:true},
  {id:'outro',label:'Outro equipamento — informe a potência',mode:'watts',watts:100,illustrative:true}
 ].map(x=>Object.freeze({...x,source:x.illustrative?'Exemplo editável':x.mode==='monthly'?'MME/Procel — consumo médio histórico':'MME/Procel — potência média histórica'})));
 const format=value=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(value);
 function calculate(input){
  const watts=Number(input?.watts),quantity=Number(input?.quantity),hours=Number(input?.hours),days=Number(input?.days);
  if(!Number.isFinite(watts)||watts<=0||watts>100000
   ||!Number.isSafeInteger(quantity)||quantity<1||quantity>100
   ||!Number.isFinite(hours)||hours<=0||hours>24
   ||!Number.isSafeInteger(days)||days<1||days>7)return null;
  const kwh=watts*quantity*hours*days*30/7/1000;
  return Number.isFinite(kwh)&&kwh<=1000000?kwh:null;
 }
 function calculateMonthly(input){
  const monthly=Number(input?.monthlyKwh),quantity=Number(input?.quantity);
  if(!Number.isFinite(monthly)||monthly<=0||monthly>100000
    ||!Number.isSafeInteger(quantity)||quantity<1||quantity>100)return null;
  const kwh=monthly*quantity;
  return Number.isFinite(kwh)&&kwh<=1000000?kwh:null;
 }
 function total(rows){return (Array.isArray(rows)?rows:[]).reduce((sum,row)=>sum+(Number(row?.kwh)||0),0);}
 return Object.freeze({appliances,format,calculate,calculateMonthly,total,SOURCE_MME,SOURCE_PBE});
});
