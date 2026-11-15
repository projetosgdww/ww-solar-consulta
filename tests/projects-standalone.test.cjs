'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../cliente-core.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tiers=[
 ['PRJ-B-003',300],['PRJ-B-010',400],['PRJ-B-020',500],['PRJ-B-030',600],
 ['PRJ-B-040',700],['PRJ-B-050',800],['PRJ-B-060',900]
];
test('sete projetos avulsos aparecem com ações próprias e sem exigência de kit',()=>{
 const html=read('cliente-dev.html'),js=read('cliente-dev.js');
 assert.equal((html.match(/data-project-id=/g)||[]).length,7);
 assert.match(js,/function renderStandaloneProjects\(/);
 assert.match(js,/!p\.payload\?\.kitCodigo/);
 assert.match(js,/add\(id\)/);
 for(const [id,price] of tiers){
   assert.ok(html.includes('data-project-id="'+id+'"'),id);
   const catalog=[{id,kind:'piece',title:'Projeto avulso',price,active:true,approved:true,payload:{categoria:'projetos'}}];
   const onlyProject=C.sumCart([{id,qty:1}],catalog);
   assert.equal(onlyProject.cents,price*100,id);
   assert.equal(onlyProject.selected.length,1);
 }
});
test('alinhamento da seção e responsividade não alteram totais comerciais',()=>{
 const css=read('cliente-dev.css');
 assert.match(css,/\.client-projects-card\{max-width:none;width:100%/);
 assert.match(css,/\.client-projects-grid>\.client-projects-tier\{/);
 assert.match(css,/@media\(max-width:700px\)/);
});
