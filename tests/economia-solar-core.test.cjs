const test=require('node:test');const assert=require('node:assert/strict');const {calculate,tariffFor,policy}=require('../economia-solar-core.js');
const v={consumo:600,geracao:600,sim:30,gd:2,min:30,cip:40};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7, a+' != '+b);
test('progressao 2026 a 2028 e GD I',()=>{for(const [year,p] of [[2026,.60],[2027,.75],[2028,.90]]){near(tariffFor(year,2).incidence,p);near(tariffFor(year,1).incidence,0);}assert.equal(tariffFor(2029,2),null);});
test('balanco energetico e fio B',()=>{const r=calculate(v);near(r.self,180);near(r.grid,420);near(r.injected,420);near(r.compensated,420);near(r.wire,420*.283714420722*.60);});
test('GD I preserva minimo de cada ligacao',()=>{for(const min of [30,50,100]){const r=calculate({...v,gd:1,min});near(r.uncredited,min);near(r.excess,min);near(r.wire,0);}});
test('GD II respeita piso sem duplicar transporte',()=>{const r=calculate({...v,consumo:100,geracao:100,sim:0,min:100});near(r.compensated,0);near(r.before,r.after);const s=calculate({...v,consumo:150,geracao:150,sim:0,min:100});near(s.uncredited*(policy.te+policy.tusd)+s.wire,100*(policy.te+policy.tusd));});
test('geracao zero e consumo zero',()=>{const r=calculate({...v,geracao:0});near(r.before,r.after);const s=calculate({...v,consumo:0});near(s.self,0);near(s.compensated,0);near(s.before,s.after);});
test('excedente e autoconsumo limitado',()=>{const r=calculate({...v,consumo:300,geracao:600});near(r.self,180);near(r.excess,r.injected-r.compensated);assert.ok(r.excess>=300);const s=calculate({...v,consumo:100,sim:100});near(s.self,100);near(s.injected,500);});
test('economia cai com progressao GD II',()=>{assert.ok(calculate(v,2026).saving>calculate(v,2027).saving);assert.ok(calculate(v,2027).saving>calculate(v,2028).saving);});
test('entradas invalidas rejeitadas',()=>{for(const x of [{sim:101},{consumo:-1},{geracao:NaN},{min:20},{gd:3},{cip:-1}])assert.throws(()=>calculate({...v,...x}),RangeError);});
test('conservacao de energia e composicao financeira',()=>{for(const gd of [1,2])for(const min of [30,50,100])for(const consumo of [0,20,100,300,600])for(const geracao of [0,50,600,1000])for(const sim of [0,30,100]){const r=calculate({gd,min,consumo,geracao,sim,cip:40});near(r.self+r.grid,consumo);near(r.self+r.injected,geracao);near(r.compensated+r.excess,r.injected);near(r.compensated+r.uncredited,r.grid);assert.ok(r.after<=r.before+1e-7);assert.ok(r.compensated>=0);}});

const {allocateExcess}=require('../economia-solar-core.js');
test('competencia explicita sem substituicao silenciosa',()=>{
 const mar=tariffFor(2026,2,'2026-03'), nov=tariffFor(2026,2,'2026-11');
 near(mar.te,.24519);near(mar.tusdCredit,.28985);near(mar.pis,.0117);near(nov.tusdCredit,.48849-.283714420722*.60);near(nov.cofins,.0219);
 assert.equal(tariffFor(2026,2,'2026-04'),null);assert.equal(tariffFor(2027,2,'2026-03'),null);
 assert.equal(tariffFor(2027,2).scenario,true);
});
test('creditos anteriores podem superar injecao do mes',()=>{
 const r=calculate({...v,consumo:1807,geracao:1194,sim:0,min:100,creditsPrevious:147.2});
 near(r.compensated,1341.2);near(r.usedOwn,1194);near(r.usedPrevious,147.2);near(r.creditBalance,0);
});
test('beneficiaria sem injecao recebe creditos',()=>{
 const r=calculate({...v,consumo:384,geracao:0,sim:0,min:100,creditsReceived:192},2026,'2026-03');
 near(r.compensated,192);near(r.usedReceived,192);near(r.uncredited,192);near(r.excess,0);
});
test('creditos preservados quando piso impede uso e sem duplicidade',()=>{
 const r=calculate({...v,gd:1,consumo:50,geracao:80,sim:0,min:30,creditsPrevious:15.2,creditsReceived:10.3});
 near(r.compensated,20);near(r.excess,60);near(r.remainingPrevious,15.2);near(r.remainingReceived,10.3);
 near(r.creditBalance+r.compensated,80+15.2+10.3);
});
test('rateio percentual conserva excedente e valida limites',()=>{
 const r=allocateExcess(147.2,[25,50]);near(r.allocations[0],36.8);near(r.allocations[1],73.6);near(r.remaining,36.8);
 for(const p of [[60,41],[-1],[NaN]])assert.throws(()=>allocateExcess(100,p),RangeError);
 assert.throws(()=>calculate({...v,creditsPrevious:-1}),RangeError);
 assert.throws(()=>calculate({...v,creditsReceived:Infinity}),RangeError);
});
// Anonymized numerical benchmarks, no account identifiers or original files.
// Compare energy subtotal only; penalties and interest are outside the model.
test('regressao financeira de cinco cenarios de referencia',()=>{
 const cases=[
  {grid:239,inj:285,gd:1,min:30,ref:'2026-11',expected:53.24},
  {grid:1807,inj:1194,gd:2,min:100,ref:'2026-11',previous:147.2,expected:822.81},
  {grid:270,inj:0,gd:2,min:30,ref:'2026-11',expected:243.30},
  {grid:384,inj:0,gd:2,min:100,ref:'2026-03',received:192,expected:242.20},
  {grid:184,inj:0,gd:2,min:30,ref:'2026-11',expected:165.79}
 ];
 for(const c of cases){
  const r=calculate({consumo:c.grid,geracao:c.inj,sim:0,gd:c.gd,min:c.min,cip:0,creditsPrevious:c.previous??0,creditsReceived:c.received??0},2026,c.ref);
  assert.ok(Math.abs(r.energy-c.expected)<=.20,JSON.stringify({expected:c.expected,actual:r.energy}));
  assert.ok(Math.abs(r.energy-c.expected)/c.expected<.01);
 }
});

