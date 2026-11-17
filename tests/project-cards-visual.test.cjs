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


test('rodapé segue referencia em duas colunas, com informacoes e atendimento',()=>{
 assert.match(section,/class="ww-project-footer-v3"/);
 assert.match(section,/INFORMAÇÕES IMPORTANTES/);
 assert.match(section,/SOLICITAÇÃO E ATENDIMENTO/);
 assert.equal((section.match(/class="ww-project-footer-block/g)||[]).length,2);
 assert.match(css,/#projetos \.ww-project-footer-v3\{/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/#projetos \.ww-project-footer-heading-orange\{background:#FA4100\}/);
 assert.match(css,/#projetos \.ww-project-footer-heading-green\{background:#1F543F\}/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/#projetos \.ww-project-footer-v3\{grid-template-columns:1fr/);
});
test('rodapé preserva avisos, estado do acesso e WhatsApp sem duplicar elementos',()=>{
 for(const content of [
   'a Taxa de Responsabilidade Técnica (TRT)',
   'não está inclusa',
   'deverá ser paga pelo contratante',
   'Para instalações enquadradas no Grupo A ou acima de 60 kW',
   'O enquadramento é confirmado na análise da unidade consumidora.',
   'Entre na sua conta para incluir somente o projeto no carrinho',
   'Falar sobre projetos · (85) 99117-0375 ↗'
 ])assert.ok(section.includes(content),content);
 assert.equal((section.match(/id="client-projects-hint"/g)||[]).length,1);
 assert.equal((section.match(/class="client-projects-important"/g)||[]).length,1);
 assert.equal((section.match(/wa\.me\/5585991170375/g)||[]).length,1);
 assert.match(js,/function renderStandaloneProjects\(/);
 assert.match(js,/const hint=\$\('client-projects-hint'\)/);
 assert.match(section,/target="_blank" rel="noopener noreferrer"/);
 assert.match(section,/class="button button-outline ww-project-contact"/);
});
