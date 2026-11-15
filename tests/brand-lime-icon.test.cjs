'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('favicon SVG usa verde-limão aprovado',()=>{
 const svg=read('favicon.svg');
 assert.ok(svg.includes('#81F002'));
 assert.ok(!svg.includes('#f8c947'));
});
test('ícones PWA gerados com mesmo verde e renovação de cache',()=>{
 const gen=read('scripts/generate-wwsolar-icons.mjs'),sw=read('sw.js');
 assert.ok(gen.includes('[129,240,2,255]'));
 assert.ok(!gen.includes('[255,192,53,255]'));
 assert.ok(sw.includes('wwsolar-public-icons-v2'));
});
test('cliente e admin usam favicon renovado e identidade da marca',()=>{
 const client=read('cliente-dev.html'),admin=read('admin-dev.html');
 for(const html of [client,admin])assert.ok(html.includes('favicon.svg?v=20261115-limao-v1'));
 assert.ok(client.includes('apple-touch-icon.png?v=20261115-limao-v1'));
 assert.ok(admin.includes('<svg viewBox="0 0 44 44"'));
});
