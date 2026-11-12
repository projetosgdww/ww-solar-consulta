const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const client=read('cliente-dev.js'),admin=read('admin-dev.js'),login=read('cliente-dev.html');
const sql=read('supabase/wwsolar-dev-schema.sql'),edge=read('supabase/functions/wwsolar-create-customer/index.ts');
const config=read('cliente-dev-config.js');
for(const code of [client,admin,config]){
  assert(!/service_role|serviceRole|SUPABASE_SERVICE_ROLE_KEY/.test(code),'privileged API key in client');
  assert(!/auth\.signUp\(|resetPasswordForEmail|inviteUserByEmail/.test(code),'unapproved self-service auth');
  assert(!/dados\/(catalogo-publico|pecas-publicas)\.json/.test(code),'public JSON fallback');
}
assert(sql.includes('alter table public.wwsolar_client_access enable row level security'));
assert(sql.includes('alter table public.wwsolar_catalog enable row level security'));
assert(sql.includes('alter table public.wwsolar_carts enable row level security'));
assert(sql.includes('auth.uid()')&&sql.includes('with check ('));
assert(sql.includes('app_metadata')&&!sql.includes("auth.jwt()->'user_metadata'"));
assert(edge.includes('getUser(token)')&&edge.includes('wwsolar_role!=="admin"'));
assert(edge.includes('createUser(')&&edge.includes('email_confirm:true'));
assert(edge.includes('crypto.getRandomValues'));
assert(!edge.includes('console.log(password)'));
assert(login.includes('type="password"')&&!login.includes('Esqueci minha senha'));
assert(!/id="client-password"[^>]*minlength=/.test(login),'login não deve impor tamanho mínimo diferente da senha existente');
assert(config.includes('supabaseUrl: "https://drutoqwkjzdsirqthdux.supabase.co"'));
assert(config.includes('publishableKey: "sb_publishable_'));
assert(!/sb_secret_|service_role|SERVICE_ROLE/.test(config));
console.log('WW Solar Cliente DEV — guardas de segurança básicas aprovadas.');
