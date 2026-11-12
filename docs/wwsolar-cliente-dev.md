# WW Solar — Área do Cliente DEV (12/11/2026)

## Objetivo aprovado

Manter a identidade visual existente (cores, logo, simulador e catálogo), com acesso por e-mail e senha fornecida pelo administrador. Cada cliente consulta kits e equipamentos, mantém um carrinho individual e abre seu pedido como **mensagem pré-preenchida** para o WhatsApp comercial (85) 99272-3637.

**Não** há tela de cadastro público, convite, recuperação de senha ou alteração de senha para o cliente. Na tela administrativa, o operador informa apenas o e-mail do cliente; o backend gera senha única forte e retorna as credenciais uma única vez. O administrador copia a mensagem e a encaminha por canal privado ao cliente. Senhas previsíveis como `nome123` **não são seguras**, portanto não são usadas.

## Estado atual

- Branch isolada `feat/wwsolar-area-cliente-dev`: código preparado, sem publicação.
- **Frontend DEV:** `cliente-dev.html`, `cliente-dev.css`, `cliente-dev.js`.
- **Admin DEV:** `admin-dev.html`, `admin-dev.js`; requer `app_metadata.wwsolar_role=admin` de um usuário verificado.
- **Catálogo protegido, carrinhos RLS e acesso ativo:** esboço SQL em `supabase/wwsolar-dev-schema.sql`.
- **Cadastro admin-only:** `supabase/functions/wwsolar-create-customer/index.ts`.
- **Configuração:** `cliente-dev-config.js` está intencionalmente vazia, então o login falha fechado.
- **Testes:** `node --check`, `node --test tests/cliente-core.test.cjs`, `node tests/cliente-security.test.cjs`.
- Nenhuma conta criada, nenhum e-mail disparado, nenhuma tabela criada, nenhum segredo transferido e nenhum projeto Supabase vinculado.

## Dependência para ativação real

Nenhum dos projetos Supabase atualmente conectados é dedicado exclusivamente ao catálogo WW Solar. Não utilizar automaticamente `ww-platform-dev`, `ww-platform-prod` ou os projetos `solar-studio-*`. Confirmar ambiente exclusivo e eventuais custos **antes** de criar um novo projeto Supabase ou aplicar SQL.

1. Provisionar backend exclusivo/isolado. Configurar Auth e desabilitar **cadastro público** (não impede a criação pelo administrador).
2. Aplicar `wwsolar-dev-schema.sql` em DEV. Validar RLS de duas contas A e B: A não lê/altera o carrinho de B; visitantes anônimos não consultam catálogo nem preço.
3. Criar usuário administrador autorizado por mecanismo administrativo seguro, definindo `app_metadata.wwsolar_role=admin` no servidor. Nunca por `user_metadata` editável pelo usuário.
4. Implantar Edge Function com `WWSOLAR_ALLOWED_ORIGINS` configurado para o domínio exato de homologação. Manter `SUPABASE_SERVICE_ROLE_KEY` **somente** em variáveis protegidas do backend.
5. Popular `wwsolar_catalog` apenas com produtos e kits homologados. Os 58 kits legados ainda não possuem composição revisada; não importá-los automaticamente como aprovados.
6. Preencher SOMENTE URL Supabase e chave pública em `cliente-dev-config.js`. Jamais colocar service role, senha ou custo interno no GitHub Pages.
7. Homologar: login correto, senha incorreta, usuário bloqueado, perfis A/B, carrinhos isolados, busca de kits, soma em centavos, indisponibilidade/preço alterado, mensagem do WhatsApp, responsividade e logout.
8. Após validação, migrar para rota definitiva e publicar. **Proteger os preços significa retirar os JSONs com preços e dados comerciais do GitHub Pages**. Um modal de login só no HTML não protege os arquivos `dados/catalogo-publico.json` e `dados/pecas-publicas.json`, que hoje são públicos. Histórico de arquivos anteriormente publicados pode continuar consultável; não prometer sigilo retroativo.

## Limites intencionais

- Carrinho é solicitação de cotação, **não pedido pago**. O usuário precisa tocar em **Enviar** no WhatsApp. Não há envio autônomo.
- Não criar venda ou compromisso de estoque ao apenas clicar. Valores e frete continuam sujeitos à confirmação.
- Credenciais enviadas em texto são um risco inerente ao fluxo escolhido; use senha aleatória exclusiva, canal privado e não reutilize credenciais. Não exibir ou registrar a senha depois do primeiro envio.
- Sem recuperação automática: se perder o acesso, o cliente contacta o administrador para reemissão por procedimento administrativo. Não reutilizar senha anterior e não divulgar senhas em logs.
- Catálogo antigo/usuários de outros produtos permanecem intocados até a migração controlada.

## Critérios para publicar

Exigir testes automatizados verdes, testes manuais de autenticação + RLS A/B no backend escolhido, zero vazamentos de informações comerciais em arquivos públicos, contato WhatsApp conferido e aprovação final do comportamento do carrinho. O visual do site institucional deve permanecer sem alterações.
