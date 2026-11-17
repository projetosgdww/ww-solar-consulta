'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pwa=fs.readFileSync('cliente-pwa.js','utf8');
const html=fs.readFileSync('cliente-dev.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const build=fs.readFileSync('scripts/build-cliente-dev.mjs','utf8');
const seo=fs.readFileSync('scripts/seo-output-policy.mjs','utf8');
const release=JSON.parse(fs.readFileSync('pwa-release.json','utf8'));
test('PWA confere versão ao abrir e retornar, recarrega somente uma vez',()=>{
 assert.equal(release.version,'20261117-pwa-auto-update-v1');
 assert.match(pwa,/const CURRENT='20261117-pwa-auto-update-v1'/);
 assert.match(pwa,/visibilitychange/); assert.match(pwa,/pageshow/);
 assert.match(pwa,/cache:'no-store'/);assert.match(pwa,/sessionStorage.getItem/);
 assert.match(pwa,/window.location.reload/);assert.match(pwa,/updateViaCache:'none'/);
});
test('JS e CSS recebem no-store e URLs de assets mudam nesta release',()=>{
 assert.match(seo,/\*\.js/);
 assert.match(seo,/\*\.css/);
 assert.match(seo,/pwa-release\.json/);
 assert.match(html,/cliente-dev\.js\?v=20261117-pwa-auto-update-v1/);
 assert.match(html,/cliente-pwa\.js\?v=20261117-pwa-auto-update-v1/);
 assert.match(build,/'pwa-release\.json'/);
});
test('service worker não armazena páginas, preços ou scripts',()=>{
 assert.match(sw,/event\.request\.mode==='navigate'/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/PUBLIC_ICONS/);
 assert.doesNotMatch(sw,/caches\.open\([^)]*\)[\s\S]*?\.put\(/);
});
