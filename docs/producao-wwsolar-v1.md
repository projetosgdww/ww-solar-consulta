# WW Solar — Preparação de produção V1 (somente peças)

Revisado em 12/11/2026. **Estratégia custo zero aprovada: um único Supabase existente no Catálogo Online, sem contratação. Não publicar clientes reais antes de concluir o checklist.**

## Isolamento de ambientes
- DEV homologado: Cloudflare Pages `ww-solar-clientes-dev`, branch `feat/wwsolar-area-cliente-dev`, Supabase `drutoqwkjzdsirqthdux`; contém clientes de teste e o pedido `PED-602F1533`.
- Preparação PROD: Pages `ww-solar`, branch `release/wwsolar-pecas-v1`, build `node scripts/build-cliente-dev.mjs`, diretório `dist-cliente-dev`. Deploy automático desativado e nenhum deployment criado no momento da configuração.
- Arquivo `cliente-dev-config.js` desta branch está intencionalmente **sem URL e sem publishable key**, bloqueando login. Antes de conectar à base existente é necessário promovê-la formalmente a PROD, com backup/exportação, separação ou limpeza controlada dos dados de teste, revisão de políticas e smoke tests. Não operar DEV e PROD ativos ao mesmo tempo no mesmo backend sem segregação segura.
- `catalogo.wwplatform.com.br` é um hostname sugerido, sem registro DNS existente no levantamento de 12/11; **não foi criado nem anunciado**. `solar.wwplatform.com.br` já possui AAAA e não deve ser sobrescrito.

## Auditoria atual sem alterações de dados (12/11/2026)
- Catálogo: 50 peças `active=true, approved=true`; 58 kits `active=false, approved=false`.
- RLS ativo nas sete tabelas `wwsolar_*`.
- 2 clientes de homologação, 1 pedido e 1 evento de auditoria. Nenhum registro excluído ou reclassificado.
- Edge Functions `wwsolar-create-customer` (versão 4) e `wwsolar-quote` (versão 3) ativas, ambas com `verify_jwt=true`.
- Security Advisor: 1 aviso de senha vazada; sem outros avisos no retorno de segurança. O recurso de detecção de senha vazada é exclusivo do plano Pro ou superior conforme documentação oficial.
- Ausência de cópia de segurança ou restauração testada impede promover o único banco para atendimento de produção hoje.
- Compensação do plano Free: senhas geradas aleatoriamente pelo administrador; ainda necessário revisar rate limiting, configurações de Auth e política de recuperação.

## Escopo comercial
- Somente 50 peças aprovadas. Nunca publicar automaticamente os 58 kits legados nem os 12 rascunhos sem aprovação de engenharia.
- Administração Clientes/Pedidos, senha emitida pelo admin, sem convite/recuperação self-service.
- WhatsApp confirmado em 12/11: +55 85 99272-3637; abertura com mensagem preenchida não comprova envio.

## Gates antes do primeiro cliente PROD
1. **Custo zero:** Supabase informou US$ 0/mês para outro projeto, mas a criação falhou por limite global de 2 projetos gratuitos. Nenhuma cobrança autorizada. A organização escolhida é Catálogo Online (`ebmgztrxhvyrknexeupk`), contendo atualmente `ww-solar-clientes-dev` (`drutoqwkjzdsirqthdux`). Adotar **promoção planejada da instância existente** em vez de novo projeto.
2. Antes da promoção: fazer backup/exportação verificável do schema e dados, documentar clientes/pedidos de teste e preservar evidências; definir tratamento dos testes sem apagar histórico às cegas. Não usar simultaneamente o mesmo projeto como ambientes DEV e PROD independentes.
3. Revalidar as sete tabelas com RLS, policies de isolamento, GRANTs mínimos de `service_role`, auditoria de pedidos, snapshots imutáveis e funções. Auditar as 50 peças aprovadas, sem publicar os 58 kits legados e 12 rascunhos.
4. Revisar Edge Functions `wwsolar-create-customer` e `wwsolar-quote`, `verify_jwt=true`, origens CORS restritas ao domínio definitivo e variáveis secretas no backend. Nunca expor service role no frontend.
5. **Somente após aceite da promoção do banco existente:** preencher a URL e a chave pública atuais em `cliente-dev-config.js` e trocar a guarda de teste da release por validação explícita desse projeto promovido. Revisar número WhatsApp.
6. Executar CI de release, smoke test no deploy controlado, criar 2 contas de teste e validar bloqueio, RLS, idempotência, alteração de preço, cotação/histórico, responsividade e auditoria.
7. Configurar hostname `catalogo.wwplatform.com.br` somente após deploy validado; confirmar DNS, TLS e origens CORS; ativar produção com rollback documentado.
8. Fechar exposição do legado: PR #3 separado retira JSONs do HEAD da `main`, mas não apaga histórico público. Validar hospedagens antigas/caches e evitar assumir privacidade retroativa.
9. Security Advisor em 12/11: alerta `auth_leaked_password_protection`; **recurso indisponível no Free**, conforme tabela de preços oficial do Supabase. Não contratar Pro só para ocultar alerta. Compensar com senha aleatória de 72 bits emitida pelo administrador, restrição de cadastro e revisão de política de senha/rate limits; registrar risco residual. Configurar estratégia de backups/exportações manuais e monitoramento compatíveis com Free.

**Estado atual: projeto Pages PROD reservado sem deploy. Banco gratuito existente homologado apenas como DEV; promoção ainda não realizada. NÃO liberada para clientes.**
