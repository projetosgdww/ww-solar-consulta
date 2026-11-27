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
 const host='https://catalogo.wwplatform.com.br/api/aneel';
 const run=(url,method='GET')=>handle(new Request(url,{method}),{lookup});
 assert.equal((await run(host+'?month=2026-11','POST')).status,405);
 assert.equal((await run(host+'?month=2026-11&url=example.com')).status,400);
 assert.equal((await run(host+'?month=2027-01')).status,400);
 assert.equal((await run('https://invalid.example/api/aneel?month=2026-11')).status,404);
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
 const response=await handle(new Request('https://catalogo.wwplatform.com.br/api/aneel?month=2026-11'),{lookup:async()=>{const err=new Error('ANEEL HTTP 503');err.source='bandeiras';throw err;}});
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
 const {handle}=await import('../functions/api/tarifas-prod.js');
 const url='https://catalogo.wwplatform.com.br/api/tarifas-prod',token='Bearer '+ 'a'.repeat(32);
 const req=new Request(url,{headers:{Authorization:token}});
 const env={TARIFF_AUTH_PUBLISHABLE_KEY:'test'};
 const user={id:'11111111-1111-4111-8111-111111111111',app_metadata:{wwsolar_role:'admin'}};
 const fake=u=>async()=>({ok:true,json:async()=>u});
 assert.equal((await handle(new Request(url),env)).status,401);
 assert.equal((await handle(req,env,{fetcher:fake({...user,app_metadata:{wwsolar_role:'client'},user_metadata:{wwsolar_role:'admin'}})})).status,403);
 assert.equal((await handle(req,env,{fetcher:fake(user)})).status,503);
 assert.equal((await handle(new Request('https://invalid.example/api/tarifas-prod'),env)).status,404);
 assert.equal((await handle(new Request(url,{method:'POST',headers:{Authorization:token,'Content-Type':'application/json',Origin:'https://example.com'}}),env)).status,403);
 const fakeDB={prepare:()=>({all:async()=>({success:true,results:[]})})};
 const ok=await handle(req,{...env,TARIFFS_PROD:fakeDB},{fetcher:fake(user)});assert.equal(ok.status,200);assert.equal((await ok.json()).state.revision,0);
});
test('API central valida comandos e reconstrução do histórico',async()=>{
 const {command,replay}=await import('../functions/api/tarifas-prod.js');
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
 const {handle}=await import('../functions/api/tarifas-prod.js');
 const req=new Request('https://catalogo.wwplatform.com.br/api/tarifas-prod',{headers:{Authorization:'Bearer '+'a'.repeat(32)}});
 let touches=0;
 const env={TARIFF_AUTH_PUBLISHABLE_KEY:'test',TARIFFS_PROD:{prepare(){touches++;throw Error('unexpected');}}};
 const cases=[
  [async()=>({ok:false,status:503}),'AUTH_HTTP'],
  [async()=>{throw Error('network');},'AUTH_NETWORK'],
  [async()=>({ok:true,json:async()=>{throw Error('invalid JSON');}}),'AUTH_RESPONSE']
 ];
 for(const [fetcher,code] of cases){const r=await handle(req,env,{fetcher});assert.equal(r.status,503);assert.equal((await r.json()).code,code);}
 assert.equal(touches,0);
});

