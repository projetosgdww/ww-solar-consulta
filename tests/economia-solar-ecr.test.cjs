'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../economia-solar-ecr.js'),C=require('../economia-solar-core.js');
const profile=C.policy.profiles['2026-11'],v={consumo:600,geracao:600,sim:30,gd:2,min:30,cip:40};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
const run=(over={},p=E.reference)=>E.estimate({year:2027,gd:2,compensated:1000,profile,...over},p);
test('reproduz exemplo Enel CE sem tributos com TE SCEE negativa',()=>{
 const r=run();assert.equal(r.status,'provisional');near(r.scee,.46047);near(r.wireRate,.21279);near(r.benefit,247.68);
 assert.equal(r.ecr.toFixed(2),'129.78');assert.equal(r.combined.toFixed(2),'342.57');assert.equal(r.remainingBenefit.toFixed(2),'117.90');
});
test('2026 e GD I sem ECR; 2028 e perfis incompatíveis não inventam fator',()=>{
 assert.equal(run({year:2026}).ecr,0);assert.equal(run({gd:1}).ecr,0);assert.equal(run({year:2028}).ecr,null);assert.equal(run({profile:{...profile,te:.25}}).ecr,null);assert.equal(run({profile:null}).ecr,null);
});
test('fator configuravel apenas em estudo, limites e energia zero',()=>{
 near(run({}, {...E.reference,factor:0}).ecr,0);near(run({}, {...E.reference,factor:1}).ecr,247.68);near(run({compensated:0}).ecr,0);
 for(const factor of [-.1,1.01,NaN])assert.throws(()=>run({}, {...E.reference,factor}),RangeError);
 assert.throws(()=>run({gd:3}),RangeError);assert.throws(()=>run({compensated:-1}),RangeError);
 assert.throws(()=>run({}, {...E.reference,status:'homologado'}),RangeError);
});
test('energia compensada do motor base, mono bi tri, autoconsumo e sem geracao; sem mutar resultados',()=>{
 for(const min of [30,50,100])for(const sim of [0,30,70,100]){
  const x={...v,min,sim},r=C.calculate(x,2027),old=JSON.stringify(r);
  const e=run({compensated:r.compensated});near(e.ecr,r.compensated*.24768*.524);assert.equal(JSON.stringify(C.calculate(x,2027)),old);
 }
 near(run({compensated:C.calculate({...v,geracao:0},2027).compensated}).ecr,0);
 const base=C.calculate(v,2026);assert.equal(base.before.toFixed(2),'580.75');assert.equal(base.after.toFixed(2),'166.16');assert.equal(base.saving.toFixed(2),'414.59');
});
test('estudo separado da fatura e da configuracao tarifaria central',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('economia-solar.html','utf8'),js=fs.readFileSync('economia-solar.js','utf8');
 assert.match(html,/id="eco-ecr-study" hidden/);assert.match(html,/Não integra a fatura estimada acima/);assert.match(js,/compensated:r\.compensated/);
 assert.doesNotMatch(js,/r\.after\s*\+=|r\.saving\s*-=|r\.after\s*=.*ecr/);
});
