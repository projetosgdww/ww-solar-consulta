'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const C=require('../cliente-core.js');
const js=fs.readFileSync(path.join(root,'cliente-dev.js'),'utf8');
const css=fs.readFileSync(path.join(root,'cliente-dev.css'),'utf8');
test('kit de fornecedor 4,20 kWp seleciona projeto Grupo B R$ 400',()=>{
  const kit={kind:'kit',id:'FOTUS-TESTE',payload:{placas:7,moduloWp:600}};
  assert.equal(C.kitKwp(kit),4.2);
  assert.deepEqual(C.projectForKwp(C.kitKwp(kit)),{upTo:10,id:'PRJ-B-010',price:400});
});
test('a opção do projeto aparece para qualquer kit no carrinho lateral',()=>{
  assert.match(js,/function projectForKit\(kit\)/);
  assert.match(js,/const tier=C\.projectForKwp\(C\.kitKwp\(kit\)\)/);
  assert.match(js,/p\.id===tier\.id/);
  assert.match(js,/if\(inDrawer&&!missing&&available\(\)\.some\(p=>p\.id===x\.id&&p\.kind==='kit'\)\)/);
  assert.doesNotMatch(js,/if\(inDrawer&&!missing&&x\.id\.startsWith\('WW-'\)\)/);
  assert.match(js,/Projeto somente para este kit/);
  assert.ok(js.includes("projectLine?.linkedKits?.includes(x.id)"));
  assert.ok(js.includes("if(project.id==='PRJ-'+kitId)"));
});
test('serviços WW continuam com vínculo dedicado e carrinho cabeçalho extremo direito',()=>{
  assert.match(js,/const dedicated=available\(\)\.find\(p=>p\.id==='PRJ-'\+kit\.id/);
  assert.match(css,/@media\(min-width:931px\)/);
  assert.match(css,/\.header #client-cart-top\{margin-left:auto/);
});
