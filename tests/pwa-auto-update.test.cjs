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
 assert.match(release.version,/^[a-zA-Z0-9._-]{3,80}$/);
 assert.match(pwa,/meta\[name="wwsolar-release"\]/);
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
 assert.match(build,/CF_PAGES_COMMIT_SHA/);
 assert.match(html,/__WW_SOLAR_RELEASE__/);
});
test('service worker não armazena páginas, preços ou scripts',()=>{
 assert.match(sw,/event\.request\.mode==='navigate'/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/PUBLIC_ICONS/);
 assert.doesNotMatch(sw,/caches\.open\([^)]*\)[\s\S]*?\.put\(/);
});
