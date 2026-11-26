'use strict';
(function(root){
// ECR - estudo DEV, nao homologado para faturamento.
// ANEEL REN 1176/2026, art. 12 (310-A) e art. 14; NT 192/2026 (proposta).
// Despacho 3324/2026, tabela 2, B1 residencial SCEE convencional.
// Referencia de aplicacao de 26/08/2026 a 21/04/2027, congelada para o cenario.
const reference=Object.freeze({distributor:'ENEL CE',subgroup:'B1',modality:'convencional',start:'2026-08-26',end:'2027-04-21',teScee:-.02802,tusdScee:.48849,fioB:.283714420722,factor:.524,year:2027,status:'proposta',tariffSource:'Despacho ANEEL 3324/2026, tabela 2; reproducao consultada em 26/11/2026',factorSource:'NT 192/2026-STR/ANEEL; proposta CDE 2027'});
function validateScenario(p){
 if(!p||p.year!==2027||p.distributor!=='ENEL CE'||p.subgroup!=='B1'||p.modality!=='convencional'||p.status!=='proposta'||![p.teScee,p.tusdScee,p.fioB,p.factor].every(Number.isFinite)||Math.abs(p.teScee)>10||p.tusdScee<=0||p.tusdScee>10||p.teScee+p.tusdScee<0||p.fioB<0||p.fioB>p.tusdScee||p.factor<0||p.factor>1)throw RangeError('Parametros ECR invalidos');
 return p;
}
function estimate({year,gd,compensated,profile},scenario=reference){
 if(!Number.isInteger(year)||![1,2].includes(gd)||!Number.isFinite(compensated)||compensated<0||compensated>1e9)throw RangeError('Cenario ECR invalido');
 if(year<2027)return {status:'not-applicable',reason:'Anterior a 2027',ecr:0};
 if(gd===1)return {status:'not-applicable',reason:'GD I Enel CE - hipotese de mercado >= 700 GWh/ano, sujeita a classificacao anual',ecr:0};
 if(year!==2027)return {status:'unavailable',reason:'Fator ECR nao definido para este ano',ecr:null};
 const p=validateScenario(scenario);
 // Recuse misturar referencia SCEE congelada com uma tarifa convencional diferente.
 if(!profile||profile.reference!=='2026-11'||Math.abs(profile.te-.21326)>1e-8||Math.abs(profile.tusd-p.tusdScee)>1e-8||Math.abs(profile.fioB-p.fioB)>1e-8)return {status:'unavailable',reason:'Referencia tarifaria diferente da base SCEE de estudo',ecr:null};
 // Precisao de tarifa de 5 casas para reproduzir o demonstrativo de estudo.
 const rate=n=>Number(n.toFixed(5)),scee=rate(p.teScee+p.tusdScee),wireRate=rate(p.fioB*.75),benefitRate=Math.max(0,rate(scee-wireRate)),ecrRate=benefitRate*p.factor;
 const wire=compensated*wireRate,benefit=compensated*benefitRate,ecr=compensated*ecrRate;
 return {status:'provisional',year,compensated,scee,wireRate,benefitRate,ecrRate,wire,benefit,ecr,remainingBenefit:benefit-ecr,combined:wire+ecr,factor:p.factor,reference:p,limitations:['Sem tributos do ECR','Energia compensada do modelo atual, sem revalidacao do limite do art. 310-A §3','Nao altera a fatura ou payback do motor base','Vigencia congelada; nao constitui previsao de reajuste']};
}
const api=Object.freeze({reference,validateScenario,estimate});
if(typeof module==='object'&&module.exports)module.exports=api;else root.WWSolarECR=api;
})(typeof globalThis==='object'?globalThis:this);
