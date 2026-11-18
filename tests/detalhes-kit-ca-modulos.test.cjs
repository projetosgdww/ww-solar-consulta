'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('cliente-dev.js','utf8');
const block=js.slice(js.indexOf("const detailSpecs=el('dl'"),js.indexOf('detailPanel.append(detailSpecs)'));
test('detalhe exibe marca dos módulos quando presente, sem adivinhar',()=>{
 assert.match(block,/x\.moduloFabricante/);
 assert.match(block,/marca a confirmar/);
 assert.match(block,/\['Módulos',moduleSpecs/);
});
test('estrutura e cabos só constam inclusos quando composição confirma ambos',()=>{
 assert.match(block,/x\.componentesIncluidos/);
 assert.match(block,/hasStructure&&hasCables/);
 assert.match(block,/\['Estrutura e cabos',includesDC\?'Inclusos no kit':'Confirmar composição'\]/);
});
test('materiais CA não inclusos, com conteúdo curto e isolamento da cotação',()=>{
 assert.match(block,/\['Materiais CA','Não inclusos'\]/);
 assert.match(js,/btn\('Adicionar à cotação \+',\(\)=>add\(p\.id\)/);
 assert.match(js,/card\.dataset\.productId=p\.id/);
});
