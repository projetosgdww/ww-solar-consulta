# WW Solar — piloto isolado do registro real de cotações DEV (16/11/2026)

## Objetivo
Exercitar o registro de um pedido TESTE em `drutoqwkjzdsirqthdux` sem alterar `wwsolar-quote` oficial, nem o endereço `catalogo.wwplatform.com.br`.

## Proteções
- Função independente `wwsolar-quote-pilot` com verificação JWT habilitada.
- Origin de 8 caracteres na prévia `https://xxxxxxxx.ww-solar.pages.dev` (não aceita domínio oficial ou aliases).
- Ação `submit` restrita ao papel **admin** autenticado via app_metadata.
- Confirmação `pilot_confirmation=REGISTRAR_TESTE_DEV` obrigatória, além de um `window.confirm` visível.
- Revalidação de carrinho, preços do catálogo, associação de projetos elétricos, quantidade e chave idempotente pelo backend.
- Sem envio automático ou navegação para WhatsApp. A tela mostra a mensagem persistida retornada pelo servidor.
- `status` e outras mutações administrativas indisponíveis no endpoint piloto.
- Banco DEV registra um pedido de teste de verdade. Esse piloto NÃO deve ser divulgado a clientes.

## Como usar após deploy isolado da função e da branch
1. Abra o link de *deploy preview com hash de oito caracteres* da branch `feat/wwsolar-piloto-cotacao-real-dev`, na rota `/cliente.html?piloto-pedido=1`.
2. Faça login com o administrador, coloque o kit 450 sem projeto e o kit 500 com projeto.
3. Clique em `Registrar pedido TESTE DEV` e confirme a pergunta.
4. Confirme referência real, total R$ 18.015,48, vínculo PRJ-B-010 apenas ao FOTUS-4200-DEYE-5 e visibilidade no histórico administrativo DEV.
5. Refaça a operação com a mesma `request_key` para validar idempotência; depois teste com novo pedido e cancele pelo fluxo administrativo regular caso necessário.

## Regras de liberação
**Não publicar** este piloto nos domínios oficiais. Não mesclar no release. Sem aprovação final, não substituir a função `wwsolar-quote`. A função de simulação `wwsolar-quote-preview` permanece ativa e sem escrita.

O comando do build testa `tests/quote-pilot-dev.test.cjs`. Os testes automatizados e o teste autenticado de ponta a ponta devem ser conferidos antes de considerar o piloto homologado.