test('referencia publica DEV somente leitura, sem dados de auditoria e com restauracao',async()=>{
 const {handle}=await import('../functions/api/tarifa-ativa-prod.js');
 const {sameTariff}=await import('../functions/api/tarifas-prod.js');
 const id='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
 const draft={...policy.profiles['2026-11'],source:'Referencia de teste'};
 const rows=[{seq:1,expected_seq:0,action:'save',version_id:id,draft_json:JSON.stringify(draft),actor_id:actor,occurred_at:'2026-11-26'},{seq:2,expected_seq:1,action:'approve',version_id:id,actor_id:actor},{seq:3,expected_seq:2,action:'activate',version_id:id,actor_id:actor}];
 const url='https://catalogo.wwplatform.com.br/api/tarifa-ativa-prod';
 let reads=0;const env={TARIFFS_PROD:{prepare:sql=>{assert.match(sql,/^SELECT /);reads++;return {all:async()=>({success:true,results:rows})};}}};
 assert.equal((await handle(new Request(url,{method:'POST'}),env)).status,405);
 assert.equal((await handle(new Request('https://invalid.example/api/tarifa-ativa-prod'),env)).status,404);
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


test('Economia Solar transmite geração e abre o kit compatível, sem adicionar ao carrinho',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const eco=fs.readFileSync('economia-solar.js','utf8');
 const client=fs.readFileSync('cliente-dev.js','utf8');
 const link={hidden:true,setAttribute(){},removeAttribute(k){delete this[k];}};
 vm.runInNewContext(eco.slice(eco.indexOf('function updateKitLink('),eco.indexOf('const rateioEnabled',eco.indexOf('function updateKitLink(')))+'\nupdateKitLink(599.1)',{kitLink:link});
 assert.equal(link.href,'./?economia_kwh=600#catalogo');assert.equal(link.hidden,false);
 vm.runInNewContext(eco.slice(eco.indexOf('function updateKitLink('),eco.indexOf('const rateioEnabled',eco.indexOf('function updateKitLink(')))+'\nupdateKitLink(0)',{kitLink:link});
 assert.equal(link.href,undefined);assert.equal(link.hidden,true);
 const src=client.slice(client.indexOf('let economiaTargetApplied=false'),client.indexOf('function renderAll()'));
 for(const [query,expected,match] of [['?economia_kwh=600',600,true],['?economia_kwh=2500',2500,false],['?economia_kwh=0',null,false],['?economia_kwh=1e3',null,false]]){
  let target=null,scrolled='',kind=null;const S={query:'old',target:300};
  const card={dataset:{productId:'kit1'},scrollIntoView(){scrolled='kit';}};
  const custom={scrollIntoView(){scrolled='custom';}};
  const els={'client-search':{value:'old'},'client-product-grid':{children:[card]},'client-custom-kit-cta':custom,'catalogo':{}};
  const ctx={S,window:{location:{search:query}},URLSearchParams,$:id=>els[id],setTarget(v,exact){assert.equal(exact,true);target=v;S.target=v;},setKind(v){kind=v;},available:()=>[],C:{recommendedKit(){return match?{id:'kit1'}:null;}},requestAnimationFrame:fn=>fn()};
  vm.runInNewContext(src+'\napplyEconomiaTarget();applyEconomiaTarget();',ctx);
  assert.equal(target,expected);assert.equal(scrolled,expected===null?'':match?'kit':'custom');
  if(expected!==null){assert.equal(kind,'kit');assert.equal(S.query,'');}
 }
 assert.match(client,/if\(fromEconomia&&Number\.isSafeInteger\(n\)&&n>0&&n<=100000\)S\.target=n/);
});

test('autoconsumo remoto distribui somente excedente liquido e conserva energia',()=>{
 const b={consumo:400,min:30,cip:25,percent:100};
 for(const gd of [1,2])for(const min of [30,50,100]){
  const equal=calculateGroup({...v,gd,min},[b],2026);
  near(equal.available,0);near(equal.distribution.allocations[0],0);near(equal.units[0].saving,0);
  const g=calculateGroup({...v,gd,min,geracao:1000},[b],2026);
  near(g.available,400);near(g.distribution.allocations[0],400);
  near(g.sourceRemaining+g.units[0].usedReceived+g.units[0].remainingReceived,g.source.creditBalance);
  near(g.totals.saving,g.source.saving+g.units[0].saving);
  const half=calculateGroup({...v,gd,min,geracao:1000},[{...b,percent:50}],2026);
  near(half.distribution.allocations[0],200);near(half.distribution.remaining,200);
  const deficit=calculateGroup({...v,gd,min,geracao:300},[b],2026);near(deficit.available,0);
 }
});
test('rateio usa mesma tarifa central em ambas unidades e ECR somente sobre compensacao',()=>{
 const C=require('../economia-solar-core.js'),E=require('../economia-solar-ecr.js');
 const p={...policy.profiles['2026-11'],source:'referencia de teste'};
 const b={consumo:400,min:30,cip:25,percent:100},gen={...v,geracao:1000};
 const g=C.calculateGroup(gen,[b],2027,undefined,p);
 const expected=C.calculateDraft({...b,gd:2,geracao:0,sim:0,creditsReceived:400},p,2027);
 near(g.units[0].after,expected.after);near(g.source.after,C.calculateDraft(gen,p,2027).after);
 const e=E.estimate({year:2027,gd:2,compensated:g.source.compensated+g.units[0].compensated,profile:p});
 assert.equal(e.status,'provisional');near(e.ecr,(g.source.compensated+g.units[0].compensated)*.24768*.524);
 near(E.sensitivity(g.totals,e.ecr,15000).saving,g.totals.saving-e.ecr);
});
test('interface de rateio inicia desativada e nao interfere em FormData da geradora',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('economia-solar.html','utf8'),js=fs.readFileSync('economia-solar.js','utf8');
 assert.match(html,/id="eco-rateio-enabled" type="checkbox">/);
 assert.match(html,/id="eco-rateio-fields" hidden disabled/);
 assert.match(html,/id="eco-rateio-result" class="eco-rateio-result" hidden/);
 assert.match(js,/if\(!rateioEnabled.checked\)return/);
 assert.match(js,/calculateGroup\(v,\[b\],year,undefined,activeProfile\)/);
 assert.match(js,/g.source.compensated\+u.compensated/);
});

