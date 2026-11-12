-- WW Solar DEV — snapshot imutável e auditoria ATÔMICA do status.
alter table public.wwsolar_quote_requests
  add column if not exists status_updated_by uuid references auth.users(id);

create or replace function public.wwsolar_quote_protect_and_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.request_key is distinct from old.request_key
     or new.customer_email is distinct from old.customer_email
     or new.items is distinct from old.items
     or new.total_cents is distinct from old.total_cents
     or new.created_at is distinct from old.created_at then
    raise exception 'historical_quote_snapshot_is_immutable';
  end if;
  if new.status is distinct from old.status then
    if new.status_updated_by is null then
      raise exception 'status_change_requires_actor';
    end if;
    insert into public.wwsolar_quote_status_events
       (request_id,changed_by,old_status,new_status)
    values (new.id,new.status_updated_by,old.status,new.status);
  end if;
  return new;
end
$$;
drop trigger if exists wwsolar_quote_protect_and_audit_trigger on public.wwsolar_quote_requests;
create trigger wwsolar_quote_protect_and_audit_trigger
  before update on public.wwsolar_quote_requests
  for each row execute function public.wwsolar_quote_protect_and_audit();
revoke execute on function public.wwsolar_quote_protect_and_audit() from PUBLIC, anon, authenticated;

drop policy if exists "wwsolar_quote_read_owner_or_admin" on public.wwsolar_quote_requests;
create policy "wwsolar_quote_read_owner_or_admin" on public.wwsolar_quote_requests
for select to authenticated
using (
  (user_id=(select auth.uid()) and exists(
    select 1 from public.wwsolar_client_access access
    where access.user_id=(select auth.uid()) and access.active=true
  ))
  or (select auth.jwt()->'app_metadata'->>'wwsolar_role')='admin'
);
