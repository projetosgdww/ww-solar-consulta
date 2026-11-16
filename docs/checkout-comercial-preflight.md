# WW Solar — Checkout comercial V2 | preparação sem deploy de produção

**Data da revisão:** 16/11/2026.
**Branch:** `feat/wwsolar-checkout-comercial-preflight-v2`.
**Base:** `feat/vitrine-publica-controlada-v1`.
**Ambiente comercial atual:** `catalogo.wwplatform.com.br` e produção Cloudflare Pages `release/wwsolar-pecas-v1`.
**Status:** candidato em revisão; **não implantar na produção sem liberação explícita**.

## Resultados usados como evidência
- Piloto DEV gravou `PED-0A2A9E26`, total R$ 17.697,06: Fotus 3,60 kWp Deye 3 kW + Fotus 4,20 kWp Deye 3 kW + PRJ-B-010 vinculado exclusivamente ao segundo.
- Reenvio HTTP autenticado da mesma `request_key`: `existing=true`, mesmo pedido; consulta posterior no Supabase DEV confirmou 6 registros, 6 chaves distintas e nenhuma duplicidade.
- A função real `wwsolar-quote` **atualmente publicada** no Supabase DEV compartilhado está na versão 7 sem `quote_version=2` e sem `verifyProjectAssociations`. Não substituir sem plano de publicação.
- Funções `wwsolar-quote-preview` e `wwsolar-quote-pilot` são exclusivas para testes e **não** devem ser selecionadas em produção.

## Preparação deste candidato
1. Mantém função oficial V2 no GitHub, com autenticação, validação de papel, atualização de status administrativo, cálculo autoritativo do catálogo, associação de projetos, `request_key` idempotente e mensagem gerada no servidor.
2. O frontend comercial exige `quote_version=2`, `project_link_snapshots=true` e `idempotent_request_key=true` ANTES de enviar `submit`. Falha fechada se não for atendido.
3. Antes de abrir o WhatsApp exige `data.order.total_cents === current.cents` e `quoteSnapshotMatches` de linhas, quantidades e vínculos; nunca complementa mensagem com rascunho local.
4. Usa **somente** o texto do servidor para `wa.me`; a abertura do WhatsApp é um rascunho de mensagem. O cliente precisa concluir o envio. O histórico não significa mensagem entregue.
5. A UI diferencia kits de mesmo título por inversor e SKU para evitar troca de composição. Preserva preços e margens existentes.
6. Em erro de rede, não declara que nenhum pedido foi gravado: orienta consultar o histórico antes de repetir.
7. A prévia mantém a ação `validate`, sem criar registros. Este candidato não contém o botão administrativo de teste de duplicidade nem função piloto.

## Ordem segura de publicação posterior
1. **Não liberar agora.** Revisar PR, documentação de preços, capacidade da API e permissões de produção. Confirmar URL, domínio, número WhatsApp comercial e número específico de projetos.
2. Fazer backup/referência do SHA comercial e da função publicada antes de qualquer alteração; confirmar a restauração da versão anterior.
3. Em janela controlada, publicar primeiro o frontend V2 em modo de bloqueio de pedidos quando o endpoint ainda é V1. Confirmar que a interface não cria pedidos enquanto capacidades V2 estão ausentes. Validar que o catálogo, login e painel Admin continuam funcionando.
4. Publicar apenas a função `wwsolar-quote` V2 candidata no projeto **explicitamente autorizado**, com `verify_jwt=true`, imports e allowlist de origens corretos. Nunca alterar a função `wwsolar-quote-pilot`.
5. Executar smoke tests controlados com conta autorizada: kit com projeto, kit sem projeto, projeto avulso, preço alterado, falta de estoque, carrinho expirado, usuário suspenso, retry idempotente, atualização de status e consulta ao histórico.
6. Fazer um teste de WhatsApp com destinatário comercial autorizado. Confirmar manualmente o destino, texto e que o **envio de mensagem depende de ação no WhatsApp**.
7. Só depois, abrir a funcionalidade para os clientes conforme decisão comercial. Monitorar falhas e rollback.

## Restrições
- Não mesclar branch de piloto na release.
- Não publicar preview como produção, não reabilitar deployments automáticos de produção sem aprovação.
- Não modificar dados/preços/carrinhos reais para executar testes.
- Alterar `wwsolar-quote` em projeto compartilhado pode afetar imediatamente qualquer frontend comercial existente: exige atenção à ordem, rollback e comunicação.
