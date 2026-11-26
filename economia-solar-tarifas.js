'use strict';
(function(root){
// Snapshot dos CSVs publicos ANEEL de 26/11/2026 (tarifas e componentes)
// e 23/11/2026 (acionamento). B1 residencial convencional, tarifa de aplicacao.
const periods=Object.freeze([
 Object.freeze({start:'2026-01-01',end:'2026-04-21',te:.24519,tusd:.46488,fioB:null,reh:'3445/2025'}),
 Object.freeze({start:'2026-04-22',end:'2026-08-25',te:.26099,tusd:.48878,fioB:.283714420722,reh:'3574/2026'}),
 Object.freeze({start:'2026-08-26',end:'2027-04-21',te:.21326,tusd:.48849,fioB:.283714420722,reh:'3324/2026'})
]);
const flagMonths=Object.freeze({'2026-01':'verde','2026-02':'verde','2026-03':'verde','2026-04':'verde','2026-05':'amarela','2026-06':'amarela','2026-07':'amarela','2026-08':'amarela','2026-09':'amarela','2026-10':'verde','2026-11':'verde'});
const flags=Object.freeze({verde:0,amarela:.01885,vermelha1:.04463,vermelha2:.07877});
const taxes=Object.freeze({'2026-03':Object.freeze({icms:.20,pis:.0117,cofins:.0538}),'2026-11':Object.freeze({icms:.20,pis:.0048,cofins:.0219})});
const profiles=Object.freeze({
 '2026-03':Object.freeze({reference:'2026-03',flag:flagMonths['2026-03'],te:periods[0].te,tusd:periods[0].tusd,fioB:(.46488-.28985)/.60,fioBSource:'inferido de fatura',...taxes['2026-03']}),
 '2026-11':Object.freeze({reference:'2026-11',flag:flagMonths['2026-11'],te:periods[2].te,tusd:periods[2].tusd,fioB:periods[2].fioB,fioBSource:'ANEEL',...taxes['2026-11']})
});
const reference='2026-11';
const sources=Object.freeze({tariffs:'https://dadosabertos.aneel.gov.br/dataset/tarifas-distribuidoras-energia-eletrica',components:'https://dadosabertos.aneel.gov.br/dataset/componentes-tarifarias',flags:'https://dadosabertos.aneel.gov.br/dataset/bandeiras-tarifarias'});
// Month lookup is deliberately conservative: never choose a period silently in a split month.
function lookupMonth(month){
 if(typeof month!=='string'||!/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(month))throw new RangeError('Competencia invalida');
 const start=month+'-01',year=Number(month.slice(0,4)),m=Number(month.slice(5));
 const end=month+'-'+String(new Date(Date.UTC(year,m,0)).getUTCDate()).padStart(2,'0');
 const matches=periods.filter(p=>p.start<=end&&p.end>=start);
 const period=matches.length===1&&matches[0].start<=start&&matches[0].end>=end?matches[0]:null;
 return {month,period,periods:matches,flag:flagMonths[month]??null,taxes:taxes[month]??null,reason:period?null:matches.length>1?'mudanca de vigencia no mes':'cobertura incompleta ou ausente'};
}
const config=Object.freeze({...profiles[reference],baseYear:2026,reference,profiles,periods,flagMonths,taxes,lookupMonth,flags,sources,flagSource:sources.flags,transition:Object.freeze({2023:.15,2024:.30,2025:.45,2026:.60,2027:.75,2028:.90})});
if(typeof module==='object'&&module.exports)module.exports=config;else root.WWSolarTariff=config;
})(typeof globalThis==='object'?globalThis:this);
