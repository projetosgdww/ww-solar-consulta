# WW Solar — Preparação de produção V1 (somente peças)

Revisado em 12/11/2026. **Não publicar clientes reais antes de concluir o checklist.**

## Isolamento de ambientes
- DEV homologado: Cloudflare Pages `ww-solar-clientes-dev`, branch `feat/wwsolar-area-cliente-dev`, Supabase `drutoqwkjzdsirqthdux`; contém clientes de teste e o pedido `PED-602F1533`.
- Preparação PROD: Pages `ww-solar`, branch `release/wwsolar-pecas-v1`, build `node scripts/build-cliente-dev.mjs`, diretório `dist-cliente-dev`. Deploy automático desativado e nenhum deployment criado no momento da configuração.
- Arquivo `cliente-dev-config.js` desta branch está intencionalmente **sem URL e sem publishable key**, bloqueando login até backend PROD exclusivo estar disponível. Nunca apontar produção para o projeto DEV por conveniência.
- `catalogo.wwplatform.com.br` é um hostname sugerido, sem registro DNS existente no levantamento de 12/11; **não foi criado nem anunciado**. `solar.wwplatform.com.br` já possui AAAA e não deve ser sobrescrito.

## Escopo comercial
- Somente 50 peças aprovadas. Nunca publicar automaticamente os 58 kits legados nem os 12 rascunhos sem aprovação de engenharia.
- Administração Clientes/Pedidos, senha emitida pelo admin, sem convite/recuperação self-service.
- WhatsApp confirmado em 12/11: +55 85 99272-3637; abertura com mensagem preenchida não comprova envio.

## Gates antes do primeiro cliente PROD
1. Aprovar orçamento/organização de **novo Supabase PROD** dedicado; verificar custos com Supabase antes de criar, sem gerar custo sem autorização explícita.
2. Criar Auth e schema no PROD por migrações revisadas: policies RLS, GRANTs mínimos de service_role, auditoria de pedidos, snapshots imutáveis. Verificar versões e ordem das migrations, sem usar a base de teste.
3. Importar apenas as **50 peças aprovadas**, auditar SKUs, descrição, preços e margem comercial; evitar catálogo de custo e tabelas de referência no build público.
4. Implantar Edge Functions `wwsolar-create-customer` e `wwsolar-quote` com `verify_jwt=true`, origens CORS restritas ao domínio PROD e variáveis secretas no backend. Nunca expor service role no frontend.
5. Preencher apenas URL e publishable key da instância PROD em `cliente-dev-config.js`; modificar teste de segurança da release para exigir PROD e proibir referência DEV. Revisar endereço WhatsApp.
6. Executar CI de release, smoke test no deploy controlado, criar 2 contas de teste e validar bloqueio, RLS, idempotência, alteração de preço, cotação/histórico, responsividade e auditoria.
7. Configurar hostname `catalogo.wwplatform.com.br` somente após deploy validado; confirmar DNS, TLS e origens CORS; ativar produção com rollback documentado.
8. Fechar exposição do legado: PR #3 separado retira JSONs do HEAD da `main`, mas não apaga histórico público. Validar hospedagens antigas/caches e evitar assumir privacidade retroativa.
9. Habilitar/verificar proteção contra senhas comprometidas em Supabase Auth quando disponível; reexecutar Security Advisor. Configurar backup/monitoramento e responsável operacional.

**Estado atual: estrutura PROD reservada sem deploy e sem banco PROD. NÃO liberada para clientes.**
