-- 17/11/2026: MC4 da Soollar + margem bruta no montador.
-- Fonte: Soollar Distribuidora_PREÇOS20261116.pdf, código 440111, R$ 10,00,
-- "CONECTOR SOLAR MC4 MACHO E FEMEA COM 2 PARES".
-- Inserção idempotente: não sobrepõe atualizações manuais posteriores.
insert into public.wwsolar_builder_costs
(owner_id,supplier,sku,title,category,unit_cost_cents,module_wp,inverter_w,source_date,source_reference)
select id,'Soollar','SOO-440111','CONECTOR SOLAR MC4 MACHO E FÊMEA COM 2 PARES',
  'componentes',1000,0,0,date '2026-11-16',
  'Soollar Distribuidora_PREÇOS20261116.pdf · CD Fortaleza'
from auth.users
where lower(email)='suporte@projetosgdww.com.br'
  and raw_app_meta_data->>'wwsolar_role'='admin'
  and coalesce(raw_app_meta_data->>'wwsolar_password_change_required','false')<>'true'
on conflict (owner_id,supplier,sku) do nothing;

-- A coluna mantém o nome histórico "markup_percent" para compatibilidade com a V1;
-- a partir da V2 seu significado é MARGEM BRUTA sobre o preço de venda (0 <= m < 100).
alter table public.wwsolar_builder_drafts
  drop constraint wwsolar_builder_drafts_markup_percent_check;
alter table public.wwsolar_builder_drafts
  add constraint wwsolar_builder_drafts_markup_percent_check
  check (markup_percent>=0 and markup_percent<100);
comment on column public.wwsolar_builder_drafts.markup_percent is
'MARGEM BRUTA percentual sobre a venda, não markup: preço = custo / (1 - markup_percent / 100). Coluna nomeada historicamente.';
