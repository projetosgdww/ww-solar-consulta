'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('cliente-dev.html','utf8');
const css=fs.readFileSync('cliente-dev.css','utf8');
const js=fs.readFileSync('cliente-dev.js','utf8');
const scene=fs.readFileSync('natal-wwsolar-scene.svg','utf8');
const garland=fs.readFileSync('natal-wwsolar-garland.svg','utf8');
test('composição natalina fiel ao modelo: estrelas, festões, Noel, árvore e presentes',()=>{
 const start=html.indexOf('<div class="shell client-welcome"');
 const end=html.indexOf('<section class="hero">',start);
 assert.ok(start>=0&&end>start);
 const banner=html.slice(start,end);
 assert.match(html, /<span class="ww-natal-stars" aria-hidden="true">/);
 assert.match(banner, /Olá, bem-vindo\./);
 assert.match(banner, /id="client-identity"/);
 assert.match(banner, /class="ww-natal-composition" aria-hidden="true"/);
 assert.match(banner, /class="ww-natal-garland" src="\.\/natal-wwsolar-garland\.svg" alt=""/);
 assert.match(banner, /class="ww-natal-scene" src="\.\/natal-wwsolar-scene\.svg" alt=""/);
 assert.equal((html.match(/ww-natal-composition/g)||[]).length,1);
 assert.ok(scene.includes('id="wwred"'));
 assert.ok(scene.includes('needle0'));
 assert.ok(scene.includes('Gift boxes'));
 assert.ok(scene.includes('Santa, waving'));
 assert.ok(garland.includes('viewBox="0 0 1200 70"'));
});
test('decoração sem bibliotecas externas, clique, layout alterado ou prejuízo ao movimento reduzido',()=>{
 assert.match(css, /#client-app \.ww-natal-composition\{/);
 assert.match(css, /position:absolute;inset:0;z-index:2;pointer-events:none/);
 assert.match(css, /#client-app \.ww-natal-scene\{/);
 assert.match(css, /#client-app \.ww-natal-garland\{/);
 assert.match(css, /#client-app>\.hero\{position:relative;z-index:3\}/);
 assert.match(css, /@media\(max-width:620px\)/);
 assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css, /#client-app \.ww-natal-scene\{animation:none;transform:none\}/);
 assert.match(scene, /prefers-reduced-motion/);
 assert.match(html, /cliente-dev\.css\?v=20261117-natal-scene-v2/);
 assert.doesNotMatch(scene+garland, /https?:\/\//);
 assert.doesNotMatch(scene+garland, /<script|<foreignObject/i);
 assert.ok(!js.includes('ww-natal-composition'));
});
test('continuidade dos fluxos comerciais existentes',()=>{
 for(const anchor of ['client-login-open','client-cart-top','client-product-grid','client-projects-grid','client-drawer-checkout'])
   assert.ok(html.includes('id="'+anchor+'"'),anchor);
 assert.match(html, /<section class="hero">/);
});
