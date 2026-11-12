-- Regressão RLS e integridade de cotações WW Solar (DEV somente).
-- Usa identidades existentes, simula dois perfis cliente e faz ROLLBACK.
begin;
create temporary table _wwsolar_accounts as
select
 (select id from auth.users where raw_app_meta_data->>'wwsolar_role'='client' order by created_at limit 1) as a,
 (select id from auth.users where raw_app_meta_data->>'wwsolar_role'='admin' order by created_at limit 1) as b;
do $$ begin
 if exists(select 1 from _wwsolar_accounts where a is null or b is null) then
  raise exception 'Identidades DEV admin e cliente necessárias';
 end if;
end $$;
grant select on _wwsolar_accounts to authenticated;
create temporary table _wwsolar_checks(name text,got bigint,want bigint);
grant insert,select on _wwsolar_checks to authenticated;
insert into public.wwsolar_client_access(user_id,email,active)
select b,'wwsolar-regression-'||b||'@invalid.example',true from _wwsolar_accounts
on conflict(user_id) do nothing;
insert into public.wwsolar_quote_requests
(id,user_id,request_key,customer_email,items,total_cents,status)
select 'a1100000-0000-4000-8000-000000000001'::uuid,a,
'a2100000-0000-4000-8000-000000000001'::uuid,'test-a@invalid.example',
'[{"sku":"TEST-A","title":"Test A","qty":1,"subtotal_cents":100}]'::jsonb,100,'registrado'
from _wwsolar_accounts
union all
select 'b1100000-0000-4000-8000-000000000002'::uuid,b,
'b2100000-0000-4000-8000-000000000002'::uuid,'test-b@invalid.example',
'[{"sku":"TEST-B","title":"Test B","qty":1,"subtotal_cents":200}]'::jsonb,200,'registrado'
from _wwsolar_accounts;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated',
'app_metadata',jsonb_build_object('wwsolar_role','client'))::text,true) from _wwsolar_accounts;
insert into _wwsolar_checks select 'A sees own order',count(*),1 from public.wwsolar_quote_requests
where id in ('a1100000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000002');
insert into _wwsolar_checks select 'A cannot see B',count(*),0 from public.wwsolar_quote_requests
where id='b1100000-0000-4000-8000-000000000002';
insert into _wwsolar_checks select 'Client cannot read events',count(*),0 from public.wwsolar_quote_status_events;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated',
'app_metadata',jsonb_build_object('wwsolar_role','client'))::text,true) from _wwsolar_accounts;
insert into _wwsolar_checks select 'B sees own order',count(*),1 from public.wwsolar_quote_requests
where id in ('a1100000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000002');
insert into _wwsolar_checks select 'B cannot see A',count(*),0 from public.wwsolar_quote_requests
where id='a1100000-0000-4000-8000-000000000001';
reset role;
update public.wwsolar_quote_requests
set status='em_atendimento',status_updated_by=(select b from _wwsolar_accounts)
where id='a1100000-0000-4000-8000-000000000001';
insert into _wwsolar_checks select 'Atomic status audit',count(*),1
from public.wwsolar_quote_status_events
where request_id='a1100000-0000-4000-8000-000000000001'
and old_status='registrado' and new_status='em_atendimento';
do $$begin
 begin
  update public.wwsolar_quote_requests set total_cents=999
  where id='a1100000-0000-4000-8000-000000000001';
  insert into _wwsolar_checks values('Immutable snapshot',0,1);
 exception when others then
  if position('historical_quote_snapshot_is_immutable' in sqlerrm)>0 then
   insert into _wwsolar_checks values('Immutable snapshot',1,1);
  else raise;end if;
 end;
end$$;
do $$begin
 if (select count(*) from _wwsolar_checks)<>7 or exists(select 1 from _wwsolar_checks where got<>want) then
  raise exception 'WW Solar regression FAILED';
 end if;
end$$;
select name,got,want,got=want as passed from _wwsolar_checks order by name;
rollback;
