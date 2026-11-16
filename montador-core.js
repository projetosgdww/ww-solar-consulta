// WW Solar Montador interno DEV — cálculos puros, sem acesso ao catálogo comercial.
(function(root,factory){
 const module=factory();
 if(typeof exports==='object')Object.assign(exports,module);
 if(root)root.WWSolarMontadorCore=module;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const CENTS_LIMIT=1e12;
 const integer=(v,min,max)=>Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):null;
 function parseBRL(value){
   const n=Number(String(value).trim().replace(',','.'));
   return Number.isFinite(n)&&n>=0&&n<=1e9?Math.round((n+Number.EPSILON)*100):null;
 }
 function extractModuleWp(title){
   const s=String(title||'');
   if(!/m[oó]dulo|modulo|painel/i.test(s))return 0;
   const m=s.match(/\b(\d{3,4})\s*W(?:P)?\b/i);
   return m?integer(Number(m[1]),1,2000)||0:0;
 }
 function extractInverterW(title,category){
   if(!['inversores','microinversores'].includes(category))return 0;
   const s=String(title||'').replace(/(\d),(\d)/g,'$1.$2');
   const x=s.match(/(?:^|[^\d])(\d+(?:\.\d+)?)\s*K\s*W?\b/i);
   return x?integer(Math.round(Number(x[1])*1000),1,200000)||0:0;
 }
 function money(cents){
   return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(cents)||0)/100);
 }
 function normalizedLines(lines){
   if(!Array.isArray(lines)||lines.length>80)return null;
   const seen=new Set();const out=[];
   for(const line of lines){
     if(!line||!/^[-_a-zA-Z0-9]{2,64}$/.test(String(line.sku||''))||seen.has(line.sku))return null;
     const qty=integer(line.qty,1,99);
     const cents=integer(line.unit_cost_cents,1,100000000000);
     const wp=integer(line.module_wp??0,0,2000);
     const watt=integer(line.inverter_w??0,0,200000);
     if(qty===null||cents===null||wp===null||watt===null||typeof line.title!=='string'||line.title.length>250)return null;
     seen.add(line.sku);
     out.push({sku:line.sku,title:line.title,category:String(line.category||'outros'),qty,unit_cost_cents:cents,module_wp:wp,inverter_w:watt});
   }
   return out;
 }
 function calculate(lines,freightCents=0,markupPercent=25){
   const clean=normalizedLines(lines);
   const freight=integer(freightCents,0,CENTS_LIMIT);
   const markup=Number(markupPercent);
   if(!clean||freight===null||!Number.isFinite(markup)||markup<0||markup>300)throw Error('invalid_builder_amount');
   let parts=0,passThrough=0,dcWp=0,acW=0,modules=0,inverters=0;
   for(const row of clean){
     const sub=row.qty*row.unit_cost_cents;
     if(!Number.isSafeInteger(sub)||parts+sub>CENTS_LIMIT)throw Error('amount_out_of_range');
     parts+=sub;
     if(row.category==='stringbox')passThrough+=sub;
     dcWp+=row.qty*row.module_wp;
     acW+=row.qty*row.inverter_w;
     if(row.module_wp>0)modules+=row.qty;
     if(row.inverter_w>0)inverters+=row.qty;
   }
   const base=parts+freight;
   if(!Number.isSafeInteger(base)||base>CENTS_LIMIT)throw Error('amount_out_of_range');
   // String boxes são opcionais e repassadas exatamente ao custo de PDF.
   const markupCents=Math.round((base-passThrough)*markup/100);
   const total=base+markupCents;
   if(!Number.isSafeInteger(total)||total>CENTS_LIMIT)throw Error('amount_out_of_range');
   const dcAcRatio=acW>0?Math.round(dcWp/acW*100)/100:null;
   return {lines:clean,parts_cents:parts,freight_cents:freight,base_cents:base,markup_percent:markup,total_cents:total,
     markup_cents:markupCents,pass_through_cents:passThrough,dc_wp:dcWp,ac_w:acW,modules,inverters,
     monthly_kwh:Math.round(dcWp/1000*128),dc_ac_ratio:dcAcRatio};
 }
 function technicalAlert(calc){
   if(!calc.modules||!calc.inverters)return 'Faltam módulos ou inversores: composição incompleta.';
   if(!calc.dc_ac_ratio)return 'Não foi possível verificar a relação CC/CA.';
   if(calc.dc_ac_ratio>1.5)return 'ATENÇÃO: potência CC alta frente à potência CA (triagem preliminar). Verificar limites do fabricante.';
   if(calc.dc_ac_ratio<0.7)return 'ATENÇÃO: potência CC baixa frente à potência CA (triagem preliminar). Verificar dimensionamento.';
   return 'Triagem CC/CA preliminar: relação '+calc.dc_ac_ratio.toFixed(2)+'. Confirmar strings, tensão, corrente, MPPT, aterramento e instalação com fichas técnicas.';
 }
 return {parseBRL,extractModuleWp,extractInverterW,money,normalizedLines,calculate,technicalAlert};
});
