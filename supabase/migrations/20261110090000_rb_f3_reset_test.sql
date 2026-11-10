-- RB-F3 (R-148 item 4): "reset test", a staff-only WhatsApp command. Additive only: one service-only function.
-- It closes as Removed (voided) every open request at a demo business (locations.is_demo) that the sending phone itself
-- created, through its own business roles, and nothing else: no other person's request, no business that is not a demo,
-- nothing deleted. The sending phone must hold an active staff_admin role. Each request gets a timeline row, as any change.
-- With p_confirm false it only counts, for the confirm question.

create function public.request_reset_test(p_phone text, p_confirm boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0; v_businesses integer := 0; q record;
begin
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{6,14}$' then return private.rb_refuse('invalid_input'); end if;
  if not exists (select 1 from public.phone_roles r where r.phone = p_phone and r.role = 'staff_admin' and r.revoked_at is null) then
    return private.rb_refuse('forbidden');
  end if;

  if not p_confirm then
    select count(*), count(distinct x.location_id) into v_count, v_businesses
      from public.customer_requests x
      join public.locations l on l.id = x.location_id and l.is_demo
      join public.phone_roles r on r.phone = p_phone and r.revoked_at is null and r.role in ('owner', 'manager', 'staff')
        and r.location_id = x.location_id and r.user_id = x.created_by
     where x.status <> 'closed';
    return jsonb_build_object('ok', true, 'open', v_count, 'businesses', v_businesses);
  end if;

  for q in
    select x.id, x.location_id, x.status, x.created_by, m.role as member_role
      from public.customer_requests x
      join public.locations l on l.id = x.location_id and l.is_demo
      join public.phone_roles r on r.phone = p_phone and r.revoked_at is null and r.role in ('owner', 'manager', 'staff')
        and r.location_id = x.location_id and r.user_id = x.created_by
      join public.location_members m on m.location_id = x.location_id and m.user_id = x.created_by
     where x.status <> 'closed'
     order by x.location_id, x.id
     for update of x
  loop
    update public.customer_requests c set status = 'closed', outcome = 'voided', closed_at = now(),
      row_version = c.row_version + 1, updated_at = now() where c.id = q.id;
    perform private.rb_activity(q.location_id, q.id, 'status_changed', q.created_by, q.member_role, 'request_reset_test',
      q.status, 'closed', null, 'voided', '{}');
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('ok', true, 'voided', v_count);
end $$;

revoke all on function public.request_reset_test(text, boolean) from public, anon, authenticated;
grant execute on function public.request_reset_test(text, boolean) to service_role;
comment on function public.request_reset_test(text, boolean) is
  'RB-F3: staff-only "reset test". Voids the open requests the sending phone created at demo businesses. Service role only.';
