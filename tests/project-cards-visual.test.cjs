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
 assert.match(html,/cliente-dev\.css\?v=20261117-project-notes-v3/);
});
test('seleção e preço seguem a integração original do catálogo',()=>{
 assert.match(js,/button\.parentElement\?\.querySelector\('strong'\)/);
 assert.match(js,/price\.textContent=project\?euro\(project\.price\):'Sob consulta'/);
 assert.match(js,/button\.dataset\.projectId/);
 assert.match(js,/if\(!S\.user&&!GUEST_QUOTE_MODE\)\{requestLoginFor\(id\);return;\}/);
 assert.match(js,/add\(id\)/);
 assert.match(section,/client-projects-hint/);
 assert.match(section,/client-projects-important/);
 assert.match(section,/5585991170375/);
 assert.equal(core.PROJECT_TIERS.length,7);
});


test('informações finais seguem referência discreta em três linhas numeradas',()=>{
 assert.match(section,/class="ww-project-notes"/);
 assert.equal((section.match(/class="ww-project-note"/g)||[]).length,3);
 for(const number of ['01','02','03'])assert.ok(section.includes('>'+number+'</span>'));
 for(const title of ['TRT não inclusa','Grupo A e potências acima de 60 kW','Solicitação e atendimento'])
   assert.ok(section.includes('>'+title+'</strong>'),title);
 assert.doesNotMatch(section,/ww-project-footer-heading|ww-project-footer-block|INFORMAÇÕES IMPORTANTES/);
 assert.match(css,/#projetos \.ww-project-notes\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/#projetos \.ww-project-note-title\{/);
 assert.match(css,/#projetos \.ww-project-notes \.client-projects-important/);
 assert.doesNotMatch(css,/ww-project-footer-heading-orange|ww-project-footer-heading-green/);
 assert.match(css,/@media\(max-width:700px\)/);
});
test('rodapé preserva avisos, estado do acesso e WhatsApp sem duplicar elementos',()=>{
 for(const content of [
   'A Taxa de Responsabilidade Técnica (TRT)',
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
 assert.match(section,/class="ww-project-contact"/);
});
