# WW Solar — Catálogo oficial somente kits geradores

Em 16/11/2026 o proprietário solicitou retirar as peças avulsas da vitrine e preservar os kits geradores. Os projetos elétricos PRJ-B continuam como serviços opcionais, inclusive vinculados a kits.

## Implementação segura
- Cliente anônimo: a vitrine descarta quaisquer produtos do tipo `piece` que não sejam `PRJ-B` com categoria `projetos`.
- Cliente autenticado: a listagem e o carrinho utilizam `quotableProduct`; somente kits geradores e projetos PRJ-B são considerados cotáveis.
- Peças avulsas em carrinhos existentes são preservadas para que o usuário possa removê-las, porém o checkout e a renovação ficam bloqueados até sua remoção.
- Edge Function oficial `wwsolar-quote` versão 9 rejeita novas cotações com peças avulsas antes de cálculo/INSERT, preservando idempotência, status e histórico.
- Tabela `wwsolar_catalog` e tabelas privadas do montador permanecem intactas. Nenhuma mudança de preço/custo.
- Migração `20261116205500_wwsolar_public_catalog_only_kits.sql` **NÃO APLICADA**: função `wwsolar_public_catalog` pertence a `wwsolar_public_reader` NOLOGIN; tentativa direta recusada por falta de owner; tentativa com `SET LOCAL ROLE` recusada por falta de permissão. Não alterar proprietário nem privilégios por atalho sem auditoria. A RPC antiga ainda pode retornar peças avulsas para chamadas diretas, embora a nova interface as filtre.
- Próxima revisão: executar alteração da RPC por administrador de DB explicitamente habilitado e confirmar que retorna 25 kits + 7 projetos, sem peças avulsas.

## Evidências e rollback
- Backup release anterior: `backup/wwsolar-before-kits-only-20261116`, commit `58a553709bd40beee7f1ebe1c56ac70689cc6272`.
- Preview de UI `d335dc41.ww-solar.pages.dev` compilado com 115/115 testes.
- Publicar em produção somente o frontend após verificar o guard de catálogo e backend.
- Para reversão, restaurar a branch de backup na Cloudflare e a função anterior `wwsolar-quote` V8 do mesmo commit; não mexer em pedidos.
- O projeto Supabase é compartilhado com a produção; mudanças no backend entram em vigor imediatamente, enquanto previews Cloudflare não afetam o HTML oficial.

## Próximas validações
- Confirmar visualmente a página oficial sem aba Peças Avulsas e com apenas cartões de kits.
- Confirmar funcionamento dos serviços PRJ-B e do histórico.
- Confirmar comportamento de carrinho antigo e bloqueio da cotação.
- Corrigir a RPC pública em janela separada, sem perder o proprietário de privilégio mínimo.
