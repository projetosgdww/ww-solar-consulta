'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('cliente-dev.html','utf8');
const css=fs.readFileSync('cliente-dev.css','utf8');
const js=fs.readFileSync('cliente-dev.js','utf8');
const core=require('../cliente-core.js');
const section=html.slice(html.indexOf('<section class="main-section shell client-projects"'),html.indexOf('<!-- Seção de carrinho duplicado'));
const expected=[
 ['PRJ-B-003','R$ 300,00'],['PRJ-B-010','R$ 400,00'],['PRJ-B-020','R$ 500,00'],
 ['PRJ-B-030','R$ 600,00'],['PRJ-B-040','R$ 700,00'],
 ['PRJ-B-050','R$ 800,00'],['PRJ-B-060','R$ 900,00']
];
test('sete cards Grupo B sem novas faixas ou alterações comerciais',()=>{
 assert.equal((section.match(/class="client-projects-tier ww-project-tier-v2"/g)||[]).length,7);
 assert.equal((section.match(/data-project-id="/g)||[]).length,7);
 for(const [id,price] of expected){
   assert.ok(section.includes('data-project-sku="'+id+'"'),id);
   assert.ok(section.includes('data-project-id="'+id+'"'),id);
   assert.ok(section.includes(price),price);
 }
 assert.ok(section.includes('Até 3 kW'));
 assert.ok(section.includes('Acima de 3 e abaixo de 10 kW'));
 assert.ok(section.includes('De 50 a 60 kW'));
});
test('cards de projetos usam paleta visual aprovada',()=>{
 assert.match(css,/#projetos \.client-projects-grid>\.ww-project-tier-v2/);
 assert.match(css,/linear-gradient\(90deg,#D73700 0%,#FA4100 55%,#FF8A4D 100%\)/);
 assert.match(css,/background:#81F002;color:#183400/);
 assert.match(css,/background:#FFFFFF/);
 assert.match(css,/background:#FA4100;color:#17241a/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(section,/PROJETO ELÉTRICO/);
 assert.match(section,/SERVIÇO OPCIONAL/);
 assert.match(section,/Valor do projeto/);
 assert.match(section,/TRT não inclusa · paga pelo contratante/);
 assert.match(html,/cliente-dev\.css\?v=20261117-project-footer-v2/);
});
test('seleção e preço seguem a integração original do catálogo',()=>{
 assert.match(js,/button\.parentElement\?\.querySelector\('strong'\)/);
 assert.match(js,/price\.textContent=project\?euro\(project\.price\):'Sob consulta'/);
 assert.match(js,/button\.dataset\.projectId/);
 assert.match(js,/if\(!S\.user\)\{requestLoginFor\(id\);return;\}/);
 assert.match(js,/add\(id\)/);
 assert.match(section,/client-projects-hint/);
 assert.match(section,/client-projects-important/);
 assert.match(section,/5585991170375/);
 assert.equal(core.PROJECT_TIERS.length,7);
});
