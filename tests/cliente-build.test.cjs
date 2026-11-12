const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync('cliente-dev.html','utf8');
const js=fs.readFileSync('cliente-dev.js','utf8');
const out='dist-cliente-dev';
test('vitrine preserva estrutura original, mas exige login',()=>{
  for(const name of ['class="hero"','class="simulator"','class="result-card"','class="catalogue-section"','class="kit-grid client-product-grid"','id="client-checkout"'])
    assert(src.includes(name),name);
  assert(src.includes('id="client-app" hidden'));
  assert(js.includes("show('client-entry',false)"));
  assert(js.includes("show('client-app',true)"));
});
test('build público só contém arquivos permitidos',()=>{
  const files=fs.readdirSync(out).sort();
  const expected=['404.html','_headers','admin-dev.html','admin-dev.js','cliente-core.js','cliente-dev-config.js','cliente-dev.css','cliente-dev.html','cliente-dev.js','favicon.svg','index.html','styles.css','kit-builder-core.js','kits-admin-dev.html','kits-admin-dev.js','kits-admin-dev.css'].sort();
  assert.deepEqual(files,expected);
  for(const p of ['dados/catalogo-publico.json','dados/pecas-publicas.json','app.js','pecas.html','supabase/wwsolar-dev-schema.sql'])
    assert(!fs.existsSync(path.join(out,p)),p+' não deve ir para Pages DEV');
});
test('versão de login não acessa arquivos públicos de preços',()=>{
  for(const name of ['dados/catalogo-publico.json','dados/pecas-publicas.json'])
    assert(!js.includes(name));
  assert(js.includes("from('wwsolar_catalog')"));
});
