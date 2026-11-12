-- WW Solar DEV — solicitações de cotação com snapshot e histórico auditável.
-- Clientes nunca podem definir preço total, status ou alterar pedidos diretamente.
create table if not exists public.wwsolar_quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  request_key uuid not null,
  customer_email text not null,
  items jsonb not null check (jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 25),
  total_cents bigint not null check (total_cents > 0),
  status text not null default 'registrado'
    check (status in ('registrado','em_atendimento','fechado','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_key)
);
create index if not exists wwsolar_quote_requests_user_date_idx
  on public.wwsolar_quote_requests (user_id, created_at desc);
create index if not exists wwsolar_quote_requests_date_idx
  on public.wwsolar_quote_requests (created_at desc);

create table if not exists public.wwsolar_quote_status_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.wwsolar_quote_requests(id) on delete cascade,
  changed_by uuid not null references auth.users(id),
  old_status text not null,
  new_status text not null,
  changed_at timestamptz not null default now()
);
create index if not exists wwsolar_quote_status_events_by_order_idx
  on public.wwsolar_quote_status_events (request_id, changed_at desc);

alter table public.wwsolar_quote_requests enable row level security;
alter table public.wwsolar_quote_status_events enable row level security;
revoke all on public.wwsolar_quote_requests from PUBLIC,anon,authenticated;
revoke all on public.wwsolar_quote_status_events from PUBLIC,anon,authenticated;
grant select on public.wwsolar_quote_requests to authenticated;
grant select on public.wwsolar_quote_status_events to authenticated;
grant select,insert,update on public.wwsolar_quote_requests to service_role;
grant select,insert on public.wwsolar_quote_status_events to service_role;
grant usage,select on sequence public.wwsolar_quote_status_events_id_seq to service_role;

create policy "wwsolar_quote_read_owner_or_admin" on public.wwsolar_quote_requests
for select to authenticated
using (
  user_id = (select auth.uid()) or
  (select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin'
);
create policy "wwsolar_quote_events_admin_only" on public.wwsolar_quote_status_events
for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin');

-- Lista de clientes para gestão exclusiva pelo administrador.
create policy "wwsolar_client_access_admin_read" on public.wwsolar_client_access
for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin');

-- Nenhuma política de INSERT/UPDATE/DELETE para clientes nos pedidos.
-- Apenas função de servidor autenticada calcula preços e grava snapshots.
