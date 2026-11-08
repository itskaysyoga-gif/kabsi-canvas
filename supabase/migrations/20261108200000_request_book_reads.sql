-- Request book, RB-C1 (R-139): the reads, the proposals and the name search key that PR B does not have. Additive only:
-- eight service-only functions, private helpers and one trigger on public.customers. No existing table, column, function,
-- route or Google path changes, nothing calls these yet, and no row is added to app_settings or location_packs.
--
-- Rules every function keeps, as in PR B:
--   private.rb_gate first: 'disabled' unless app_settings.request_book is 'on' and the pack is in test, then 'not_member'
--   for anyone who is not a member of that location (a null actor included);
--   every row is read through the location given, so another business's row is never returned;
--   proposals are idempotent through rb_replay and rb_finish, and a refused call writes nothing;
--   reads are STABLE, so the database itself refuses any write inside them, tool_executions included;
--   no dynamic SQL: every value is a bound parameter;
--   audit rows and tool results hold ids, states and field names, never a name, a phone or a customer's words.

-- 1. The name search key. Lower case, trimmed, spaces folded, Arabic-Indic and Eastern Arabic-Indic digits to 0 to 9,
-- Arabic short vowels and the tatweel removed, the common hamza forms of alef, taa marbuta and alef maqsura folded, and
-- common Latin accents folded. Written with escapes so that the file shows no Arabic script.
create function private.rb_fold(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(left(btrim(regexp_replace(lower(translate(p,
      U&'\0660\0661\0662\0663\0664\0665\0666\0667\0668\0669\06F0\06F1\06F2\06F3\06F4\06F5\06F6\06F7\06F8\06F9'
        || U&'\0623\0625\0622\0671\0629\0649'
        || 'àáâãäåāăąçćčďèéêëēėęěìíîïīįłñńňòóôõöøōőřśšşťùúûüūůűýÿžźżÀÁÂÃÄÅĀĂĄÇĆČĎÈÉÊËĒĖĘĚÌÍÎÏĪĮŁÑŃŇÒÓÔÕÖØŌŐŘŚŠŞŤÙÚÛÜŪŮŰÝŸŽŹŻ'
        || U&'\064B\064C\064D\064E\064F\0650\0651\0652\0640',
      '01234567890123456789'
        || U&'\0627\0627\0627\0627\0647\064A'
        || 'aaaaaaaaacccdeeeeeeeeiiiiiilnnnoooooooorssstuuuuuuuyyzzz'
        || 'AAAAAAAAACCCDEEEEEEEEIIIIIILNNNOOOOOOOORSSSTUUUUUUUYYZZZ')),
    '\s+', ' ', 'g')), 200), '')
$$;

-- Digits only, with Arabic digits folded and leading zeros (a trunk 0 or an international 00) dropped, so a number
-- typed locally or internationally compares by its tail.
create function private.rb_digits(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(ltrim(regexp_replace(translate(p,
      U&'\0660\0661\0662\0663\0664\0665\0666\0667\0668\0669\06F0\06F1\06F2\06F3\06F4\06F5\06F6\06F7\06F8\06F9',
      '01234567890123456789'), '[^0-9]', '', 'g'), '0'), '')
$$;

create function private.rb_customers_name_key() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.name_key := private.rb_fold(new.display_name);
  return new;
end $$;
create trigger customers_name_key before insert or update of display_name on public.customers
  for each row execute function private.rb_customers_name_key();
-- PR B left the key blank. Production has no customers; this keeps any test row consistent.
update public.customers k set name_key = private.rb_fold(k.display_name)
 where k.name_key is distinct from private.rb_fold(k.display_name);

-- 2. One list row: what the owner needs to pick the right request, and nothing more.
create function private.rb_row(q public.customer_requests, p_name text) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('request_id', q.id, 'number', q.number, 'kind', q.kind, 'status', q.status, 'outcome', q.outcome,
    'summary', q.summary, 'customer_id', q.customer_id, 'customer_name', p_name, 'requested_window_text', q.requested_window_text,
    'starts_at', q.starts_at, 'staff_confirmed', q.staff_confirmed_at is not null,
    'customer_confirmed', q.customer_confirmed_at is not null, 'next_action', q.next_action,
    'next_action_due_at', q.next_action_due_at, 'follow_up_user_id', q.follow_up_user_id, 'created_at', q.created_at)
$$;

create function private.rb_intake_result(i public.request_intakes) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('ok', true, 'intake_id', i.id, 'state', i.state, 'expires_at', i.expires_at)
$$;

create function private.rb_intake_audit(p_actor uuid, p_action text, p_location uuid, p_intake uuid, p_after jsonb) returns void
language sql set search_path = '' as $$
  select private.audit('user', p_actor, p_action, p_location, 'request_intake', p_intake::text, null, p_after, 'system', 'ok');
$$;

-- ------------------------------------------------------------------------------------------------------------------------
-- 3. Proposals. What arrived is kept apart from any request until someone saves it with request_create.

create function public.request_intake_propose(p_location uuid, p_actor uuid, p_key text, p_source text, p_raw_text text,
  p_field_evidence jsonb, p_provider_message_id text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g record; p record; i public.request_intakes; v_evidence jsonb;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  v_evidence := coalesce(p_field_evidence, '{}'::jsonb);
  if jsonb_typeof(v_evidence) <> 'object' then return private.rb_refuse('invalid_field', '{"field": "field_evidence"}'); end if;
  if nullif(btrim(p_raw_text), '') is null and v_evidence = '{}'::jsonb then return private.rb_refuse('invalid_input'); end if;
  p := private.rb_replay(p_location, p_actor, p_key, 'request_intake_propose', jsonb_build_object('source', p_source,
    'raw_text', p_raw_text, 'field_evidence', v_evidence, 'provider_message_id', p_provider_message_id));
  if p.result is not null then return p.result; end if;
  if pg_column_size(v_evidence) > 16000 then return private.rb_refuse('invalid_field', '{"field": "field_evidence"}'); end if;
  if p_provider_message_id is not null and exists (select 1 from public.request_intakes x
       where x.location_id = p_location and x.provider_message_id = p_provider_message_id) then
    return private.rb_refuse('duplicate_message');
  end if;
  begin
    insert into public.request_intakes (location_id, source, raw_text, field_evidence, provider_message_id, created_by)
    values (p_location, p_source, p_raw_text, v_evidence, p_provider_message_id, p_actor)
    returning * into i;
  exception
    when unique_violation then return private.rb_refuse('duplicate_message');
    when integrity_constraint_violation or data_exception then return private.rb_refuse('invalid_field');
  end;
  perform private.rb_intake_audit(p_actor, 'request_intake_proposed', p_location, i.id, jsonb_build_object('source', i.source));
  return private.rb_finish(p_location, p_actor, p_key, 'request_intake_propose', p.input_hash, private.rb_intake_result(i));
end $$;

-- Only the person who proposed it, or an owner or manager, may change or discard a proposal.
create function public.request_intake_revise(p_location uuid, p_actor uuid, p_key text, p_intake uuid, p_raw_text text,
  p_field_evidence jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g record; p record; i public.request_intakes; v_text text; v_evidence jsonb; v_fields text[] := '{}';
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  if p_raw_text is null and p_field_evidence is null then return private.rb_refuse('invalid_input'); end if;
  if p_field_evidence is not null and jsonb_typeof(p_field_evidence) <> 'object' then
    return private.rb_refuse('invalid_field', '{"field": "field_evidence"}');
  end if;
  p := private.rb_replay(p_location, p_actor, p_key, 'request_intake_revise',
    jsonb_build_object('intake', p_intake, 'raw_text', p_raw_text, 'field_evidence', p_field_evidence));
  if p.result is not null then return p.result; end if;
  select * into i from public.request_intakes x where x.id = p_intake and x.location_id = p_location for update;
  if not found then return private.rb_refuse('not_found'); end if;
  if i.created_by is distinct from p_actor and g.actor_role not in ('owner', 'manager') then return private.rb_refuse('forbidden'); end if;
  if i.state <> 'pending' then return private.rb_refuse('intake_unavailable', jsonb_build_object('state', i.state)); end if;
  if i.expires_at <= now() then return private.rb_refuse('intake_unavailable', '{"state": "expired"}'); end if;
  v_text := coalesce(p_raw_text, i.raw_text);
  v_evidence := coalesce(p_field_evidence, i.field_evidence);
  if pg_column_size(v_evidence) > 16000 then return private.rb_refuse('invalid_field', '{"field": "field_evidence"}'); end if;
  if nullif(btrim(v_text), '') is null and v_evidence = '{}'::jsonb then return private.rb_refuse('invalid_input'); end if;
  if v_text is distinct from i.raw_text then v_fields := v_fields || 'raw_text'::text; end if;
  if v_evidence is distinct from i.field_evidence then v_fields := v_fields || 'field_evidence'::text; end if;
  if v_fields = '{}' then return private.rb_refuse('no_change'); end if;
  begin
    update public.request_intakes x set raw_text = v_text, field_evidence = v_evidence where x.id = i.id returning x.* into i;
  exception
    when integrity_constraint_violation or data_exception then return private.rb_refuse('invalid_field');
  end;
  perform private.rb_intake_audit(p_actor, 'request_intake_revised', p_location, i.id, jsonb_build_object('fields', to_jsonb(v_fields)));
  return private.rb_finish(p_location, p_actor, p_key, 'request_intake_revise', p.input_hash, private.rb_intake_result(i));
end $$;

create function public.request_intake_discard(p_location uuid, p_actor uuid, p_key text, p_intake uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g record; p record; i public.request_intakes;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  p := private.rb_replay(p_location, p_actor, p_key, 'request_intake_discard', jsonb_build_object('intake', p_intake));
  if p.result is not null then return p.result; end if;
  select * into i from public.request_intakes x where x.id = p_intake and x.location_id = p_location for update;
  if not found then return private.rb_refuse('not_found'); end if;
  if i.created_by is distinct from p_actor and g.actor_role not in ('owner', 'manager') then return private.rb_refuse('forbidden'); end if;
  if i.state <> 'pending' then return private.rb_refuse('intake_unavailable', jsonb_build_object('state', i.state)); end if;
  update public.request_intakes x set state = 'discarded' where x.id = i.id returning x.* into i;
  perform private.rb_intake_audit(p_actor, 'request_intake_discarded', p_location, i.id, '{}'::jsonb);
  return private.rb_finish(p_location, p_actor, p_key, 'request_intake_discard', p.input_hash, private.rb_intake_result(i));
end $$;

-- ------------------------------------------------------------------------------------------------------------------------
-- 4. Reads. STABLE: none of them can write a row, not even to tool_executions or the audit log.

create function public.request_intake_get(p_location uuid, p_actor uuid, p_intake uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare g record; i public.request_intakes; v_request uuid;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  select * into i from public.request_intakes x where x.id = p_intake and x.location_id = p_location;
  if not found then return private.rb_refuse('not_found'); end if;
  select q.id into v_request from public.customer_requests q
   where q.location_id = p_location and q.intake_id = i.id and q.outcome is distinct from 'voided'
   order by q.created_at desc limit 1;
  return jsonb_build_object('ok', true, 'intake_id', i.id, 'source', i.source, 'raw_text', i.raw_text,
    'field_evidence', i.field_evidence,
    'state', case when i.state = 'pending' and i.expires_at <= now() then 'expired' else i.state end,
    'provider_message_id', i.provider_message_id, 'created_by', i.created_by, 'created_at', i.created_at,
    'expires_at', i.expires_at, 'request_id', v_request);
end $$;

-- By id or by number ('42' or '#42').
create function public.request_get(p_location uuid, p_actor uuid, p_ref text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare g record; r public.customer_requests; v_ref text; v_name text; v_erased timestamptz;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  v_ref := btrim(p_ref);
  if v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into r from public.customer_requests q where q.location_id = p_location and q.id = v_ref::uuid;
  elsif v_ref ~ '^#?[0-9]{1,9}$' then
    select * into r from public.customer_requests q where q.location_id = p_location and q.number = ltrim(v_ref, '#')::integer;
  else
    return private.rb_refuse('invalid_input');
  end if;
  if r.id is null then return private.rb_refuse('not_found'); end if;
  select k.display_name, k.erased_at into v_name, v_erased from public.customers k
   where k.id = r.customer_id and k.location_id = p_location;
  return jsonb_build_object('ok', true, 'request', to_jsonb(r) - 'location_id', 'customer_name', v_name,
    'customer_erased', v_erased is not null);
end $$;

-- Search by number, name, phone or words of the summary. Every key given must match. Open first, then most recent;
-- at most 15 rows, and how many more there are.
create function public.request_find(p_location uuid, p_actor uuid, p_query jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  g record; v_unknown text; v_number integer; v_name text; v_phone text; v_words text[]; v_rows jsonb; v_total integer;
  v_allowed text[] := array['number', 'name', 'phone', 'text'];
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  if p_query is null or jsonb_typeof(p_query) <> 'object' or p_query = '{}'::jsonb then return private.rb_refuse('invalid_input'); end if;
  select k into v_unknown from jsonb_object_keys(p_query) k where k <> all (v_allowed) limit 1;
  if v_unknown is not null then return private.rb_refuse('unknown_field', jsonb_build_object('field', v_unknown)); end if;
  if p_query ? 'number' then
    if coalesce(p_query ->> 'number', '') !~ '^#?[0-9]{1,9}$' then return private.rb_refuse('invalid_field', '{"field": "number"}'); end if;
    v_number := ltrim(p_query ->> 'number', '#')::integer;
  end if;
  if p_query ? 'name' then
    v_name := private.rb_fold(p_query ->> 'name');
    if v_name is null or length(v_name) < 2 then return private.rb_refuse('invalid_field', '{"field": "name"}'); end if;
  end if;
  if p_query ? 'phone' then
    v_phone := private.rb_digits(p_query ->> 'phone');
    if v_phone is null or length(v_phone) < 7 then return private.rb_refuse('invalid_field', '{"field": "phone"}'); end if;
  end if;
  if p_query ? 'text' then
    select array_agg(w) into v_words from (
      select w from unnest(regexp_split_to_array(coalesce(private.rb_fold(p_query ->> 'text'), ''), ' ')) w
       where length(w) >= 2 limit 6) s;
    if v_words is null then return private.rb_refuse('invalid_field', '{"field": "text"}'); end if;
  end if;

  with hits as (
    select q, k.display_name as name, count(*) over () as total
      from public.customer_requests q
      join public.customers k on k.location_id = q.location_id and k.id = q.customer_id
     where q.location_id = p_location
       and (v_number is null or q.number = v_number)
       and (v_name is null or (k.erased_at is null and position(v_name in k.name_key) > 0))
       and (v_phone is null or (k.erased_at is null and exists (select 1 from public.customer_identifiers ci
             where ci.location_id = p_location and ci.customer_id = k.id and ci.kind = 'phone'
               and right(private.rb_digits(ci.value), length(v_phone)) = v_phone)))
       and (v_words is null or not exists (select 1 from unnest(v_words) w
             where position(w in coalesce(private.rb_fold(q.summary), '')) = 0))
     order by (q.status = 'closed'), q.created_at desc, q.number desc
     limit 15)
  select coalesce(jsonb_agg(private.rb_row(h.q, h.name)), '[]'::jsonb), coalesce(max(h.total), 0)::integer
    into v_rows, v_total from hits h;
  return jsonb_build_object('ok', true, 'rows', v_rows, 'more', greatest(v_total - jsonb_array_length(v_rows), 0));
end $$;

-- Open requests, filtered by kind, status, unconfirmed appointments, or a next action due by a time. Most recent first;
-- at most 15 rows, and how many more there are.
create function public.request_list_open(p_location uuid, p_actor uuid, p_filter jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  g record; f jsonb; v_unknown text; v_kind text; v_status text; v_unconfirmed boolean;
  v_due timestamptz; v_rows jsonb; v_total integer;
  v_allowed text[] := array['kind', 'status', 'unconfirmed', 'due'];
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  f := coalesce(p_filter, '{}'::jsonb);
  if jsonb_typeof(f) <> 'object' then return private.rb_refuse('invalid_input'); end if;
  select k into v_unknown from jsonb_object_keys(f) k where k <> all (v_allowed) limit 1;
  if v_unknown is not null then return private.rb_refuse('unknown_field', jsonb_build_object('field', v_unknown)); end if;
  if f ? 'kind' then
    v_kind := f ->> 'kind';
    if v_kind is null or v_kind not in ('enquiry', 'appointment', 'job') then return private.rb_refuse('invalid_field', '{"field": "kind"}'); end if;
  end if;
  if f ? 'status' then
    v_status := f ->> 'status';
    if v_status is null or v_status not in ('new', 'contacted', 'requested', 'waiting', 'active', 'ready') then
      return private.rb_refuse('invalid_field', '{"field": "status"}');
    end if;
  end if;
  if f ? 'unconfirmed' then
    if jsonb_typeof(f -> 'unconfirmed') <> 'boolean' then return private.rb_refuse('invalid_field', '{"field": "unconfirmed"}'); end if;
    v_unconfirmed := (f ->> 'unconfirmed')::boolean;
  end if;
  if f ? 'due' then
    begin
      v_due := (f ->> 'due')::timestamptz;
    exception when data_exception then
      return private.rb_refuse('invalid_field', '{"field": "due"}');
    end;
    if v_due is null then return private.rb_refuse('invalid_field', '{"field": "due"}'); end if;
  end if;

  with hits as (
    select q, k.display_name as name, count(*) over () as total
      from public.customer_requests q
      join public.customers k on k.location_id = q.location_id and k.id = q.customer_id
     where q.location_id = p_location and q.status <> 'closed'
       and (v_kind is null or q.kind = v_kind)
       and (v_status is null or q.status = v_status)
       and (v_unconfirmed is null or (q.kind = 'appointment'
             and (q.staff_confirmed_at is null or q.customer_confirmed_at is null) = v_unconfirmed))
       and (v_due is null or (q.next_action_due_at is not null and q.next_action_due_at <= v_due))
     order by q.created_at desc, q.number desc
     limit 15)
  select coalesce(jsonb_agg(private.rb_row(h.q, h.name)), '[]'::jsonb), coalesce(max(h.total), 0)::integer
    into v_rows, v_total from hits h;
  return jsonb_build_object('ok', true, 'rows', v_rows, 'more', greatest(v_total - jsonb_array_length(v_rows), 0));
end $$;

-- Customers who might be the one meant. It suggests and never decides: a phone or a name can be shared, so every match
-- is listed, the phone is shown masked, and an erased customer is never returned.
create function public.customer_suggest(p_location uuid, p_actor uuid, p_name text default null, p_phone text default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare g record; v_name text; v_phone text; v_rows jsonb; v_total integer;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  v_name := private.rb_fold(p_name);
  v_phone := private.rb_digits(p_phone);
  if v_name is not null and length(v_name) < 2 then v_name := null; end if;
  if v_phone is not null and length(v_phone) < 7 then v_phone := null; end if;
  if v_name is null and v_phone is null then return private.rb_refuse('invalid_input'); end if;

  with cands as (
    select k.id, k.display_name, k.last_seen_at, k.created_at,
           v_name is not null and position(v_name in k.name_key) > 0 as by_name,
           ph.value as phone
      from public.customers k
      left join lateral (select ci.value from public.customer_identifiers ci
                          where v_phone is not null and ci.location_id = p_location and ci.customer_id = k.id and ci.kind = 'phone'
                            and right(private.rb_digits(ci.value), length(v_phone)) = v_phone
                          order by ci.created_at limit 1) ph on true
     where k.location_id = p_location and k.erased_at is null
       and ((v_name is not null and position(v_name in k.name_key) > 0) or ph.value is not null)),
  hits as (
    select c.*, count(*) over () as total from cands c
     order by (c.phone is not null and c.by_name) desc, (c.phone is not null) desc, c.last_seen_at desc nulls last, c.created_at desc
     limit 15)
  select coalesce(jsonb_agg(jsonb_build_object('customer_id', h.id, 'display_name', h.display_name,
           'matched_by', case when h.phone is not null and h.by_name then 'name_and_phone' when h.phone is not null then 'phone' else 'name' end,
           'phone_hint', case when h.phone is not null then '***' || right(private.rb_digits(h.phone), 4) end,
           'request_count', (select count(*) from public.customer_requests q
                              where q.location_id = p_location and q.customer_id = h.id and q.outcome is distinct from 'voided'),
           'last_seen_at', h.last_seen_at)), '[]'::jsonb),
         coalesce(max(h.total), 0)::integer
    into v_rows, v_total from hits h;
  return jsonb_build_object('ok', true, 'suggestion_only', true, 'candidates', v_rows,
    'more', greatest(v_total - jsonb_array_length(v_rows), 0));
end $$;

-- Service-only: no browser role can run any of this, and no API role can call a private helper.
revoke all on function public.request_intake_propose(uuid, uuid, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.request_intake_revise(uuid, uuid, text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.request_intake_discard(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.request_intake_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.request_get(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.request_find(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.request_list_open(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.customer_suggest(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.request_intake_propose(uuid, uuid, text, text, text, jsonb, text) to service_role;
grant execute on function public.request_intake_revise(uuid, uuid, text, uuid, text, jsonb) to service_role;
grant execute on function public.request_intake_discard(uuid, uuid, text, uuid) to service_role;
grant execute on function public.request_intake_get(uuid, uuid, uuid) to service_role;
grant execute on function public.request_get(uuid, uuid, text) to service_role;
grant execute on function public.request_find(uuid, uuid, jsonb) to service_role;
grant execute on function public.request_list_open(uuid, uuid, jsonb) to service_role;
grant execute on function public.customer_suggest(uuid, uuid, text, text) to service_role;

do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'private' and p.proname like 'rb\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
  end loop;
end $$;
