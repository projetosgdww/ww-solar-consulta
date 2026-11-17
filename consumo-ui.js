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
  source=$('ww-consumo-source'),warning=$('ww-consumo-warning'),cycles=$('ww-consumo-cycles'),cycleKwh=$('ww-consumo-cycle-kwh');
 let rows=[],counter=0;
 const field=(cls,text)=>{const node=document.createElement('span');node.className=cls;node.textContent=text;return node;};
 const current=()=>core.appliances.find(x=>x.id===choice.value)||core.appliances[0];
 for(const item of core.appliances){
  const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.label;choice.append(opt);
 }
 function read(){
  const item=current();
  if(item.mode==='monthly')return core.calculateMonthly({monthlyKwh:monthly.value,quantity:quantity.value});
  if(item.mode==='cycle')return core.calculateCycles({cycleKwh:cycleKwh.value,quantity:quantity.value,cyclesPerWeek:cycles.value});
  return core.calculate({watts:watts.value,quantity:quantity.value,hours:hours.value,days:days.value});
 }
 function validate(){
  const kwh=read();
  $('ww-consumo-current').textContent=kwh===null?'Informe os dados do aparelho':core.format(kwh)+' kWh/mês';
  $('ww-consumo-add').disabled=kwh===null||rows.length>=30;
  return kwh;
 }
 function selectItem(){
  const item=current(),isMonthly=item.mode==='monthly',isCycle=item.mode==='cycle';
  monthlyRow.hidden=!isMonthly;timeRows.hidden=isMonthly||isCycle;
  $('ww-consumo-cycle-row').hidden=!isCycle;
  $('ww-consumo-manual-label').textContent=isMonthly?'Alterar consumo mensal (kWh/mês)':isCycle?'Alterar consumo por lavagem (kWh/ciclo)':'Alterar potência do meu aparelho (W)';
  $('ww-consumo-watts-row').hidden=isMonthly||isCycle;
  $('ww-consumo-kwh-row').hidden=!isMonthly;
  $('ww-consumo-cycle-kwh-row').hidden=!isCycle;
  details.open=!!item.manual;
  watts.value=item.watts==null?'':String(item.watts);
  monthly.value=item.monthlyKwh==null?'':String(item.monthlyKwh);
  cycleKwh.value=item.cycleKwh==null?'':String(item.cycleKwh);
  source.replaceChildren();
  if(item.basis==='estimativa'){
    source.textContent='Potência fixa de referência: '+item.watts+' W. '+item.note;
  }else if(item.basis==='inmetro'){
    source.append(document.createTextNode('Modelo Inmetro: '+item.model+' · '+item.source+' · '));
    const link=document.createElement('a');link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
    link.textContent='Consultar PBE';source.append(link);
  }else if(item.model){
    source.append(document.createTextNode('Exemplo de modelo: '+item.model+' · '));
    if(item.sourceUrl){
      const link=document.createElement('a');link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='Consultar ficha do fabricante';source.append(link);
    }
  }else source.textContent='Modelo específico ainda não verificado. Informe a potência ou o consumo na etiqueta para calcular.';
  warning.hidden=!isMonthly&&!isCycle&&!item.variable&&item.basis!=='estimativa';
  warning.textContent=isMonthly?'Consumo mensal da ficha de um modelo, não uma média universal. Confira sua etiqueta ENCE.':
    isCycle?'Consumo medido por ciclo. Informe quantas lavagens faz por semana.':
    item.basis==='estimativa'?'Estimativa de referência, não potência medida de um computador específico. Ajuste se souber o valor do seu aparelho.':
    'Ar-condicionado inverter varia conforme temperatura, ambiente e carga térmica. Os watts apresentados são de um modelo a 35 °C em carga total, e não o consumo médio contínuo.';
  $('ww-consumo-note').textContent=isMonthly
    ?'Pode substituir o consumo mensal pelo indicado na etiqueta do seu modelo.'
    :isCycle?'O consumo depende do programa de lavagem e do equipamento.'
    :item.manual?'Sem modelo confirmado: informe a potência indicada na etiqueta ou no manual.':item.basis==='inmetro'?'Potência elétrica em carga total de modelo PBE; pode variar no uso real.':'A potência indicada é um valor de referência ajustável, não universal.';
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
 for(const input of [watts,quantity,hours,days,monthly,cycleKwh,cycles])input.addEventListener('input',validate);
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
   'Cálculo orientativo baseado em modelos identificados quando disponíveis; confira etiquetas e condições reais de uso.'].join('\n');
  try{await navigator.clipboard.writeText(message);$('ww-consumo-status').textContent='Resultado copiado.';}
  catch(_){$('ww-consumo-status').textContent='Não foi possível copiar automaticamente.';}
 });
 choice.value='ventilador';selectItem();render();
})();
