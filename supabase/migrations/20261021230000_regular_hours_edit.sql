-- P0.5-03 part A: the owner's regular opening hours go through the one publication pipeline (K-21, K-18, K-38).
--
-- An edit of the weekly hours in the Hours screen is the owner's approval of exactly that week. It does what "Keep my
-- information" does in Google Protection, in one step: the new week becomes the owner-approved fact for
-- profile.regular_hours (so Protection treats it as the approved value from now on), a profile_changes row records it
-- (source owner_edit, so the history says the owner did it, not Google), and the listing_revert publication sends the
-- approved value after the 10 second undo window and checks that Google shows it. Nothing is sent without approval.
--
-- Additive only: one check widened, one function added, decide_profile_change replaced (the K-19 "twice in 30 days"
-- count no longer counts the owner's own edits, which are not Google changing the value again). Nothing is dropped.

alter table public.profile_changes drop constraint profile_changes_source_check;
alter table public.profile_changes add constraint profile_changes_source_check
  check (source in ('google_update', 'notification', 'scheduled_check', 'owner_edit'));

-- The owner's own regular hours, validated again here: the shape Google takes (up to 21 periods, a known day, a time of
-- day each) and a display line of the kind Google Protection compares. Called by the content Edge Function with the
-- service key, after it built p_display and p_raw from the week the owner confirmed; members only, by the approval
-- policy, like every approval.
create function public.apply_regular_hours(p_location uuid, p_user uuid, p_channel text, p_display text, p_raw jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.locations; f public.knowledge_facts; v_new uuid := gen_random_uuid(); v_change uuid := gen_random_uuid();
  v_open uuid; r jsonb; per jsonb;
begin
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;
  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'unknown_location'; end if;
  if not exists (select 1 from public.location_members where location_id = p_location and user_id = p_user) then
    raise exception 'not_member';
  end if;
  if not private.may_approve(p_location, 'profile_change', p_user, false) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  if l.concierge then raise exception 'concierge_profile'; end if;

  if p_display is null or length(trim(p_display)) not between 1 and 1000 then raise exception 'bad_hours'; end if;
  if p_raw is null or jsonb_typeof(p_raw) is distinct from 'object'
     or jsonb_typeof(p_raw -> 'periods') is distinct from 'array' then
    raise exception 'bad_hours';
  end if;
  if jsonb_array_length(p_raw -> 'periods') not between 1 and 21 then raise exception 'bad_hours'; end if;
  for per in select * from jsonb_array_elements(p_raw -> 'periods') loop
    if jsonb_typeof(per) is distinct from 'object'
       or coalesce(per ->> 'openDay', '') not in ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')
       or coalesce(per ->> 'closeDay', '') not in ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')
       or jsonb_typeof(per -> 'openTime') is distinct from 'object'
       or jsonb_typeof(per -> 'closeTime') is distinct from 'object' then
      raise exception 'bad_hours';
    end if;
  end loop;

  select * into f from public.knowledge_facts
   where location_id = p_location and slot = 'profile.regular_hours' and superseded_by is null for update;

  -- The same hours again: nothing to send. If Google shows something else, Google Protection has its own decision.
  if f.id is not null and f.status = 'verified' and f.value ->> 'display' = p_display then
    return jsonb_build_object('state', 'unchanged');
  end if;

  -- An open difference for the hours is replaced by this edit (A5: a newer one supersedes the open one).
  select id into v_open from public.profile_changes
   where location_id = p_location and field = 'regular_hours' and status in ('detected', 'awaiting_review') for update;

  if f.id is not null then update public.knowledge_facts set superseded_by = v_new where id = f.id; end if;
  insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
    confirmed_at, uses, version)
  values (v_new, p_location, 'profile.regular_hours', 'regular_hours',
    jsonb_build_object('display', trim(p_display), 'raw', p_raw),
    'verified', 'owner', 'owner_edit:' || v_change, p_user, now(), array['replies', 'posts', 'profile'],
    coalesce(f.version, 0) + 1);

  if v_open is not null then
    update public.profile_changes set status = 'superseded', superseded_by = v_change where id = v_open;
  end if;
  insert into public.profile_changes (id, location_id, field, previous_value, previous_fact_id, google_value, source,
    severity, status, explanation)
  values (v_change, p_location, 'regular_hours', f.value, f.id, null, 'owner_edit', 'recommended', 'detected',
    'You changed your opening hours in Kabsi.');

  r := public.approve_publication('listing_revert', v_change, '{}'::jsonb, p_user, p_channel);
  return (r - 'state') || jsonb_build_object('state', 'approved', 'publication_state', r ->> 'state', 'fact_id', v_new,
    'change_id', v_change);
