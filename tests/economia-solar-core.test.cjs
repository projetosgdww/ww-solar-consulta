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

test('intermediario ANEEL DEV somente leitura e parametros limitados',async()=>{
 const {handle}=await import('../functions/api/aneel.js');
 let calls=0;
 const lookup=async month=>{calls++;return {month,period:null,periods:[],flag:null};};
 const host='https://ww-solar-economia-dev.pages.dev/api/aneel';
 const run=(url,method='GET')=>handle(new Request(url,{method}),{lookup});
 assert.equal((await run(host+'?month=2026-11','POST')).status,405);
 assert.equal((await run(host+'?month=2026-11&url=example.com')).status,400);
 assert.equal((await run(host+'?month=2027-01')).status,400);
 assert.equal((await run('https://catalogo.wwplatform.com.br/api/aneel?month=2026-11')).status,404);
 assert.equal(calls,0);
 const ok=await run(host+'?month=2026-11');assert.equal(ok.status,200);assert.equal((await ok.json()).result.month,'2026-11');assert.equal(calls,1);
 const failed=await handle(new Request(host+'?month=2026-11'),{lookup:async()=>{throw new Error('ANEEL HTTP 503');}});
 assert.equal(failed.status,502);assert.equal((await failed.json()).code,'UPSTREAM_HTTP');assert.equal(failed.headers.get('Cache-Control'),'no-store');
});

test('diagnostico distingue indisponibilidade de cada fonte e erro JSON',async()=>{
 const onlyFlagsFail=async url=>new URL(url).searchParams.get('resource_id')===aneel.resources.flags?{ok:false,status:503}:{ok:true,json:async()=>({success:true,result:{total:0,records:[]}})};
 await assert.rejects(()=>aneel.lookup('2026-11',onlyFlagsFail),err=>err.source==='bandeiras'&&err.message==='ANEEL HTTP 503');
 const badJSON=async url=>new URL(url).searchParams.get('resource_id')===aneel.resources.components?{ok:true,json:async()=>{throw new SyntaxError('invalid JSON');}}:{ok:true,json:async()=>({success:true,result:{total:0,records:[]}})};
 await assert.rejects(()=>aneel.lookup('2026-11',badJSON),err=>err.source==='componentes'&&err.message==='Resposta JSON ANEEL inválida');
 const {handle}=await import('../functions/api/aneel.js');
 const response=await handle(new Request('https://ww-solar-economia-dev.pages.dev/api/aneel?month=2026-11'),{lookup:async()=>{const err=new Error('ANEEL HTTP 503');err.source='bandeiras';throw err;}});
 const body=await response.json();assert.equal(body.code,'UPSTREAM_HTTP');assert.equal(body.source,'bandeiras');assert.equal(body.httpStatus,503);
});

test('rascunho online usa somente tributos da propria competencia e preserva motor',()=>{
 const {prepareOnlineDraft}=require('../economia-solar-core.js');
 const p={start:'2026-08-26',end:'2027-04-21',te:.21326,tusd:.48849,fioB:.283714420722,reh:'REH 3324/2026'};
 const r={month:'2026-11',period:p,periods:[p],flag:{name:'verde',rate:0}};
 const time='2026-11-26T15:00:00Z', before=calculate(v);
 const d=prepareOnlineDraft(r,null,time);near(d.taxes.pis,.0048);near(d.fioB,p.fioB);assert.equal(d.status,'rascunho');
 const july={...p,start:'2026-04-22',end:'2026-08-25',te:.26099,tusd:.48878};
 const j=prepareOnlineDraft({month:'2026-07',period:july,periods:[july],flag:{name:'amarela',rate:.01885}},d.taxes,time);assert.equal(j.taxes,null);
 assert.throws(()=>prepareOnlineDraft({...r,periods:[p,july]},null,time),RangeError);
 assert.throws(()=>prepareOnlineDraft({...r,flag:{name:'verde',rate:.1}},null,time),RangeError);
 assert.throws(()=>prepareOnlineDraft({...r,period:{...p,end:'2026-11-15'}},null,time),RangeError);
 assert.deepEqual(calculate(v),before);
});

