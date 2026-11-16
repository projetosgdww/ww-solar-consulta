-- WW Solar: reduzir privilégio da RPC pública já homologada.
-- O dono da função deixa de ser postgres (BYPASSRLS) e passa a ser um papel NOLOGIN
-- com SELECT limitado à tabela catálogo, submetido a uma política RLS específica.
-- Não concede acesso às tabelas de carrinhos, usuários, custos, pedidos ou acesso.
begin;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname='wwsolar_public_reader')
     then raise exception 'Papel wwsolar_public_reader já existe; revisar antes de prosseguir';
  end if;
  if (select pg_catalog.pg_get_userbyid(proowner)
      from pg_catalog.pg_proc where oid='public.wwsolar_public_catalog()'::pg_catalog.regprocedure) <> 'postgres'
     then raise exception 'Dono da RPC mudou; revisar antes de prosseguir';
  end if;
end;
$$;

create role wwsolar_public_reader with nologin noinherit nobypassrls;
grant usage on schema public to wwsolar_public_reader;
grant select (id, kind, title, price, payload, active, approved)
  on table public.wwsolar_catalog to wwsolar_public_reader;

create policy wwsolar_catalog_public_reader_select
  on public.wwsolar_catalog
  as permissive for select
  to wwsolar_public_reader
  using (active is true and approved is true and price > 0);

-- Transferência de dono requer membership e CREATE; CREATE é temporário.
grant wwsolar_public_reader to postgres with set true;
grant create on schema public to wwsolar_public_reader;
alter function public.wwsolar_public_catalog() owner to wwsolar_public_reader;
revoke create on schema public from wwsolar_public_reader;
revoke wwsolar_public_reader from postgres;

-- O público só continua podendo EXECUTAR a função fixa, não consultar a tabela.
revoke all on function public.wwsolar_public_catalog() from public, anon, authenticated;
grant execute on function public.wwsolar_public_catalog() to anon, authenticated;
commit;

-- Pós-teste obrigatório:
-- 1. Owner = wwsolar_public_reader; rolcanlogin = false, rolbypassrls = false.
-- 2. SET LOCAL ROLE anon: 83 itens (25 kits / 51 peças / 7 projetos); custo 0.
-- 3. anon sem SELECT direto; papel reader sem acesso a outras tabelas.
-- 4. Nenhuma mudança nas políticas de authenticated, carrinhos ou pedidos.
