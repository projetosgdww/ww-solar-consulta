# WW Solar — Matriz de 32 kits: potência, geração, MPPT e orçamento preliminar

> **RASCUNHO, NÃO HOMOLOGADO.** Cotações sujeitas à validação dos modelos exatos de inversores, arranjos CC, materiais e instalação. Nenhum kit foi publicado.

Cálculos: geração estimada mensal = kWp × 128; inversor mínimo nominal = kWp × 0,77; preço preliminar = preços avulsos das peças × 1,15. Uma string por MPPT, no máximo 2 MPPT nos modelos com ficha vinculada; tensões sob STC, e não Voc no frio.

| Código | kWp | kWh/mês | Mínimo CA | Inversor candidato | MPPT/strings STC | Preço preliminar | Situação |
|---|---:|---:|---:|---|---|---:|---|
| WW-Z600-06 | 3,60 | 460,80 | 2,772 | PAV-038 | 6 | R$ 8.648,70 | candidato_pendente |
| WW-Z600-08 | 4,80 | 614,40 | 3,696 | PAV-038 | 8 | R$ 10.576,10 | candidato_pendente |
| WW-Z600-10 | 6,00 | 768,00 | 4,620 | PAV-038 | 10 | R$ 12.664,34 | candidato_pendente |
| WW-Z600-12 | 7,20 | 921,60 | 5,544 | PAV-038 | 6+6 | R$ 14.965,49 | candidato_pendente |
| WW-Z600-14 | 8,40 | 1.075,20 | 6,468 | PAV-038 | 7+7 | R$ 17.053,73 | candidato_pendente |
| WW-Z600-16 | 9,60 | 1.228,80 | 7,392 | — | — | Pendente | ficha_modelo_pendente |
| WW-Z600-18 | 10,80 | 1.382,40 | 8,316 | — | — | Pendente | ficha_modelo_pendente |
| WW-Z600-20 | 12,00 | 1.536,00 | 9,240 | — | — | Pendente | ficha_modelo_pendente |
| WW-Z600-22 | 13,20 | 1.689,60 | 10,164 | — | — | Pendente | ficha_modelo_pendente |
| WW-Z600-24 | 14,40 | 1.843,20 | 11,088 | — | — | Pendente | sem_inversor_na_base |
| WW-Z600-26 | 15,60 | 1.996,80 | 12,012 | — | — | Pendente | sem_inversor_na_base |
| WW-D625-06 | 3,75 | 480,00 | 2,888 | PAV-038 | 6 | R$ 8.821,20 | candidato_pendente |
| WW-D625-08 | 5,00 | 640,00 | 3,850 | PAV-038 | 8 | R$ 10.806,10 | candidato_pendente |
| WW-D625-10 | 6,25 | 800,00 | 4,813 | PAV-038 | 5+5 | R$ 12.951,84 | candidato_pendente |
| WW-D625-12 | 7,50 | 960,00 | 5,775 | PAV-038 | 6+6 | R$ 15.310,49 | candidato_pendente |
| WW-D625-14 | 8,75 | 1.120,00 | 6,738 | PAV-038 | 7+7 | R$ 17.456,23 | candidato_pendente |
| WW-D625-16 | 10,00 | 1.280,00 | 7,700 | — | — | Pendente | ficha_modelo_pendente |
| WW-D625-18 | 11,25 | 1.440,00 | 8,663 | — | — | Pendente | ficha_modelo_pendente |
| WW-D625-20 | 12,50 | 1.600,00 | 9,625 | — | — | Pendente | ficha_modelo_pendente |
| WW-D625-22 | 13,75 | 1.760,00 | 10,588 | — | — | Pendente | sem_inversor_na_base |
| WW-D625-24 | 15,00 | 1.920,00 | 11,550 | — | — | Pendente | sem_inversor_na_base |
| WW-D625-26 | 16,25 | 2.080,00 | 12,513 | — | — | Pendente | sem_inversor_na_base |
| WW-D710-04 | 2,84 | 363,52 | 2,187 | PAV-038 | 4 | R$ 6.991,71 | candidato_pendente |
| WW-D710-06 | 4,26 | 545,28 | 3,280 | PAV-038 | 6 | R$ 9.407,70 | candidato_pendente |
| WW-D710-08 | 5,68 | 727,04 | 4,374 | PAV-038 | 8 | R$ 11.588,10 | candidato_pendente |
| WW-D710-10 | 7,10 | 908,80 | 5,467 | PAV-038 | 5+5 | R$ 13.929,34 | candidato_pendente |
| WW-D710-12 | 8,52 | 1.090,56 | 6,560 | PAV-038 | 6+6 | R$ 16.483,49 | candidato_pendente |
| WW-D710-14 | 9,94 | 1.272,32 | 7,654 | — | — | Pendente | ficha_modelo_pendente |
| WW-D710-16 | 11,36 | 1.454,08 | 8,747 | — | — | Pendente | ficha_modelo_pendente |
| WW-D710-18 | 12,78 | 1.635,84 | 9,841 | — | — | Pendente | ficha_modelo_pendente |
| WW-D710-20 | 14,20 | 1.817,60 | 10,934 | — | — | Pendente | sem_inversor_na_base |
| WW-D710-22 | 15,62 | 1.999,36 | 12,027 | — | — | Pendente | sem_inversor_na_base |

## Status e limitações
- **candidato_pendente**: inversor com corrente e limites STC preliminarmente plausíveis segundo ficha não vinculada a SKU exato; não equivale a homologação.
- **ficha_modelo_pendente**: existem inversores com potência CA suficiente, mas sem ficha elétrica exata vinculada ou sem candidato que passe a triagem.
- **sem_inversor_na_base**: nenhum inversor de potência nominal suficiente cadastrado.
- SAJ 3 kW (PAV-036): ficha R5-3K-S1-15 informa Imp máxima de 15 A, abaixo das Imp dos módulos destas famílias. Bloqueado automaticamente com esses módulos.
- Deye 7,3 kW (PAV-038): confirmar associação exata com a variante SUN-7.3K-G05-P1-EU-CM2 antes de qualquer liberação.
- SAJ 7,3 kW (PAV-040): ficha identifica corrente 30 A / 15 A entre MPPT1 e MPPT2 (MPPT1 com duas strings e máximo 30 A agregado); sem detalhamento por string/fabricante suficiente, motor usa 15 A conservadores por string. Nenhuma aprovação automática.
- Todas as divisões de strings foram calculadas com tensões STC; a tensão Voc em temperatura mínima, ganho bifacial, posicionamento e cabeamento real exigem revisão por projeto.
- As entradas CC e conectores são **estimativa comercial** a partir da divisão proposta, não componentes/quantidades homologados.

## Resumo
- Configurações: 32.
- candidato_pendente: 15.
- ficha_modelo_pendente: 10.
- sem_inversor_na_base: 7.
- Publicados: 0.
