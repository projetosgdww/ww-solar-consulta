/* WW Solar — calculadora de consumo, isolada do carrinho e sem acesso à conta. */
(()=>{
 'use strict';
 const core=window.WWSolarConsumo;
 const $=id=>document.getElementById(id);
 if(!core||!$('ww-consumo-form'))return;
 const form=$('ww-consumo-form'),choice=$('ww-consumo-appliance'),
  watts=$('ww-consumo-watts'),quantity=$('ww-consumo-quantity'),
  hours=$('ww-consumo-hours'),days=$('ww-consumo-days');
 let rows=[],counter=0;
 const field=(id,text)=>{
  const node=document.createElement('span');
  node.className=id;node.textContent=text;return node;
 };
 for(const item of core.appliances){
  const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.label;
  choice.append(opt);
 }
 choice.value='tv';
 function read(){return {watts:watts.value,quantity:quantity.value,hours:hours.value,days:days.value};}
 function validate(){
  const kwh=core.calculate(read());
  $('ww-consumo-current').textContent=kwh===null?'—':core.format(kwh)+' kWh/mês';
  $('ww-consumo-add').disabled=kwh===null||rows.length>=30;
  return kwh;
 }
 function render(){
  const list=$('ww-consumo-list');
  list.replaceChildren();
  rows.forEach(row=>{
   const line=document.createElement('li');line.className='ww-consumo-item';
   const description=document.createElement('div');description.append(field('ww-consumo-item-name',row.label));
   description.append(field('ww-consumo-item-desc',core.format(row.kwh)+' kWh/mês · '+row.quantity+' un.'));
   const remove=document.createElement('button');remove.type='button';remove.className='ww-consumo-remove';
   remove.textContent='Remover';remove.setAttribute('aria-label','Remover '+row.label);
   remove.addEventListener('click',()=>{rows=rows.filter(item=>item.id!==row.id);render();});
   line.append(description,remove);list.append(line);
  });
  const kwh=core.total(rows);
  $('ww-consumo-total').textContent=core.format(kwh)+' kWh/mês';
  $('ww-consumo-count').textContent=rows.length+' '+(rows.length===1?'item':'itens');
  $('ww-consumo-empty').hidden=rows.length!==0;
  $('ww-consumo-results').hidden=rows.length===0;
  $('ww-consumo-copy').disabled=rows.length===0;
  validate();
 }
 choice.addEventListener('change',()=>{
  const item=core.appliances.find(x=>x.id===choice.value);
  watts.value=String(item?.watts||100);validate();
 });
 for(const input of [watts,quantity,hours,days])input.addEventListener('input',validate);
 form.addEventListener('submit',event=>{
  event.preventDefault();const kwh=validate();
  if(kwh===null||rows.length>=30)return;
  const selected=core.appliances.find(x=>x.id===choice.value);
  rows.push({id:++counter,label:selected?.label||'Equipamento',quantity:Number(quantity.value),kwh});
  render();
 });
 $('ww-consumo-clear').addEventListener('click',()=>{rows=[];render();});
 $('ww-consumo-copy').addEventListener('click',async()=>{
  if(!rows.length)return;
  const message=['WW Solar — Estimativa de consumo mensal','',
   ...rows.map(x=>x.label+' ('+x.quantity+' un.): '+core.format(x.kwh)+' kWh/mês'),
   '', 'Total estimado: '+core.format(core.total(rows))+' kWh/mês',
   'Estimativa orientativa. Verifique a etiqueta de consumo e as condições reais de uso.'].join('\n');
  try{
   await navigator.clipboard.writeText(message);
   $('ww-consumo-status').textContent='Resultado copiado.';
  }catch(_){$('ww-consumo-status').textContent='Não foi possível copiar automaticamente.';}
 });
 render();
})();
