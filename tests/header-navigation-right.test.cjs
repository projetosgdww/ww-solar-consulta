'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('navegação do cliente e botão de sair acompanham carrinho na borda direita',()=>{
 const css=read('cliente-dev.css');
 assert.match(css,/@media\(min-width:931px\)/);
 assert.match(css,/\.header #client-nav:not\(\[hidden\]\)\{margin-left:auto/);
 assert.match(css,/\.header #client-cart-top\{margin-left:clamp\(/);
 assert.match(css,/\.header \.client-header-actions\{gap:/);
});
test('painel admin usa navegação à direita com novo CSS',()=>{
 const css=read('cliente-dev.css');
 const admin=read('admin-dev.html');
 assert.match(css,/\.header \.header-inner>\.nav:not\(#client-nav\)\{margin-left:auto\}/);
 assert.match(admin,/cliente-dev\.css\?v=20261115-nav-right-v2/);
 assert.match(admin,/>Voltar ao catálogo</);
});
test('cliente conserva links e botão Sair, sem alterar fluxo comercial',()=>{
 const html=read('cliente-dev.html');
 for(const id of ['client-nav-simulate','client-kits-link','client-pieces-link','client-projects-link','client-logout','client-cart-top']){
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/cliente-dev\.css\?v=20261116-simulator-polish-v5/);
 assert.match(html,/cliente-dev\.js\?v=20261116-simulator-polish-v5/);
});
