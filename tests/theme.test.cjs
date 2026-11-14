'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('tema disponível em todas as quatro páginas navegáveis',()=>{
 for(const page of ['cliente-dev.html','admin-dev.html','privacidade.html','termos.html']){
   const html=read(page);
   assert.match(html,/theme\.js\?v=/);
   assert.match(html,/theme\.css\?v=/);
 }
});
test('tema isolado de operações comerciais e autenticação',()=>{
 const js=read('theme.js');
 for(const forbidden of ['fetch(','.from(','signInWithPassword','wwsolar_catalog','localStorage.clear','sessionStorage.clear'])
   assert.equal(js.includes(forbidden),false);
 for(const value of ["'light'","'dark'","'auto'"])assert.ok(js.includes(value));
 assert.match(js,/prefers-color-scheme: dark/);
 assert.match(js,/localStorage\.setItem\(KEY,v\)/);
 assert.match(js,/DOMContentLoaded/);
});
test('layout e arquivos incluídos na compilação DEV',()=>{
 const css=read('theme.css');
 assert.match(css,/html\[data-theme=dark\]/);
 assert.match(css,/@media\(max-width:560px\)/);
 const build=read('scripts/build-cliente-dev.mjs');
 assert.match(build,/'theme.js','theme.css'/);
});
