# WW Solar — Revisão comercial dos kits (13/11/2026)

**Origem:** decisões do administrador, não homologação elétrica. Os 32 rascunhos permanecem preservados no Supabase; dois foram retirados da oferta de revisão, restando 30.

## Ajustes por código

| Código | Regra solicitada | Alimentação | Situação |
|---|---|---|---|
| WW-Z600-16 | 1 × inversor 7,3 kW | verificar | diferença do fator 0,77: mínimo 7,392 kW; alerta |
| WW-Z600-18 | Fora da oferta | — | excluído da prévia |
| WW-Z600-20 | 1 × 6 kW + 1 × 3 kW | **trifásica** | 9 kW < 9,24 kW da regra; alerta |
| WW-Z600-22 | 2 × 6 kW | **trifásica** | verificar |
| WW-Z600-24 | 2 × 6 kW | **trifásica** | verificar |
| WW-Z600-26 | 2 × 6 kW | **trifásica** | dimensionamento por inversor pendente |
| WW-D625-06 | revisão comercial autorizada | verificar | SAJ 3 kW segue com corrente Imp acima da ficha; não homologado |
| WW-D625-08 | 2 × micro Deye 2,25 kW | verificar | 4 módulos por micro, conexão CA e entradas a confirmar |
| WW-D625-10 | 1 × 6 kW | verificar | confirmar ficha |
| WW-D625-12 | 1 × 6 kW | verificar | confirmar ficha |
| WW-D625-14 | 1 × 7,3 kW | verificar | confirmar ficha |
| WW-D625-16 | Fora da oferta | — | excluído da prévia |
| WW-D625-18 | 1 × 6 kW + 1 × 3 kW | **trifásica** | confirmar compatibilidade de corrente |
| WW-D625-20 | 2 × 6 kW | **trifásica** | verificar |
| WW-D625-22 | 2 × 6 kW | **trifásica** | verificar |
| WW-D625-24 | 2 × 6 kW | **trifásica** | verificar |
| WW-D625-26 | 1 × SAJ 15 kW trifásico 380 V | **trifásica** | confirmar rede 380 V e MPPT |

Outros kits, inclusive a linha DMEGC 710 W, continuam pela seleção comercial automática de potência × 0,77 e pela restrição anterior aos inversores de 10/10,5 kW; o 15 kW só entra excepcionalmente no WW-D625-26.

## Regras preservadas

- **Geração estimada mensal:** kWp × 128; é aproximação, não garantia de produção.
- **Preço:** soma das peças avulsas × 1,15.
- **Estrutura:** fixação cerâmica para cada 4 módulos (arredondamento), um perfil por módulo.
- **Cabos:** 2,5 m de cada cor por painel, em rolos separados de 25 m; 4 mm² para 4 módulos e 6 mm² acima de 4, sujeito a dimensionamento por percurso.
- **Conectores:** estimativa comercial por entradas CC; revisar quantidades antes de aprovar.
- **Sistema com dois inversores string:** pressupõe alimentação trifásica; deve ser validada no local, inclusive as exigências da distribuidora, balanceamento e conexão CA.
- **Rótulos técnicos:** decisões comerciais não retiram alertas de corrente, tensão, potência, ganho bifacial ou falta de ficha. Não há homologação nem publicação automática de kits na área do cliente.
