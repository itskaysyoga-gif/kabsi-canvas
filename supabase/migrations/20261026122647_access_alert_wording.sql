-- Access 1: the staff alert for lost Google access named hello@kabsi.co; Kabsi's access is the Kabsi Clients business group
-- (KABSI_GROUP_ID). Same function as 20261021180000, one line of wording changed. No data changes.

create or replace function public.ops_on_location() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner text;
begin
  if tg_op = 'INSERT' then
    select email into v_owner from auth.users where id = new.created_by;
    if coalesce(v_owner, '') like '%@test.local' then return new; end if;
    perform public.ops_emit('business_new', 'customers', ':convenience_store: New business started setup: ' || new.name,
      new.address,
      public.ops_f('Country', new.country) || public.ops_f('Owner', v_owner) || public.ops_f('Came from', new.signup_source),
      public.ops_staff_btn(), 'loc_new:' || new.id);
    return new;
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    perform public.ops_emit('business_live', 'customers', ':tada: ' || new.name || ' is live on Kabsi',
      'Google access works. Reviews are synced and drafted from now on.',
      public.ops_f('Country', new.country),
      public.ops_staff_btn(), 'loc_live:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  if new.access_lost_at is not null and old.access_lost_at is null and new.disconnect_requested_at is null then
    perform public.ops_emit('access_lost', 'alerts', ':warning: Google access lost: ' || new.name,
      'Kabsi can''t reach this Google profile any more (the Kabsi Clients group was removed or its access changed). The owner was emailed the steps to add it back.',
      public.ops_f('Country', new.country), public.ops_staff_btn(),
      'loc_lost:' || new.id || ':' || extract(epoch from new.access_lost_at)::bigint);
  end if;
  if new.deletion_requested_at is not null and old.deletion_requested_at is null then
    perform public.ops_emit('deletion_requested', 'customers', ':wastebasket: Deletion requested: ' || new.name,
      'The owner asked to remove this business from Kabsi. It goes in 7 days unless they cancel.', '[]', public.ops_staff_btn(),
      'loc_del:' || new.id || ':' || extract(epoch from new.deletion_requested_at)::bigint);
  elsif new.deletion_requested_at is null and old.deletion_requested_at is not null then
    perform public.ops_emit('deletion_cancelled', 'customers', ':relieved: Deletion cancelled: ' || new.name, null, '[]', '[]',
      'loc_undel:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  if new.status in ('paused', 'disabled') and old.status is distinct from new.status
     and not (new.disconnect_requested_at is not null and old.disconnect_requested_at is null) then
    perform public.ops_emit('business_' || new.status, 'customers', ':pause_button: ' || new.name || ' is now ' || new.status, null,
      '[]', public.ops_staff_btn(), 'loc_' || new.status || ':' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $$;
