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

## Procedimento de backup gratuito — preparado, ainda NÃO executado
- A rotina Windows `backup-wwsolar-gratis.ps1` é disponibilizada como artefato da homologação. Usa Supabase CLI v3 `supabase db dump --remote=drutoqwkjzdsirqthdux` e exporta *schema* e dados de `public` separadamente.
- Destino local: `%LOCALAPPDATA%\\WW-Solar\\Backups\\AAAAmmdd-HHMMSS`, **fora do GitHub**. Gera manifesto de tamanho e SHA-256 e falha se SQLs estiverem vazios.
- Para executar: instalar Supabase CLI oficial e Docker quando requerido, autenticar-se na conta `Catálogo Online`, executar PowerShell `powershell -NoProfile -ExecutionPolicy Bypass -File .\\backup-wwsolar-gratis.ps1`, conferir hashes e guardar cópia criptografada offline.
- **Limite técnico:** `supabase db dump` exclui esquemas gerenciados (especialmente `auth`), Storage, segredos e código das Edge Functions. Esses componentes exigem plano de recuperação complementar e teste de restauração isolado. Nunca declarar backup completo só porque os arquivos SQL foram gerados.
- **Estado:** nenhum dump foi gerado nesta sessão (sem conexão CLI de banco nem execução no computador do operador); nenhuma restauração foi testada. Não promover a PROD até validar os arquivos.
- A branch release contém `.gitignore` para reduzir commits acidentais de arquivos privados; ele não substitui a disciplina de nunca colocá-los na pasta Git.

## Backup manual executado pelo operador em 12/11/2026
- Pasta: `C:\Users\Rina Brasil\WW-Solar-Backup\Backup-2026-11-12_17-26` (apenas no Windows do operador; nenhum SQL foi enviado ao GitHub).
- `estrutura.sql`: 18,11 KB, SHA-256 `373977DA6B621FCFE358EE5F8519168D08D6F75AF2663E2093BE6B2674BF9008`.
- `dados.sql`: 26,64 KB, SHA-256 `5377A50C5DDEA335DA6FDCC093135EA56A213BC982F577D83A6E1FE092C73EC6`.
- Saída CLI Supabase 3.1.0: ambos os dumps concluídos para `drutoqwkjzdsirqthdux`; Docker Engine 29.9.3 ativo.
- **Validação parcial:** existência, tamanho não zero e hashes confirmados pelo operador. Não foi realizada comparação de integridade de tabelas, restore, Auth, Storage nem recuperação integral.
- Próximas etapas: inventário local sem imprimir registros, segunda cópia criptografada, estratégia Auth e ensaio de restauração isolada. Não apagar dados de homologação.

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
