-- Request book, PR B: the one shared workflow (Build decisions tab). Additive only: six service-only functions and their
-- private helpers. Nothing calls them, and every one returns 'disabled' unless app_settings.request_book is 'on' and the
-- location's pack is in test. Production has no such setting.
--
-- Rules every function keeps:
--   a refused call writes nothing and returns {ok:false, reason};
--   a repeated idempotency key returns the first result, and the same key with other input is refused;
--   the location comes from the caller's resolved role and must match both the actor's membership and the row;
--   a skipped step is never written as if it happened: it needs an acknowledgement and carries a flag;
--   no customer confirmation, availability or external booking is ever inferred;
--   audit rows and tool results hold ids, statuses and field names, never a name, a phone or a customer's words.

create function private.rb_refuse(p_reason text, p_extra jsonb default '{}') returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false, 'reason', p_reason) || p_extra
$$;

-- Is the request book on for this business, and is this person a member of it?
create function private.rb_gate(p_location uuid, p_actor uuid,
  out reason text, out actor_role text, out pack text, out pack_version integer)
language plpgsql stable set search_path = '' as $$
begin
  if not exists (select 1 from public.app_settings s where s.key = 'request_book' and s.value = 'on') then
    reason := 'disabled'; return;
  end if;
  select p.pack, p.pack_version into pack, pack_version from public.location_packs p
   where p.location_id = p_location and p.state = 'test';
  if not found then
    reason := 'disabled'; return;
  end if;
  select m.role into actor_role from public.location_members m where m.location_id = p_location and m.user_id = p_actor;
  if not found then
    reason := 'not_member';
  end if;
end $$;

