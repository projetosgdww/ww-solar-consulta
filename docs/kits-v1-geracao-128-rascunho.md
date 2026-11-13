# WW Solar — 32 configurações e geração estimada

> RASCUNHO: não inserir nem liberar kits antes da homologação técnica e comercial.

Fórmula: **geração média mensal estimada = potência CC nominal em kWp × 128**. A geração real depende de local, orientação, perdas, clima e instalações.

| Módulo | Qtd. | Potência CC | Geração estimada |
|---|---:|---:|---:|
| ZNSHINE 600 W | 6 | 3,60 kWp | 460,80 kWh/mês |
| ZNSHINE 600 W | 8 | 4,80 kWp | 614,40 kWh/mês |
| ZNSHINE 600 W | 10 | 6,00 kWp | 768,00 kWh/mês |
| ZNSHINE 600 W | 12 | 7,20 kWp | 921,60 kWh/mês |
| ZNSHINE 600 W | 14 | 8,40 kWp | 1.075,20 kWh/mês |
| ZNSHINE 600 W | 16 | 9,60 kWp | 1.228,80 kWh/mês |
| ZNSHINE 600 W | 18 | 10,80 kWp | 1.382,40 kWh/mês |
| ZNSHINE 600 W | 20 | 12,00 kWp | 1.536,00 kWh/mês |
| ZNSHINE 600 W | 22 | 13,20 kWp | 1.689,60 kWh/mês |
| ZNSHINE 600 W | 24 | 14,40 kWp | 1.843,20 kWh/mês |
| ZNSHINE 600 W | 26 | 15,60 kWp | 1.996,80 kWh/mês |
| DMEGC 625 W | 6 | 3,75 kWp | 480,00 kWh/mês |
| DMEGC 625 W | 8 | 5,00 kWp | 640,00 kWh/mês |
| DMEGC 625 W | 10 | 6,25 kWp | 800,00 kWh/mês |
| DMEGC 625 W | 12 | 7,50 kWp | 960,00 kWh/mês |
| DMEGC 625 W | 14 | 8,75 kWp | 1.120,00 kWh/mês |
| DMEGC 625 W | 16 | 10,00 kWp | 1.280,00 kWh/mês |
| DMEGC 625 W | 18 | 11,25 kWp | 1.440,00 kWh/mês |
| DMEGC 625 W | 20 | 12,50 kWp | 1.600,00 kWh/mês |
| DMEGC 625 W | 22 | 13,75 kWp | 1.760,00 kWh/mês |
| DMEGC 625 W | 24 | 15,00 kWp | 1.920,00 kWh/mês |
| DMEGC 625 W | 26 | 16,25 kWp | 2.080,00 kWh/mês |
| DMEGC 710 W | 4 | 2,84 kWp | 363,52 kWh/mês |
| DMEGC 710 W | 6 | 4,26 kWp | 545,28 kWh/mês |
| DMEGC 710 W | 8 | 5,68 kWp | 727,04 kWh/mês |
| DMEGC 710 W | 10 | 7,10 kWp | 908,80 kWh/mês |
| DMEGC 710 W | 12 | 8,52 kWp | 1.090,56 kWh/mês |
| DMEGC 710 W | 14 | 9,94 kWp | 1.272,32 kWh/mês |
| DMEGC 710 W | 16 | 11,36 kWp | 1.454,08 kWh/mês |
| DMEGC 710 W | 18 | 12,78 kWp | 1.635,84 kWh/mês |
| DMEGC 710 W | 20 | 14,20 kWp | 1.817,60 kWh/mês |
| DMEGC 710 W | 22 | 15,62 kWp | 1.999,36 kWh/mês |

## Comportamento do simulador
- Exibir apenas kits com `kind=kit`, `active=true`, `approved=true` e preço positivo.
- Calcular geração via potência do kit × 128, não confiar em valor de geração digitado manualmente no catálogo.
- Escolher menor geração publicada igual ou superior à meta; listar todas as opções que a atingem, ordenadas por geração e preço.
- Quando nenhum kit atender, mostrar ausência de opção sem recomendar potência inferior.
- Manter peças avulsas e rascunhos inalterados.

## Regras comerciais homologáveis
- Telha cerâmica inicialmente; kit de fixação por cada grupo de 4 painéis; um perfil de alumínio separado por painel.
- Cabo vermelho e preto em linhas separadas, 2,5 m de cada cor por painel, rolos comerciais de 25 m, arredondamento para cima; até 4 painéis 4 mm² preliminar, acima de 4 painéis 6 mm² preliminar; dimensionamento técnico poderá corrigir.
- Um par de conectores por entrada CC efetivamente usada (verificar embalagens). Proteções elétricas excluídas nesta etapa.
- Preço = soma dos preços avulsos de venda × 1,15. Inversor: potência CC × 0,77 como triagem comercial e verificação obrigatória da compatibilidade elétrica.
- No DMEGC 710 W, validar divergência de moldura (33 mm no datasheet vs. 30 mm na descrição comercial).

**Nenhuma das 32 configurações foi aprovada ou publicada no banco.**
