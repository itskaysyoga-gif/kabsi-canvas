-- App 6 (master plan 30.34 item 5): Settings' "Where your routine messages go" saved in one call.
-- Before, choosing WhatsApp or Email in Settings made three to five browser calls one after another (set_routine_channel,
-- whatsapp_set_prefs, and for Email two set_notification_pref), about a quarter of a second each, then three reads. The
-- choice showed only after all of them (2.5 to 3.5 seconds on production, 5 Nov 2026), and a call that failed half way left
-- the choice half saved. set_routine_delivery does the same writes in one transaction and returns the new state, so the
-- page can show the choice at once and roll it back with one plain line if the save fails.
-- Same rules as before: only an owner or manager of the business, WhatsApp only while the person's WhatsApp is connected
-- (whatsapp_not_connected), Email puts the two routine emails back to their default. Additive only: set_routine_channel,
-- whatsapp_set_prefs and set_notification_pref stay as they are.

create or replace function public.set_routine_delivery(p_location uuid, p_channel text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_wa boolean;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_channel is null or p_channel not in ('email', 'whatsapp') then
    raise exception 'unknown channel' using errcode = '22023';
  end if;
  v_wa := p_channel = 'whatsapp';
  if v_wa and not exists (select 1 from public.whatsapp_optins o where o.user_id = v_user and o.state = 'active') then
    raise exception 'whatsapp_not_connected' using errcode = 'P0001';
  end if;

  insert into public.routine_channels (user_id, channel, updated_at) values (v_user, p_channel, now())
  on conflict (user_id) do update set channel = excluded.channel, updated_at = now();

  -- WhatsApp carries both routine messages while chosen; Email takes them back (the same as whatsapp_set_prefs(wa, wa)).
  update public.whatsapp_optins set
    review_alerts = v_wa,
    digest_optin = v_wa,
    digest_consent_at = case when v_wa and not digest_optin then now() when not v_wa then null else digest_consent_at end,
    updated_at = now()
   where user_id = v_user;

  -- Back on email: the two routine emails come back to their default (what the earlier switch turned off).
  if not v_wa then
    insert into public.notification_preferences (user_id, location_id, category, channel, frequency)
    values (v_user, p_location, 'review_new', 'email', 'default'), (v_user, p_location, 'weekly_report', 'email', 'default')
    on conflict (user_id, location_id, category, channel) do update set frequency = 'default', updated_at = now();
  end if;

  return jsonb_build_object('channel', p_channel, 'whatsapp', public.whatsapp_status());
end;
$$;
revoke all on function public.set_routine_delivery(uuid, text) from public, anon;
grant execute on function public.set_routine_delivery(uuid, text) to authenticated;
comment on function public.set_routine_delivery(uuid, text) is
  'App 6: Settings, where routine messages go. One transaction: the stored channel, the WhatsApp alert and report switches, and on email the two routine emails back to default. Owner or manager of the business; WhatsApp only while connected.';
