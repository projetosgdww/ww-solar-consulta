'use strict';
(function(root){
const origin='https://dadosabertos.aneel.gov.br';
const resources=Object.freeze({components:'e8717aa8-2521-453f-bf16-fbb9a16eea39',flags:'0591b8f6-fe54-437b-b72b-1aa2efd46e42'});
const filters=Object.freeze({SigNomeAgente:'ENEL CE',NumCPFCNPJ:'07047251000170',DscBaseTarifaria:'Tarifa de Aplicação',DscSubGrupoTarifario:'B1',DscModalidadeTarifaria:'Convencional',DscClasseConsumidor:'Residencial',DscSubClasseConsumidor:'Residencial',DscDetalheConsumidor:'Não se aplica',DscUnidade:'R$/MWh'});
function bounds(month){
 if(typeof month!=='string'||!/^2026-(0[1-9]|1[0-2])$/.test(month))throw new RangeError('Consulta online experimental disponível somente para 2026.');
 return [month+'-01',month+'-'+String(new Date(Date.UTC(2026,Number(month.slice(5)),0)).getUTCDate()).padStart(2,'0')];
}
function number(v){
 if(typeof v==='number'&&Number.isFinite(v))return v;
 if(typeof v!=='string'||!/^[-+]?(?:[0-9]+(?:[.,][0-9]+)?|[.,][0-9]+)$/.test(v.trim()))throw new Error('Valor numérico ANEEL inválido');
 return Number(v.trim().replace(',','.'));
}
function summarize(month,components,flags){
 const [start,end]=bounds(month),groups=new Map(),keys={TE:'te',TUSD:'tusd',TUSD_FioB:'fioB'};
 for(const row of components){
  if(!Object.entries(filters).every(([k,v])=>String(row[k])===v))continue;
  if(!Object.hasOwn(keys,row.DscComponenteTarifario))continue;
  const a=String(row.DatInicioVigencia),b=String(row.DatFimVigencia);
  if(!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(a)||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(b)||a>b)throw new Error('Vigência inválida');
  if(a>end||b<start)continue;
  const id=a+'|'+b, p=groups.get(id)??{start:a,end:b,reh:String(row.DscResolucaoHomologatoria??'')};
  const k=keys[row.DscComponenteTarifario],value=number(row.VlrComponenteTarifario)/1000;
  if(value<0||value>10||Object.hasOwn(p,k)&&Math.abs(p[k]-value)>1e-10||p.reh!==String(row.DscResolucaoHomologatoria??''))throw new Error('Componentes conflitantes; revisão necessária');
  p[k]=value;groups.set(id,p);
 }
 const periods=[...groups.values()].sort((a,b)=>a.start.localeCompare(b.start));
 for(const p of periods){if(![p.te,p.tusd,p.fioB].every(Number.isFinite)||p.te<=0||p.tusd<=0||p.fioB>p.tusd)throw new Error('Componentes incompletos ou inconsistentes');}
 const period=periods.length===1&&periods[0].start<=start&&periods[0].end>=end?periods[0]:null;
 const names={'Verde':'verde','Amarela':'amarela','Vermelha P1':'vermelha1','Vermelha P2':'vermelha2'};
 let flag=null;
 for(const row of flags){
  if(String(row.DatCompetencia)!==start)continue;
  if(!Object.hasOwn(names,row.NomBandeiraAcionada))throw new Error('Bandeira não reconhecida');
  const value=number(row.VlrAdicionalBandeira)/1000;
  const next={name:names[row.NomBandeiraAcionada],rate:value};
  if(value<0||value>1||flag&&(flag.name!==next.name||flag.rate!==value))throw new Error('Acionamento conflitante');
  flag=next;
 }
 return {month,period,periods,flag};
}
async function read(resource,filter,fetcher){
 const url=new URL('/api/3/action/datastore_search',origin);
 url.searchParams.set('resource_id',resource);url.searchParams.set('filters',JSON.stringify(filter));url.searchParams.set('limit','500');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetcher(url.toString(),{signal:controller.signal,redirect:'manual',headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('ANEEL HTTP '+response.status);
  let data;try{data=await response.json();}catch{throw new Error('Resposta JSON ANEEL inválida');}
 const r=data?.result;
  if(data.success!==true||!Array.isArray(r?.records)||!Number.isInteger(r.total)||r.total!==r.records.length||r.total>500)throw new Error('Resposta incompleta ou inválida da ANEEL');
  return r.records;
 }finally{clearTimeout(timer);}
}
async function lookup(month,fetcher=(...args)=>fetch(...args)){
 const [start]=bounds(month);
 const tagged=async(source,fn)=>{try{return await fn();}catch(err){const e=new Error(String(err?.message??'Falha de consulta'));e.name=err?.name??'Error';e.source=source;throw e;}};
 const [components,flags]=await Promise.all([tagged('componentes',()=>read(resources.components,filters,fetcher)),tagged('bandeiras',()=>read(resources.flags,{DatCompetencia:start},fetcher))]);
 return tagged('validacao',()=>summarize(month,components,flags));
}
const api=Object.freeze({lookup,summarize,filters,resources});
if(typeof module==='object'&&module.exports)module.exports=api;else root.WWSolarAneel=api;
})(typeof globalThis==='object'?globalThis:this);
