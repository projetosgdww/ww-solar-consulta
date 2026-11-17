// WW Solar — composição privada de kits. Cálculos locais sem gravações.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WWSolarAdminComposition=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const labels=Object.freeze({
  modulos:'Módulos',inversores:'Inversores',microinversores:'Microinversores',
  estruturas:'Estruturas e trilhos',cabos:'Cabos',componentes:'Componentes elétricos',
  stringbox:'String boxes',outros:'Outros'
 });
 const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents)/100);
 const asQuantity=value=>{
  const qty=Number(value);
  return Number.isSafeInteger(qty)&&qty>=1&&qty<=999?qty:0;
 };
 function normalizeCatalog(items){
  const seen=new Set();
  return (Array.isArray(items)?items:[]).flatMap(row=>{
   const sku=String(row?.sku||'').trim();
   const unitCostCents=Number(row?.unit_cost_cents);
   if(!/^[A-Za-z0-9_-]{2,64}$/.test(sku)||seen.has(sku)
      ||!Number.isSafeInteger(unitCostCents)||unitCostCents<=0
      ||unitCostCents>100000000000)return [];
   const title=String(row?.title||'').trim();
   if(title.length<3||title.length>250)return [];
   seen.add(sku);
   return [{sku,title,category:labels[row?.category]||'Outros',categoryId:row?.category,
    unitCostCents,sourceDate:row?.source_date||null,
    moduleWp:Number.isFinite(Number(row?.module_wp))?Number(row.module_wp):0}];
  }).sort((a,b)=>a.category.localeCompare(b.category,'pt-BR')
    ||a.title.localeCompare(b.title,'pt-BR')||a.sku.localeCompare(b.sku));
 }
 function composeRows(lines,catalog){
  const bySku=new Map((Array.isArray(catalog)?catalog:[]).map(row=>[row.sku,row]));
  const selected=(Array.isArray(lines)?lines:[]).slice(0,80);
  let totalCents=0,panels=0,powerWp=0;
  const rows=selected.map(line=>{
   const sku=String(line?.sku||'');
   const product=bySku.get(sku);
   const quantity=asQuantity(line?.quantity);
   if(!sku||!product||!quantity)
      return {sku,quantity:quantity||0,product:product||null,subtotalCents:0};
   const subtotalCents=product.unitCostCents*quantity;
   if(!Number.isSafeInteger(subtotalCents)||!Number.isSafeInteger(totalCents+subtotalCents))
     throw Error('Total fora do limite de cálculo');
   totalCents+=subtotalCents;
   if(product.categoryId==='modulos'&&product.moduleWp>0){
     panels+=quantity;powerWp+=product.moduleWp*quantity;
   }
   return {sku,quantity,product,subtotalCents};
  });
  return {rows,totalCents,panels,powerWp};
 }
 function summary(rows,catalog){
  const calc=composeRows(rows,catalog);
  if(!calc.rows.some(row=>row.product&&row.quantity))return '';
  const parts=['WW Solar — Composição interna de kit',''];
  calc.rows.forEach(row=>{
   if(!row.product||!row.quantity)return;
   parts.push(row.quantity+' × '+row.product.title+' ['+row.product.sku+'] — '
      +money(row.product.unitCostCents)+' cada · '+money(row.subtotalCents));
  });
  parts.push('', 'Custo total das peças: '+money(calc.totalCents));
  if(calc.panels)parts.push('Potência dos módulos: '+(calc.powerWp/1000).toLocaleString('pt-BR',{maximumFractionDigits:3})+' kWp');
  parts.push('Composição interna para revisão. Não publicada. Preços e compatibilidade sujeitos à conferência.');
  return parts.join('\n');
 }
 return Object.freeze({labels,money,asQuantity,normalizeCatalog,composeRows,summary});
});
