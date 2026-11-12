-- WW Solar — kits internos DEV, aprovados? NUNCA: somente rascunhos.
-- Não há sincronização automática com wwsolar_catalog nem publicação de preços.
-- Acervo de custos restrito ao app_metadata.wwsolar_role='admin'.

create table if not exists public.wwsolar_kit_drafts (
  code text primary key check (code ~ '^WW-(0[1-9]|1[0-2])$'),
  panels integer not null check (panels between 4 and 26 and panels%2=0),
  module_id text not null references public.wwsolar_catalog(id),
  status text not null default 'rascunho'
    check (status in ('rascunho','revisao_tecnica','pendente_custos')),
  engineering_approved boolean not null default false check (engineering_approved = false),
  published boolean not null default false check (published = false),
  updated_at timestamptz not null default now()
);

create table if not exists public.wwsolar_piece_costs (
  sku text primary key references public.wwsolar_catalog(id),
  unit_cost numeric(12,2) not null check (unit_cost>0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.wwsolar_kit_drafts enable row level security;
alter table public.wwsolar_piece_costs enable row level security;

revoke all on public.wwsolar_kit_drafts from PUBLIC, anon, authenticated;
revoke all on public.wwsolar_piece_costs from PUBLIC, anon, authenticated;
grant select on public.wwsolar_kit_drafts to authenticated;
grant select on public.wwsolar_piece_costs to authenticated;
grant insert,update on public.wwsolar_piece_costs to authenticated;

create policy "wwsolar_kit_drafts_admin_select" on public.wwsolar_kit_drafts
  for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin');

create policy "wwsolar_piece_costs_admin_select" on public.wwsolar_piece_costs
  for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin');

create policy "wwsolar_piece_costs_admin_insert" on public.wwsolar_piece_costs
  for insert to authenticated
  with check ((select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin'
    and updated_by=(select auth.uid()));

create policy "wwsolar_piece_costs_admin_update" on public.wwsolar_piece_costs
  for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin')
  with check ((select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin'
    and updated_by=(select auth.uid()));

insert into public.wwsolar_kit_drafts (code,panels,module_id,status)
values
('WW-01',4,'PAV-049','rascunho'),
('WW-02',6,'PAV-049','rascunho'),
('WW-03',8,'PAV-049','rascunho'),
('WW-04',10,'PAV-049','rascunho'),
('WW-05',12,'PAV-049','rascunho'),
('WW-06',14,'PAV-049','rascunho'),
('WW-07',16,'PAV-049','rascunho'),
('WW-08',18,'PAV-049','rascunho'),
('WW-09',20,'PAV-049','rascunho'),
('WW-10',22,'PAV-049','rascunho'),
('WW-11',24,'PAV-049','rascunho'),
('WW-12',26,'PAV-049','rascunho')
on conflict (code) do nothing;

-- Nenhum custo fictício inserido. Nenhum kit disponível aos clientes.