'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('cliente-dev.html','utf8');
const css=fs.readFileSync('cliente-dev.css','utf8');
test('login oferece WhatsApp WW Solar com mensagem pronta sem cadastro público',()=>{
 const url='https://wa.me/5585992723637?text=';
 assert.ok(html.includes(url));
 assert.ok(html.includes('Ol%C3%A1!%20Gostaria%20de%20solicitar%20acesso%20ao%20cat%C3%A1logo%20WW%20Solar.'));
 assert.ok(html.includes('Solicitar acesso pelo WhatsApp'));
 assert.ok(html.includes('(85) 99272-3637'));
 assert.ok(html.includes('Não há cadastro público.'));
 assert.match(html,/rel="noopener noreferrer"/);
 assert.match(html,/id="client-login-form"/);
 assert.match(html,/id="client-forgot-password"/);
 assert.match(css,/\.client-access-whatsapp/);
});
