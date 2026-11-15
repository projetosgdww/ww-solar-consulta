'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'cliente-dev.html'),'utf8');
const css=fs.readFileSync(path.join(root,'cliente-dev.css'),'utf8');
const js=fs.readFileSync(path.join(root,'cliente-dev.js'),'utf8');
test('carrinho duplicado oculto, preserva controles para o aplicativo',()=>{
  assert.match(html,/<section[^>]*id="carrinho"[^>]*hidden/);
  assert.match(css,/#carrinho\[hidden\]\{display:none!important\}/);
  for(const id of ['client-cart-lines','client-cart-count','client-cart-total','client-checkout','client-cart-refresh','client-cart-timer']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
});
test('carrinho lateral mantém checkout, mensagens e ações',()=>{
  assert.match(html,/id="client-cart-drawer"/);
  for(const id of ['client-cart-trigger','client-drawer-lines','client-drawer-checkout','client-drawer-refresh','client-drawer-clear']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.equal((html.match(/id="client-action-status"/g)||[]).length,1);
  const aside=html.slice(html.indexOf('<aside id="client-cart-drawer"'),html.indexOf('</aside>'));
  assert.match(aside,/id="client-action-status"/);
  assert.match(js,/\$\('client-drawer-checkout'\)\.addEventListener\('click',checkout\)/);
  assert.match(js,/const status=\(m,id='client-action-status'\)/);
});
