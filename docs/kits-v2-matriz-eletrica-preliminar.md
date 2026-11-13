# WW Solar — Matriz preliminar das 32 configurações

> RASCUNHO: nenhum modelo foi homologado ou publicado automaticamente. Conferir o modelo exato do inversor e a configuração das strings antes de aprovar.

Fatores: geração média mensal = kWp × 128; inversor referência = kWp × 0,77; preço futuro = soma das peças × 1,15.

| Código | Potência CC | Geração estimada | Inversor mínimo | Candidato | Situação |
|---|---:|---:|---:|---|---|
| WW-Z600-06 | 3,60 kWp | 460,80 kWh | 2,772 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-Z600-08 | 4,80 kWp | 614,40 kWh | 3,696 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-Z600-10 | 6,00 kWp | 768,00 kWh | 4,62 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-Z600-12 | 7,20 kWp | 921,60 kWh | 5,544 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-Z600-14 | 8,40 kWp | 1.075,20 kWh | 6,468 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-Z600-16 | 9,60 kWp | 1.228,80 kWh | 7,392 kW | — | sem_inversor |
| WW-Z600-18 | 10,80 kWp | 1.382,40 kWh | 8,316 kW | — | sem_inversor |
| WW-Z600-20 | 12,00 kWp | 1.536,00 kWh | 9,24 kW | — | sem_inversor |
| WW-Z600-22 | 13,20 kWp | 1.689,60 kWh | 10,164 kW | — | sem_inversor |
| WW-Z600-24 | 14,40 kWp | 1.843,20 kWh | 11,088 kW | — | sem_inversor |
| WW-Z600-26 | 15,60 kWp | 1.996,80 kWh | 12,012 kW | — | sem_inversor |
| WW-D625-06 | 3,75 kWp | 480,00 kWh | 2,888 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D625-08 | 5,00 kWp | 640,00 kWh | 3,85 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D625-10 | 6,25 kWp | 800,00 kWh | 4,813 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D625-12 | 7,50 kWp | 960,00 kWh | 5,775 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D625-14 | 8,75 kWp | 1.120,00 kWh | 6,738 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D625-16 | 10,00 kWp | 1.280,00 kWh | 7,70 kW | — | sem_inversor |
| WW-D625-18 | 11,25 kWp | 1.440,00 kWh | 8,663 kW | — | sem_inversor |
| WW-D625-20 | 12,50 kWp | 1.600,00 kWh | 9,625 kW | — | sem_inversor |
| WW-D625-22 | 13,75 kWp | 1.760,00 kWh | 10,588 kW | — | sem_inversor |
| WW-D625-24 | 15,00 kWp | 1.920,00 kWh | 11,55 kW | — | sem_inversor |
| WW-D625-26 | 16,25 kWp | 2.080,00 kWh | 12,513 kW | — | sem_inversor |
| WW-D710-04 | 2,84 kWp | 363,52 kWh | 2,187 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D710-06 | 4,26 kWp | 545,28 kWh | 3,28 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D710-08 | 5,68 kWp | 727,04 kWh | 4,374 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D710-10 | 7,10 kWp | 908,80 kWh | 5,467 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D710-12 | 8,52 kWp | 1.090,56 kWh | 6,56 kW | PAV-038 (7.3 kW) | pendente_engenharia |
| WW-D710-14 | 9,94 kWp | 1.272,32 kWh | 7,654 kW | — | sem_inversor |
| WW-D710-16 | 11,36 kWp | 1.454,08 kWh | 8,747 kW | — | sem_inversor |
| WW-D710-18 | 12,78 kWp | 1.635,84 kWh | 9,841 kW | — | sem_inversor |
| WW-D710-20 | 14,20 kWp | 1.817,60 kWh | 10,934 kW | — | sem_inversor |
| WW-D710-22 | 15,62 kWp | 1.999,36 kWh | 12,027 kW | — | sem_inversor |

## Atenções identificadas
- SAJ 3 kW: limite operacional de 15 A na ficha R5-3K-S1-15, inferior às correntes Imp dos três módulos cadastrados. Bloquear seleção automática com os módulos dessas linhas.
- Deye 7,3 kW: ficha da variante SUN-7.3K-G05P1-EU-CM2 indica 18 A operacionais e 27 A de curto-circuito por entrada, mas SKU comercial PAV-038 não especifica esse sufixo. Confirmar correspondência.
- Outros inversores: sem ficha associada exatamente ao SKU; não homologar por potência nominal somente.
- DMEGC 710 W: avaliar aumento de corrente sob ganho bifacial e adequação de fixação para moldura de 33 mm.
- Faltam arranjos de strings por MPPT, Voc com temperatura, queda de tensão, trajetória dos cabos e quantidades definitivas de conectores.
- O preço não deve ser fechado sem definição de entradas CC e compatibilidade comprovada.

## Situação consolidada
- Kits: 32.
- pendente_engenharia: 15.
- sem_inversor: 17.
- A tabela não autoriza publicação de qualquer kit.