end $$;
revoke execute on function public.apply_regular_hours(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_regular_hours(uuid, uuid, text, text, jsonb) to service_role;

-- decide_profile_change: as before, but the K-19 count of put-backs in 30 days leaves out the owner's own edits.
CREATE OR REPLACE FUNCTION public.decide_profile_change(p_change uuid, p_decision text, p_user uuid, p_channel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.profile_changes; l public.locations; f public.knowledge_facts; v_role text; v_new uuid; v_last timestamptz;
  v_n integer; r jsonb;
begin
  if p_decision not in ('accept', 'reject') then raise exception 'bad_decision'; end if;
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;
  select * into c from public.profile_changes where id = p_change for update;
  if not found then raise exception 'unknown_change'; end if;
  select role into v_role from public.location_members where location_id = c.location_id and user_id = p_user;
  if v_role is null then raise exception 'not_member'; end if;
  if c.status not in ('detected', 'awaiting_review') then raise exception 'already_decided'; end if;
  -- K-19, K-64, A4: name, address, main category, open status and map pin: the owner, signed in.
  if private.protection_high_risk(c.field) then
    if p_channel <> 'dashboard' and not private.signed_in_as(p_user) then raise exception 'sign_in_required'; end if;
    if v_role <> 'owner' then raise exception 'owner_only'; end if;
  end if;
  -- P0.3-06 (K-16): a decision on a Google change is an approval of the profile_change kind.
  if not private.may_approve(c.location_id, 'profile_change', p_user, private.protection_high_risk(c.field)) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  select * into l from public.locations where id = c.location_id;

  select * into f from public.knowledge_facts
   where location_id = c.location_id and slot = 'profile.' || c.field and superseded_by is null for update;

  if p_decision = 'accept' then
    -- Google's value becomes the owner-approved fact (K-18: the owner's own data from now on).
    if c.google_value is null then raise exception 'values_cleared'; end if;
    v_new := gen_random_uuid();
    if f.id is not null then update public.knowledge_facts set superseded_by = v_new where id = f.id; end if;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
      confirmed_at, uses, version)
    values (v_new, c.location_id, 'profile.' || c.field, c.field,
      jsonb_build_object('display', coalesce(c.google_value ->> 'display', ''), 'raw', coalesce(c.google_value -> 'raw', 'null'::jsonb)),
      'verified', 'google', 'profile_change:' || c.id, p_user, now(), array['profile'], coalesce(f.version, 0) + 1);
    update public.profile_changes set status = 'accepted', decided_by = p_user, decided_at = now() where id = c.id;
    return jsonb_build_object('state', 'accepted', 'fact_id', v_new);
  end if;

  -- "Keep my information": only a value the owner confirmed is ever put back (K-18).
  if f.id is null or f.status <> 'verified' or f.value is null then raise exception 'not_confirmed'; end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;

  -- K-116.2: one high-risk field per approval (each approval is one field), and 7 days between them.
  if private.protection_high_risk(c.field) then
    select max(p.approved_at) into v_last from public.publications p
     where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
       and private.protection_high_risk(private.profile_key(p.payload ->> 'field'))
       and p.approved_at > now() - interval '7 days';
    if v_last is not null then
      raise exception 'high_risk_wait %', to_char((v_last + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');
    end if;
  end if;

  -- K-19: never re-sent more than twice in 30 days. The third conflict goes to Google support, by a person.
  select count(*) into v_n from public.publications p
   where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
     and private.profile_key(p.payload ->> 'field') = c.field and p.approved_at > now() - interval '30 days'
     -- P0.5-03: the owner's own edit in the hours editor is not Google changing the value again.
     and not exists (select 1 from public.profile_changes o where o.publication_id = p.id and o.source = 'owner_edit');
  if v_n >= 2 then
    insert into public.staff_followups (kind, location_id, location_name, detail, due_at)
    select 'google_support', l.id, l.name,
      left(format('Google changed the %s again after Kabsi put the owner''s approved value back %s times in 30 days. '
        || 'Kabsi does not send it a third time (K-19). Contact Google Business Profile support: say the owner confirmed '
        || 'this value, Google keeps replacing it, and ask Google to keep the owner''s value. The values are on change %s '
        || 'in Google Protection.', private.protection_label(c.field), v_n, c.id), 500),
      private.add_business_days(now(), 2)
     where not exists (select 1 from public.staff_followups s
                        where s.kind = 'google_support' and s.location_id = l.id and s.done_at is null);
    update public.profile_changes set status = 'rejected', decided_by = p_user, decided_at = now(),
      support_requested_at = now() where id = c.id;
    perform public.ops_emit('protection_support', 'customers', ':telephone_receiver: Google support needed: ' || l.name,
      'Google keeps changing the ' || private.protection_label(c.field) || '. Kabsi put it back twice in 30 days; contact Google support (staff follow-up).',
      '[]', public.ops_staff_btn(), 'protection_support:' || c.id);
    return jsonb_build_object('state', 'support');
  end if;

  r := public.approve_publication('listing_revert', c.id, '{}'::jsonb, p_user, p_channel);
  return (r - 'state') || jsonb_build_object('state', 'rejected', 'publication_state', r ->> 'state');
end $function$;