# WW Solar — Montador de Kits DEV V1

## Escopo
Ferramenta privada acessada pelo painel Admin DEV. Nova aba "Montador de kits · DEV" abre `montador.html` em deployment preview. A produção `catalogo.wwplatform.com.br` e o checkout `wwsolar-quote` não são modificados.

## Fluxo do administrador
1. Escolher peças avulsas do catálogo interno (somente id, descrição, categoria; **NÃO usa preço de venda como custo**).
2. Cadastrar o custo de compra do fornecedor (inicial: Sola), com potência elétrica para cálculos. Salvar o custo privado em `wwsolar_builder_costs`.
3. Adicionar peças à direita, ajustar quantidades, compor módulos, inversor, estrutura, cabos e conectores.
4. O cálculo mostra potência FV em kWp, geração **estimada** `kWp × 128`, custo das peças, despesas/frete, acréscimo percentual (25% padrão) e preço sugerido; um alerta preliminar sobre relação CC/CA não substitui projeto técnico.
5. Salvar na tabela `wwsolar_builder_drafts` com valores **congelados no instante do salvamento**. Reabrir, duplicar, atualizar manualmente custo da linha e salvar nova versão. Exportar JSON ou imprimir como PDF.
6. **Nenhum kit é publicado no catálogo**. Aprovação e integração comercial serão feitas em fase própria.

## Segurança
- RLS em ambas as tabelas privadas com `FORCE ROW LEVEL SECURITY`. `anon` não tem grants; permissões de `authenticated` exigem dono e claim administrativa em `app_metadata`.
- Nenhum `DELETE` é concedido. Todos os registros pertencem ao usuário autenticado.
- `montador.html` e scripts só são copiados no build Pages com `CF_PAGES_BRANCH=feat/wwsolar-montador-kits-dev-v1`. O painel DEV adiciona link restrito.
- Não modifica `wwsolar_catalog`, `wwsolar_quote_requests`, `wwsolar_carts` ou funções do checkout.
- Custos se referem ao fornecedor; preços do catálogo de venda não são custo histórico.
- Os dados administrativos estão em tabelas separadas do mesmo projeto Supabase que atende o catálogo oficial; a permissão e os nomes garantem isolamento lógico. Para isolamento físico completo, usar um projeto DEV distinto numa fase posterior.

## Limitações V1
- Seleção usa somente componentes já disponíveis na tabela de peças (não cadastra novos produtos comerciais).
- Potências inferidas do nome são sugestões editáveis; verificação de string, MPPT, tensão, corrente, cabos, frete e estoque depende de revisão técnica.
- Snapshot de cada custo é persistido no rascunho; custos atualizados exigem ação manual para atualizar linhas antigas.
- Uma única alteração por rascunho sobrescreve a versão anterior, mas mantém os valores históricos enquanto não atualizada explicitamente; histórico de revisões detalhado poderá vir depois.
- A identificação do fornecedor é livre por texto e pode separar custos por variações de nome.

## Critérios de aceite
- [ ] Build de preview com todos os testes.
- [ ] Acesso anônimo bloqueado para custos e drafts.
- [ ] Autenticação Admin verificada no navegador.
- [ ] Adicionar módulo + inversor, custo, frete, acréscimo e cálculo de geração.
- [ ] Salvar, abrir, duplicar e exportar JSON.
- [ ] Confirmar que pedidos e itens comerciais permanecem inalterados.

## Não fazer
Não implantar esta branch na produção, não ativar o catálogo automático e não divulgar preços de custo.
