'use strict';
(function(root){
// Observed monthly references; not an official complete tariff history.
const profiles=Object.freeze({
 '2026-03':Object.freeze({reference:'2026-03',te:.24519,tusd:.46488,fioB:(.46488-.28985)/.60,icms:.20,pis:.0117,cofins:.0538}),
 '2026-11':Object.freeze({reference:'2026-11',te:.21326,tusd:.48849,fioB:(.48849-.31825)/.60,icms:.20,pis:.0048,cofins:.0219})
});
const reference='2026-11';
const config=Object.freeze({...profiles[reference],baseYear:2026,reference,profiles,transition:Object.freeze({2023:.15,2024:.30,2025:.45,2026:.60,2027:.75,2028:.90})});
if(typeof module==='object'&&module.exports)module.exports=config;else root.WWSolarTariff=config;
})(typeof globalThis==='object'?globalThis:this);