const {validateTariffDraft,calculateGroup}=require('../economia-solar-core.js');
test('bandeiras nao oneram energia compensada e verde preserva modelo',()=>{
 const base=calculate(v),red=calculate({...v,flag:'vermelha2'}),yellow=calculate({...v,flag:'amarela'});
 near(base.flagBefore,0);near(red.flagAfter,0);near(red.flagBefore,600*.07877/(.8*(1-.0048-.0219)));
 assert.ok(red.saving>yellow.saving);
 const partial=calculate({...v,geracao:300,flag:'amarela'});
 near(partial.flagAfter,partial.uncredited*.01885/(.8*(1-.0048-.0219)));
 const zero=calculate({...v,geracao:0,flag:'vermelha1'});near(zero.before,zero.after);
 assert.throws(()=>calculate({...v,flag:'inexistente'}),RangeError);
});
test('rascunho validado nao altera referencia vigente',()=>{
 const d={...policy.profiles['2026-11'],reference:'2026-12',source:'Documento de referencia para teste'};
 const draft=validateTariffDraft(d);assert.equal(draft.status,'rascunho');assert.equal(tariffFor(2026,2,'2026-12'),null);
 for(const bad of [{te:0},{fioB:1},{icms:1},{pis:.4},{reference:'2026-13'},{source:''}])assert.throws(()=>validateTariffDraft({...d,...bad}),RangeError);
});
test('simulacao conjunta de rateio nao duplica excedentes',()=>{
 const g=calculateGroup({...v,consumo:200,geracao:1000,sim:0},[{consumo:300,min:30,cip:20,percent:50},{consumo:200,min:30,cip:20,percent:25}]);
 near(g.sourceRemaining,g.source.creditBalance-g.distribution.allocations.reduce((a,b)=>a+b,0));
 g.units.forEach((r,i)=>near(r.usedReceived+r.remainingReceived,g.distribution.allocations[i]));
 near(g.totals.saving,g.totals.before-g.totals.after);
 assert.throws(()=>calculateGroup(v,[{consumo:100,min:30,cip:0,percent:101}]),RangeError);
});

test('snapshot ANEEL seleciona vigencia sem inventar dados mensais',()=>{
 const nov=policy.lookupMonth('2026-11');near(nov.period.fioB,.283714420722);near(nov.period.te,.21326);assert.equal(nov.flag,'verde');assert.equal(nov.taxes.pis,.0048);
 const may=policy.lookupMonth('2026-05');near(may.period.te,.26099);assert.equal(may.flag,'amarela');assert.equal(may.taxes,null);
 for(const month of ['2026-04','2026-08']){const r=policy.lookupMonth(month);assert.equal(r.period,null);assert.equal(r.periods.length,2);}
 const mar=policy.lookupMonth('2026-03');assert.equal(mar.period.fioB,null);
 const dec=policy.lookupMonth('2026-12');assert.equal(dec.flag,null);assert.equal(dec.taxes,null);
 assert.equal(policy.lookupMonth('2027-05').period,null);
 assert.throws(()=>policy.lookupMonth('2026-13'),RangeError);
});

const aneel=require('../economia-solar-aneel.js');
test('consulta ANEEL valida unidade, duplicatas, vigencia e bandeira',()=>{
 const make=(a,b,k,v)=>({...aneel.filters,DatInicioVigencia:a,DatFimVigencia:b,DscResolucaoHomologatoria:'REH teste',DscComponenteTarifario:k,VlrComponenteTarifario:v});
 const rows=[make('2026-08-26','2027-04-21','TE','213,26'),make('2026-08-26','2027-04-21','TUSD','488,49'),make('2026-08-26','2027-04-21','TUSD_FioB','283,714420722')];
 const flag=[{DatCompetencia:'2026-11-01',NomBandeiraAcionada:'Verde',VlrAdicionalBandeira:',00'}];
 const r=aneel.summarize('2026-11',[...rows,rows[0]],flag);
 near(r.period.te,.21326);near(r.period.fioB,.283714420722);near(r.flag.rate,0);
 assert.equal(aneel.summarize('2026-08',rows,[]).period,null);
 assert.equal(aneel.summarize('2026-12',rows,[]).flag,null);
 assert.throws(()=>aneel.summarize('2026-11',rows.slice(0,2),flag));
 assert.throws(()=>aneel.summarize('2026-11',[...rows,{...rows[0],VlrComponenteTarifario:'999'}],flag));
 assert.throws(()=>aneel.summarize('2027-01',rows,flag));
});
test('consulta online rejeita resposta truncada, sem gravar dados',async()=>{
 const fake=async()=>({ok:true,json:async()=>({success:true,result:{total:501,records:[]}})});
 await assert.rejects(()=>aneel.lookup('2026-11',fake),/incompleta/);
});
