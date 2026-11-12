# WW Solar — Fonte única de preços (fase DEV)

## Escopo implementado

- Fonte única da área autenticada e do montador: tabela `public.wwsolar_catalog` do projeto **ww-solar-clientes-dev**.
- Catálogo e carrinho do cliente consultam diretamente `wwsolar_catalog`.
- Montador administrativo consulta o mesmo catálogo, seus SKUs e preços de **venda avulsa** e oferece **Atualizar preços e produtos**.
- Cálculos do montador: revogar os acréscimos das peças (conforme regras comercialmente aprovadas) para obter *estimativas* de custo. Para custos de compra efetivamente confirmados, `wwsolar_piece_costs` tem prioridade quando não está desatualizada.
- `costSource` identifica estimativa, confirmação, pendência e confirmação desatualizada; custos estimados jamais são apresentados como custos reais comprovados.
- Acrescentar **15%** é exclusivo do total de custo **depois da reversão** (ou quando há custo real). Nunca aplicar 15% sobre valores avulsos já majorados.
- Rascunhos (12) estão bloqueados para publicação até validação de equipamentos, estrutura, strings, proteções, disponibilidade, frete e custos.

## Regras atuais (fonte: decisões comerciais WW Solar)

| Categoria | Preço avulso de venda | Custo inferido para o montador |
|---|---|---|
| Módulos | Custo + R$ 175 | Venda − R$ 175 |
| Inversores on-grid | Custo × 1,25 | Venda ÷ 1,25 |
| Microinversores | Custo × 1,25 | Venda ÷ 1,25 |
| Estruturas | Custo × 1,40 | Venda ÷ 1,40 |
| Cabos | Custo × 1,30 | Venda ÷ 1,30 |
| Componentes elétricos | Custo × 1,30 | Venda ÷ 1,30 |

A reversão assume que o preço avulso foi efetivamente gerado por essa política e não recebeu outros descontos/alterações. Não corresponde a comprovante de custo. Produtos sem preço ou de outras categorias não podem ser inferidos.

## Protocolo para próximas atualizações em lote

1. Receber arquivo/lista de fornecedor com data, centro de distribuição, SKU/código do fornecedor, descrição, categoria, preço **de compra**, disponibilidade e unidade comercial; identificar alterações ou novos produtos.
2. Conciliar com catálogo `PAV-...` por identificadores estáveis (não apenas por nome semelhante). Duplicações e ambiguidades vão para revisão, sem substituição silenciosa.
3. Gerar prévia: incluídos, atualizados, desativados, divergentes, preços antigos/novos, variação percentual, custos e margens. **Não publicar diretamente**.
4. Revisão do administrador: aceitar, rejeitar ou corrigir alterações relevantes, inclusive revisão técnica dos kits impactados.
5. Atualizar em transação a base de catálogo DEV (com origem, data e evidências quando disponíveis). Confirmar políticas de RLS e manter o histórico da revisão.
6. Atualizar montador DEV pelo botão próprio. Kit referenciado por SKU recalcula automaticamente; se o fornecedor alterar modelo, entrada CC ou estrutura, invalidar homologação.
7. Testar carrinho (incluindo alteração de valores após cotação de 25 minutos), disponibilidade, perfis admin/cliente, e somente então promover ofertas aprovadas em canais públicos.
8. **Importante:** a vitrine estática legada em GitHub Pages usa `dados/pecas-publicas.json` e **não é ainda sincronizada** automaticamente com Supabase. Antes de dizer que houve atualização 'ponta a ponta', acrescentar pipeline de exportação segura e aprovação da vitrine estática, ou migrar essa vitrine para a fonte central, mantendo acesso não público aos custos.

## Limites de homologação

O fator 0,77 para inversores, 3 m de cabo por módulo, um perfil por módulo e um kit de fixação para 4 painéis são apenas hipóteses de pré-composição; não substituem validação de tensão/corrente/strings, estruturas, proteções, bitola, queda de tensão, frete e requisitos de instalação. O total apresentado não deve ser vendido como 'kit completo aprovado' enquanto faltar qualquer componente obrigatório.

**Ambientes:** mudanças nesta fase somente em `ww-solar-clientes-dev` e branch `feat/wwsolar-area-cliente-dev`. Preservar repositório da vitrine pública e qualquer outro projeto sem autorização específica.
