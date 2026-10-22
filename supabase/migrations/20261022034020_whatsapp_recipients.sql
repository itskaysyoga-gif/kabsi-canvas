-- P0.8-03: who gets a WhatsApp alert for a business, and where a photo sent to the Kabsi number goes. Service role only.

-- The owners and managers of a business with an active WhatsApp opt-in and review alerts on (STOP removes them).
create or replace function public.whatsapp_recipients(p_location uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.user_id order by m.user_id), '{}')
    from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
   where m.location_id = p_location and m.role in ('owner', 'manager') and o.state = 'active' and o.review_alerts
$$;

-- The WhatsApp photo drop (K-129 point 5, Pro): the one active business the sender owns or manages, on Pro. With more
-- than one business Kabsi cannot tell which it is for, so the owner adds it in the app.
create or replace function public.whatsapp_photo_target(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_locs uuid[];
begin
  select array_agg(m.location_id) into v_locs
    from public.location_members m join public.locations l on l.id = m.location_id
   where m.user_id = p_user and m.role in ('owner', 'manager') and l.status = 'active';
  if coalesce(array_length(v_locs, 1), 0) = 0 then return jsonb_build_object('ok', false, 'reason', 'no_business'); end if;
  if array_length(v_locs, 1) > 1 then return jsonb_build_object('ok', false, 'reason', 'many'); end if;
  if not coalesce((private.feature_plan(v_locs[1]) ->> 'pro')::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'pro');
  end if;
  return jsonb_build_object('ok', true, 'location_id', v_locs[1]);
end $$;

revoke all on function public.whatsapp_recipients(uuid), public.whatsapp_photo_target(uuid) from public, anon, authenticated;
grant execute on function public.whatsapp_recipients(uuid), public.whatsapp_photo_target(uuid) to service_role;
