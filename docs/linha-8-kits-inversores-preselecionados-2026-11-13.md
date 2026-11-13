# WW Solar — Oito faixas de geração: inversores pré-selecionados

Decisões comerciais do proprietário em 13/11/2026. Documento preparatório de engenharia: **não publica kits, não marca engenharia aprovada e não substitui validação de fichas, strings e rede**.

| Faixa mensal | Inversor indicado | SKU WW Solar | Situação |
|---|---|---|---|
| **WW-300 · 300 kWh/mês** | **1 × micro Deye 2,25 kW; 4 × ZNSHINE 600 W = 2,4 kWp (307,2 kWh/mês)** | **PAV-034 + 4 × PAV-044** | **composição comercial escolhida; verificar documentação/fornecedor** |
| **WW-500 · 500 kWh/mês** | **1 × SAJ 3 kW (alternativa comercial a 2 micros); candidato 7 × ZNSHINE 600 W = 4,2 kWp (537,6 kWh/mês)** | **PAV-036 + 7 × PAV-044** | **corrente Imp 15,55 A > 15 A: precisa aval do fabricante; variante 1 MPPT** |
| **WW-800 · 800 kWh/mês** | **1 × SAJ 6 kW; candidato 10 × DMEGC 625 W = 6,25 kWp (800 kWh/mês)** | **PAV-037 + 10 × PAV-049** | **corrente Imp 15,25 A > 15 A: precisa aval do fabricante** |
| **WW-1000 · 1.000 kWh/mês** | **SAJ 6 kW monofásico** | **PAV-037** | **escolha comercial confirmada** |
| **WW-1200 · 1.200 kWh/mês** | **SAJ 7,3 kW monofásico** | **PAV-040** | **escolha comercial confirmada** |
| **WW-1500 · 1.500 kWh/mês** | **SAJ 15 kW trifásico 380 V** | **PAV-057** | **escolha comercial confirmada** |
| **WW-1800 · 1.800 kWh/mês** | **SAJ 15 kW trifásico 380 V** | **PAV-057** | **escolha comercial confirmada** |
| WW-2000 · 2.000 kWh/mês | SAJ 15 kW trifásico 380 V (candidato anterior) | PAV-057 | aguardar dimensionamento |

Utilizar nos kits apenas PAV-044 (ZNSHINE 600 W), PAV-049 (DMEGC 625 W) e PAV-054 (DMEGC 710 W), respeitando a escolha do proprietário.

**Pontos de verificação críticos:**
- SAJ R5-6K-S2-15: documentação enviada indica 15 A por MPPT; módulos escolhidos têm Imp STC superior a 15 A. Confirmar possibilidade formal de associação e efeito de limitação de corrente com fabricante, além de potência FV máxima, strings, Voc em temperatura mínima e variante exata.
- SAJ 7,3 kW R5: a documentação encontrada cobre variantes de 7 kW e 7,5 kW e referências ao modelo 7,3 kW de outro material; confirmar designação exata do item de distribuidora antes de atribuir limites. Não supor homologação.
- SAJ 15 kW R6-15K-T2-32: 380 V trifásico é condição de aplicação; confirmar rede disponível, estudo de conexão, correntes por MPPT/strings, tensões e potência CC.
- As faixas são kWh/mês de referência, e não kW; estimativa comercial prévia kWp × 128 kWh/mês.
- Não modificar rascunhos de 32 kits anteriores nem catálogo do cliente enquanto estas oito composições não forem tecnicamente verificadas.

## Lista comercial preliminar — faixas menores (13/11/2026)

**WW-300**: 4 módulos ZNSHINE 600 W (PAV-044), 1 micro Deye 2,25 kW (PAV-034), 4 perfis de alumínio 2,36 m (PAV-024), 1 kit de fixação cerâmica para 4 módulos (PAV-029), 1 rolo de 25 m de cabo CC vermelho 4 mm² (PAV-001) e 1 rolo de 25 m de cabo CC preto 4 mm² (PAV-002). **Não adicionar automaticamente mais itens à lista comercial sem autorização**; confirmar conectores originais do micro, sua montagem/fixação e circuitos CA na execução do projeto. Pela ficha Deye SUN-S225G4-EU-Q0, 4 entradas FV com limite operacional 16 A, Isc 24 A por entrada e MPPT 25–55 V; ZNSHINE 600W: Imp 15,55 A, Isc 16,43 A, Vmp 38,60 V, Voc 45,80 V. Compatibilidade STC é preliminar. Confirmar que a referência S2.25K-G4 do fornecedor corresponde à variante SUN-S225G4-EU-Q0.

**WW-500**: preferir economicamente **1 SAJ 3 kW PAV-036** em vez de **2 micro Deye PAV-034**. Candidato 7 × ZNSHINE 600 W (4,2 kWp, 537,6 kWh/mês); conferir compatibilidade exata do SAJ 3K-R5 1 MPPT, corrente operacional 15 A versus 15,55 A do módulo, Voc corrigida por temperatura, faixa MPPT, potência máxima FV e cabos/estrutura. **Não marcar como aprovado enquanto a corrente estiver pendente**. Uma alternativa com 2 micros exige outra topologia e não foi aprovada como escolha principal.

**WW-800**: escolher **1 SAJ 6 kW PAV-037**. Candidato 10 × DMEGC 625 W (6,25 kWp, 800 kWh/mês); verificar Imp do módulo 15,25 A acima de 15 A por MPPT na ficha SAJ R5-6K-S2-15; arranjo elétrico de duas strings, coeficientes de temperatura, corrente bifacial e compatibilidade da variante exata. **Não homologado ainda**.

Os demais kits continuam conforme tabela principal; os kits WW-1000 e WW-800 podem compartilhar o mesmo SKU de inversor SAJ 6 kW, mas são kits separados.
