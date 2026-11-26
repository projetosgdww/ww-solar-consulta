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

test('comparacao financeira isolada conserva motor base',()=>{
 const base=C.calculate(v,2027),e=run({compensated:base.compensated}),copy=JSON.stringify(base);
 const s=E.sensitivity(base,e.ecr,15000);
 assert.equal(s.after.toFixed(2),'239.03');assert.equal(s.saving.toFixed(2),'341.72');assert.equal(s.payback.toFixed(2),'3.66');
 assert.equal(JSON.stringify(base),copy);assert.equal(E.sensitivity(base,base.saving,15000).payback,null);
});
test('gestao ECR: validacao, revisao, aprovacao, restauracao e leitura publica sem auditoria',async()=>{
 const {command,replay,publicReference,handle}=await import('../functions/api/ecr-dev.js');
 const {handle:read}=await import('../functions/api/ecr-ativo-dev.js');
 const id='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
 const draft={...E.reference,regulatoryStatus:'proposta',source:'NT 192/2026-STR/ANEEL; Despacho 3324/2026'};
 const c=command({action:'save',requestId:id,expectedRevision:0,draft});
 assert.equal(c.draft.teScee,-.02802);assert.equal(c.draft.factor,.524);
 assert.throws(()=>E.validateStudyDraft({...draft,factor:1.01}));assert.throws(()=>E.validateStudyDraft({...draft,year:2028}));
 assert.throws(()=>E.validateStudyDraft({...draft,regulatoryStatus:'homologado',source:'Apenas uma proposta'}));
 const rows=[{seq:1,expected_seq:0,action:'save',version_id:id,draft_json:JSON.stringify(c.draft),actor_id:actor,occurred_at:'2026-11-26'}];
 assert.throws(()=>replay([...rows,{seq:2,expected_seq:1,action:'activate',version_id:id}]));
 rows.push({seq:2,expected_seq:1,action:'approve',version_id:id,actor_id:actor},{seq:3,expected_seq:2,action:'activate',version_id:id,actor_id:actor});
 const p=publicReference(replay(rows));assert.equal(p.revision,3);assert.equal(p.profile.factor,.524);assert.equal(p.profile.regulatoryStatus,'proposta');assert.equal(Object.hasOwn(p.profile,'source'),false);assert.equal(JSON.stringify(p).includes(actor),false);
 const origin='https://ww-solar-economia-dev.pages.dev',env={TARIFF_AUTH_PUBLISHABLE_KEY:'test',TARIFFS_DEV:{prepare:sql=>{assert.match(sql,/FROM ecr_events/);return {all:async()=>({success:true,results:rows})};}}};
 assert.equal((await handle(new Request(origin+'/api/ecr-dev'),env)).status,401);
 const req=new Request(origin+'/api/ecr-dev',{headers:{Authorization:'Bearer '+'a'.repeat(32)}});
 assert.equal((await handle(req,env,{fetcher:async()=>({ok:true,json:async()=>({id:actor,app_metadata:{wwsolar_role:'client'}})})})).status,403);
 assert.equal((await read(new Request(origin+'/api/ecr-ativo-dev',{method:'POST'}),env)).status,405);
 assert.equal((await read(new Request('https://catalogo.wwplatform.com.br/api/ecr-ativo-dev'),env)).status,404);
 assert.deepEqual(await (await read(new Request(origin+'/api/ecr-ativo-dev'),env)).json(),{ok:true,...p});
 assert.throws(()=>replay([...rows,{seq:4,expected_seq:1,action:'restore_default'}]));
 rows.push({seq:4,expected_seq:3,action:'restore_default',actor_id:actor});assert.equal(publicReference(replay(rows)).profile,null);
});
