# WW Solar — Vitrine pública controlada (homologação)

## Estado e limites
- Branch isolada `feat/vitrine-publica-controlada-v1`.
- Catálogo oficial permanece com o frontend fechado; o banco compartilhado recebeu uma RPC de leitura comercial controlada, sem abrir a tabela interna para visitantes.
- A consulta atual é dinâmica via RPC do Supabase. O DEV mantém `dados/vitrine-preview.json` de 16/11/2026 somente como fallback de homologação; **o snapshot não deve ir à produção**.
- O código da prévia já tenta a RPC `wwsolar_public_catalog()` e usa o snapshot **apenas em domínio de preview** se a consulta não responder. No domínio oficial, a ausência de RPC falha fechada: não anuncia preços antigos.\n- A API do Supabase não foi aberta ao papel `anon`.
- A consulta pública deverá incluir todos os kits futuros `active=true`, `approved=true` e com preço positivo; kits WW inativos ficam de fora.\n- A criação da RPC está registrada em `supabase/drafts/20261116_wwsolar_public_catalog_rpc.sql` (já aplicada). Seu reforço de menor privilégio foi aplicado e está documentado em `supabase/drafts/20261116_wwsolar_public_catalog_least_privilege.sql`.

## Contrato dos dados públicos
- Kit: id, tipo, título, preço e apenas potência, faixa de consumo, geração estimada e condições genéricas de entrega.
- Peça: id, tipo, título, preço e categoria.
- Projeto: id, tipo, título, preço e categoria.
- Proibido divulgar payload bruto, preço de custo, margens, notas, usuário, fornecedor/representante, tokens, carrinhos, pedidos ou dados de acesso.

## Funcionamento da prévia
- Visitante vê vitrine, preços, filtro por peça/kit, simulador e ofertas de projetos.
- Ao clicar em Ver detalhes, entra na tela de login e pode solicitar acesso via WhatsApp.
- Usuários ativos continuam com detalhes, histórico, carrinho e cotação protegidos.
- Após logout a navegação volta à vitrine.

## Checklist antes da produção
1. **Concluído:** RPC pública dinâmica, isolada por allowlist, com função executada por papel técnico sem login e sem BYPASSRLS.
2. Verificar preços e alterações na fonte sem publicar novamente a Cloudflare.
3. Testar anon, cliente ativo, suspenso, troca obrigatória de senha, admin e recuperação de senha.
4. Validar carrinho, checkout, histórico e cotação com tentativas de contorno pela API.
5. Conferir apresentação mobile, transparência de preços/frete e revisão legal.
6. Publicar em produção somente após aprovação expressa.

## Homologação da RPC dinâmica — 16/11/2026
- Migração aplicada no banco compartilhado: `wwsolar_public_catalog_readonly_v1`.
- Função: `public.wwsolar_public_catalog()`; sem parâmetros, somente leitura, resultado com allowlist comercial.
- Teste no contexto de `anon`: 83 itens = 25 kits + 51 peças + 7 projetos. Nenhum kit WW ativo. Valor de referência `FOTUS-3600-DEYE-3 = R$ 8.260,98`.
- `anon` **não** recebeu `SELECT` na tabela `public.wwsolar_catalog`; RLS da tabela e dos carrinhos permanece ativa.
- Verificação do payload da RPC: zero chaves fora da allowlist.
- Avisos dos advisors após migração: execução intencional de função `SECURITY DEFINER` para `anon` e `authenticated` (Supabase lints 0028 e 0029). Reavaliar modelo de privilégio antes de promoção a PROD: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable . Outros dois avisos preexistentes: tabela interna sem políticas (RLS ativo) e proteção contra senhas vazadas desativada.
- A RPC ainda usa `security definer` intencionalmente, mas desde a migração `wwsolar_public_catalog_least_privilege_v1` o owner é `wwsolar_public_reader`, papel `NOLOGIN`, sem `BYPASSRLS`, sem `CREATE` e com `SELECT` apenas nas sete colunas comerciais da tabela de origem. Não possui leitura de carrinhos, clientes nem dados internos. A política RLS `wwsolar_catalog_public_reader_select` restringe a leitura a produtos ativos, aprovados e com preço positivo. Supabase Advisors ainda apresenta lints 0028 e 0029 por detectar SECURITY DEFINER publicamente executável, embora o owner esteja limitado. Não tratar esses lints como resolvidos sem avaliação adicional.
- O domínio oficial não foi reimplantado. A prévia já tenta RPC antes de qualquer snapshot; a inspeção final em navegador sem login ainda deve ser executada antes da publicação.

