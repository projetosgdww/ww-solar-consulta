'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const clientHtml=fs.readFileSync('cliente-dev.html','utf8');
const adminHtml=fs.readFileSync('admin-dev.html','utf8');
const adminJs=fs.readFileSync('admin-dev.js','utf8');
test('login legado do cliente não aparece antes da consulta pública',()=>{
 assert.match(clientHtml,/id="client-entry" hidden>/);
 assert.match(clientHtml,/<section id="client-app" hidden>/);
});
test('administrador possui login exclusivo e navegação separada',()=>{
 for(const id of ['admin-signin','admin-signin-form','admin-signin-email','admin-signin-password','admin-signin-submit','admin-session-logout'])
  assert.match(adminHtml,new RegExp('id="'+id+'"'));
 assert.match(adminHtml,/id="admin-tab-sales"/);
 assert.match(adminHtml,/id="admin-tab-composer"/);
 assert.doesNotMatch(adminHtml,/id="admin-tab-clients"/);
 assert.match(adminJs,/db\.auth\.signInWithPassword/);
 assert.match(adminJs,/app_metadata\?\.wwsolar_role!=='admin'/);
 assert.match(adminJs,/db\.auth\.signOut\(\)/);
 assert.match(adminJs,/function enableAdmin\(\)/);
});
