-- RPC pública comercial. Aplicação única após auditoria e homologação da vitrine.
-- Vitrine pública WW Solar. Dados devolvidos são apenas campos comerciais aprovados.
-- Não muda a RLS da wwsolar_catalog, carts, orders ou client_access.
begin;
create function public.wwsolar_public_catalog()
returns table (
 id text, kind text, title text, price numeric,
 payload jsonb, active boolean, approved boolean
)
language sql
stable
security definer
set search_path = ''
as $$
 select c.id, c.kind, c.title, c.price,
   case when c.kind = 'kit' then
     pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
       'potenciaKwp',c.payload->'potenciaKwp',
       'faixaGeracaoKwh',c.payload->'faixaGeracaoKwh',
       'geracaoMensalKwh',c.payload->'geracaoMensalKwh',
       'freteInclusoParaCaninde',c.payload->'freteInclusoParaCaninde',
       'prazoEntregaDiasUteis',c.payload->'prazoEntregaDiasUteis',
       'prazoAdicionalDiasUteis',c.payload->'prazoAdicionalDiasUteis'
     ))
   else pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
       'categoria',c.payload->'categoria'
   )) end,
   c.active,c.approved
 from public.wwsolar_catalog as c
 where c.active is true
   and c.approved is true
   and c.price > 0
   and (
     (c.kind='kit')
     or (c.kind='piece' and c.payload->>'categoria' in
        ('modulos','microinversores','inversores','estruturas','cabos','componentes'))
     or (c.kind='piece' and c.id like 'PRJ-B-%' and c.payload->>'categoria'='projetos')
   )
 order by c.kind,c.id;
$$;
revoke all on function public.wwsolar_public_catalog() from public,anon,authenticated;
grant execute on function public.wwsolar_public_catalog() to anon,authenticated;
comment on function public.wwsolar_public_catalog() is
  'WW Solar: catálogo comercial público, sem custos, margens, clientes, fornecedores ou dados de pedidos.';
commit;
-- Testes necessários após aplicação: chamada com SET ROLE anon,
-- conferência dos 83 registros, payload permitido, permissões de tabela inalteradas,
-- e monitoramento de lints de segurança.
