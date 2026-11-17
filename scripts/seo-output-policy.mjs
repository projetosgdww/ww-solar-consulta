// Políticas de indexação do catálogo WW Solar: separa preview e domínio oficial.
// A autorização comercial para indexar é implementada sem expor admin ou dados privados.
export const OFFICIAL_BRANCH='release/wwsolar-pecas-v1';
export const PUBLIC_ORIGIN='https://catalogo.wwplatform.com.br';

export function isOfficialSeoRelease(branch){
  return branch===OFFICIAL_BRANCH;
}
export function publicCatalogHtml(source,branch){
  const original='<meta name="robots" content="noindex,nofollow">';
  if(source.split(original).length!==2)throw Error('Meta robots de segurança ausente no HTML fonte');
  if(!source.includes('<link rel="canonical" href="'+PUBLIC_ORIGIN+'/">'))
    throw Error('Canonical público ausente');
  if(!source.includes('<meta name="description"'))throw Error('Metadescrição pública ausente');
  return isOfficialSeoRelease(branch)
    ?source.replace(original,'<meta name="robots" content="index,follow">')
    :source;
}
export function seoHeaders(branch){
  const base='/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/*.html\n  Cache-Control: no-store\n\n/sw.js\n  Cache-Control: no-cache\n\n/manifest.webmanifest\n  Cache-Control: no-cache\n';
  const hidden=['/admin.html','/admin-dev.html','/cliente-dev.html','/404.html']
    .map(path=>path+'\n  X-Robots-Tag: noindex, nofollow\n').join('\n');
  const preview='https://ww-solar.pages.dev/*\n  X-Robots-Tag: noindex, nofollow\n\nhttps://:version.ww-solar.pages.dev/*\n  X-Robots-Tag: noindex, nofollow\n';
  if(isOfficialSeoRelease(branch))return base+'\n'+preview+'\n'+hidden;
  return base+'\n/*\n  X-Robots-Tag: noindex, nofollow\n\n'+hidden;
}
export function seoDiscoveryFiles(branch){
  if(!isOfficialSeoRelease(branch))return {};
  return {
    'robots.txt':'User-agent: *\nAllow: /\nSitemap: '+PUBLIC_ORIGIN+'/sitemap.xml\n',
    'sitemap.xml':'<?xml version="1.0" encoding="UTF-8"?>\n'
      +'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      +'  <url><loc>'+PUBLIC_ORIGIN+'/</loc></url>\n'
      +'</urlset>\n',
  };
}
