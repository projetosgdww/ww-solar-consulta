-- Metadados privados para rastrear quando o custo foi consultado no fornecedor.
alter table public.wwsolar_builder_costs
  add column if not exists source_date date,
  add column if not exists source_reference text;
alter table public.wwsolar_builder_costs
  add constraint wwsolar_builder_costs_source_reference_len
  check (source_reference is null or char_length(source_reference)<=200);
alter table public.wwsolar_builder_costs
  drop constraint wwsolar_builder_costs_category_check;
alter table public.wwsolar_builder_costs
  add constraint wwsolar_builder_costs_category_check
  check (category in ('modulos','inversores','microinversores','cabos','estruturas','componentes','outros','stringbox'));
update public.wwsolar_builder_costs
set source_date=date '2026-11-16',
    source_reference='Soollar Distribuidora_PREÇOS20261116.pdf · CD Fortaleza'
where supplier='Soollar' and source_date is null;
