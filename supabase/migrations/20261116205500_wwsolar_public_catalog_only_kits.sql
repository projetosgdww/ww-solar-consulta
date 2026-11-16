-- WW Solar: somente kits geradores na vitrine oficial; projetos PRJ-B são serviços opcionais.
-- Não altera preços, custos, carrinhos, pedidos, RLS ou a propriedade da RPC.
-- CREATE OR REPLACE preserva owner restrito wwsolar_public_reader e os grants atuais.
-- O proprietário é um papel NOLOGIN; postgres deve assumir explicitamente o papel durante a troca.
begin;
set local role wwsolar_public_reader;
create or replace function public.wwsolar_public_catalog()
returns table (id text, kind text, title text, price numeric, payload jsonb, active boolean, approved boolean)
language sql
stable security definer
set search_path = ''
as $function$
  select c.id, c.kind, c.title, c.price,
    case when c.kind='kit' then
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'potenciaKwp', c.payload->'potenciaKwp',
        'faixaGeracaoKwh', c.payload->'faixaGeracaoKwh',
        'geracaoMensalKwh', c.payload->'geracaoMensalKwh',
        'freteInclusoParaCaninde', c.payload->'freteInclusoParaCaninde',
        'prazoEntregaDiasUteis', c.payload->'prazoEntregaDiasUteis',
        'prazoAdicionalDiasUteis', c.payload->'prazoAdicionalDiasUteis'
      ))
    else pg_catalog.jsonb_build_object('categoria','projetos') end,
    c.active,c.approved
  from public.wwsolar_catalog c
  where c.active is true
    and c.approved is true
    and c.price>0
    and (
      c.kind='kit'
      or (c.kind='piece' and c.id like 'PRJ-B-%' and c.payload->>'categoria'='projetos')
    )
  order by c.kind,c.id;
$function$;
comment on function public.wwsolar_public_catalog() is
'WW Solar: kits geradores e serviços elétricos PRJ-B; não retorna peças avulsas, custos ou dados internos.';

commit;
