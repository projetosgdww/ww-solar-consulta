/* WW Solar — Catálogo de equipamentos V3: dados de modelos identificados em fichas de fabricantes.
   Os valores não são médias universais nem substituem a etiqueta do aparelho.
   Sem referência confirmada: valor não é preenchido automaticamente. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WWSolarConsumo=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 // Modelos comerciais identificados por fichas do fabricante. Potência nominal/máxima
 // não equivale necessariamente ao consumo médio real; permitem ajuste pelo usuário.
 // Produtos sem ficha conferida NÃO recebem watts inventados: usuário informa dados.
 const appliances=Object.freeze([
  {
    "id": "ventilador",
    "label": "Ventilador",
    "mode": "watts",
    "watts": 140,
    "model": "Mondial VT-40-B",
    "sourceUrl": "https://www.mondial.com.br/ventilador-de-mesa-mondial-turbo-vt-40-b/p"
  },
  {
    "id": "ventilador-teto",
    "label": "Ventilador de teto",
    "mode": "watts",
    "watts": 131,
    "model": "Britânia Cancun BVT01B (131 W)",
    "sourceUrl": "https://www.britania.com.br/ventilador-britania-teto-cancun-bvt01b-126w/p"
  },
  {
    "id": "televisao",
    "label": "Televisor LED / Smart TV",
    "mode": "watts",
    "watts": 165,
    "model": "Samsung 55LS01B (consumo máximo)",
    "sourceUrl": "https://www.samsung.com/br/lifestyle-tvs/the-serif/ls01b-55-inch-the-serif-qled-4k-smart-tv-cloud-white-qn55ls01bagxzd/"
  },
  {
    "id": "notebook-comum",
    "label": "Notebook comum",
    "mode": "watts",
    "watts": 50,
    "basis": "estimativa",
    "note": "Valor fixo escolhido dentro da faixa informada (30–65 W); não é potência medida de um modelo."
  },
  {
    "id": "notebook-gamer",
    "label": "Notebook gamer",
    "mode": "watts",
    "watts": 200,
    "basis": "estimativa",
    "note": "Valor fixo escolhido dentro da faixa informada (130–300 W); não é potência medida de um modelo."
  },
  {
    "id": "pc-escritorio",
    "label": "PC de escritório",
    "mode": "watts",
    "watts": 225,
    "basis": "estimativa",
    "note": "Valor fixo escolhido dentro da faixa informada (150–300 W); não é potência medida de um modelo."
  },
  {
    "id": "pc-gamer",
    "label": "PC gamer intermediário",
    "mode": "watts",
    "watts": 550,
    "basis": "estimativa",
    "note": "Valor fixo escolhido dentro da faixa informada (450–650 W); não é potência medida de um modelo."
  },
  {
    "id": "pc-extremo",
    "label": "PC extremo",
    "mode": "watts",
    "watts": 950,
    "basis": "estimativa",
    "note": "Valor fixo escolhido dentro da faixa informada (750–1200 W); não é potência medida de um modelo."
  },
  {
    "id": "monitor",
    "label": "Monitor",
    "mode": "watts",
    "watts": 25,
    "model": "Samsung Essential S3 24 polegadas (máximo)",
    "sourceUrl": "https://www.samsung.com/br/monitors/full-hd-1080p/essential-monitor-s3-s32gf-24-inch-fhd-ips-120hz-ls24f320galmzd/"
  },
  {
    "id": "lampada",
    "label": "Lâmpada LED",
    "mode": "watts",
    "watts": 9,
    "model": "Positivo Casa Inteligente Smart Lâmpada Wi-Fi",
    "sourceUrl": "https://www.positivocasainteligente.com.br/smart-lampada"
  },
  {
    "id": "microondas",
    "label": "Forno micro-ondas",
    "mode": "watts",
    "watts": 1400,
    "model": "Brastemp BM146AE (potência informada na ficha)",
    "sourceUrl": "https://www.brastemp.com.br/micro-ondas-brastemp-de-embutir-32-litros-preto-com-18-receitas-pre-programadas-e-design-sofisticado-bm146ae/p"
  },
  {
    "id": "airfryer",
    "label": "Air fryer",
    "mode": "watts",
    "watts": 1500,
    "model": "Electrolux EAF170",
    "sourceUrl": "https://loja.electrolux.com.br/air-fryer-electrolux-por-rita-lobo-5-1l-cinza-expert-c-visor-1500w--eaf170-/p?workspace=master"
  },
  {
    "id": "chuveiro",
    "label": "Chuveiro elétrico",
    "mode": "watts",
    "watts": 5500,
    "model": "Lorenzetti Ducha Loren Comfort Eletrônica 127 V / 5500 W",
    "sourceUrl": "https://www.lorenzetti.com.br/noticias/releases/banho-quente-com-mais-conforto-lorenzetti-apresenta-a-ducha-loren-comfort-eletr%C3%B4nica-na-construsul-2026"
  },
  {
    "id": "bomba",
    "label": "Bomba d'água",
    "mode": "watts",
    "manual": true
  },
  {
    "id": "ar-9000",
    "label": "Ar-condicionado Split 9.000 BTU/h",
    "mode": "watts",
    "watts": 780,
    "basis": "inmetro",
    "model": "AGRATTO ZICST9QF-02",
    "source": "Inmetro PBE · 31/12/2025, páginas 1 e 67: potência consumida a 35 °C, carga total (780 W)",
    "sourceUrl": "https://pbe.inmetro.gov.br/",
    "variable": true
  },
  {
    "id": "ar-12000",
    "label": "Ar-condicionado Split 12.000 BTU/h",
    "mode": "watts",
    "watts": 1172,
    "basis": "inmetro",
    "model": "AGRATTO LCST12QF-02I",
    "source": "Inmetro PBE · 31/12/2025, páginas 1 e 67: potência consumida a 35 °C, carga total (1.172 W)",
    "sourceUrl": "https://pbe.inmetro.gov.br/",
    "variable": true
  },
  {
    "id": "ar-18000",
    "label": "Ar-condicionado Split 18.000 BTU/h",
    "mode": "watts",
    "watts": 1691,
    "basis": "inmetro",
    "model": "AGRATTO LCS18F - 02I",
    "source": "Inmetro PBE · 31/12/2025, páginas 2 e 68: potência consumida a 35 °C, carga total (1.691 W)",
    "sourceUrl": "https://pbe.inmetro.gov.br/",
    "variable": true
  },
  {
    "id": "ar-24000",
    "label": "Ar-condicionado Split 24.000 BTU/h",
    "mode": "watts",
    "watts": 2197,
    "basis": "inmetro",
    "model": "AGRATTO ZICST24QF-02",
    "source": "Inmetro PBE · 31/12/2025, páginas 1 e 67: potência consumida a 35 °C, carga total (2.197 W)",
    "sourceUrl": "https://pbe.inmetro.gov.br/",
    "variable": true
  },
  {
    "id": "geladeira",
    "label": "Geladeira",
    "mode": "monthly",
    "monthlyKwh": 39.7,
    "model": "Electrolux IW43S 389 L (kWh/mês)",
    "sourceUrl": "https://loja.electrolux.com.br/geladeira-electrolux-frost-free-duplex-efficient-com-autosense-inox-look-389l--iw43s-/p"
  },
  {
    "id": "freezer",
    "label": "Freezer",
    "mode": "monthly",
    "monthlyKwh": 31.3,
    "model": "Electrolux HI440 400 L inverter (kWh/mês)",
    "sourceUrl": "https://loja.electrolux.com.br/freezer-horizontal-electrolux-400l-com-tecnologia-inverter--hi440-/p?idsku=310120488"
  },
  {
    "id": "frigobar",
    "label": "Frigobar",
    "mode": "monthly",
    "manual": true
  },
  {
    "id": "liquidificador",
    "label": "Liquidificador",
    "mode": "watts",
    "watts": 550,
    "model": "Mondial L-550-W",
    "sourceUrl": "https://www.mondial.com.br/liquidificador-mondial-easy-power-550w-l-550-w/p"
  },
  {
    "id": "batedeira",
    "label": "Batedeira",
    "mode": "watts",
    "watts": 500,
    "model": "Mondial B-50-W",
    "sourceUrl": "https://www.mondial.com.br/batedeira-cake-premium-mondial-branco-500w-b-50-w-1/p"
  },
  {
    "id": "cafeteira",
    "label": "Cafeteira elétrica",
    "mode": "watts",
    "watts": 550,
    "model": "Mondial C-30 18X",
    "sourceUrl": "https://www.mondial.com.br/cafeteira-eletrica-dolce-arome-mondial-preto-inox-550w-c-30-18x-1/p"
  },
  {
    "id": "ferro",
    "label": "Ferro elétrico",
    "mode": "watts",
    "watts": 1200,
    "model": "Mondial FSN-55-B",
    "sourceUrl": "https://www.mondial.com.br/ferro-de-passar-a-seco-mondial-fsn-55-b/p"
  },
  {
    "id": "forno",
    "label": "Forno elétrico",
    "mode": "watts",
    "watts": 1800,
    "model": "Mondial FRN-52-BI",
    "sourceUrl": "https://www.mondial.com.br/forno-eletrico-mondial-52l-family-grill-inox-frn-52-bi/p"
  },
  {
    "id": "fogao",
    "label": "Fogão elétrico",
    "mode": "watts",
    "watts": 2000,
    "model": "Mondial FE-03 (2 chapas)",
    "sourceUrl": "https://www.mondial.com.br/fogao-eletrico-mondial-fast-cook-dual-fe-03/p"
  },
  {
    "id": "sanduicheira",
    "label": "Sanduicheira / grill",
    "mode": "watts",
    "watts": 750,
    "model": "Mondial S-20",
    "sourceUrl": "https://www.mondial.com.br/sanduicheira-mondial-s-20/p"
  },
  {
    "id": "panela",
    "label": "Panela elétrica de arroz",
    "mode": "watts",
    "watts": 700,
    "model": "Mondial PE-44-10X",
    "sourceUrl": "https://www.mondial.com.br/panela-eletrica-mondial-fast-rice-10-pe-44-10x/p"
  },
  {
    "id": "multiprocessador",
    "label": "Multiprocessador",
    "mode": "watts",
    "watts": 1000,
    "model": "Mondial MPN-02-BE",
    "sourceUrl": "https://www.mondial.com.br/multiprocessador-mondial-turbo-chef-3-em-1-1000w-preto/p"
  },
  {
    "id": "espremedor",
    "label": "Espremedor de frutas",
    "mode": "watts",
    "watts": 250,
    "model": "Mondial E-10 Turbo Premium 250 W",
    "sourceUrl": "https://www.mondial.com.br/extrator-de-sucos-mondial-turbo-premium-e-10/p"
  },
  {
    "id": "churrasqueira",
    "label": "Churrasqueira elétrica",
    "mode": "watts",
    "watts": 1800,
    "model": "Mondial CH-09-BI",
    "sourceUrl": "https://www.mondial.com.br/churrasqueira-elet--ch-09-bi-127v-60hz/p"
  },
  {
    "id": "aspirador",
    "label": "Aspirador de pó",
    "mode": "watts",
    "watts": 1400,
    "model": "Electrolux FLEXN",
    "sourceUrl": "https://loja.electrolux.com.br/aspirador-agua-po-flex-electrolux-flexn/p"
  },
  {
    "id": "secador",
    "label": "Secador de cabelo",
    "mode": "watts",
    "watts": 2000,
    "model": "Mondial SC-21",
    "sourceUrl": "https://www.mondial.com.br/secador-de-cabelo-space-shine-mondial-sc-21/p"
  },
  {
    "id": "lavadora",
    "label": "Lavadora de roupas",
    "mode": "cycle",
    "cycleKwh": 0.43,
    "model": "Electrolux LPR14 (kWh por ciclo)",
    "sourceUrl": "https://loja.electrolux.com.br/lavadora-branca-14kg-com-dispenser-autolimpante-lpr14-electrolux/p"
  },
  {
    "id": "exhaustor",
    "label": "Exaustor de fogão",
    "mode": "watts",
    "watts": 250,
    "model": "Mondial coifa/exaustor CF60-01 250 W",
    "sourceUrl": "https://www.mondial.com.br/coifa-de-parede-mondial-cf60-01/p"
  },
  {
    "id": "enceradeira",
    "label": "Enceradeira",
    "mode": "watts",
    "manual": true
  },
  {
    "id": "prancha",
    "label": "Prancha de cabelo / chapinha",
    "mode": "watts",
    "manual": true
  },
  {
    "id": "videogame",
    "label": "Videogame",
    "mode": "watts",
    "manual": true
  },
  {
    "id": "som",
    "label": "Aparelho de som",
    "mode": "watts",
    "manual": true
  },
  {
    "id": "outro",
    "label": "Outro equipamento",
    "mode": "watts",
    "manual": true
  },
  {
    "id": "ventilador-coluna",
    "label": "Ventilador de coluna",
    "mode": "watts",
    "watts": 140,
    "model": "Mondial VSP-40C-NB",
    "sourceUrl": "https://www.mondial.com.br/ventilador-coluna-mondial-super-power-6-pas-40-cm-vsp-40c-nb/p"
  },
  {
    "id": "forno-grande",
    "label": "Forno elétrico grande",
    "mode": "watts",
    "watts": 1800,
    "model": "Mondial FRN-60-BI",
    "sourceUrl": "https://www.mondial.com.br/forno-eletrico-mondial-family-grill-60-litros-preto-inox-frn-60-bi/p"
  }
].map(item=>Object.freeze(item)));
 const format=value=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(value);
 function calculate(input){
  const watts=Number(input?.watts),quantity=Number(input?.quantity),hours=Number(input?.hours),days=Number(input?.days);
  if(!Number.isFinite(watts)||watts<=0||watts>100000
   ||!Number.isSafeInteger(quantity)||quantity<1||quantity>100
   ||!Number.isFinite(hours)||hours<=0||hours>24
   ||!Number.isSafeInteger(days)||days<1||days>7)return null;
  const kwh=watts*quantity*hours*days*30/7/1000;
  return Number.isFinite(kwh)&&kwh<=1000000?kwh:null;
 }
 function calculateMonthly(input){
  const monthly=Number(input?.monthlyKwh),quantity=Number(input?.quantity);
  if(!Number.isFinite(monthly)||monthly<=0||monthly>100000
    ||!Number.isSafeInteger(quantity)||quantity<1||quantity>100)return null;
  const kwh=monthly*quantity;
  return Number.isFinite(kwh)&&kwh<=1000000?kwh:null;
 }
 function calculateCycles(input){
  const cycleKwh=Number(input?.cycleKwh),quantity=Number(input?.quantity),cyclesPerWeek=Number(input?.cyclesPerWeek);
  if(!Number.isFinite(cycleKwh)||cycleKwh<=0||cycleKwh>10000||!Number.isSafeInteger(quantity)||quantity<1||quantity>100||!Number.isSafeInteger(cyclesPerWeek)||cyclesPerWeek<1||cyclesPerWeek>35)return null;
  return cycleKwh*quantity*cyclesPerWeek*30/7;
 }
 function total(rows){return (Array.isArray(rows)?rows:[]).reduce((sum,row)=>sum+(Number(row?.kwh)||0),0);}
 return Object.freeze({appliances,format,calculate,calculateMonthly,calculateCycles,total});
});
