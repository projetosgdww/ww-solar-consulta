const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const client=readFileSync('cliente-dev.js','utf8');
const html=readFileSync('cliente-dev.html','utf8');
const server=readFileSync('supabase/functions/wwsolar-create-customer/index.ts','utf8');
test('cadastro e reemissão exigem nova senha pessoal',()=>{
 assert.match(server,/wwsolar_password_change_required:true/);
 assert.match(server,/target\.user\.id,\{password,app_metadata:/);
 assert.match(server,/email,password,email_confirm:true,app_metadata:/);
});
test('servidor altera senha e libera acesso na mesma operação',()=>{
 assert.match(server,/new_password/);
 assert.match(server,/password:newPassword,\s*app_metadata:/);
 assert.match(server,/newPassword\.length<12/);
 assert.match(server,/wwsolar_password_change_required:false/);
 assert.doesNotMatch(server,/Executar SOMENTE após updateUser/);
});
test('cliente não acessa catálogo enquanto exige troca',()=>{
 assert.match(client,/if\(S\.recoveryMode\|\|user\.app_metadata\?\.wwsolar_password_change_required===true\)/);
 assert.match(client,/showPasswordSetup/);
 assert.match(client,/body:\{action:'complete_setup',new_password:first\}/);
});
test('a interface oferece senha própria e recuperação',()=>{
 for(const id of ['client-password-setup','client-password-setup-form','client-new-password','client-confirm-password','client-forgot-password'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(client,/resetPasswordForEmail/);
});

test('após salvar nova senha, inicia sessão nova em vez de atualizar token revogado',()=>{
 const start=client.indexOf('async function savePersonalPassword(');
 const end=client.indexOf('async function cancelPasswordSetup(',start);
 const flow=client.slice(start,end);
 assert.doesNotMatch(flow,/auth\.refreshSession\(/);
 assert.match(flow,/auth\.signInWithPassword\(/);
 assert.match(flow,/email,password:first/);
 assert.match(flow,/Sua senha foi atualizada\. Entre novamente/);
});

test('link de recuperação preserva intenção de troca ao abrir o WW Solar',()=>{
 assert.match(client,/searchParams\.set\('wwsolar_recovery','1'\)/);
 assert.match(client,/queryParams\.get\('wwsolar_recovery'\)==='1'/);
 assert.match(client,/showPasswordSetup\(S\.recoveryMode\?'recovery':'first'\)/);
 assert.match(client,/S\.db\.auth\.resetPasswordForEmail\(email,\{/);
});
test('marcador de recuperação não permanece após salvar ou cancelar',()=>{
 const count=(client.match(/searchParams\.delete\('wwsolar_recovery'\)/g)||[]).length;
 assert.equal(count,2);
});
