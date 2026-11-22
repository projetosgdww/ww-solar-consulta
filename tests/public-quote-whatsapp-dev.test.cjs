'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const js=fs.readFileSync('cliente-dev.js','utf8'),html=fs.readFileSync('cliente-dev.html','utf8');
const guest=js.slice(js.indexOf('async function checkoutGuest()'),js.indexOf('async function checkout(){'));
test('cotação pública usa preço comercial atualizado e mantém associações de projetos',()=>{
 assert.match(guest,/await enrichDevKitDetails\(await readPublicCatalog\(\)\)/);
 assert.match(guest,/C\.sumCart\(S\.lines,latest\)/);
 assert.match(guest,/C\.linkedProjectNote\(S\.lines,latest\)/);
 assert.match(guest,/sum\.cents!==previous\.cents/);
});
test('WhatsApp tem destino controlado e link gerado somente depois da validação',()=>{
 assert.match(guest,/const hasProject=S\.lines\.some/);
 assert.match(guest,/cfg\.projectWhatsapp/);
 assert.match(guest,/cfg\.whatsapp/);
 assert.ok(guest.includes('.test(destination)'));
 assert.match(guest,/const whatsappUrl='https:\/\/wa\.me\/'/);
 assert.match(guest,/encodeURIComponent\(text\)/);
 assert.match(html,/id="client-drawer-checkout"/);
 assert.match(js,/Enviar cotação pelo WhatsApp ↗/);
 assert.match(js,/function clearGuestWhatsApp\(\)/);
 assert.match(js,/if\(GUEST_QUOTE_MODE\)clearGuestWhatsApp\(\)/);
});
test('DEV não registra pedido nem envia mensagem sem clique do visitante',()=>{
 assert.doesNotMatch(guest,/\.insert\(|\.upsert\(|\.update\(|\.delete\(|wwsolar_quote_requests|window\.open\(/);
 assert.match(guest,/window\.location\.assign\(whatsappUrl\)/);
 assert.match(html,/O envio só acontece se você confirmar no WhatsApp/);
 assert.match(guest,/Não cria pedido nem registra venda/);
});