## Revisão final de segurança — 16/11/2026
- Verificação com `SET LOCAL ROLE anon`: **83 itens** (25 kits, 51 peças, 7 projetos), **0 kits WW**; preço do kit `FOTUS-3600-DEYE-3` segue **R$ 8.260,98**.
- O visitante `anon` continua sem `SELECT` direto em `public.wwsolar_catalog`.
- `wwsolar_public_reader`: `NOLOGIN`, `NOBYPASSRLS`, `NOINHERIT`; sem `CREATE` no schema `public`, sem `SELECT` em `wwsolar_carts` ou `wwsolar_client_access`, nem em `updated_at` do catálogo.
- Estado DEV homologado pelo usuário: navegação livre, valores na vitrine, login sob demanda, retorno à vitrine e responsividade.
- Publicação oficial ainda exige liberação explícita. Verificar operação pós-merge sem snapshot, smoke test do checkout/login e validação de revisão jurídica/condições comerciais antes do lançamento.

## Simulação segura da cotação por kit — 16/11/2026
- O carrinho permite incluir um projeto para apenas um dos kits da mesma faixa, sem marcar o outro; o usuário homologou visualmente os dois sentidos.
- O backend original `wwsolar-quote` da produção **não foi reimplantado**. Sua atualização, ainda no GitHub, passa a validar `linkedKits` e `standaloneQty` contra os SKUs e as potências do catálogo.
- A função de testes `wwsolar-quote-preview` está **ativa** no Supabase, com JWT obrigatório, origem restrita a URLs de deploy preview de 8 caracteres e somente ação `validate`. Não contém operações de gravação e devolve itens e mensagem simulados.
- A versão DEV da Cloudflare `https://b14c70a8.ww-solar.pages.dev/cliente.html` passou em 89 testes automatizados (0 falhas). O botão de cotação em DEV **simula sem registrar pedido e sem abrir WhatsApp**.
- A relação `linked_kits` e a quantidade de serviço avulso `standalone_qty` serão gravadas dentro do campo existente `items` do pedido quando a atualização do backend oficial for autorizada. Não exige nova coluna.
- O painel admin preparado exibe explicitamente o nome e o SKU dos kits associados, sem presumir associação por faixa e sem perder compatibilidade com os itens legados.
- Ainda falta homologar manualmente a simulação no DEV com cliente autenticado e verificar que a mensagem gerada menciona apenas o kit selecionado. **Não mesclar PR nem publicar o backend oficial até essa validação e autorização expressa.**

## Pré-lançamento do envio real — 16/11/2026
- O backend candidato `wwsolar-quote` anuncia `{quote_version:2, project_link_snapshots:true, idempotent_request_key:true}` na ação autenticada `capabilities`, antes de qualquer INSERT.
- O frontend de produção candidato **não envia** o pedido se a ação de capacidades falhar ou não informar suporte ao vínculo por kit. A cotação permanece no carrinho.
- Depois da gravação, o cliente confere que `order.items` coincide integralmente com os itens, quantidades, `linked_kits` e `standalone_qty` antes de abrir WhatsApp, usando somente `message` do servidor.
- O reenvio com mesma `request_key` é idempotente no backend e preserva o histórico da primeira resposta.
- Corrigida a expressão regular que seleciona o WhatsApp específico de projetos: `/^55[0-9]{10,11}$/`.
- A função de simulação `wwsolar-quote-preview` segue ativa, autenticada e sem INSERT/UPDATE/DELETE. **O backend real ainda não foi implantado**.
- Prévia de homologação com guardas de compatibilidade: `https://2c4ac4d1.ww-solar.pages.dev/cliente.html`.
- Testes automatizados: 95 aprovados, nenhuma falha na compilação inicial. Homologação de pedido real e entrega do WhatsApp ficam condicionadas à liberação oficial.
