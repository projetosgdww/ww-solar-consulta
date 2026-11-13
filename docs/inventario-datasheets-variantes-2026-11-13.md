# WW Solar — Inventário de datasheets e variantes (13/11/2026)

**Escopo:** oito kits comerciais alvo: 300, 500, 800, 1000, 1200, 1500, 1800 e 2000 kWh/mês; somente módulos ZNSHINE 600 W (PAV-044), DMEGC 625 W (PAV-049), DMEGC 710 W (PAV-054). Documento de análise, não aprovação de engenharia nem catálogo comercial. Não modifica rascunhos nem publicação.

## Modelos / fontes recuperadas

| SKU | Descrição na loja | Variante da documentação | Fonte | Situação |
|---|---|---|---|---|
| PAV-034 | Deye micro 2,25 kW, referência S2.25K-G4 | **SUN-S225G4-EU-Q0** | PDF enviado pelo proprietário «655554 - Datasheet MICRO DEYE - SUN-S130-225G4-EU-Q0.pdf», pág. 2 | Família documentada; confirmar equivalência à referência comercial S2.25K-G4 |
| PAV-036 | SAJ 3 kW, 1 MPPT | **R5-3K-S1-15** | PDF oficial SAJ R5-3K-S1-15; https://www.saj-electric.com/hubfs/Brazil/Datasheet/R5-3K-S1-15_datasheet_pt_BR.pdf | Variante candidata forte; confirmar etiqueta física/código Soollar 677351 |
| PAV-037 | SAJ 6 kW, 2 MPPTs | **R5-6K-S2-15** | PDF enviado «Datasheet 5k 2mppt (2).pdf», pág. 3 | Variante candidata; confirmar etiqueta/código Soollar 665286 |
| PAV-038 | Deye 7,3 kW 2 MPPTs | **SUN-7.3K-G05P1-EU-CM2** | Manual Deye: https://pt.deyeinverter.com/deyeinverter/2026/04/27/BManualSUN-36-8K-G05P1-EU-CM220260427pt.pdf | Documento de família identificado, código do fornecedor 665373 não informa sufixo: confirmar |
| PAV-040 | SAJ 7,3 kW, 2 MPPTs | **R5-7.3K-S2-15** | Manual SAJ: https://br.saj-electric.com/hubfs/Guides%20and%20Manuals/R5/30302973_R5-%280.7K-8K%29-%28S1%2CS2%29-15_User_Manual_V1.0_pt-br.pdf | Variante candidata; confirmar SKU Soollar 657996 |
| PAV-057 | SAJ 15 kW trifásico 380V, 2 MPPTs | **R6-15K-T2-32** | PDF enviado «Datasheet 15k 380.pdf», pág. 3 | Nome da variante coincide com descrição comercial; confirmar etiqueta/código Soollar 413568 |

### Parâmetros críticos

**Deye micro SUN-S225G4-EU-Q0, pág. 2:** potência CA 2250 W; tensão CC máx. 60 V; start 20 V; MPPT 25–55 V; 4 entradas de módulo (2 MPPT, 2+2); corrente CC máx. operacional por entrada 16 A; curto CC máx. por entrada 24 A; potência admissível de módulo indicada 210–790 W, 4 peças. Verificar corrente bifacial real, conectores/ligação CA; a referência comercial S2.25K-G4 não comprova sozinha a variante Q0. Os 710 W possuem Imp 17,45 A > 16 A, portanto requerem análise específica (possível limitação de corrente) e não estão automaticamente homologados.

**SAJ 3k R5-3K-S1-15:** 1 MPPT, 15 A operação, 18 A curto, MPPT 50–450 V, tensão DC max. 500 V, partida 50 V; potência máxima FV **conflitante entre versões** de documentos SAJ (4500 W em manual e outras versões; 6000 W em datasheet da página do fabricante). NÃO fixar um número sem casar com a versão exata da unidade; Imp dos três módulos (15,25/15,55/17,45 A) > 15 A.

**SAJ 6k R5-6K-S2-15, ficha encaminhada pág. 3:** potência FV máx. 10.200 Wp (na ficha enviada), tensão CC máxima 600 V, MPPT 90–550 V, partida 100 V, 2 MPPTs 1 string por cada, corrente operacional 15/15 A, curto-circuito 18/18 A. **Manuais SAJ de versões diferentes indicam FV máximo de 9000 Wp**. Exigir correspondência ao lote/SKU antes de fixar o limite. Imp de todos os três módulos > 15 A; analisar com fabricante antes de aprovação.

**SAJ 7,3k R5-7.3K-S2-15 (manual oficial SAJ):** 2 MPPTs, 2 strings no MPPT1 e 1 no MPPT2; corrente limite por MPPT 30/15 A e Isc 36/18 A; MPPT 90–550 V, DC max 600 V, partida 100 V, potência FV máx 10.950 Wp segundo manual. Nota: 30 A no MPPT1 é limite agregado, não licença para exceder corrente por conector/string; verificar fabricante/variante e arranjo.

**Deye 7,3k SUN-7.3K-G05P1-EU-CM2:** manual oficial encontrado, mas não assumimos identificação segura com o produto abreviado da Soollar sem etiqueta/descrição completa. Parâmetros preliminares de ficha anterior: corrente operação 18 A, Isc 27 A, 2 MPPTs, 70–500 V, partida 80 V, DC máx 550 V, limite FV 10.950 Wp. **Reconferir no manual da variante** antes de aprovar.

**SAJ 15k R6-15K-T2-32, ficha encaminhada pág. 3:** arranjo FV máx. 30.000 Wp; CC máximo 1100 V; MPPT 180–1000 V, início 200 V; 2 MPPTs; 2 strings por MPPT; corrente operacional **32/32 A agregada por MPPT**, curto **38,4/38,4 A**; saída 3L+N+PE 220/380 V; nominal 15.000 W. Para strings em paralelo, somar correntes no MPPT e verificar conectores individuais, fusíveis e ganhos bifaciais.

### Módulos autorizados na linha de kits

- PAV-044 ZNSHINE 600 W: Imp 15,55 A; Isc 16,43 A; Vmp 38,60 V; Voc 45,80 V.
- PAV-049 DMEGC 625 W: Imp 15,25 A; Isc 16,17 A; Vmp 41,05 V; Voc 49,29 V; bifacial.
- PAV-054 DMEGC 710 W: Imp 17,45 A; Isc 18,52 A; Vmp 40,76 V; Voc 48,82 V; bifacial, verificar medida real da moldura (material anterior indica 33 mm, catálogo comercial 30 mm).

**Pendências transversais:** conferir coeficientes de temperatura, Voc mínima, tensões com temperatura de célula alta, módulos por string, Corrente (Imp/Isc e ganho bifacial), condições da rede CA, suportes, cabos, equipamentos de proteção e manual de integração do microinversor. Nenhum kit deve mudar automaticamente a flag de engenharia/aprovação por causa deste inventário.