test('normalizacao decimal e versoes de homologacao nao alteram simulador comercial',()=>{
 const core=require('../economia-solar-core.js'),api=require('../economia-solar-tariff-sandbox.js');
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const d=core.validateTariffDraft({...policy.profiles['2026-11'],source:'Teste de homologação',te:0.21325999999999998,tusd:0.48849000000000004});
 assert.equal(d.te,.21326);assert.equal(d.tusd,.48849);assert.equal(d.fioB,.283714420722);
 assert.equal(api.allowed('ww-solar-economia-dev.pages.dev'),true);assert.equal(api.allowed('catalogo.wwplatform.com.br'),false);
 const baseline=core.calculate(v);
 api.change(storage,'save',{draft:d,newId:'v1'});
 assert.throws(()=>api.change(storage,'activate',{id:'v1',expected:null}));
 api.change(storage,'approve',{id:'v1'});api.change(storage,'activate',{id:'v1',expected:null});
 assert.equal(api.read(storage).active,'v1');
 near(core.calculateDraft(v,d).saving,baseline.saving);
 const d2={...d,te:.3};api.change(storage,'save',{draft:d2,newId:'v2'});api.change(storage,'approve',{id:'v2'});
 assert.throws(()=>api.change(storage,'activate',{id:'v2',expected:null}));
 api.change(storage,'activate',{id:'v2',expected:'v1'});
 assert.notEqual(core.calculateDraft(v,d2).saving,baseline.saving);
 api.change(storage,'activate',{id:'v1',expected:'v2'});
 assert.equal(api.read(storage).active,'v1');api.change(storage,'restoreDefault',{expected:'v1'});
 assert.equal(api.read(storage).active,null);assert.equal(api.read(storage).events.length,8);
 assert.deepEqual(core.calculate(v),baseline);
});

test('API central DEV rejeita ausencia de sessao, papel de cliente e banco indisponivel',async()=>{
 const {handle}=await import('../functions/api/tarifas-dev.js');
 const url='https://ww-solar-economia-dev.pages.dev/api/tarifas-dev',token='Bearer '+ 'a'.repeat(32);
 const req=new Request(url,{headers:{Authorization:token}});
 const env={TARIFF_AUTH_PUBLISHABLE_KEY:'test'};
 const user={id:'11111111-1111-4111-8111-111111111111',app_metadata:{wwsolar_role:'admin'}};
 const fake=u=>async()=>({ok:true,json:async()=>u});
 assert.equal((await handle(new Request(url),env)).status,401);
 assert.equal((await handle(req,env,{fetcher:fake({...user,app_metadata:{wwsolar_role:'client'},user_metadata:{wwsolar_role:'admin'}})})).status,403);
 assert.equal((await handle(req,env,{fetcher:fake(user)})).status,503);
 assert.equal((await handle(new Request('https://catalogo.wwplatform.com.br/api/tarifas-dev'),env)).status,404);
 assert.equal((await handle(new Request(url,{method:'POST',headers:{Authorization:token,'Content-Type':'application/json',Origin:'https://example.com'}}),env)).status,403);
 const fakeDB={prepare:()=>({all:async()=>({success:true,results:[]})})};
 const ok=await handle(req,{...env,TARIFFS_DEV:fakeDB},{fetcher:fake(user)});assert.equal(ok.status,200);assert.equal((await ok.json()).state.revision,0);
});
test('API central valida comandos e reconstrução do histórico',async()=>{
 const {command,replay}=await import('../functions/api/tarifas-dev.js');
 const id='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
 const draft={...policy.profiles['2026-11'],source:'Teste de homologacao'};
 const c=command({action:'save',requestId:id,expectedRevision:0,draft});
 assert.equal(c.id,id);
 assert.throws(()=>command({action:'delete',requestId:id,expectedRevision:0}));
 const rows=[{seq:1,expected_seq:0,action:'save',version_id:id,draft_json:JSON.stringify(c.draft),actor_id:actor,occurred_at:'2026-11-26'}];
 assert.throws(()=>replay([...rows,{seq:2,expected_seq:1,action:'activate',version_id:id}]));
 rows.push({seq:2,expected_seq:1,action:'approve',version_id:id,actor_id:actor},{seq:3,expected_seq:2,action:'activate',version_id:id,actor_id:actor});
 assert.equal(replay(rows).active,id);assert.equal(replay(rows).revision,3);
 assert.throws(()=>replay([...rows,{seq:4,expected_seq:1,action:'restore_default'}]));
});

