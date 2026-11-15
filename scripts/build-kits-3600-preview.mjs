// Prévia comercial DEV isolada: não usa Supabase, autenticação ou checkout.
// Nunca exportar custo, capturas internas ou registros completos para o site.
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const root=process.cwd(),out=join(root,'dist-cliente-dev');
const data=JSON.parse(await readFile(join(root,'catalog/preflight-kits-3600-20261115.json'),'utf8'));
const kits=data.records;
if(kits.length!==12||kits.some(x=>x.active||x.approved))throw Error('Prévia exige 12 kits não publicados');
const escaped=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const note='Kit pronto do fornecedor · Frete incluso para Canindé/CE. Prazo previsto: até 15 dias úteis, podendo acrescentar até 5 dias úteis após confirmação do pedido e da disponibilidade. Para outras cidades, frete sob consulta.';
const cards=kits.map((kit,i)=>{
 const x=kit.payload;
 const inverter=escaped(x.inversor);
 const qty=x.quantidadeInversores>1?x.quantidadeInversores+' unidades · ':'';
 const title=escaped(kit.title);
 return '<article class="kit-card kit-3600-card">'+
 '<div class="kit-top"><span class="kit-id">Kit de fornecedor · prévia</span><span class="kit-status">Em homologação</span></div>'+
 '<h3>'+title+'</h3>'+
 '<p class="kit-generation"><strong>460,8 kWh/mês</strong> de média mensal estimada*</p>'+
 '<div class="kit-facts">'+
 '<div><span>Módulos</span><strong>6 × 600 Wp</strong></div>'+
 '<div><span>Inversor</span><strong>'+qty+inverter+'</strong></div>'+
 '<div><span>Tipo de ligação</span><strong>Monofásica 220 V</strong></div>'+
 '</div>'+
 '<small class="client-muted">Inclui módulos, inversor, fixação, perfis, cabos e conectores.</small>'+
 '<small class="client-muted">'+escaped(note)+'</small>'+
 '<div class="kit-bottom"><div><small>Valor dos equipamentos</small><b>'+escaped(money(kit.price))+'</b></div><span class="kit-3600-disabled">Cotação indisponível na prévia</span></div>'+
 '<small class="client-muted">Estimativa de geração. Equipamentos, compatibilidade e instalação sujeitos à validação técnica antes da contratação.</small>'+
 '</article>';
}).join('\n');
const html=`<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>WW Solar | Prévia dos 12 kits 3,60 kWp</title>
<link rel="icon" href="./favicon.svg?v=20261115-limao-v1" type="image/svg+xml">
<link rel="stylesheet" href="./styles.css"><link rel="stylesheet" href="./cliente-dev.css"><link rel="stylesheet" href="./palette-wwsolar.css">
<style>
.kit-3600-notice{border:1px solid #ef9b77;background:#fff4ed;padding:16px 19px;border-radius:13px;margin:22px 0;color:#67351d}
.kit-3600-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:25px 0 40px}
.kit-3600-card{min-width:0}
.kit-3600-card .kit-facts strong{overflow-wrap:anywhere;text-align:right}
.kit-3600-card .client-muted{display:block;margin:10px 0;line-height:1.55}
.kit-3600-disabled{background:#eef3ed;color:#415a4c;border:1px solid #cbd7cc;padding:10px;border-radius:8px;font-weight:700;font-size:11px;text-align:center}
.kit-3600-top{padding:52px 0 0}
.kit-3600-top h1{font-size:clamp(28px,4vw,44px);line-height:1.12}
.kit-3600-top p{max-width:780px;line-height:1.6}
@media(max-width:920px){.kit-3600-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.kit-3600-grid{grid-template-columns:1fr}.kit-3600-top{padding-top:26px}}
</style></head>
<body>
<header class="header"><div class="shell header-inner"><a class="brand" href="./cliente.html"><span class="brand-symbol" aria-hidden="true"><svg viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="12" stroke="currentColor" stroke-width="4"/><path d="M22 2v7M22 35v7M2 22h7M35 22h7M8 8l5 5M31 31l5 5M36 8l-5 5M13 31l-5 5" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg></span><span class="brand-copy"><strong>WW<span>SOLAR</span></strong><small>PRÉVIA COMERCIAL DEV</small></span></a><nav class="nav"><a href="./cliente.html">Voltar ao catálogo</a></nav></div></header>
<main class="shell"><section class="kit-3600-top"><div class="section-label">TESTE VISUAL · 12 NOVOS KITS</div>
<h1>Kit solar 450 kWh/mês · 3,60 kWp</h1>
<p>Confira as 12 composições prontas do fornecedor. Potência: 6 × 600 Wp. Geração estimada: 460,8 kWh/mês pela regra comercial vigente.</p>
<div class="kit-3600-notice"><strong>Prévia de homologação — sem pedidos.</strong> Os produtos ainda não estão cadastrados para cotação. Este link serve apenas para conferência visual e de preços; o catálogo oficial não foi alterado.</div>
</section><section class="kit-3600-grid" aria-label="Doze novos kits em homologação">${cards}</section></main>
<footer class="footer"><div class="shell footer-inner"><span><strong>WW</strong>SOLAR</span><span>Prévia DEV, sem cotação · 12 composições para validação</span></div></footer>
</body></html>`;
if(/cost_brl|source_capture|internal_review|checkout|supabase\.co/i.test(html))throw Error('Prévia contém detalhe interno ou checkout');
await writeFile(join(out,'kits-3600-preview.html'),html,'utf8');
console.log('Prévia isolada criada: 12 kits, sem custos internos e sem checkout.');
