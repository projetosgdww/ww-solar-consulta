'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
test('favicon do navegador usa a identidade verde-limão aprovada',()=>{
 const svg=read('favicon.svg');
 assert.equal((svg.match(/#81F002/g)||[]).length,2);
 assert.doesNotMatch(svg,/#f8c947/i);
});
test('gerador dos três ícones PWA aplica a mesma cor, com cache renovado',()=>{
 const generator=read('scripts/generate-wwsolar-icons.mjs'),sw=read('sw.js');
 assert.match(generator,/\[129,240,2,255\]/);
 assert.doesNotMatch(generator,/\[255,192,53,255\]/);
 assert.match(sw,/wwsolar-public-icons-v3/);
 for(const filename of ['ww-solar-192.png','ww-solar-512.png','apple-touch-icon.png']){
  assert.ok(generator.includes(filename),filename);
  assert.ok(sw.includes(filename),filename);
 }
});
test('ícone atualizado em páginas de cliente admin privacidade e termos',()=>{
 for(const p of ['cliente-dev.html','admin-dev.html','privacidade.html','termos.html']){
   assert.match(read(p),/favicon\.svg\?v=20261115-limao-v1/);
 }
 assert.match(read('admin-dev.html'),/viewBox="0 0 44 44"/);
});