test('falha de autenticacao central e classificada sem acessar banco',async()=>{
 const {handle}=await import('../functions/api/tarifas-dev.js');
 const req=new Request('https://ww-solar-economia-dev.pages.dev/api/tarifas-dev',{headers:{Authorization:'Bearer '+'a'.repeat(32)}});
 let touches=0;
 const env={TARIFF_AUTH_PUBLISHABLE_KEY:'test',TARIFFS_DEV:{prepare(){touches++;throw Error('unexpected');}}};
 const cases=[
  [async()=>({ok:false,status:503}),'AUTH_HTTP'],
  [async()=>{throw Error('network');},'AUTH_NETWORK'],
  [async()=>({ok:true,json:async()=>{throw Error('invalid JSON');}}),'AUTH_RESPONSE']
 ];
 for(const [fetcher,code] of cases){const r=await handle(req,env,{fetcher});assert.equal(r.status,503);assert.equal((await r.json()).code,code);}
 assert.equal(touches,0);
});

test('referencia publica DEV somente leitura, sem dados de auditoria e com restauracao',async()=>{
 const {handle}=await import('../functions/api/tarifa-ativa-dev.js');
 const {sameTariff}=await import('../functions/api/tarifas-dev.js');
 const id='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
 const draft={...policy.profiles['2026-11'],source:'Referencia de teste'};
 const rows=[{seq:1,expected_seq:0,action:'save',version_id:id,draft_json:JSON.stringify(draft),actor_id:actor,occurred_at:'2026-11-26'},{seq:2,expected_seq:1,action:'approve',version_id:id,actor_id:actor},{seq:3,expected_seq:2,action:'activate',version_id:id,actor_id:actor}];
 const url='https://ww-solar-economia-dev.pages.dev/api/tarifa-ativa-dev';
 let reads=0;const env={TARIFFS_DEV:{prepare:sql=>{assert.match(sql,/^SELECT /);reads++;return {all:async()=>({success:true,results:rows})};}}};
 assert.equal((await handle(new Request(url,{method:'POST'}),env)).status,405);
 assert.equal((await handle(new Request('https://catalogo.wwplatform.com.br/api/tarifa-ativa-dev'),env)).status,404);
 assert.equal((await handle(new Request(url+'?x=1'),env)).status,400);
 assert.equal(reads,0);
 const r=await handle(new Request(url),env);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');
 const body=await r.json();assert.equal(body.revision,3);assert.equal(body.profile.reference,'2026-11');
 assert.equal(Object.hasOwn(body.profile,'source'),false);assert.equal(Object.hasOwn(body,'events'),false);assert.equal(JSON.stringify(body).includes(actor),false);
 near(require('../economia-solar-core.js').calculateDraft(v,{...body.profile,source:'Referencia central DEV'}).saving,calculate(v).saving);
 assert.equal(sameTariff(draft,{...draft,source:'Outra consulta'}),true);assert.equal(sameTariff(draft,{...draft,pis:.01}),false);
 rows.push({seq:4,expected_seq:3,action:'restore_default',version_id:null,actor_id:actor});
 const restored=await (await handle(new Request(url),env)).json();assert.equal(restored.profile,null);assert.equal(restored.revision,4);
 assert.equal((await handle(new Request(url),{})).status,503);
});
