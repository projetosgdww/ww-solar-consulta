# WW Solar — Vitrine pública controlada (homologação)

## Estado e limites
- Branch isolada `feat/vitrine-publica-controlada-v1`.
- Catálogo oficial continua fechado e sem alteração de código/permissões.
- O DEV utiliza `dados/vitrine-preview.json`: snapshot sanitizado de 16/11/2026 com 25 kits Fotus, 51 peças e 7 projetos opcionais. **Não é feed em tempo real** e não deve ser usado em produção.
- O código da prévia já tenta a RPC `wwsolar_public_catalog()` e usa o snapshot **apenas em domínio de preview** quando a função ainda não existe. No domínio oficial, a ausência de RPC falha fechada: não anuncia preços antigos.\n- A API do Supabase não foi aberta ao papel `anon`.
- A consulta pública deverá incluir todos os kits futuros `active=true`, `approved=true` e com preço positivo; kits WW inativos ficam de fora.\n- A preparação da futura RPC está em `supabase/drafts/20261116_wwsolar_public_catalog_rpc.sql`. **Não executar** sem aprovação para o banco compartilhado.

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
1. Implantar uma consulta pública segura e **dinâmica** em ambiente isolado, substituir o snapshot. Validar RBAC/RLS e não permitir leitura de linhas internas.
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
- O SQL usa `security definer` de forma deliberada, pois a tabela bruta **não pode** tornar-se pública. Revisar redução de privilégios do owner antes de implantação definitiva; nenhuma tabela de cliente é referenciada na RPC.
- O domínio oficial não foi reimplantado. A prévia já tenta RPC antes de qualquer snapshot; a inspeção final em navegador sem login ainda deve ser executada antes da publicação.
