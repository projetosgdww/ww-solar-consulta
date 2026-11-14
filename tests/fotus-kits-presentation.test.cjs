const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const client=readFileSync('cliente-dev.js','utf8');
const quote=readFileSync('supabase/functions/wwsolar-quote/index.ts','utf8');
test('kits prontos exibem condições sem afetar kits calculados',()=>{
  assert.match(client,/if\(x\.origemKit==='fotus_pronto'\)/);
  assert.match(client,/Frete incluso para Canindé\/CE/);
  assert.match(client,/até 15 dias úteis/);
  assert.match(client,/até 5 dias úteis/);
});
test('mensagem de cotação limita frete ao fornecedor Fotus',()=>{
  assert.match(quote,/order\.items\.some\(x=>x\.sku\.startsWith\("FOTUS-"\)\)/);
  assert.match(quote,/Kits prontos Fotus: frete incluso para Canindé\/CE/);
  assert.match(quote,/Entrega prevista em até 15 dias úteis/);
});
