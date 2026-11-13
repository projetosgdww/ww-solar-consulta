const test=require('node:test');
const assert=require('node:assert/strict');
const K=require('../kit-line-commercial-v2.js');
const raw=[
['PAV-044','MODULO 600W N-TYPE ZNSHINE MONOFACIAL 30MM',775,'modulos'],
['PAV-049','MODULO 625W N-TYPE DMEGC BIFACIAL 30MM',800,'modulos'],
['PAV-054','MODULO 710W N-TYPE DMEGC BIFACIAL 30MM',885,'modulos'],
['PAV-036','INVERSOR SAJ AFCI MONO 3K-R5-ON-GRID 220V 1MPPT',1624.88,'inversores'],
['PAV-035','INVERSOR DEYE AFCI MONOFASICO 6K ON GRID 220V 2MPPT',1249.88,'inversores'],
['PAV-038','INVERSOR DEYE MONO 7.3KW ON GRID 220V 2MPPT',1874.89,'inversores'],
['PAV-039','INVERSOR DEYE AFCI MONO 10.5KW ON GRID-G2 220V 2MPPT',2499.88,'inversores'],
['PAV-041','INVERSOR SAJ AFCI MONO 10KW-R6 220V 3MPPT',3575.11,'inversores'],
['PAV-024','PERFIL ALUMINIO 2.36M',63,'estruturas'],
['PAV-029','FIXAÇÃO CERÂMICA P/4 MÓDULOS',139.86,'estruturas'],
['PAV-001','CABO VERMELHO 4 MM 25M',130,'cabos'],
['PAV-002','CABO PRETO 4 MM 25M',130,'cabos'],
['PAV-003','CABO PRETO 6 MM 25M',162.5,'cabos'],
['PAV-004','CABO VERMELHO 6 MM 25M',162.5,'cabos'],
['PAV-007','MC4 2 PARES',13,'componentes']];
const products=raw.map(([id,title,price,categoria])=>({id,title,price,kind:'piece',approved:true,active:true,payload:{categoria}}));
const row=(kit,sku)=>kit.rows.find(r=>r.sku===sku);
test('exatamente 32 kits de 2,75 a 16,25 kWp, sem 4 módulos de 600/625',()=>{
 assert.equal(K.allPresets.length,32);
 assert.equal(new Set(K.allPresets.map(x=>x.code)).size,32);
 assert.equal(K.allPresets.some(x=>x.code==='WW-Z600-04'),false);
 assert.equal(K.allPresets.some(x=>x.code==='WW-D625-04'),false);
 assert.equal(K.allPresets.find(x=>x.code==='WW-D625-26').kwp,16.25);
 assert.equal(K.allPresets.find(x=>x.code==='WW-D710-04').kwp,2.84);
});
test('128 por kWp e inversor de menor potência >= CC vezes 0.77',()=>{
 const p=K.allPresets.find(x=>x.code==='WW-D625-06');
 assert.equal(p.generationKwhMonth,480);
 assert.equal(p.inverterReferenceKw,2.8875);
 const q=K.compose(p.code,products,{dcInputsUsed:1});
 assert.equal(q.inverterCandidate.acKw,7.3);
 assert.equal(q.candidateOptions.find(x=>x.sku==='PAV-036').electrical.status,'incompativel_preliminar');
 assert.equal(q.candidateOptions.find(x=>x.sku==='PAV-035').electrical.status,'sem_ficha_modelo');
 assert.equal(q.inverterCandidate.electrical.status,'pendente_engenharia');
 assert.equal(q.engineeringApproved,false);
 assert.equal(q.published,false);
});
test('perfis separados da fixação e rolos por cor; acima de 4 módulos usa 6mm',()=>{
 const a=K.compose('WW-D710-04',products,{dcInputsUsed:1});
 assert.equal(row(a,'PAV-024').quantity,4);
 assert.equal(row(a,'PAV-029').quantity,1);
 assert.equal(row(a,'PAV-001').quantity,1);
 assert.equal(row(a,'PAV-002').quantity,1);
 const b=K.compose('WW-D625-12',products,{dcInputsUsed:2});
 assert.equal(b.metersPerColor,30);
 assert.equal(b.rollsPerColor,2);
 assert.equal(row(b,'PAV-004').quantity,2);
 assert.equal(row(b,'PAV-003').quantity,2);
 assert.equal(row(b,'PAV-024').quantity,12);
 assert.equal(row(b,'PAV-029').quantity,3);
 assert.equal(row(b,'PAV-007').quantity,1);
});
test('preço é soma de preços AVULSOS vezes 1,15 e não custo reverso',()=>{
 const p=K.compose('WW-D625-06',products,{dcInputsUsed:1});
 assert.equal(p.subtotal,7670.61);
 assert.equal(p.previewPrice,8821.20);
 assert.equal(p.pending.length,0);
});
test('estimativa automática de conectores sem homologação elétrica',()=>{
 const p=K.compose('WW-Z600-06',products);
 assert(p.previewPrice>0);
 assert.equal(p.dcInputsUsed,1);
 assert.equal(p.dcInputsEstimated,true);
 assert.equal(p.engineeringApproved,false);
 assert.equal(p.published,false);
});
test('não inventa inversor para kits maiores sem modelo disponível',()=>{
 const p=K.compose('WW-D625-26',products,{dcInputsUsed:2});
 assert.equal(p.inverterCandidate,null);
 assert.equal(p.previewPrice,null);
 assert(p.pending.some(x=>x.startsWith('Inversor')));
});

