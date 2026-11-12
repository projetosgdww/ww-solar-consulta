-- WW Solar — ÁREA DE CLIENTES, proposta isolada para DEV.
-- NÃO APLICAR em projeto compartilhado ou PROD sem homologação.
-- Sem preços de custo, senhas, service_role, e-mails de clientes ou seed de terceiros.

create table if not exists public.wwsolar_client_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wwsolar_catalog (
  id text primary key,
  kind text not null check (kind in ('kit','piece')),
  title text not null check (length(title) between 3 and 240),
  price numeric(12,2) not null check (price > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  active boolean not null default false,
  approved boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists wwsolar_catalog_kind_idx
  on public.wwsolar_catalog(kind) where active = true and approved = true;

create table if not exists public.wwsolar_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lines jsonb not null default '[]'::jsonb
    check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) <= 25),
  updated_at timestamptz not null default now()
);

alter table public.wwsolar_client_access enable row level security;
alter table public.wwsolar_catalog enable row level security;
alter table public.wwsolar_carts enable row level security;

revoke all on public.wwsolar_client_access from anon, authenticated;
revoke all on public.wwsolar_catalog from anon, authenticated;
revoke all on public.wwsolar_carts from anon, authenticated;

grant select on public.wwsolar_client_access to authenticated;
grant select on public.wwsolar_catalog to authenticated;
grant select,insert,update,delete on public.wwsolar_carts to authenticated;

-- app_metadata é gravado apenas pelo servidor; NÃO usar user_metadata.
-- O admin deve existir previamente em Auth, com app_metadata:
-- {"wwsolar_role":"admin"}. A função de cadastro não permite criar admins.

create policy "wwsolar_read_own_access" on public.wwsolar_client_access
for select to authenticated
using (user_id = (select auth.uid()));

create policy "wwsolar_catalog_active_members" on public.wwsolar_catalog
for select to authenticated
using (
  active = true and approved = true
  and (
    exists (
      select 1 from public.wwsolar_client_access a
      where a.user_id = (select auth.uid()) and a.active = true
    )
    or (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin'
  )
);

create policy "wwsolar_cart_own_read" on public.wwsolar_carts
for select to authenticated
using (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.wwsolar_client_access a
      where a.user_id = (select auth.uid()) and a.active = true
    )
    or (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin'
  )
);

create policy "wwsolar_cart_own_insert" on public.wwsolar_carts
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.wwsolar_client_access a
      where a.user_id = (select auth.uid()) and a.active = true
    )
    or (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin'
  )
);

create policy "wwsolar_cart_own_update" on public.wwsolar_carts
for update to authenticated
using (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.wwsolar_client_access a
      where a.user_id = (select auth.uid()) and a.active = true
    )
    or (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin'
  )
)
with check (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.wwsolar_client_access a
      where a.user_id = (select auth.uid()) and a.active = true
    )
    or (select auth.jwt()->'app_metadata'->>'wwsolar_role') = 'admin'
  )
);

create policy "wwsolar_cart_own_delete" on public.wwsolar_carts
for delete to authenticated
using (user_id = (select auth.uid()));

-- Admin Provisioning Edge Function usa service_role em ambiente de execução
-- protegido; não conceder INSERT/UPDATE das tabelas administrativas ao cliente.
-- Para começar a servir o catálogo, importar somente produtos REVISADOS
-- como approved=true, após migrá-los para um projeto exclusivo do WW Solar.
