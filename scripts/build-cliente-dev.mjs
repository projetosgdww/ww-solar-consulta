import { cp, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root=process.cwd();
const out=resolve(root,'dist-cliente-dev');
const allowed=[
  'cliente-dev.html','cliente-dev.js','cliente-dev.css','cliente-dev-config.js',
  'cliente-core.js','admin-dev.html','admin-dev.js','admin-dev.css','styles.css','favicon.svg'
];
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of allowed){
  const source=resolve(root,file);
  const info=await stat(source);
  if(!info.isFile())throw Error('Arquivo esperado não encontrado: '+file);
  await cp(source,join(out,file));
}
await writeFile(join(out,'index.html'),
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0; url=./cliente-dev.html"><title>WW Solar — Área do Cliente</title></head><body><p><a href="./cliente-dev.html">Abrir área do cliente</a></p></body></html>\n');
await writeFile(join(out,'404.html'),
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="robots" content="noindex,nofollow"><title>Página não encontrada</title></head><body><h1>Página não encontrada</h1><p><a href="/cliente-dev.html">Área do cliente WW Solar</a></p></body></html>\n');
await writeFile(join(out,'_headers'),
  '/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/*.html\n  Cache-Control: no-store\n');
console.log('Build V1 isolado concluído; nenhum catálogo JSON nem arquivo do site público foi copiado.');