test('dashboard de rateio preserva indicadores individuais, comparativo e detalhes',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('economia-solar.html','utf8'),js=fs.readFileSync('economia-solar.js','utf8');
 const ids=['dashboard','kpi-source','kpi-beneficiary','kpi-combined','kpi-payback','annual','mini-available','mini-percent','mini-allocated','mini-compensated','energy','source','bill','total','ecr','ecr-values'];
 for(const unit of ['source','beneficiary','combined'])for(const field of ['before','after','saving'])ids.push(unit+'-'+field);
 for(const id of ids)assert.equal((html.match(new RegExp('id="eco-rateio-'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/<details><summary>Detalhes técnicos do rateio/);
 assert.match(html,/<details><summary>Premissas e observações regulatórias/);
 assert.match(html,/<details id="eco-rateio-ecr" hidden>/);
 assert.match(js,/\['source',g\.source\],\['beneficiary',u\],\['combined',t\]/);
 assert.match(js,/put\('kpi-payback',payback\(t\.saving\)\)/);
 assert.match(js,/money\(g\.source\.saving\*12\)/);
 assert.match(js,/money\(u\.saving\*12\)/);
 assert.match(js,/dashboard\.hidden=true/);
 assert.match(js,/dashboard\.hidden=false/);
 new (require('node:vm').Script)(js);
});

test('dashboard principal executa com o motor real, troca escopo e conserva fluxo e ECR',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),html=fs.readFileSync('economia-solar.html','utf8'),js=fs.readFileSync('economia-solar.js','utf8'),C=require('../economia-solar-core.js'),E=require('../economia-solar-ecr.js');
 const ids=new Map();
 function el(id=''){return {id,children:[],attrs:{},style:{},dataset:{},hidden:false,disabled:false,value:'',textContent:'',checked:false,classList:{toggle(){}},events:{},setAttribute(k,v){this.attrs[k]=String(v)},removeAttribute(k){delete this.attrs[k]},replaceChildren(...x){this.children=x},append(...x){this.children.push(...x)},addEventListener(k,f){this.events[k]=f},checkValidity(){return true},focus(){}}}
 for(const [,id] of html.matchAll(/id="([^"]+)"/g)){assert.ok(!ids.has(id),id);ids.set(id,el(id));}
 const get=id=>{assert.ok(ids.has(id),'ID ausente '+id);return ids.get(id);};
 const data={consumo:600,geracao:1000,sim:30,gd:2,min:30,cip:40,invest:15000,atual:''};
 const form=get('form');form.elements={atual:{value:''}};form.reset=()=>{};
 for(const [id,value] of Object.entries({'eco-year':'2027','eco-ecr-factor':'52.4','eco-rateio-consumo':'400','eco-rateio-min':'30','eco-rateio-cip':'25','eco-rateio-percent':'50'}))get(id).value=value;
 get('eco-rateio-enabled').checked=true;
 const tabs=['overview','flow','rateio','ecr'].map(id=>get('eco-tab-'+id));
 const scopes=['source','combined'].map(id=>{const b=el();b.dataset.ecoScope=id;return b;});
 const document={getElementById:get,createElement:()=>el(),createElementNS:()=>el(),createTextNode:s=>s,querySelectorAll:s=>s==='[data-eco-scope]'?scopes:tabs};
 class FormData{constructor(){} *[Symbol.iterator](){yield*Object.entries(data);}}
 vm.runInNewContext(js,{document,FormData,location:{hostname:'test'},window:{addEventListener(){}},WWSolarEconomia:C,WWSolarECR:E});
 const source=C.calculate(data,2027),group=C.calculateGroup(data,[{consumo:400,min:30,cip:25,percent:50}],2027),money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 assert.equal(get('saving').textContent,money(source.saving));
 assert.equal(get('eco-dash-bill-label').textContent,'Fatura com energia solar');
 assert.equal(get('eco-dash-content').hidden,false);
 assert.equal(get('eco-dash-flow').children.length,4);
 near(get('eco-dash-flow').children.reduce((sum,x)=>sum+parseFloat(x.style.width),0),100);
 assert.equal(get('eco-dash-payback-legend').children.length,4);
 scopes[1].events.click();assert.equal(get('saving').textContent,money(group.totals.saving));
 assert.equal(get('eco-dash-bill-label').textContent,'Fatura conjunta com solar e rateio');
 assert.equal(get('after').textContent,money(group.totals.after));
 const e=E.estimate({year:2027,gd:2,compensated:group.source.compensated+group.units[0].compensated,profile:C.policy.profiles['2026-11']});
 assert.equal(get('eco-impact-after').textContent,money(E.sensitivity(group.totals,e.ecr,data.invest).annual));
 tabs[2].events.click();assert.equal(get('eco-panel-rateio').hidden,false);
 get('eco-rateio-enabled').checked=false;form.events.input();assert.equal(get('eco-tab-rateio').hidden,true);assert.equal(get('eco-panel-overview').hidden,false);assert.equal(get('saving').textContent,money(source.saving));
 assert.equal(get('eco-dash-bill-label').textContent,'Fatura com energia solar');
 get('eco-year').value='2026';get('eco-year').events.change();assert.equal(get('eco-tab-ecr').hidden,true);
 Object.assign(data,{consumo:0,geracao:0,sim:0,cip:0,invest:0});
 form.events.input();assert.equal(get('after').textContent,money(0));assert.equal(get('saving').textContent,money(0));assert.equal(get('before').textContent,money(0));
 assert.equal(get('eco-kit-link').hidden,true);
 get('eco-rateio-enabled').checked=true;
 for(const id of ['eco-rateio-consumo','eco-rateio-cip','eco-rateio-percent'])get(id).value='0';
 form.events.input();assert.equal(get('eco-rateio-kpi-beneficiary').textContent,money(0));
 scopes[1].events.click();assert.equal(get('after').textContent,money(0));
 Object.assign(data,{consumo:10});
 form.events.input();assert.equal(get('after').textContent,money(C.calculate(data,2026).after));
 assert.equal(get('eco-rateio-beneficiary-after').textContent,money(0));
 assert.ok(C.calculate({...data,consumo:0},2026).after>0,'motor preserva disponibilidade');
 for(const name of ['consumo','geracao','sim','cip','invest'])assert.match(html,new RegExp('name="'+name+'"[^>]*value="0"'));
 for(const id of ['eco-rateio-consumo','eco-rateio-cip','eco-rateio-percent'])assert.match(html,new RegExp('id="'+id+'"[^>]*value="0"'));
});

