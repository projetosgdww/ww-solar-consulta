/* WW Solar — consumo V2, público, sem persistir dados ou acessar pedidos. */
(()=>{
 'use strict';
 const core=window.WWSolarConsumo;
 const $=id=>document.getElementById(id);
 if(!core||!$('ww-consumo-form'))return;
 const form=$('ww-consumo-form'),choice=$('ww-consumo-appliance'),
  watts=$('ww-consumo-watts'),quantity=$('ww-consumo-quantity'),
  hours=$('ww-consumo-hours'),days=$('ww-consumo-days'),
  monthly=$('ww-consumo-monthly'),details=$('ww-consumo-manual'),
  monthlyRow=$('ww-consumo-monthly-row'),timeRows=$('ww-consumo-time-rows'),
  source=$('ww-consumo-source'),warning=$('ww-consumo-warning');
 let rows=[],counter=0;
 const field=(cls,text)=>{const node=document.createElement('span');node.className=cls;node.textContent=text;return node;};
 const current=()=>core.appliances.find(x=>x.id===choice.value)||core.appliances[0];
 for(const item of core.appliances){
  const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.label;choice.append(opt);
 }
 function read(){
  const item=current();
  return item.mode==='monthly'
   ?core.calculateMonthly({monthlyKwh:monthly.value,quantity:quantity.value})
   :core.calculate({watts:watts.value,quantity:quantity.value,hours:hours.value,days:days.value});
 }
 function validate(){
  const kwh=read();
  $('ww-consumo-current').textContent=kwh===null?'—':core.format(kwh)+' kWh/mês';
  $('ww-consumo-add').disabled=kwh===null||rows.length>=30;
  return kwh;
 }
 function selectItem(){
  const item=current(),isMonthly=item.mode==='monthly';
  monthlyRow.hidden=!isMonthly;timeRows.hidden=isMonthly;
  $('ww-consumo-manual-label').textContent=isMonthly?'Alterar consumo da etiqueta (kWh/mês)':'Alterar potência do meu aparelho (W)';
  $('ww-consumo-watts-row').hidden=isMonthly;
  $('ww-consumo-note').textContent=isMonthly
   ?'Para este aparelho, usamos referência de consumo mensal, não potência constante × 24 horas. Se souber o kWh/mês da etiqueta do seu modelo, informe em “Alterar consumo”.'
   :item.variable
    ?'Ar-condicionado varia com temperatura e modelo (especialmente inverter). A potência histórica é só ponto de partida; confira a etiqueta de eficiência.'
    :'Referência aproximada. Consulte o manual ou a etiqueta do seu aparelho para maior precisão.';
  details.open=false;
  watts.value=String(item.watts||100);monthly.value=String(item.monthlyKwh||30);
  source.textContent=item.source;
  warning.hidden=!item.variable;
  warning.textContent=isMonthly?'Geladeira, freezer e frigobar ligam o compressor em ciclos. Use preferencialmente o consumo mensal da etiqueta do seu modelo.':'Ar-condicionado varia conforme condições de uso e tecnologia. O resultado não representa o consumo exato de um inverter.';
  validate();
 }
 function render(){
  const list=$('ww-consumo-list');list.replaceChildren();
  rows.forEach(row=>{
   const line=document.createElement('li');line.className='ww-consumo-item';
   const description=document.createElement('div');description.append(field('ww-consumo-item-name',row.label));
   description.append(field('ww-consumo-item-desc',core.format(row.kwh)+' kWh/mês · '+row.quantity+' un.'));
   const remove=document.createElement('button');remove.type='button';remove.className='ww-consumo-remove';
   remove.textContent='Remover';remove.setAttribute('aria-label','Remover '+row.label);
   remove.addEventListener('click',()=>{rows=rows.filter(x=>x.id!==row.id);render();});
   line.append(description,remove);list.append(line);
  });
  $('ww-consumo-total').textContent=core.format(core.total(rows))+' kWh/mês';
  $('ww-consumo-count').textContent=rows.length+' '+(rows.length===1?'item':'itens');
  $('ww-consumo-empty').hidden=rows.length!==0;
  $('ww-consumo-results').hidden=rows.length===0;
  $('ww-consumo-copy').disabled=rows.length===0;
  validate();
 }
 choice.addEventListener('change',selectItem);
 for(const input of [watts,quantity,hours,days,monthly])input.addEventListener('input',validate);
 form.addEventListener('submit',ev=>{
  ev.preventDefault();const kwh=validate();
  if(kwh===null||rows.length>=30)return;
  rows.push({id:++counter,label:current().label,quantity:Number(quantity.value),kwh});
  render();
 });
 $('ww-consumo-clear').addEventListener('click',()=>{rows=[];render();});
 $('ww-consumo-copy').addEventListener('click',async()=>{
  if(!rows.length)return;
  const message=['WW Solar — Estimativa de consumo mensal','',
   ...rows.map(x=>x.label+' ('+x.quantity+' un.): '+core.format(x.kwh)+' kWh/mês'),
   '', 'Total estimado: '+core.format(core.total(rows))+' kWh/mês',
   'Referências médias históricas e estimativas; confira etiquetas ou manuais do equipamento.'].join('\n');
  try{await navigator.clipboard.writeText(message);$('ww-consumo-status').textContent='Resultado copiado.';}
  catch(_){$('ww-consumo-status').textContent='Não foi possível copiar automaticamente.';}
 });
 choice.value='ventilador';selectItem();render();
})();
