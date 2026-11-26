'use strict';
(function(root){
const core=typeof module==='object'&&module.exports?require('./economia-solar-core.js'):root.WWSolarEconomia;
const key='wwsolar.tariff.sandbox.v1';
const host='ww-solar-economia-dev.pages.dev';
function allowed(h){return h===host;}
function empty(){return {version:1,active:null,versions:[],events:[]};}
function read(storage){
 const raw=storage.getItem(key);if(raw===null)return empty();
 const s=JSON.parse(raw);
 if(!s||s.version!==1||!Array.isArray(s.versions)||!Array.isArray(s.events)||s.versions.length>200||s.events.length>1000)throw Error('Histórico local inválido');
 const ids=new Set();
 for(const x of s.versions){if(typeof x.id!=='string'||ids.has(x.id)||!['salvo','aprovado'].includes(x.state))throw Error('Versão inválida');ids.add(x.id);core.validateTariffDraft(x.draft);}
 if(s.active!==null&&!s.versions.some(x=>x.id===s.active&&x.state==='aprovado'))throw Error('Referência local inválida');
 return s;
}
function change(storage,action,{draft,id,expected,now=new Date().toISOString(),newId}={}){
 const s=read(storage);
 if(!['save','approve','activate','restoreDefault'].includes(action))throw Error('Ação inválida');
 if(s.events.length>=1000)throw Error('Limite de histórico local atingido');
 if(action==='save'){
  if(s.versions.length>=200||typeof newId!=='string'||!newId||s.versions.some(x=>x.id===newId))throw Error('Limite ou identificador inválido');
  const d=core.validateTariffDraft(draft);
  id=newId;s.versions.push({id,state:'salvo',draft:d,createdAt:now});
 }else if(action==='restoreDefault'){
  if(s.active!==expected)throw Error('Referência local mudou; atualize a página');
  id=null;
 }else{
  const x=s.versions.find(v=>v.id===id);if(!x)throw Error('Versão inexistente');
  if(action==='approve'){if(x.state!=='salvo')throw Error('Versão já revisada');x.state='aprovado';x.approvedAt=now;}
  if(action==='activate'&&(x.state!=='aprovado'||s.active!==expected||s.active===id))throw Error('Aprovação ou referência local inválida');
 }
 const previous=s.active;
 if(action==='activate'||action==='restoreDefault')s.active=id;
 s.events.push({action,id,previous,active:s.active,at:now});
 storage.setItem(key,JSON.stringify(s));return s;
}
const api=Object.freeze({key,allowed,read,change});
if(typeof module==='object'&&module.exports)module.exports=api;else root.WWSolarTariffSandbox=api;
})(typeof globalThis==='object'?globalThis:this);
