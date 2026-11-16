-- WW Solar: montador interno DEV. Não altera catálogo, carrinho nem pedidos oficiais.
-- Custos são PRIVADOS e só podem ser lidos pelo administrador dono.
create table public.wwsolar_builder_costs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  supplier text not null default 'Sola' check (char_length(supplier) between 1 and 64),
  sku text not null check (sku ~ '^[A-Za-z0-9_-]{2,64}$'),
  title text not null check (char_length(title) between 3 and 250),
  category text not null check (category in ('modulos','inversores','microinversores','cabos','estruturas','componentes','outros')),
  unit_cost_cents bigint not null check (unit_cost_cents between 1 and 100000000000),
  module_wp integer not null default 0 check (module_wp between 0 and 2000),
  inverter_w integer not null default 0 check (inverter_w between 0 and 200000),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (owner_id, supplier, sku)
);
create index wwsolar_builder_costs_owner_updated on public.wwsolar_builder_costs(owner_id, updated_at desc);
create table public.wwsolar_builder_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  supplier text not null default 'Sola' check (char_length(supplier) between 1 and 64),
  title text not null check (char_length(title) between 3 and 180),
  notes text not null default '' check (char_length(notes) <= 1500),
  lines jsonb not null check (jsonb_typeof(lines)='array' and jsonb_array_length(lines) between 1 and 80),
  total_cost_cents bigint not null check (total_cost_cents between 0 and 1000000000000),
  freight_cents bigint not null default 0 check (freight_cents between 0 and 1000000000000),
  markup_percent numeric(7,2) not null default 25 check (markup_percent between 0 and 300),
  status text not null default 'rascunho' check (status='rascunho'),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index wwsolar_builder_drafts_owner_updated on public.wwsolar_builder_drafts(owner_id, updated_at desc);
alter table public.wwsolar_builder_costs enable row level security;
alter table public.wwsolar_builder_drafts enable row level security;
alter table public.wwsolar_builder_costs force row level security;
alter table public.wwsolar_builder_drafts force row level security;
revoke all on public.wwsolar_builder_costs from public, anon, authenticated;
revoke all on public.wwsolar_builder_drafts from public, anon, authenticated;
grant select, insert, update on public.wwsolar_builder_costs to authenticated;
grant select, insert, update on public.wwsolar_builder_drafts to authenticated;
-- Permissão admin vem exclusivamente de app_metadata, nunca de user_metadata.
create policy "wwsolar_builder_costs_admin_read" on public.wwsolar_builder_costs
for select to authenticated
using (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
);
create policy "wwsolar_builder_costs_admin_insert" on public.wwsolar_builder_costs
for insert to authenticated
with check (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
);
create policy "wwsolar_builder_costs_admin_update" on public.wwsolar_builder_costs
for update to authenticated
using (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
)
with check (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
);
create policy "wwsolar_builder_drafts_admin_read" on public.wwsolar_builder_drafts
for select to authenticated
using (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
);
create policy "wwsolar_builder_drafts_admin_insert" on public.wwsolar_builder_drafts
for insert to authenticated
with check (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
);
create policy "wwsolar_builder_drafts_admin_update" on public.wwsolar_builder_drafts
for update to authenticated
using (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
)
with check (
  owner_id = (select auth.uid()) and
  (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin' and
  coalesce((select auth.jwt()->'app_metadata'->>'wwsolar_password_change_required'),'false') <> 'true'
);
comment on table public.wwsolar_builder_costs is 'WW Solar: custos privados do montador DEV; não são preços públicos.';
comment on table public.wwsolar_builder_drafts is 'WW Solar: rascunhos internos de kits, nunca publicados no catálogo por este fluxo.';