test('não aceita selecionar manualmente inversor com Imp acima do limite',()=>{
 assert.throws(()=>K.compose('WW-D625-06',products,{dcInputsUsed:1,inverterSku:'PAV-036'}),/incompatível/);
});
test('comercial sem ficha associada não é automaticamente aprovado',()=>{
 const p=K.compose('WW-D625-06',products,{dcInputsUsed:1,inverterSku:'PAV-035'});
 assert.equal(p.inverterCandidate.electrical.status,'sem_ficha_modelo');
 assert.equal(p.engineeringApproved,false);
});
test('DMEGC 710 W no Deye 7,3k fica pendente por variante e ganho bifacial',()=>{
 const p=K.compose('WW-D710-08',products,{dcInputsUsed:1,inverterSku:'PAV-038'});
 assert.equal(p.inverterCandidate.electrical.status,'pendente_engenharia');
 assert(p.inverterCandidate.electrical.reasons.some(x=>x.includes('bifacial')));
});

test('distribui strings por MPPT sob limites STC e mantém temperatura pendente',()=>{
 const p=K.compose('WW-D625-12',products);
 assert.equal(p.preliminaryStrings.inputsUsed,2);
 assert.deepEqual(p.preliminaryStrings.strings.map(x=>x.modules),[6,6]);
 assert.equal(p.preliminaryStrings.strings[0].vmpStcV,246.3);
 assert.equal(p.preliminaryStrings.strings[0].vocStcV,295.74);
 assert.equal(p.dcInputsEstimated,true);
 assert.equal(p.engineeringApproved,false);
});
test('inversor 7.3 kW não ultrapassa capacidade máxima CC informada na ficha',()=>{
 const p=K.allPresets.find(x=>x.code==='WW-D625-18');
 const inverter=products.find(x=>x.id==='PAV-038');
 const check=K.electricalScreen(p,inverter);
 assert.equal(check.status,'incompativel_preliminar');
 assert(check.reasons.some(x=>x.includes('Potência CC')));
});

test('inversores de 10 e 10,5 kW não participam dos kits, sem afetar peças avulsas',()=>{
 const options=K.options(products,5.5);
 assert(!options.some(x=>x.acKw===10||x.acKw===10.5));
 assert(products.some(x=>x.id==='PAV-039'));
 assert(products.some(x=>x.id==='PAV-041'));
 assert.throws(()=>K.compose('WW-D625-12',products,{inverterSku:'PAV-041'}),/fora da triagem/);
});

test('SAJ 15 kW entra como peça avulsa sem entrar nas propostas de kits',()=>{
 const novo={id:'PAV-057',title:'INVERSOR SAJ AFCI 15KW-R6-T2-32 ON-GRID TRIFASICO 380V 2MPPT',price:3874.88,kind:'piece',active:true,approved:true,payload:{categoria:'inversores'}};
 const catalog=[...products,novo];
 assert(catalog.some(x=>x.id==='PAV-057'));
 assert(!K.options(catalog,12.5).some(x=>x.id==='PAV-057'));
});