test('recomendacao por orcamento utiliza apenas kits publicos e geracao real do catalogo',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),C=require('../cliente-core.js');
 const js=fs.readFileSync('economia-solar.js','utf8'),html=fs.readFileSync('economia-solar.html','utf8');
 const start=js.indexOf('function normalizeBudgetKits'),end=js.indexOf('const kitEl=',start);
 assert.ok(start>=0&&end>start);const ctx={C};
 vm.runInNewContext(js.slice(start,end)+'\nthis.normalize=normalizeBudgetKits;this.select=selectBudgetKits;',ctx);
 const row=(id,kwp,price,extra={})=>({id,kind:'kit',active:true,approved:true,price,payload:{potenciaKwp:kwp,custo:1},...extra});
 const rows=ctx.normalize([row('K-1',4,8000),row('K-2',6,12000),row('K-3',8,14000),row('K-4',8,16000),row('K-X',8,1,{approved:false}),row('K-Y',8,2,{active:false}),row('K-Z',8,3,{kind:'piece'})],C);
 assert.equal(rows.length,4);assert.equal(rows[0].generation,512);assert.equal(rows[0].custo,undefined);assert.equal(rows[0].payload,undefined);
 const ids=(target,budget)=>Array.from(ctx.select(rows,target,budget),x=>x.id);
 assert.deepEqual(ids(1000,10000),['K-1','K-2','K-3']);
 assert.deepEqual(ids(1000,15000),['K-3']);
 assert.deepEqual(ids(2000,10000),['K-1','K-3']);
 assert.deepEqual(ids(0,10000),[]);assert.deepEqual(ids(1000,0),[]);
 assert.match(html,/id="eco-tab-kits"/);assert.match(html,/id="eco-panel-kits"/);
 assert.match(js,/wwsolar_public_catalog_v2/);assert.match(js,/body:'\{\}'/);
 assert.match(js,/form\.elements\.geracao\.value=String\(p\.generation\)/);
 assert.doesNotMatch(js,/form\.elements\.invest\.value\s*=/);
});