-- The first result for this key, or a refusal if the key was used with other input, or null when the key is new.
create function private.rb_replay(p_location uuid, p_key text, p_tool text, p_input jsonb, out result jsonb, out input_hash text)
language plpgsql set search_path = '' as $$
declare v record;
begin
  if p_key is null or length(p_key) not between 1 and 200 then
    result := private.rb_refuse('invalid_key'); return;
  end if;
  input_hash := encode(sha256(convert_to(p_tool || ':' || p_input::text, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(p_location::text || ':' || p_key, 0));
  select t.input_hash as h, t.result as r into v from public.tool_executions t
   where t.location_id = p_location and t.idempotency_key = p_key;
  if found then
    result := case when v.h = input_hash then v.r || '{"replay": true}'::jsonb else private.rb_refuse('key_reused') end;
  end if;
end $$;

create function private.rb_finish(p_location uuid, p_actor uuid, p_key text, p_tool text, p_hash text, p_result jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  insert into public.tool_executions (location_id, idempotency_key, tool, input_hash, result, actor_user_id)
  values (p_location, p_key, p_tool, p_hash, p_result, p_actor);
  return p_result;
end $$;

-- clock_timestamp, so that the order of a request's activities is exact even inside one transaction.
create function private.rb_activity(p_location uuid, p_request uuid, p_type text, p_actor uuid, p_role text, p_tool text,
  p_from_status text default null, p_to_status text default null, p_from_outcome text default null, p_to_outcome text default null,
  p_flags text[] default '{}', p_undo_of uuid default null, p_related uuid default null)
returns uuid language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.request_activities (location_id, request_id, type, from_status, to_status, from_outcome, to_outcome,
    flags, actor_user_id, actor_role, tool, undo_of, related_request_id, created_at)
  values (p_location, p_request, p_type, p_from_status, p_to_status, p_from_outcome, p_to_outcome,
    coalesce(p_flags, '{}'), p_actor, p_role, p_tool, p_undo_of, p_related, clock_timestamp())
  returning id into v_id;
  return v_id;
end $$;

create function private.rb_result(p_request public.customer_requests, p_activity uuid, p_flags text[] default '{}')
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('ok', true, 'request_id', p_request.id, 'number', p_request.number, 'kind', p_request.kind,
    'status', p_request.status, 'outcome', p_request.outcome, 'row_version', p_request.row_version,
    'activity_id', p_activity, 'flags', to_jsonb(coalesce(p_flags, '{}'::text[])))
$$;

create function private.rb_next_number(p_location uuid) returns integer
language sql set search_path = '' as $$
  update public.location_packs set next_number = next_number + 1, updated_at = now()
   where location_id = p_location returning next_number - 1
$$;

-- The one table of moves. Every kind goes through here; packs only change the words an owner reads.
create function private.rb_rule(p_kind text, p_from text, p_to text, p_outcome text, p_starts_at timestamptz,
  out reason text, out needs_ack boolean, out owner_only boolean, out flags text[])
language plpgsql stable set search_path = '' as $$
declare v_time_passed boolean := p_starts_at is not null and p_starts_at <= now();
begin
  needs_ack := false; owner_only := false; flags := '{}';
  if p_to = p_from then
    reason := 'no_change'; return;
  end if;
  if p_to = 'closed' then
    if p_outcome is null then reason := 'outcome_required'; return; end if;
    if p_outcome = 'voided' then reason := 'not_allowed'; return; end if;
    if p_outcome = 'converted' then reason := 'use_convert'; return; end if;
    if p_kind = 'enquiry' and p_outcome = 'lost' then
      needs_ack := true; owner_only := true; return;
    elsif p_outcome = 'cancelled' and p_kind in ('appointment', 'job') then
      needs_ack := true; owner_only := true; return;
    elsif p_kind = 'appointment' and p_outcome = 'attended' then
      if p_starts_at is null then needs_ack := true; flags := array['attended_without_time'];
      elsif not v_time_passed then needs_ack := true; flags := array['attended_before_time'];
      end if;
      return;
    elsif p_outcome = 'no_show' and (p_kind = 'appointment' or (p_kind = 'job' and p_from = 'waiting')) then
      if not v_time_passed then needs_ack := true; flags := array['no_show_before_time']; end if;
      return;
    elsif p_kind = 'job' and p_outcome = 'completed' then
      if p_from = 'waiting' then needs_ack := true; flags := array['arrival_not_recorded']; end if;
      return;
    end if;
    reason := 'not_allowed'; return;
  end if;
  if p_outcome is not null then reason := 'not_allowed'; return; end if;
  if (p_kind, p_from, p_to) in (('enquiry', 'new', 'contacted'), ('job', 'waiting', 'active'), ('job', 'active', 'ready'), ('job', 'ready', 'active')) then
    return;
  end if;
  if (p_kind, p_from, p_to) = ('job', 'waiting', 'ready') then
    needs_ack := true; flags := array['arrival_not_recorded']; return;
  end if;
  reason := 'not_allowed';
end $$;

-- The only place request fields are written apart from status. Used by correction and by Undo.
create function private.rb_apply_fields(p_location uuid, p_request uuid, c jsonb) returns public.customer_requests
language plpgsql set search_path = '' as $$
declare r public.customer_requests;
begin
  if c ? 'customer_name' then
    update public.customers k set display_name = c ->> 'customer_name', updated_at = now()
      from public.customer_requests q
     where q.id = p_request and q.location_id = p_location and k.id = q.customer_id and k.location_id = p_location;
  end if;
  update public.customer_requests q set
    summary = case when c ? 'summary' then c ->> 'summary' else q.summary end,
    requested_window_text = case when c ? 'requested_window_text' then c ->> 'requested_window_text' else q.requested_window_text end,
    starts_at = case when c ? 'starts_at' then (c ->> 'starts_at')::timestamptz else q.starts_at end,
    ends_at = case when c ? 'ends_at' then (c ->> 'ends_at')::timestamptz else q.ends_at end,
    next_action = case when c ? 'next_action' then c ->> 'next_action' else q.next_action end,
    next_action_due_at = case when c ? 'next_action_due_at' then (c ->> 'next_action_due_at')::timestamptz else q.next_action_due_at end,
    follow_up_user_id = case when c ? 'follow_up_user_id' then (c ->> 'follow_up_user_id')::uuid else q.follow_up_user_id end,
    origin_channel = case when c ? 'origin_channel' then c ->> 'origin_channel' else q.origin_channel end,
    external_system = case when c ? 'external_system' then c ->> 'external_system' else q.external_system end,
    external_id = case when c ? 'external_id' then c ->> 'external_id' else q.external_id end,
    details = case when c ? 'details' then c -> 'details' else q.details end,
    staff_confirmed_at = case when c ? 'staff_confirmed_at' then (c ->> 'staff_confirmed_at')::timestamptz else q.staff_confirmed_at end,
    staff_confirmed_by = case when c ? 'staff_confirmed_by' then (c ->> 'staff_confirmed_by')::uuid else q.staff_confirmed_by end,
    customer_confirmed_at = case when c ? 'customer_confirmed_at' then (c ->> 'customer_confirmed_at')::timestamptz else q.customer_confirmed_at end,
    customer_confirmed_recorded_by = case when c ? 'customer_confirmed_recorded_by' then (c ->> 'customer_confirmed_recorded_by')::uuid else q.customer_confirmed_recorded_by end,
    row_version = q.row_version + 1, updated_at = now()
   where q.id = p_request and q.location_id = p_location
   returning q.* into r;
  return r;
end $$;

-- The latest activity of a request that has not been undone and is not itself an Undo.
create function private.rb_latest(p_request uuid) returns uuid
language sql stable set search_path = '' as $$
  select a.id from public.request_activities a
   where a.request_id = p_request and a.type <> 'undone'
     and not exists (select 1 from public.request_activities u where u.undo_of = a.id)
   order by a.created_at desc, a.id desc limit 1
$$;

create function private.rb_audit(p_actor uuid, p_action text, p_location uuid, p_request uuid, p_after jsonb) returns void
language sql set search_path = '' as $$
  select private.audit('user', p_actor, p_action, p_location, 'customer_request', p_request::text, null, p_after, 'system', 'ok');
$$;

-- ------------------------------------------------------------------------------------------------------------------------

create function public.request_create(p_location uuid, p_actor uuid, p_key text, p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g record; p record; r public.customer_requests; v_customer uuid; v_status text; v_kind text; v_activity uuid; v_id jsonb; v_unknown text;
  v_allowed text[] := array['kind', 'customer_id', 'customer_name', 'identifiers', 'summary', 'entry_method', 'origin_channel',
    'intake_id', 'requested_window_text', 'starts_at', 'ends_at', 'initial_status', 'next_action', 'next_action_due_at',
    'follow_up_user_id', 'external_system', 'external_id', 'details'];
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' then return private.rb_refuse('invalid_input'); end if;
  select k into v_unknown from jsonb_object_keys(p_input) k where k <> all (v_allowed) limit 1;
  if v_unknown is not null then return private.rb_refuse('unknown_field', jsonb_build_object('field', v_unknown)); end if;
  p := private.rb_replay(p_location, p_key, 'request_create', p_input);
  if p.result is not null then return p.result; end if;

  v_kind := p_input ->> 'kind';
  v_status := case v_kind when 'enquiry' then 'new' when 'appointment' then 'requested' when 'job' then 'waiting' end;
  if v_status is null then return private.rb_refuse('invalid_field', '{"field": "kind"}'); end if;
  if p_input ? 'initial_status' then
    if v_kind <> 'job' or p_input ->> 'initial_status' not in ('waiting', 'active') then
      return private.rb_refuse('invalid_field', '{"field": "initial_status"}');
    end if;
    v_status := p_input ->> 'initial_status';
  end if;

  begin
    -- Checked before anything is written: a refusal returned from inside this block would keep its writes.
    if p_input ? 'intake_id' then
      perform 1 from public.request_intakes i
       where i.id = (p_input ->> 'intake_id')::uuid and i.location_id = p_location and i.state = 'pending' for update;
      if not found then return private.rb_refuse('intake_unavailable'); end if;
    end if;
    if p_input ? 'customer_id' then
      select k.id into v_customer from public.customers k
       where k.id = (p_input ->> 'customer_id')::uuid and k.location_id = p_location and k.erased_at is null;
      if v_customer is null then return private.rb_refuse('customer_not_found'); end if;
      update public.customers k set last_seen_at = now() where k.id = v_customer;
    else
      insert into public.customers (location_id, display_name, last_seen_at)
      values (p_location, nullif(p_input ->> 'customer_name', ''), now()) returning id into v_customer;
    end if;
    if jsonb_typeof(p_input -> 'identifiers') = 'array' then
      insert into public.customer_identifiers (location_id, customer_id, kind, value)
      select p_location, v_customer, i ->> 'kind', i ->> 'value' from jsonb_array_elements(p_input -> 'identifiers') i
      on conflict (customer_id, kind, value) do nothing;
    elsif p_input ? 'identifiers' then
      raise exception 'identifiers' using errcode = '22023';
    end if;
    if p_input ? 'intake_id' then
      update public.request_intakes i set state = 'confirmed'
       where i.id = (p_input ->> 'intake_id')::uuid and i.location_id = p_location and i.state = 'pending';
    end if;
    if pg_column_size(coalesce(p_input -> 'details', '{}'::jsonb)) > 8000 then
      raise exception 'details' using errcode = '22023';
    end if;
    insert into public.customer_requests (location_id, number, kind, status, customer_id, summary, entry_method, origin_channel,
      intake_id, requested_window_text, starts_at, ends_at, next_action, next_action_due_at, follow_up_user_id,
      external_system, external_id, pack, pack_version, details, created_by)
    values (p_location, private.rb_next_number(p_location), v_kind, v_status, v_customer, p_input ->> 'summary', p_input ->> 'entry_method',
      coalesce(p_input ->> 'origin_channel', 'unknown'), (p_input ->> 'intake_id')::uuid, p_input ->> 'requested_window_text',
      (p_input ->> 'starts_at')::timestamptz, (p_input ->> 'ends_at')::timestamptz, p_input ->> 'next_action',
      (p_input ->> 'next_action_due_at')::timestamptz, (p_input ->> 'follow_up_user_id')::uuid,
      p_input ->> 'external_system', p_input ->> 'external_id', g.pack, g.pack_version, coalesce(p_input -> 'details', '{}'::jsonb), p_actor)
    returning * into r;
  exception
    when check_violation then
      if sqlerrm like 'request_book: real customer%' then return private.rb_refuse('real_data_refused'); end if;
      return private.rb_refuse('invalid_field');
    when not_null_violation or foreign_key_violation or unique_violation or invalid_datetime_format or datetime_field_overflow
      or invalid_text_representation or invalid_parameter_value then
      return private.rb_refuse('invalid_field');
  end;

  v_activity := private.rb_activity(p_location, r.id, 'created', p_actor, g.actor_role, 'request_create', null, v_status);
  perform private.rb_audit(p_actor, 'request_created', p_location, r.id, jsonb_build_object('kind', r.kind, 'status', r.status));
  return private.rb_finish(p_location, p_actor, p_key, 'request_create', p.input_hash, private.rb_result(r, v_activity));
end $$;

create function public.request_set_status(p_location uuid, p_actor uuid, p_key text, p_request uuid, p_expected_version integer,
  p_to_status text, p_outcome text default null, p_acknowledged boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g record; p record; r public.customer_requests; rule record; v_activity uuid; v_prev text; v_flags text[]; v_from text; v_from_outcome text; v_closed timestamptz;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  p := private.rb_replay(p_location, p_key, 'request_set_status',
    jsonb_build_object('request', p_request, 'version', p_expected_version, 'to', p_to_status, 'outcome', p_outcome, 'ack', p_acknowledged));
  if p.result is not null then return p.result; end if;
  select * into r from public.customer_requests q where q.id = p_request and q.location_id = p_location for update;
  if not found then return private.rb_refuse('not_found'); end if;
  if p_expected_version is distinct from r.row_version then
    return private.rb_refuse('version_conflict', jsonb_build_object('row_version', r.row_version));
  end if;
  v_from := r.status; v_from_outcome := r.outcome; v_closed := r.closed_at;

  if r.status = 'closed' then
    -- Reopening: owner or manager, explicit, and only back to where it was. Conversions and voids go through Undo.
    if g.actor_role not in ('owner', 'manager') then return private.rb_refuse('forbidden'); end if;
    if r.outcome in ('converted', 'voided') then return private.rb_refuse('not_reopenable'); end if;
    select a.from_status into v_prev from public.request_activities a
     where a.request_id = r.id and a.type = 'status_changed' and a.to_status = 'closed'
     order by a.created_at desc, a.id desc limit 1;
    if v_prev is null or p_to_status is distinct from v_prev or p_outcome is not null then
      return private.rb_refuse('not_allowed', jsonb_build_object('reopen_to', v_prev));
    end if;
    if not coalesce(p_acknowledged, false) then
      return private.rb_refuse('needs_confirmation', '{"flags": ["reopened"]}');
    end if;
    v_flags := array['reopened'];
    update public.customer_requests q set status = p_to_status, outcome = null, closed_at = null,
      row_version = q.row_version + 1, updated_at = now() where q.id = r.id returning q.* into r;
  else
    rule := private.rb_rule(r.kind, r.status, p_to_status, p_outcome, r.starts_at);
    if rule.reason is not null then return private.rb_refuse(rule.reason); end if;
    if rule.owner_only and g.actor_role not in ('owner', 'manager') then return private.rb_refuse('forbidden'); end if;
    if rule.needs_ack and not coalesce(p_acknowledged, false) then
      return private.rb_refuse('needs_confirmation', jsonb_build_object('flags', to_jsonb(rule.flags)));
    end if;
    v_flags := rule.flags;
    update public.customer_requests q set status = p_to_status, outcome = p_outcome,
      closed_at = case when p_to_status = 'closed' then now() end,
      row_version = q.row_version + 1, updated_at = now() where q.id = r.id returning q.* into r;
  end if;

  v_activity := private.rb_activity(p_location, r.id, 'status_changed', p_actor, g.actor_role, 'request_set_status',
    v_from, r.status, v_from_outcome, r.outcome, v_flags);
  if v_closed is not null then
    insert into public.request_activity_values (activity_id, location_id, field, before_value)
    values (v_activity, p_location, 'closed_at', to_jsonb(v_closed));
  end if;
  perform private.rb_audit(p_actor, 'request_status_changed', p_location, r.id,
    jsonb_build_object('from', v_from, 'to', r.status, 'outcome', r.outcome));
  return private.rb_finish(p_location, p_actor, p_key, 'request_set_status', p.input_hash, private.rb_result(r, v_activity, v_flags));
end $$;

-- Requested, staff-confirmed and customer-confirmed are independent facts. Customer confirmation always means staff
-- recorded what the customer told them: Kabsi does not talk to customers and verifies nothing.
create function public.request_set_confirmation(p_location uuid, p_actor uuid, p_key text, p_request uuid, p_expected_version integer,
  p_party text, p_confirmed boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g record; p record; r public.customer_requests; v_activity uuid; c jsonb; v_flags text[]; v_at text; v_by text; f text;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  if p_party is null or p_party not in ('staff', 'customer') or p_confirmed is null then return private.rb_refuse('invalid_input'); end if;
  p := private.rb_replay(p_location, p_key, 'request_set_confirmation',
    jsonb_build_object('request', p_request, 'version', p_expected_version, 'party', p_party, 'confirmed', p_confirmed));
  if p.result is not null then return p.result; end if;
  select * into r from public.customer_requests q where q.id = p_request and q.location_id = p_location for update;
  if not found then return private.rb_refuse('not_found'); end if;
  if p_expected_version is distinct from r.row_version then
    return private.rb_refuse('version_conflict', jsonb_build_object('row_version', r.row_version));
  end if;
  if r.kind <> 'appointment' then return private.rb_refuse('not_appointment'); end if;
  if r.status = 'closed' then return private.rb_refuse('closed'); end if;
  if p_confirmed and r.starts_at is null then return private.rb_refuse('time_required'); end if;
  if p_party = 'staff' then
    v_at := 'staff_confirmed_at'; v_by := 'staff_confirmed_by';
  else
    v_at := 'customer_confirmed_at'; v_by := 'customer_confirmed_recorded_by';
  end if;
  if (to_jsonb(r) ->> v_at is not null) = p_confirmed then return private.rb_refuse('no_change'); end if;
  c := jsonb_build_object(v_at, case when p_confirmed then to_jsonb(clock_timestamp()) else 'null'::jsonb end,
                          v_by, case when p_confirmed then to_jsonb(p_actor) else 'null'::jsonb end);
  v_flags := array[p_party || case when p_confirmed then '_confirmed' else '_unconfirmed' end]
    || case when p_party = 'customer' then array['recorded_by_staff'] else '{}'::text[] end;
  v_activity := private.rb_activity(p_location, r.id, 'confirmation_changed', p_actor, g.actor_role, 'request_set_confirmation',
    r.status, r.status, null, null, v_flags);
  foreach f in array array[v_at, v_by] loop
    insert into public.request_activity_values (activity_id, location_id, field, before_value, after_value)
    values (v_activity, p_location, f, to_jsonb(r) -> f, c -> f);
  end loop;
  r := private.rb_apply_fields(p_location, r.id, c);
  perform private.rb_audit(p_actor, 'request_confirmation_changed', p_location, r.id, jsonb_build_object('flags', to_jsonb(v_flags)));
  return private.rb_finish(p_location, p_actor, p_key, 'request_set_confirmation', p.input_hash, private.rb_result(r, v_activity, v_flags));
end $$;

create function public.request_correct(p_location uuid, p_actor uuid, p_key text, p_request uuid, p_expected_version integer, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g record; p record; r public.customer_requests; v_activity uuid; v_unknown text; v_field text; v_flags text[] := '{}'; v_old jsonb;
  v_name text; c jsonb := '{}'; v_cur jsonb;
  v_allowed text[] := array['summary', 'requested_window_text', 'starts_at', 'ends_at', 'next_action', 'next_action_due_at',
    'follow_up_user_id', 'origin_channel', 'external_system', 'external_id', 'details', 'customer_name'];
  v_any_role text[] := array['next_action', 'next_action_due_at', 'follow_up_user_id'];
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then return private.rb_refuse('invalid_input'); end if;
  select k into v_unknown from jsonb_object_keys(p_changes) k where k <> all (v_allowed) limit 1;
  if v_unknown is not null then return private.rb_refuse('unknown_field', jsonb_build_object('field', v_unknown)); end if;
  if g.actor_role = 'staff' and exists (select 1 from jsonb_object_keys(p_changes) k where k <> all (v_any_role)) then
    return private.rb_refuse('forbidden');
  end if;
  p := private.rb_replay(p_location, p_key, 'request_correct',
    jsonb_build_object('request', p_request, 'version', p_expected_version, 'changes', p_changes));
  if p.result is not null then return p.result; end if;
  select * into r from public.customer_requests q where q.id = p_request and q.location_id = p_location for update;
  if not found then return private.rb_refuse('not_found'); end if;
  if p_expected_version is distinct from r.row_version then
    return private.rb_refuse('version_conflict', jsonb_build_object('row_version', r.row_version));
  end if;
  if r.status = 'closed' then return private.rb_refuse('closed'); end if;
  select k.display_name into v_name from public.customers k where k.id = r.customer_id and k.location_id = p_location;
  v_cur := to_jsonb(r) || jsonb_build_object('customer_name', v_name);

  begin
    -- Only what really changes. Times compare as instants, not as text.
    for v_field in select k from jsonb_object_keys(p_changes) k loop
      if (v_field in ('starts_at', 'ends_at', 'next_action_due_at')
            and (p_changes ->> v_field)::timestamptz is not distinct from (v_cur ->> v_field)::timestamptz)
         or (v_field not in ('starts_at', 'ends_at', 'next_action_due_at') and p_changes -> v_field is not distinct from coalesce(v_cur -> v_field, 'null'::jsonb)) then
        continue;
      end if;
      c := c || jsonb_build_object(v_field, p_changes -> v_field);
    end loop;
    if c = '{}'::jsonb then return private.rb_refuse('no_change'); end if;
    if pg_column_size(coalesce(c -> 'details', '{}'::jsonb)) > 8000 then
      raise exception 'details' using errcode = '22023';
    end if;
    -- A confirmation was for the old time. It does not carry over.
    if (c ? 'starts_at' or c ? 'ends_at') and (r.staff_confirmed_at is not null or r.customer_confirmed_at is not null) then
      c := c || '{"staff_confirmed_at": null, "staff_confirmed_by": null, "customer_confirmed_at": null, "customer_confirmed_recorded_by": null}'::jsonb;
      v_flags := array['confirmations_cleared'];
    end if;
    v_activity := private.rb_activity(p_location, r.id, 'corrected', p_actor, g.actor_role, 'request_correct', r.status, r.status, null, null, v_flags);
    for v_field in select k from jsonb_object_keys(c) k loop
      insert into public.request_activity_values (activity_id, location_id, field, before_value, after_value)
      values (v_activity, p_location, v_field, coalesce(v_cur -> v_field, 'null'::jsonb), c -> v_field);
    end loop;
    r := private.rb_apply_fields(p_location, r.id, c);
  exception
    when check_violation or not_null_violation or foreign_key_violation or unique_violation or invalid_datetime_format
      or datetime_field_overflow or invalid_text_representation or invalid_parameter_value then
      return private.rb_refuse('invalid_field');
  end;

  perform private.rb_audit(p_actor, 'request_corrected', p_location, r.id,
    jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(c) k), 'flags', to_jsonb(v_flags)));
  return private.rb_finish(p_location, p_actor, p_key, 'request_correct', p.input_hash, private.rb_result(r, v_activity, v_flags));
end $$;

-- The enquiry stays exactly as it was and closes as converted; a new linked request starts. Nothing is added in between:
-- no 'contacted' step that nobody stated, and no confirmation.
create function public.request_convert_enquiry(p_location uuid, p_actor uuid, p_key text, p_request uuid, p_expected_version integer, p_input jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g record; p record; e public.customer_requests; n public.customer_requests; v_out uuid; v_in uuid; v_unknown text; v_kind text; v_status text; v_from text;
  v_allowed text[] := array['kind', 'summary', 'requested_window_text', 'starts_at', 'ends_at', 'next_action', 'next_action_due_at', 'follow_up_user_id'];
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' then return private.rb_refuse('invalid_input'); end if;
  select k into v_unknown from jsonb_object_keys(p_input) k where k <> all (v_allowed) limit 1;
  if v_unknown is not null then return private.rb_refuse('unknown_field', jsonb_build_object('field', v_unknown)); end if;
  p := private.rb_replay(p_location, p_key, 'request_convert_enquiry',
    jsonb_build_object('request', p_request, 'version', p_expected_version, 'input', p_input));
  if p.result is not null then return p.result; end if;
  v_kind := coalesce(p_input ->> 'kind', 'appointment');
  v_status := case v_kind when 'appointment' then 'requested' when 'job' then 'waiting' end;
  if v_status is null then return private.rb_refuse('invalid_field', '{"field": "kind"}'); end if;
  select * into e from public.customer_requests q where q.id = p_request and q.location_id = p_location for update;
  if not found then return private.rb_refuse('not_found'); end if;
  if p_expected_version is distinct from e.row_version then
    return private.rb_refuse('version_conflict', jsonb_build_object('row_version', e.row_version));
  end if;
  if e.kind <> 'enquiry' then return private.rb_refuse('not_enquiry'); end if;
  if e.status = 'closed' then return private.rb_refuse('closed'); end if;
  v_from := e.status;

  begin
    insert into public.customer_requests (location_id, number, kind, status, customer_id, summary, entry_method, origin_channel,
      requested_window_text, starts_at, ends_at, next_action, next_action_due_at, follow_up_user_id, converted_from_request_id,
      pack, pack_version, created_by)
    values (p_location, private.rb_next_number(p_location), v_kind, v_status, e.customer_id, coalesce(p_input ->> 'summary', e.summary),
      e.entry_method, e.origin_channel, coalesce(p_input ->> 'requested_window_text', e.requested_window_text),
      (p_input ->> 'starts_at')::timestamptz, (p_input ->> 'ends_at')::timestamptz, p_input ->> 'next_action',
      (p_input ->> 'next_action_due_at')::timestamptz,
      case when p_input ? 'follow_up_user_id' then (p_input ->> 'follow_up_user_id')::uuid else e.follow_up_user_id end,
      e.id, g.pack, g.pack_version, p_actor)
    returning * into n;
  exception
    when check_violation or not_null_violation or foreign_key_violation or unique_violation or invalid_datetime_format
      or datetime_field_overflow or invalid_text_representation or invalid_parameter_value then
      return private.rb_refuse('invalid_field');
  end;
  update public.customer_requests q set status = 'closed', outcome = 'converted', closed_at = now(),
    row_version = q.row_version + 1, updated_at = now() where q.id = e.id returning q.* into e;
  v_out := private.rb_activity(p_location, e.id, 'converted_out', p_actor, g.actor_role, 'request_convert_enquiry',
    v_from, 'closed', null, 'converted', '{}', null, n.id);
  v_in := private.rb_activity(p_location, n.id, 'converted_in', p_actor, g.actor_role, 'request_convert_enquiry',
    null, n.status, null, null, '{}', null, e.id);
  perform private.rb_audit(p_actor, 'request_converted', p_location, e.id, jsonb_build_object('to_kind', n.kind, 'new_request', n.id));
  return private.rb_finish(p_location, p_actor, p_key, 'request_convert_enquiry', p.input_hash,
    private.rb_result(n, v_in) || jsonb_build_object('enquiry_id', e.id, 'enquiry_activity_id', v_out));
end $$;

-- Undo adds a compensating activity and never rewrites history. Only inside 10 minutes, only the latest effective
-- activity of the request, and an Undo itself cannot be undone.
create function public.request_undo(p_location uuid, p_actor uuid, p_key text, p_activity uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g record; p record; a public.request_activities; r public.customer_requests; o public.customer_requests; v_undo uuid; v_pair public.request_activities; c jsonb := '{}'; v_cl jsonb;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  p := private.rb_replay(p_location, p_key, 'request_undo', jsonb_build_object('activity', p_activity));
  if p.result is not null then return p.result; end if;
  select * into a from public.request_activities x where x.id = p_activity and x.location_id = p_location;
  if not found then return private.rb_refuse('not_found'); end if;
  if g.actor_role not in ('owner', 'manager') and a.actor_user_id <> p_actor then return private.rb_refuse('forbidden'); end if;
  if a.type = 'undone' then return private.rb_refuse('not_undoable'); end if;

  -- A conversion is two requests: lock both in id order, and both must still be at the conversion.
  if a.type in ('converted_out', 'converted_in') then
    perform 1 from public.customer_requests q where q.location_id = p_location and q.id in (a.request_id, a.related_request_id)
      order by q.id for update;
    select * into v_pair from public.request_activities x where x.location_id = p_location and x.request_id = a.related_request_id
      and x.related_request_id = a.request_id and x.type in ('converted_out', 'converted_in');
    if not found then return private.rb_refuse('not_found'); end if;
  else
    perform 1 from public.customer_requests q where q.id = a.request_id and q.location_id = p_location for update;
  end if;
  select * into r from public.customer_requests q where q.id = a.request_id and q.location_id = p_location;

  if exists (select 1 from public.request_activities u where u.location_id = p_location and u.undo_of = a.id) then return private.rb_refuse('already_undone'); end if;
  if private.rb_latest(a.request_id) is distinct from a.id
     or (v_pair.id is not null and private.rb_latest(v_pair.request_id) is distinct from v_pair.id) then
    return private.rb_refuse('not_latest');
  end if;
  if clock_timestamp() - a.created_at > interval '10 minutes' then return private.rb_refuse('window_passed'); end if;

  if a.type in ('created') then
    update public.customer_requests q set status = 'closed', outcome = 'voided', closed_at = now(),
      row_version = q.row_version + 1, updated_at = now() where q.id = r.id returning q.* into r;
    v_undo := private.rb_activity(p_location, r.id, 'undone', p_actor, g.actor_role, 'request_undo', a.to_status, 'closed', null, 'voided', '{}', a.id);
  elsif a.type = 'status_changed' then
    select v.before_value into v_cl from public.request_activity_values v where v.activity_id = a.id and v.field = 'closed_at' and v.cleared_at is null;
    update public.customer_requests q set status = a.from_status, outcome = a.from_outcome,
      closed_at = case when a.from_status = 'closed' then (v_cl #>> '{}')::timestamptz end,
      row_version = q.row_version + 1, updated_at = now() where q.id = r.id returning q.* into r;
    v_undo := private.rb_activity(p_location, r.id, 'undone', p_actor, g.actor_role, 'request_undo', a.to_status, r.status, a.to_outcome, r.outcome, '{}', a.id);
  elsif a.type in ('corrected', 'confirmation_changed') then
    if exists (select 1 from public.request_activity_values v where v.activity_id = a.id and v.cleared_at is not null) then
      return private.rb_refuse('values_cleared');
    end if;
    select jsonb_object_agg(v.field, coalesce(v.before_value, 'null'::jsonb)) into c from public.request_activity_values v where v.activity_id = a.id;
    r := private.rb_apply_fields(p_location, r.id, c);
    v_undo := private.rb_activity(p_location, r.id, 'undone', p_actor, g.actor_role, 'request_undo', r.status, r.status, null, null, '{}', a.id);
  else
    -- Conversion: the enquiry returns to where it was; the new request is voided and keeps its link.
    declare v_enq public.request_activities := case when a.type = 'converted_out' then a else v_pair end;
            v_new public.request_activities := case when a.type = 'converted_out' then v_pair else a end;
    begin
      update public.customer_requests q set status = v_enq.from_status, outcome = null, closed_at = null,
        row_version = q.row_version + 1, updated_at = now() where q.id = v_enq.request_id and q.location_id = p_location returning q.* into r;
      update public.customer_requests q set status = 'closed', outcome = 'voided', closed_at = now(),
        row_version = q.row_version + 1, updated_at = now() where q.id = v_new.request_id and q.location_id = p_location returning q.* into o;
      v_undo := private.rb_activity(p_location, r.id, 'undone', p_actor, g.actor_role, 'request_undo', 'closed', r.status, 'converted', null, '{}', v_enq.id, o.id);
      perform private.rb_activity(p_location, o.id, 'undone', p_actor, g.actor_role, 'request_undo', v_new.to_status, 'closed', null, 'voided', '{}', v_new.id, r.id);
    end;
  end if;

  perform private.rb_audit(p_actor, 'request_undone', p_location, r.id, jsonb_build_object('undid', a.type));
  return private.rb_finish(p_location, p_actor, p_key, 'request_undo', p.input_hash, private.rb_result(r, v_undo));
end $$;

-- Service-only: no browser role can run any of this.
revoke all on function public.request_create(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.request_set_status(uuid, uuid, text, uuid, integer, text, text, boolean) from public, anon, authenticated;
revoke all on function public.request_set_confirmation(uuid, uuid, text, uuid, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.request_correct(uuid, uuid, text, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.request_convert_enquiry(uuid, uuid, text, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.request_undo(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.request_create(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.request_set_status(uuid, uuid, text, uuid, integer, text, text, boolean) to service_role;
grant execute on function public.request_set_confirmation(uuid, uuid, text, uuid, integer, text, boolean) to service_role;
grant execute on function public.request_correct(uuid, uuid, text, uuid, integer, jsonb) to service_role;
grant execute on function public.request_convert_enquiry(uuid, uuid, text, uuid, integer, jsonb) to service_role;
grant execute on function public.request_undo(uuid, uuid, text, uuid) to service_role;

do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'private' and p.proname like 'rb\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
  end loop;
end $$;
