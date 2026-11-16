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
