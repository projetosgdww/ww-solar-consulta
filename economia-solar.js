(() => {
'use strict';
// Preliminary empirical tariff model; not a validated regulatory billing engine.
// Public tariff reference, not a future tariff forecast.
const {calculate,calculateDraft,validateTariffDraft,policy}=globalThis.WWSolarEconomia;
const isDev=location.hostname==='ww-solar-economia-dev.pages.dev';
let activeProfile=null,referenceState=isDev?'loading':'default',revision=null,requestVersion=0;
const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty = n => n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const form = document.getElementById('form');
let centralEcr=null,ecrReferenceState=isDev?'loading':'default',ecrRequestVersion=0;
async function refreshEcr(){
 if(!isDev)return;
 const version=++ecrRequestVersion,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('/api/ecr-ativo-dev',{signal:controller.signal,cache:'no-store',credentials:'omit'}),data=await response.json();
  if(!response.ok||data?.ok!==true||!Number.isSafeInteger(data.revision)||data.revision<0||!Object.hasOwn(data,'profile'))throw Error('invalid_reference');
  const engine=globalThis.WWSolarECR,p=data.profile===null?null:engine.validateStudyDraft({...data.profile,source:'Despacho / referência central de estudo DEV'});
  if(version!==ecrRequestVersion)return;
  centralEcr=p;ecrReferenceState=p?'central':'default';
  document.getElementById('eco-ecr-factor').value=String(Number(((p?.factor??engine.reference.factor)*100).toFixed(12)));
 }catch{if(version!==ecrRequestVersion)return;centralEcr=null;ecrReferenceState='unavailable';document.getElementById('eco-ecr-factor').value=String(Number((globalThis.WWSolarECR.reference.factor*100).toFixed(12)));}
 finally{clearTimeout(timer);if(version===ecrRequestVersion)render();}
}
function renderEcrImpact(base,ecr,investment){
 const impact=globalThis.WWSolarECR.impact(base,ecr,investment);
 const put=(id,text)=>{document.getElementById('eco-impact-'+id).textContent=text;};
 const percent=n=>n===null?'Não calculável':qty(n)+'%';
 put('before',money(impact.annualBefore));put('after',money(impact.annualAfter));
 put('reduction',percent(impact.savingReduction));put('loss',money(impact.annualLoss)+' a menos por ano');
 put('months',impact.paybackMonths===null?'Não calculável':impact.paybackMonths.toLocaleString('pt-BR',{maximumFractionDigits:1})+' meses');
 put('bill',percent(impact.billIncrease));put('payback',percent(impact.paybackIncrease));
 document.getElementById('eco-impact-bar-before').style.width=impact.barBefore+'%';
 document.getElementById('eco-impact-bar-after').style.width=impact.barAfter+'%';
 document.getElementById('eco-ecr-impact').hidden=false;
}
function renderEcr(v,year,r){
 const box=document.getElementById('eco-ecr-study'),out=document.getElementById('eco-ecr-details'),status=document.getElementById('eco-ecr-status'),field=document.getElementById('eco-ecr-factor');
 document.getElementById('eco-ecr-impact').hidden=true;
 box.hidden=year<2027;out.replaceChildren();document.getElementById('eco-ecr-comparison').replaceChildren();status.textContent='';
 if(box.hidden)return;
 field.disabled=year!==2027||v.gd!==2;
 if(!field.disabled&&(field.value===''||!field.checkValidity())){status.textContent='Informe um fator entre 0 e 100%.';return;}
 try{
  const engine=globalThis.WWSolarECR,profile=activeProfile??policy.profiles[policy.reference];
  const result=engine.estimate({year,gd:v.gd,compensated:r.compensated,profile},{...engine.reference,...centralEcr,factor:Number(field.value)/100});
  if(result.status!=='provisional'){status.textContent=result.reason;return;}
  status.textContent='Projeção DEV — não homologada para faturamento. Energia compensada do modelo base: '+qty(result.compensated)+' kWh. '+(ecrReferenceState==='central'?'Referência central de estudo; situação declarada: '+centralEcr.regulatoryStatus+'.':ecrReferenceState==='unavailable'?'Banco ECR indisponível; usando referência de contingência.':ecrReferenceState==='loading'?'Consultando referência central.':'Referência de estudo padrão.')+' Fator editável apenas nesta simulação.';
  for(const [label,value] of [['Tarifa SCEE',result.scee.toLocaleString('pt-BR',{minimumFractionDigits:5,maximumFractionDigits:5})+' R$/kWh'],['Fio B de 2027 sem tributos',money(result.wire)],['Benefício bruto estimado CDE',money(result.benefit)],['Fator ECR de estudo',qty(result.factor*100)+'%'],['ECR adicional estimado (sem tributos)',money(result.ecr)],['Benefício restante CDE',money(result.remainingBenefit)],['Fio B + ECR (sem tributos)',money(result.combined)],['ECR anual isolado',money(result.ecr*12)]]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;out.append(dt,dd);
  }
  const comparison=engine.sensitivity(r,result.ecr,v.invest);
  const extra=document.getElementById('eco-ecr-comparison');extra.replaceChildren();
  for(const [label,value] of [['Fatura base sem ECR',money(r.after)],['Fatura ilustrativa com ECR sem tributos adicionais',money(comparison.after)],['Economia mensal sem ECR',money(r.saving)],['Economia mensal ilustrativa com ECR',money(comparison.saving)],['Economia anual ilustrativa com ECR',money(comparison.annual)],['Payback ilustrativo com ECR',comparison.payback===null?'Não calculado':qty(comparison.payback)+' anos']]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;extra.append(dt,dd);
  }
  renderEcrImpact(r,result.ecr,v.invest);
 }catch{document.getElementById('eco-ecr-impact').hidden=true;status.textContent='Cenário ECR indisponível; confira os parâmetros.';}
}
const rateioEnabled=document.getElementById('eco-rateio-enabled');
const rateioFields=document.getElementById('eco-rateio-fields');
const rateioResult=document.getElementById('eco-rateio-result');
function fillRateio(id,rows){
 const dl=document.getElementById(id);dl.replaceChildren();
 for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
}
function renderRateio(v,year){
 rateioResult.hidden=true;
 const ecrBox=document.getElementById('eco-rateio-ecr');ecrBox.hidden=true;
 if(!rateioEnabled.checked)return;
 let group=null;
 const status=document.getElementById('eco-rateio-status'),dashboard=document.getElementById('eco-rateio-dashboard');dashboard.hidden=true;
 for(const id of ['eco-rateio-energy','eco-rateio-source','eco-rateio-bill','eco-rateio-total','eco-rateio-ecr-values'])fillRateio(id,[]);
 try{
  const num=id=>Number(document.getElementById(id).value);
  const b={consumo:num('eco-rateio-consumo'),min:num('eco-rateio-min'),cip:num('eco-rateio-cip'),percent:num('eco-rateio-percent')};
  const g=globalThis.WWSolarEconomia.calculateGroup(v,[b],year,undefined,activeProfile);
  if(!g)throw Error('Referência indisponível');
  const u=g.units[0],allocated=g.distribution.allocations[0],t=g.totals;
  const kwh=n=>qty(n)+' kWh',payback=s=>v.invest>0&&s>0?qty(v.invest/(12*s))+' anos':'Não calculado';
  status.textContent=g.available>0?'Excedente líquido disponível para distribuição neste ciclo.':'Não há excedente líquido para rateio neste ciclo.';
  const put=(id,value,negative=false)=>{const el=document.getElementById('eco-rateio-'+id);el.textContent=value;el.classList.toggle('rateio-negative',negative);};
  for(const [id,r] of [['source',g.source],['beneficiary',u],['combined',t]]){
   put('kpi-'+id,money(r.saving),r.saving<0);
   for(const key of ['before','after','saving'])put(id+'-'+key,money(r[key]),key==='saving'&&r[key]<0);
  }
  put('kpi-payback',payback(t.saving));put('annual',money(t.saving*12),t.saving<0);
  put('mini-available',kwh(g.available));put('mini-percent',qty(b.percent)+'%');put('mini-allocated',kwh(allocated));put('mini-compensated',kwh(u.usedReceived));
  fillRateio('eco-rateio-source',[
   ['Fatura estimada sem energia solar',money(g.source.before)],['Fatura estimada com energia solar',money(g.source.after)],['Economia mensal na geradora',money(g.source.saving)],['Economia anual na geradora',money(g.source.saving*12)],['Fio B sem tributos (incluído no residual)',money(g.source.wire)]
  ]);
  fillRateio('eco-rateio-energy',[
   ['Excedente líquido disponível na geradora',kwh(g.available)],['Percentual destinado',qty(b.percent)+'%'],['Energia destinada à beneficiária',kwh(allocated)],['Energia efetivamente compensada na beneficiária',kwh(u.usedReceived)],['Créditos não utilizados na beneficiária',kwh(u.remainingReceived)],['Excedente líquido não destinado',kwh(g.distribution.remaining)],['Saldo estimado na geradora após rateio',kwh(g.sourceRemaining)],['Consumo não compensado da beneficiária',kwh(u.uncredited)]
  ]);
  fillRateio('eco-rateio-bill',[
   ['Fatura estimada sem rateio',money(u.before)],['Fatura estimada com rateio',money(u.after)],['Economia mensal na beneficiária',money(u.saving)],['Economia anual na beneficiária',money(u.saving*12)],['Fio B sem tributos (incluído no residual)',money(u.wire)]
  ]);
  fillRateio('eco-rateio-total',[
   ['Fatura conjunta sem energia solar',money(t.before)],['Fatura conjunta com energia solar',money(t.after)],['Economia mensal conjunta',money(t.saving)],['Economia anual conjunta',money(t.saving*12)],['Payback conjunto (economia constante)',payback(t.saving)]
  ]);
  dashboard.hidden=false;group=g;
  const field=document.getElementById('eco-ecr-factor'),engine=globalThis.WWSolarECR;
  if(year===2027&&v.gd===2&&field.value!==''&&field.checkValidity()){
   const profile=activeProfile??policy.profiles[policy.reference];
   const scenario={...engine.reference,...centralEcr,factor:Number(field.value)/100};
   const e=engine.estimate({year,gd:v.gd,compensated:g.source.compensated+u.compensated,profile},scenario);
   if(e.status==='provisional'){
    const c=engine.sensitivity(t,e.ecr,v.invest);
    fillRateio('eco-rateio-ecr-values',[
     ['ECR adicional conjunto sem tributos',money(e.ecr)],['Fatura conjunta ilustrativa com ECR',money(c.after)],['Economia mensal conjunta ilustrativa',money(c.saving)],['Economia anual conjunta ilustrativa',money(c.annual)],['Payback conjunto ilustrativo',c.payback===null?'Não calculado':qty(c.payback)+' anos']
    ]);ecrBox.hidden=false;
   }
  }
  rateioResult.hidden=false;
 }catch{if(dashboard.hidden)status.textContent='Rateio indisponível; confira os parâmetros.';else status.textContent+=' Projeção ECR indisponível.';rateioResult.hidden=false;}
 return group;
}

const byId=id=>document.getElementById(id);
const colors={before:'#85938e',solar:'#196541',rateio:'#416f0c',ecr:'#d97000',direct:'#c33700',balance:'#52635f'};
let dashScope='source',dashTab='overview',lastDashboard=null;
const setText=(id,value)=>{byId(id).textContent=value;};
function openTab(tab,focus=false){
 if(!byId('eco-tab-'+tab)||byId('eco-tab-'+tab).hidden)tab='overview';
 dashTab=tab;
 for(const key of ['overview','flow','rateio','ecr']){
  const b=byId('eco-tab-'+key),active=key===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;byId('eco-panel-'+key).hidden=!active;
 }
 if(focus)byId('eco-tab-'+tab).focus();
}
const ns='http://www.w3.org/2000/svg';
function svgNode(name,attrs={},text){const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;}
function svgChart(id,w,h,label){const svg=svgNode('svg',{viewBox:'0 0 '+w+' '+h,role:'img','aria-label':label});byId(id).replaceChildren(svg);return svg;}
function chartText(svg,x,y,label,attrs={}){svg.append(svgNode('text',{x,y,fill:'#52635f','font-size':11,...attrs},label));}
function legend(id,items){const el=byId(id);el.replaceChildren();for(const item of items){const span=document.createElement('span'),i=document.createElement('i');i.style.backgroundColor=item.color;span.append(i,document.createTextNode(item.label));el.append(span);}}
function barPairs(id,groups,label){
 const max=Math.max(1,...groups.flatMap(g=>[g.before,g.after])),step=99;
 const svg=svgChart(id,480,groups.length*step+12,label+'; '+groups.map(g=>g.label+': antes '+money(g.before)+', depois '+money(g.after)).join('; '));
 for(const [i,g] of groups.entries()){
  const top=i*step+12;chartText(svg,8,top,g.label,{'font-size':12,'font-weight':700,fill:'#172123'});
  for(const [j,value] of [g.before,g.after].entries()){
   const y=top+9+j*29;chartText(svg,8,y+12,j?'Depois':'Antes',{'font-size':10});
   svg.append(svgNode('rect',{x:62,y,width:275,height:16,rx:4,fill:'#e5ebe5'}),svgNode('rect',{x:62,y,width:275*Math.max(0,value)/max,height:16,rx:4,fill:j?colors.solar:colors.before}));
   chartText(svg,472,y+12,money(value),{'text-anchor':'end','font-weight':700,fill:'#172123'});
  }
 }
}

function verticalBills(id,groups,components=null,withRateio=false){
 const max=Math.max(1,...groups.flatMap(g=>[g.before,g.after])),w=480,h=250,base=194,top=22;
 const svg=svgChart(id,w,h,'Faturas antes e depois: '+groups.map(g=>g.label+' antes '+money(g.before)+', depois '+money(g.after)).join('; ')),y=n=>base-Math.max(0,n)/max*(base-top);
 for(let i=0;i<=4;i++){const n=max*i/4,yy=y(n);svg.append(svgNode('line',{x1:65,x2:470,y1:yy,y2:yy,stroke:'#dce5da'}));chartText(svg,60,yy+4,qty(n),{'text-anchor':'end','font-size':10});}
 const slot=390/groups.length,bw=Math.min(66,slot*.34);
 for(const [i,g] of groups.entries()){
  const center=70+slot*(i+.5),left=center-bw-(groups.length===1?22:4),right=center+(groups.length===1?22:4);
  svg.append(svgNode('rect',{x:left,y:y(g.before),width:bw,height:Math.max(0,base-y(g.before)),rx:4,fill:colors.before}));
  if(components&&groups.length===1&&components.every(p=>p.value>=0)){
   let subtotal=0;for(const p of components){const yy=y(subtotal+p.value);svg.append(svgNode('rect',{x:right,y:yy,width:bw,height:Math.max(0,y(subtotal)-yy),fill:p.color}));subtotal+=p.value;}
  }else svg.append(svgNode('rect',{x:right,y:y(g.after),width:bw,height:Math.max(0,base-y(g.after)),rx:4,fill:colors.solar}));
  chartText(svg,left+bw/2,Math.max(12,y(g.before)-5),money(g.before),{'text-anchor':'middle','font-size':groups.length===1?11:9,'font-weight':700,fill:'#172123'});
  chartText(svg,right+bw/2,Math.max(12,y(g.after)-5),money(g.after),{'text-anchor':'middle','font-size':groups.length===1?11:9,'font-weight':700,fill:'#172123'});
  if(groups.length===1){chartText(svg,left+bw/2,base+17,'Sem solar',{'text-anchor':'middle'});chartText(svg,right+bw/2,base+17,withRateio?'Solar + rateio':'Com solar',{'text-anchor':'middle','font-size':10});}
  else chartText(svg,center,base+17,g.label,{'text-anchor':'middle','font-size':10,'font-weight':700});
 }
 if(groups.length>1){svg.append(svgNode('rect',{x:126,y:230,width:10,height:10,fill:colors.before,rx:2}),svgNode('rect',{x:256,y:230,width:10,height:10,fill:colors.solar,rx:2}));chartText(svg,141,239,'Antes');chartText(svg,271,239,'Depois');}
}
function estimateEcr(v,year,compensated){
 const field=byId('eco-ecr-factor'),E=globalThis.WWSolarECR;
 if(year!==2027||v.gd!==2||field.value===''||!field.checkValidity())return null;
 try{const e=E.estimate({year,gd:v.gd,compensated,profile:activeProfile??policy.profiles[policy.reference]},{...E.reference,...centralEcr,factor:Number(field.value)/100});return e.status==='provisional'?e:null;}catch{return null;}
}
function paybackLabel(s,invest){return invest>0&&s>0?qty(invest/(12*s))+' anos':'Não calculado';}
function drawPayback(v,year,r,g){
 const lines=[{name:'Geradora',saving:r.saving,color:colors.solar,dash:false}];
 if(g)lines.push({name:'Com rateio',saving:g.totals.saving,color:colors.rateio,dash:false});
 const a=estimateEcr(v,year,r.compensated),E=globalThis.WWSolarECR;
 if(a)lines.push({name:'Geradora + ECR',saving:E.sensitivity(r,a.ecr,v.invest).saving,color:colors.ecr,dash:true});
 if(g){const e=estimateEcr(v,year,r.compensated+g.units[0].compensated);if(e)lines.push({name:'Rateio + ECR',saving:E.sensitivity(g.totals,e.ecr,v.invest).saving,color:colors.balance,dash:true});}
 const points=lines.flatMap(l=>[0,5].map(a=>-v.invest+l.saving*12*a)),min=Math.min(0,...points),max=Math.max(0,...points),span=Math.max(1,max-min),x=a=>78+a*76,y=a=>178-(a-min)/span*153;
 const svg=svgChart('eco-dash-payback',480,218,'Saldo acumulado estimado, cinco anos; '+lines.map(l=>l.name+' '+paybackLabel(l.saving,v.invest)).join('; '));
 for(let i=0;i<=4;i++){const n=min+span*i/4,yy=y(n);svg.append(svgNode('line',{x1:78,x2:458,y1:yy,y2:yy,stroke:'#dce5da'}));chartText(svg,72,yy+4,qty(n/1000)+' mil',{'text-anchor':'end','font-size':10});}
 svg.append(svgNode('line',{x1:78,x2:458,y1:y(0),y2:y(0),stroke:'#52635f','stroke-dasharray':'4 4'}));
 for(let a=0;a<=5;a++)chartText(svg,x(a),198,'Ano '+a,{'text-anchor':'middle','font-size':10});
 for(const l of lines){const vals=Array.from({length:6},(_,a)=>[x(a),y(-v.invest+l.saving*12*a)]);svg.append(svgNode('polyline',{points:vals.map(p=>p.join(',')).join(' '),fill:'none',stroke:l.color,'stroke-width':2.8,'stroke-dasharray':l.dash?'6 4':'none'}));for(const [cx,cy] of vals)svg.append(svgNode('circle',{cx,cy,r:2.7,fill:l.color}));}
 legend('eco-dash-payback-legend',lines.map(l=>({label:l.name+(l.dash?' (provisório)':'')+': '+paybackLabel(l.saving,v.invest),color:l.color})));
}
function drawFlow(v,r,g){
 const u=g?.units[0],allocated=g?.distribution.allocations[0]??0,total=v.geracao;
 const parts=[{label:'Autoconsumo direto',n:r.self,color:colors.direct},{label:'Compensado na geradora',n:r.usedOwn,color:colors.solar},...(g?[{label:'Destinado à beneficiária',n:allocated,color:colors.rateio}]:[]),{label:'Saldo na geradora',n:Math.max(0,r.excess-allocated),color:colors.balance}];
 const bar=byId('eco-dash-flow'),leg=byId('eco-dash-flow-legend');bar.replaceChildren();leg.replaceChildren();bar.setAttribute('role','img');bar.setAttribute('aria-label','Geração '+qty(total)+' kWh: '+parts.map(p=>p.label+' '+qty(p.n)+' kWh').join('; '));
 for(const p of parts){const pct=total>0?p.n/total*100:0;
  if(p.n>0){const seg=document.createElement('span');seg.style.width=pct+'%';seg.style.backgroundColor=p.color;seg.textContent=pct>=16?qty(p.n)+' kWh':'';bar.append(seg);}
  const d=document.createElement('div'),small=document.createElement('small'),i=document.createElement('i'),strong=document.createElement('strong'),foot=document.createElement('small');i.style.backgroundColor=p.color;small.append(i,document.createTextNode(p.label));strong.textContent=qty(p.n)+' kWh';foot.textContent=qty(pct)+'% da geração';d.append(small,strong,foot);leg.append(d);
 }
 fillRateio('eco-dash-balance',[['Geração mensal',qty(total)+' kWh'],['Consumo da rede',qty(r.grid)+' kWh'],['Energia injetada',qty(r.injected)+' kWh'],['Energia não compensada na geradora',qty(r.uncredited)+' kWh'],['Excedente líquido disponível para rateio',qty(Math.min(r.excess,Math.max(0,r.injected-r.grid)))+' kWh'],['Potência de referência',qty(v.geracao/132)+' kWp'],...(u?[['Compensado na beneficiária (do destinado)',qty(u.usedReceived)+' kWh'],['Créditos não utilizados na beneficiária (do destinado)',qty(u.remainingReceived)+' kWh']]:[])]);
}
function dashboard(v,year,r,g){
 lastDashboard={v,year,r,g};if(!g)dashScope='source';
 byId('eco-dash-scope').hidden=!g;byId('eco-tab-rateio').hidden=!g;byId('eco-tab-ecr').hidden=year<2027;
 document.querySelectorAll('[data-eco-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ecoScope===dashScope)));openTab(dashTab);
 const combined=dashScope==='combined'&&g,base=combined?{...g.totals,compensated:r.compensated+g.units[0].compensated}:r,caption=combined?'Consolidado — duas unidades':'Unidade geradora';
 setText('eco-dash-bill-label',combined?'Fatura conjunta com solar e rateio':'Fatura com energia solar');
 setText('eco-dash-year','('+year+')');setText('before',money(base.before));setText('after',money(base.after));setText('saving',money(base.saving));setText('eco-dash-before','Antes: '+money(base.before)+(base.before>0?' · Redução '+qty(base.saving/base.before*100)+'%':''));
 setText('eco-dash-saving-sub',caption);setText('eco-dash-annual',money(base.saving*12));setText('eco-dash-annual-sub','12 meses · '+caption);setText('eco-dash-payback-value',paybackLabel(base.saving,v.invest));setText('eco-dash-payback-sub','Investimento '+money(v.invest));
 for(const id of ['saving','eco-dash-annual'])byId(id).classList.toggle('dash-negative',base.saving<0);
 const cip=v.cip+(combined?Number(byId('eco-rateio-cip').value):0),wire=r.wire+(combined?g.units[0].wire:0);
 verticalBills('eco-dash-bill',[{label:caption,before:base.before,after:base.after}],[{value:cip,color:'#52635f'},{value:wire,color:'#d97000'},{value:Math.max(0,base.after-cip-wire),color:'#196541'}],Boolean(combined));
 fillRateio('eco-dash-composition',[['Iluminação pública',money(cip)],['Fio B sem tributos (dentro da fatura)',money(wire)],['Demais custos estimados',money(base.after-cip-wire)],['Total da fatura estimada',money(base.after)]]);
 drawPayback(v,year,r,g);drawFlow(v,r,g);
 if(g)verticalBills('eco-dash-rateio-chart',[{label:'Geradora',...g.source},{label:'Beneficiária',...g.units[0]},{label:'Conjunto',...g.totals}]);
 setText('eco-ecr-scope',caption);renderEcr(v,year,base);
 const e=estimateEcr(v,year,base.compensated);
 if(e){const c=globalThis.WWSolarECR.sensitivity(base,e.ecr,v.invest);barPairs('eco-ecr-bill-chart',[{label:'Fatura mensal — sem / com ECR',before:base.after,after:c.after}],'Impacto provisório na fatura mensal');}else byId('eco-ecr-bill-chart').replaceChildren();
 const range=byId('eco-ecr-range'),field=byId('eco-ecr-factor');range.disabled=year!==2027||v.gd!==2;range.value=field.value;
}

function render(){
 lastDashboard=null;byId('eco-dash-content').hidden=true;byId('eco-dash-invalid').hidden=false;
 rateioFields.hidden=!rateioEnabled.checked;rateioFields.disabled=!rateioEnabled.checked;rateioResult.hidden=true;
 if(!form.checkValidity()){document.getElementById('eco-ecr-study').hidden=true;return;}
 const v=Object.fromEntries([...new FormData(form)].map(([k,x])=>[k,Number(x)]));
 if(Object.values(v).some(n=>!Number.isFinite(n)||n<0)){document.getElementById('eco-ecr-study').hidden=true;return;}
 const year=Number(document.getElementById('eco-year').value);
 const r=activeProfile?calculateDraft(v,activeProfile,year):calculate(v,year);
 if(!r)return;
 const ref=activeProfile?.reference??policy.reference;
 const month=ref.slice(5)+'/'+ref.slice(0,4);
 const messages={loading:'Consultando referência central; cálculo provisório.',central:'Tarifa aprovada no banco DEV · revisão '+revision+'.',default:'Referência padrão do código.',unavailable:'Banco indisponível: referência padrão do código; confirme antes de usar.'};
 document.getElementById('eco-year-note').textContent='Fio B: '+qty(r.incidence*100)+'% · Referência '+month+' mantida constante; valores estimados. '+(year>=2027?'Cenário com tributos históricos de 2026, sem adequação à CBS/IBS e sem ECR na fatura principal. ':'')+messages[referenceState];
 for(const k of ['before','after','saving']) document.getElementById(k).textContent=money(r[k]);
 const rows=[['Economia anual (12 meses)',money(r.saving*12)],['Redução estimada',qty(r.before>0?r.saving/r.before*100:0)+'%'],['Autoconsumo',qty(r.self)+' kWh'],['Consumo da rede',qty(r.grid)+' kWh'],['Energia injetada',qty(r.injected)+' kWh'],['Compensação estimada',qty(r.compensated)+' kWh'],['Energia não compensada',qty(r.uncredited)+' kWh'],['Excedente não utilizado',qty(r.excess)+' kWh'],['Fio B estimado sem tributos (incluído no residual)',money(r.wire)],['Energia não compensada com tributos',money(r.nonCompensatedCost)],['Adicional de bandeira após instalação (estimado)',money(r.flagAfter)],['Iluminação pública',money(v.cip)],['Custo da energia compensada (Fio B e diferenças tributárias)',money(r.residual)],['Ajuste mínimo aproximado',money(r.floorAdjustment)],['Payback simples (economia constante)',v.invest>0&&r.saving>0?qty(v.invest/(12*r.saving))+' anos':'Não calculado']];
 if(form.elements.atual.value!=='')rows.push(['Fatura atual informada (não usada no cálculo)',money(v.atual)]);
 const dl=document.getElementById('details');dl.replaceChildren();
 for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
 const g=renderRateio(v,year);
 dashboard(v,year,r,g);
 byId('eco-dash-content').hidden=false;byId('eco-dash-invalid').hidden=true;
 document.getElementById('kit').textContent='Potência de referência: '+qty(v.geracao/132)+' kWp (produtividade hipotética de 132 kWh/kWp/mês).';
}
async function refreshReference(){
 if(!isDev)return;
 const version=++requestVersion,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('/api/tarifa-ativa-dev',{signal:controller.signal,cache:'no-store',credentials:'omit'});
  const data=await response.json();
  if(!response.ok||data?.ok!==true||!Number.isSafeInteger(data.revision)||data.revision<0||!Object.hasOwn(data,'profile'))throw Error('invalid_reference');
  const p=data.profile===null?null:validateTariffDraft({...data.profile,source:'Referência central DEV'});
  if(version!==requestVersion)return;
  activeProfile=p;revision=data.revision;referenceState=p?'central':'default';
 }catch{if(version!==requestVersion)return;activeProfile=null;revision=null;referenceState='unavailable';}
 finally{clearTimeout(timer);if(version===requestVersion)render();}
}
document.getElementById('eco-ecr-factor').addEventListener('input',render);
byId('eco-ecr-range').addEventListener('input',()=>{byId('eco-ecr-factor').value=byId('eco-ecr-range').value;render();});
document.querySelectorAll('[data-eco-scope]').forEach(b=>b.addEventListener('click',()=>{dashScope=b.dataset.ecoScope;if(lastDashboard){const {v,year,r,g}=lastDashboard;dashboard(v,year,r,g);}}));
document.querySelectorAll('[role="tab"]').forEach(b=>{b.addEventListener('click',()=>openTab(b.id.replace('eco-tab-','')));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('[role="tab"]')].filter(t=>!t.hidden),i=tabs.indexOf(b),n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;openTab(tabs[n].id.replace('eco-tab-',''),true);});});
byId('eco-reset').addEventListener('click',()=>{form.reset();byId('eco-year').selectedIndex=0;byId('eco-ecr-factor').value=String(Number(((centralEcr?.factor??globalThis.WWSolarECR.reference.factor)*100).toFixed(12)));dashScope='source';dashTab='overview';render();});
form.addEventListener('submit',e=>{e.preventDefault();render();void refreshReference();});form.addEventListener('input',render);document.getElementById('eco-year').addEventListener('change',render);render();void refreshReference();void refreshEcr();window.addEventListener('pageshow',e=>{if(e.persisted){void refreshReference();void refreshEcr();}});
})();