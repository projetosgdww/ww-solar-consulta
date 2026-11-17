'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('cliente-dev.html','utf8');
const js=fs.readFileSync('cliente-dev.js','utf8');
const quote=fs.readFileSync('supabase/functions/wwsolar-quote/index.ts','utf8');
const preview=fs.readFileSync('supabase/functions/wwsolar-quote-preview/index.ts','utf8');

test('R2: frete somente sob consulta em todos os canais, inclusive Canindé',()=>{
 for(const s of [html,js,quote,preview]) {
   assert.doesNotMatch(s,/frete incluso para Canindé|frete fora de Canindé sob consulta/i);
 }
 assert.match(js,/freightText\.append\(el\('strong','Frete sob consulta'\)\)/);
 assert.match(js,/Frete sob consulta para todas as cidades, inclusive Canindé\/CE/);
 assert.match(quote,/frete sob consulta para todas as cidades, inclusive Canindé\/CE/);
 assert.match(preview,/frete sob consulta para todas as cidades, inclusive Canindé\/CE/);
});
test('R2: card apresenta limites da venda sem mudar a tipografia',()=>{
 assert.match(js,/Venda exclusiva dos equipamentos fotovoltaicos\. Projeto elétrico e instalação não inclusos\./);
 assert.match(js,/Preços, disponibilidade e frete sujeitos à cotação e confirmação comercial/);
 assert.match(js,/'ww-kit-disclaimer'/);
 assert.match(js,/A geração real varia conforme a localidade/);
 assert.match(html,/Projetos são opcionais e cobrados separadamente/);
 assert.match(quote,/Projetos opcionais, quando selecionados, são cobrados separadamente/);
 assert.match(quote,/Total de referência/);
});
