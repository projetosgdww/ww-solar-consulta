# WW Solar — Plano de ativação comercial V2 e rollback

Revisão de 16/11/2026. O acesso e o histórico existentes devem ser preservados. Não modificar preços nem criar pedidos de demonstração em produção sem identificação de teste.

## Origem e backup imutável
- Projeto Cloudflare Pages: `ww-solar`; endereço `https://catalogo.wwplatform.com.br`; branch `release/wwsolar-pecas-v1`.
- Versão anterior de produção: `5600a77ad5ec5a13774bbc59f57a982901f5e88e` (canonical deployment `ad3ec4a5`).
- Branch de recuperação: `backup/wwsolar-release-before-v2-20261116`, criada da release V1 antes de atualizar.
- Supabase compartilhado: `ww-solar-clientes-dev` (`drutoqwkjzdsirqthdux`), embora o mesmo projeto também sirva o domínio oficial.
- Função original `wwsolar-quote` versão 7 idêntica a `supabase/functions/wwsolar-quote/index.ts` na branch de backup. JWT obrigatório.
- Funções `wwsolar-quote-preview` e `wwsolar-quote-pilot` não fazem parte do checkout comercial oficial.

## Conclusão de segurança
1. `wwsolar_public_catalog()` retorna somente campos da allowlist e produtos aprovados. A função é `SECURITY DEFINER`, mas o owner é `wwsolar_public_reader` (`NOLOGIN`, `NOBYPASSRLS`, sem acesso aos pedidos ou carrinhos e sem `CREATE` em `public`). O papel possui `SELECT` apenas nas 7 colunas comerciais de catálogo. Nenhum preço de custo, margem ou segredo é retornado.
2. O lint de `SECURITY DEFINER` público permanece esperado para esse contrato e deve ser revisto em auditoria periódica; evitar trocar para `SECURITY INVOKER` com grants públicos sobre a tabela confidencial. `anon` não possui `SELECT` na tabela interna.
3. O projeto está no plano Supabase **Free**. A detecção de senhas vazadas requer plano Pro; alertas permanecem. Medidas compensatórias: criação administrativa de contas, substituição obrigatória de senha temporária, senha pessoal com pelo menos 12 caracteres e RLS ativa.
4. RLS e funções: `authenticated` não pode inserir pedidos diretamente; apenas função autenticada revalida catálogo, SKUs, quantidades, vínculos por kit, preço em centavos, timestamp do carrinho e idempotência.
5. O endereço comercial utiliza o número WhatsApp principal `5585992723637` e, se houver projeto elétrico, o número `5585991170375` atualmente presente na configuração. A abertura de `wa.me` prepara uma mensagem: o consumidor precisa confirmar o envio no WhatsApp.

## Ordem de implantação controlada
1. Executar e revisar testes automatizados de checkout, associação de projetos, histórico administrativo e WhatsApp; evitar deploy se houver falha.
2. Implantar `wwsolar-quote` V2 no Supabase compartilhado, com `verify_jwt=true` e `quote-links.mjs`. O endpoint V2 é compatível com carrinhos legados e mantém a ação administrativa `status`.
3. Verificar imediatamente a versão e o conteúdo implantado; comparar total de pedidos antes/depois (o deploy não deve registrar pedidos).
4. Mover a release GitHub `release/wwsolar-pecas-v1` por fast-forward ao commit candidato (sem trazer códigos do piloto), preservando o SHA original e branch de backup.
5. Fazer deploy manual de **produção** no Cloudflare Pages com a branch release e o commit candidato; manter o deploy automático de produção desativado. Confirmar domínio e SHA canônico.
6. Validar vitrine sem login (RPC dinâmica), login administrativo e checkout com cotação simples. No navegador oficial, selecionar um kit sem projeto e outro kit com projeto, confirmar total e mensagem gerada.
7. Em um único pedido real/controlado, confirmar o número de referência persistido no histórico e a abertura de `wa.me` com telefone e mensagem corretos. **O envio da mensagem pelo WhatsApp depende da ação humana**. Não considerar link aberto como entrega.
8. Em falha, interromper divulgação do link, reimplantar o commit anterior na Cloudflare. Se a função V2 tiver falha, reimplantar a função V7 salva na branch de backup; frontend V2 falhará fechado sem capacidades V2.
9. Registrar resultado e tratar lints remanescentes no plano de melhoria.

## Portões de segurança
- Nunca usar `pilot_dev`, `PILOT_HOST`, `teste-idempotencia` ou `wwsolar-quote-pilot` no checkout oficial.
- Não incluir `dados/vitrine-preview.json` na release. Na falha de RPC, página pública deve falhar fechada.
- Não publicar chaves service_role em HTML ou JS.
- A cotação é uma solicitação de negociação sem pagamento automático.
- A produção é considerada operacional após teste do domínio real, não apenas após deploy bem-sucedido.
