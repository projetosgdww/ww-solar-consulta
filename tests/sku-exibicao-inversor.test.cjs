'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('cliente-dev.js','utf8');
const match=src.match(/  function displaySku\(id\)\{[\s\S]*?\n  \}/);
assert.ok(match);
const fn=Function(match[0]+';return displaySku;')();
test('SKU visual identifica marca, potencia do inversor e potencia instalada',()=>{
 assert.equal(fn('FOTUS-4200-SOLIS-5'),'SOLIS-5KW-4200');
 assert.equal(fn('FOTUS-2400-DEYE-2P25'),'DEYE-2,25KW-2400');
 assert.equal(fn('FOTUS-3600-ROCKCORE-2P5X2'),'ROCKCORE-2,5X2KW-3600');
 assert.equal(fn('FOTUS-3600-TSUN-2P25X2'),'TSUNESS-2,25X2KW-3600');
 assert.equal(fn('WW-300'),'WW-300');
});
test('IDs originais preservados em operações e pedidos',()=>{
 assert.match(src,/card\.dataset\.productId=p\.id/);
 assert.match(src,/add\(p\.id\)/);
 assert.match(src,/SKU: '\+displaySku\(p\.id\)/);
});
