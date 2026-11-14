import { cp, mkdir, rm, writeFile, stat, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

// A geração por kWp e o filtro de kits devem passar nos testes antes do deploy.
execFileSync(process.execPath,['--test','tests/cliente-core.test.cjs','tests/kit-line-commercial-v2.test.cjs','tests/kit-line-eight-review.test.cjs','tests/password-setup.test.cjs','tests/fotus-kits-presentation.test.cjs'],{stdio:'inherit'});

const root=process.cwd();
const out=resolve(root,'dist-cliente-dev');
const allowed=[
  'cliente-dev.html','cliente-dev.js','cliente-dev.css','cliente-dev-config.js','cliente-pwa.js',
  'cliente-core.js','kit-line-commercial-v2.js','kit-line-eight-review.js','manifest.webmanifest','sw.js','privacidade.html','termos.html','legal.css','admin-dev.html','admin-dev.js','admin-dev.css','styles.css','favicon.svg'
];
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of allowed){
  const source=resolve(root,file);
  const info=await stat(source);
  if(!info.isFile())throw Error('Arquivo esperado não encontrado: '+file);
  await cp(source,join(out,file));
}
execFileSync(process.execPath,['scripts/generate-wwsolar-icons.mjs'],{stdio:'inherit'});
// URLs comerciais limpas sem mudar IDs internos, scripts ou estilos já homologados.
const customer=(await readFile(join(out,'cliente-dev.html'),'utf8'))
  .replaceAll('./admin-dev.html','./admin.html');
const admin=(await readFile(join(out,'admin-dev.html'),'utf8'))
  .replaceAll('./cliente-dev.html','./cliente.html')
  .replace('Acesso restrito · DEV','Acesso restrito');
const adminJs=(await readFile(join(out,'admin-dev.js'),'utf8'))
  .replaceAll("new URL('./cliente-dev.html',window.location.href)","new URL('./cliente.html',window.location.href)");
await writeFile(join(out,'index.html'),customer);
await writeFile(join(out,'cliente.html'),customer);
await writeFile(join(out,'admin.html'),admin);
await writeFile(join(out,'admin-dev.js'),adminJs);
const redirect=to=>'<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0; url='+to+'"><title>WW Solar</title></head><body><p><a href="'+to+'">Continuar para o WW Solar</a></p></body></html>\\n';
await writeFile(join(out,'cliente-dev.html'),redirect('./cliente.html'));
await writeFile(join(out,'admin-dev.html'),redirect('./admin.html'));
await writeFile(join(out,'404.html'),
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="robots" content="noindex,nofollow"><title>Página não encontrada</title></head><body><h1>Página não encontrada</h1><p><a href="/">Abrir WW Solar</a></p></body></html>\\n');
await writeFile(join(out,'_headers'),
  '/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/*.html\n  Cache-Control: no-store\n\n/sw.js\n  Cache-Control: no-cache\n\n/manifest.webmanifest\n  Cache-Control: no-cache\n');
console.log('Build V1 isolado concluído; nenhum catálogo JSON nem arquivo do site público foi copiado.');
