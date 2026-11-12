# WW Solar — decisão de lançamento V1 (somente peças)
Atualização: 12/11/2026. Ambiente auditado: `ww-solar-clientes-dev`.

## Escopo aprovado
- Catálogo: **50 peças avulsas** com `active=true` e `approved=true`; nenhum kit liberado.
- Fluxo: cliente autorizado -> catálogo -> carrinho -> cotação (Edge Function server-side) -> WhatsApp com mensagem pré-preenchida -> painel de pedidos e trilha de mudança de status.
- Administração diária: **Clientes** e **Pedidos**. Sem convite, auto-cadastro nem recuperação pelo cliente. Admin cria acesso, reemite senha e bloqueia/reativa.
- Técnico/comercial: preços só atualizados de forma assistida e revisada; não abrir montador de kits no site comercial.

## Evidência E2E comprovada pelo operador e pelo banco
- Login admin/cliente e navegação nas duas abas.
- Cliente testou carrinho de 1 módulo 585 W, referência R$ 760,00; renovação da validade para 25 minutos.
- Erro HTTP 500 inicial foi diagnosticado como falta de GRANT de `service_role` para leitura do carrinho; corrigidos GRANTs internos para `wwsolar_carts`, `wwsolar_catalog` e `wwsolar_client_access.active`.
- Pedido `PED-602F1533`, total 76000 centavos, registrado com sucesso; WhatsApp abriu com o texto, **sem comprovação do envio**.
- Situação alterada de `registrado` para `em_atendimento` e evento persistido em `wwsolar_quote_status_events`. Snapshot de preço imutável.
- Banco: 1 pedido real de homologação, 1 evento; 50 peças aprovadas; 58 kits legados desativados, 12 kits novos com `engineering_approved=false` e `published=false`.
- Integridade comercial: 0 SKU inválido para checkout, 0 descrição inadequada, 0 preço <=0, 0 preço sem precisão de centavos.
- SQL regression `tests/wwsolar-quote-rls-dev.sql`: 11/11 PASS (inclui preflight de permissões internas).
- CI referência: GitHub Actions run 43283983572 `success` no commit `34634ef`.
- Frontend DEV Pages commit `b8bf703` publicado com sucesso; tela nova de Clientes/Pedidos confirmada em screenshots.

## Bloqueios para abertura irrestrita de produção
1. **Provisionamento de cliente novo em E2E:** criar uma conta via painel e validar login e bloqueio/reativação com essa conta. A estrutura/credenciais aleatórias já está implementada, mas o teste real desse percurso ainda não foi comprovado.
2. **Contato comercial:** destino WhatsApp ativo na configuração é `+55 85 99272-3637`. Validar que é o número de vendas correto antes de divulgar para clientes.
3. **Privacidade comercial/legado:** `main` no repositório público ainda contém `dados/catalogo-publico.json` e `dados/pecas-publicas.json`. O novo build DEV não inclui esses arquivos, mas o catálogo antigo e histórico público não se tornam privados. Definir retirada/migração do legado sem quebrar outros endereços.
4. **Ambiente definitivo:** o projeto atual e a URL ainda são DEV; preparar e validar o endereço definitivo e estratégia de backend antes de anunciar como produção.
5. **Segurança Auth:** Security Advisor reporta `auth_leaked_password_protection` desativado. Rever configuração em Auth > Security no projeto de lançamento.

## Critérios operacionais de aceite
- Dois perfis de cliente autenticados não conseguem ler carrinhos/cotações um do outro; administrador vê pedidos e trilha; cliente bloqueado não acessa o catálogo.
- Pedido é salvo antes de abrir WhatsApp; preço/custo é calculado no servidor; reenvio com mesma `request_key` não duplica pedido; divergência de preço bloqueia envio.
- Kits sem homologação não ficam disponíveis, incluindo os 58 antigos e os 12 rascunhos.
- Não habilitar pagamentos, compra automática ou alegar que WhatsApp enviou mensagem.
- Publicar apenas após revisar os bloqueios e executar smoke test de login/cotação/histórico no endereço definitivo.

**Decisão atual:** V1 de peças tecnicamente funcional e comprovada no DEV; ainda **NO-GO para divulgação irrestrita/PROD**, até os cinco bloqueios acima serem tratados. Não confundir sucesso do piloto com aprovação dos kits.
