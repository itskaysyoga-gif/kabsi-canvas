-- P0.3-01: Business Knowledge is the source for every draft (K-10, K-11, K-120, guardrail 4).
--
-- Expand, plus the contract step for writes to the card. Every table and column stays and no row is removed; this
-- file removes nothing at all. Removing a fact (the row and every version, K-120.5) is the next file,
-- 20261013090100_knowledge_fact_removal.sql, which also ties the new table to locations.
--
-- 1. private.fact_trust(): the K-11 order of trust. A fact the owner (or Kabsi staff for them) confirmed is first,
--    then Google's current value, an owner-approved website fact, other connected sources, an AI suggestion.
-- 2. public.knowledge_confirms (K-11): "Kabsi found two different answers. Which is right?" One open question per
--    business and fact. It stands in for the knowledge_confirm task until the task engine (P0.3-05) takes it over.
-- 3. public.draft_facts(location, use): what a draft may use, for the Edge Functions only: the current version,
--    verified, meant for that use, not past its ask-again date (review_after: prices 90 days, staff 180, hours notes
--    60), and not under an open question. Everything else (AI suggestions, website facts nobody confirmed, outdated,
--    rejected) never reaches a prompt.
-- 4. public.propose_fact(...): how a fact from Google, a website, a partner, staff or an AI suggestion arrives, for
--    the Edge Functions only. It never overrides a fact with more trust and never guesses: a disagreement on
--    something customers see (hours, phone, services, prices) becomes one open question, an AI suggestion waits as
--    needs_confirmation, and a value the owner rejected is not asked again.
-- 5. The owner's actions in "About your business": save_fact (add or edit, a new version each time), confirm_fact,
--    reject_fact and answer_knowledge_confirm. Owner or manager, signed in, written to the audit log without values.
-- 6. update_knowledge_card is retired: it raises and nobody may run it. locations.knowledge_card stays as it is
--    (no reader is left); taking the column away is a later contract step that asks Hussein first.

-- 1. Trust ---------------------------------------------------------------------------------------------------------

create function private.fact_trust(p_status text, p_source text, p_confirmed_by uuid) returns integer
language sql immutable set search_path = '' as $$
  select case
    when p_status = 'verified' and (p_source in ('owner', 'staff') or p_confirmed_by is not null) then 1
    when p_source = 'google' then 2
    when p_source = 'website' then 3
    when p_source in ('partner', 'staff', 'owner') then 4
    else 5 end
$$;

-- K-11: what customers see. Two answers that disagree on one of these are asked about, never picked.
create function private.fact_customer_facing(p_key text) returns boolean
language sql immutable set search_path = '' as $$
  select p_key in ('hours_note', 'regular_hours', 'phone', 'contact', 'service', 'product', 'price_note')
$$;

-- K-10: when Kabsi asks again.
create function private.fact_review_days(p_key text) returns integer
language sql immutable set search_path = '' as $$
  select case p_key when 'price_note' then 90 when 'staff_member' then 180 when 'hours_note' then 60 end
$$;

-- 2. Open questions (K-11) -----------------------------------------------------------------------------------------

create table public.knowledge_confirms (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  -- The fact the question is about (knowledge_facts.slot); its current version holds the other answer.
  slot text not null check (length(slot) between 3 and 120),
  key text not null,
  proposed_value jsonb not null,
  proposed_source text not null check (proposed_source in ('google', 'website', 'partner', 'ai_suggestion', 'staff')),
  proposed_source_ref text check (length(proposed_source_ref) <= 200),
  state text not null default 'open' check (state in ('open', 'answered')),
  -- current: the fact Kabsi had is right; proposed: the other answer is; owner_edit: the owner typed a new value.
  answer text check (answer in ('current', 'proposed', 'owner_edit')),
  answered_by uuid,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answered_has_answer check ((state = 'answered') = (answer is not null and answered_at is not null))
);
comment on table public.knowledge_confirms is
  'P0.3-01 (K-11): "Kabsi found two different answers. Which is right?" One open question per business and fact.';
create unique index knowledge_confirms_one_open on public.knowledge_confirms (location_id, slot) where state = 'open';
create index knowledge_confirms_location on public.knowledge_confirms (location_id, state);
create trigger knowledge_confirms_updated before update on public.knowledge_confirms
  for each row execute function public.set_updated_at();

alter table public.knowledge_confirms enable row level security;
revoke all on public.knowledge_confirms from public, anon, authenticated;
grant select on public.knowledge_confirms to authenticated;
create policy members_read_confirms on public.knowledge_confirms for select to authenticated
  using ((select public.is_member(location_id)) or (select public.is_staff()));

-- 3. What a draft may use ------------------------------------------------------------------------------------------

-- p_use: 'replies', 'posts', or null for every use (Google Protection's mock seed).
create function public.draft_facts(p_location uuid, p_use text default null)
returns table (id uuid, slot text, key text, value jsonb, status text, review_after timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, f.slot, f.key, f.value, f.status, f.review_after
    from public.knowledge_facts f
   where f.location_id = p_location and f.superseded_by is null and f.status = 'verified' and f.value is not null
     and (p_use is null or p_use = any (f.uses))
     and (f.review_after is null or f.review_after > now())
     and not exists (select 1 from public.knowledge_confirms c
                      where c.location_id = f.location_id and c.slot = f.slot and c.state = 'open')
   order by f.slot
$$;

-- 4. A fact from anywhere but the owner ----------------------------------------------------------------------------

-- Returns what happened: added, same, replaced, asked (an open question), held (less trust, nothing customers see),
-- or rejected_before (the owner already said no to this value).
create function public.propose_fact(p_location uuid, p_slot text, p_key text, p_value jsonb, p_source text,
  p_source_ref text default null, p_uses text[] default null) returns text
language plpgsql security definer set search_path = '' as $$
declare cur public.knowledge_facts; v_new uuid; v_had boolean;
begin
  if p_source not in ('google', 'website', 'partner', 'ai_suggestion', 'staff') then
    raise exception 'propose_fact: source % (the owner saves with save_fact)', p_source;
  end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object' then raise exception 'propose_fact: value must be an object'; end if;
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;

  if exists (select 1 from public.knowledge_facts where location_id = p_location and slot = p_slot
               and status = 'rejected' and value = p_value) then
    return 'rejected_before';
  end if;

  select * into cur from public.knowledge_facts
   where location_id = p_location and slot = p_slot and superseded_by is null for update;
  v_had := found;

  if v_had and cur.value = p_value then
    return 'same';
  end if;

  if v_had and (cur.status = 'verified'
                or private.fact_trust(cur.status, cur.source, cur.confirmed_by) < private.fact_trust('needs_confirmation', p_source, null)) then
    -- More trust already: a lower source never overrides it (K-11). Something customers see is asked about.
    if cur.status in ('verified', 'needs_confirmation') and private.fact_customer_facing(cur.key) then
      insert into public.knowledge_confirms (location_id, slot, key, proposed_value, proposed_source, proposed_source_ref)
      values (p_location, p_slot, cur.key, p_value, p_source, left(p_source_ref, 200))
      on conflict (location_id, slot) where state = 'open'
      do update set proposed_value = excluded.proposed_value, proposed_source = excluded.proposed_source,
                    proposed_source_ref = excluded.proposed_source_ref;
      return 'asked';
    end if;
    return 'held';
  end if;

  -- Nothing yet, or an unconfirmed value with no more trust than this one: the newer reading waits for the owner.
  v_new := gen_random_uuid();
  if v_had then
    update public.knowledge_facts set superseded_by = v_new where id = cur.id;
  end if;
  insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, uses, version)
  values (v_new, p_location, p_slot, coalesce(cur.key, p_key), p_value, 'needs_confirmation', p_source, left(p_source_ref, 200),
    coalesce(p_uses, cur.uses, array['replies', 'posts']), coalesce(cur.version, 0) + 1);
  return case when v_had then 'replaced' else 'added' end;
end $$;

-- 5. The owner's actions -------------------------------------------------------------------------------------------

-- Only About your business facts (slots card.*); the profile details Google Protection compares with are confirmed
-- through confirm_business_details (K-18).
create function private.fact_for_owner(p_fact uuid) returns public.knowledge_facts
language plpgsql security definer set search_path = '' as $$
declare f public.knowledge_facts;
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  select * into f from public.knowledge_facts where id = p_fact;
  if not found or not public.has_location_role(f.location_id, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if f.superseded_by is not null then raise exception 'not_current'; end if;
  if f.slot not like 'card.%' then raise exception 'not_about_your_business'; end if;
  return f;
end $$;

-- Add or edit one fact. p_field is the field of About your business (the card's names, so the slots of the facts
-- copied from the card in P0.2-03 carry on): a text, a yes or no for delivery, and for the lists (staff_names,
-- custom_rules, faqs) one item, with p_fact naming the item being edited. Every change is a new version, verified,
-- source owner; saving the same value again re-confirms it. Returns the current fact id.
create function public.save_fact(p_location uuid, p_field text, p_value jsonb, p_fact uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_text text; v_list boolean; d record; cur public.knowledge_facts; v_slot text; v_new uuid;
  limits constant jsonb := jsonb_build_object(
    'signature', 80, 'signature_ar', 80, 'tone', 10, 'tone_notes', 200, 'contact_phone', 30,
    'about', 400, 'services', 600, 'price_notes', 300, 'booking', 200, 'payment_methods', 200,
    'hours_note', 200, 'service_area', 200, 'delivery', 200, 'parking', 200, 'accessibility', 200,
    'wifi', 100, 'languages', 120, 'policies', 400, 'mention', 600, 'avoid', 400,
    'staff_names', 80, 'custom_rules', 200);
  caps constant jsonb := '{"staff_names": 20, "custom_rules": 10, "faqs": 8}';
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  v_list := p_field in ('staff_names', 'custom_rules', 'faqs');

  if p_field = 'faqs' then
    if jsonb_typeof(p_value) is distinct from 'object' or nullif(btrim(p_value ->> 'q'), '') is null
       or nullif(btrim(p_value ->> 'a'), '') is null then
      raise exception 'faqs: a question and an answer';
    end if;
    if length(btrim(p_value ->> 'q')) > 160 or length(btrim(p_value ->> 'a')) > 400 then raise exception 'faqs: too long'; end if;
    p_value := jsonb_build_object('q', btrim(p_value ->> 'q'), 'a', btrim(p_value ->> 'a'));
  elsif p_field = 'delivery' and jsonb_typeof(p_value) = 'boolean' then
    null;
  elsif limits ? p_field then
    if jsonb_typeof(p_value) is distinct from 'string' then raise exception '%: must be text', p_field; end if;
    v_text := btrim(p_value #>> '{}');
    if v_text = '' then raise exception '%: empty', p_field; end if;
    if length(v_text) > (limits ->> p_field)::int then raise exception '%: too long', p_field; end if;
    p_value := to_jsonb(v_text);
  else
    raise exception 'unknown field: %', p_field;
  end if;
  if p_field = 'tone' and p_value #>> '{}' not in ('warm', 'formal', 'short') then raise exception 'tone: warm, formal or short'; end if;

  -- The same mapping as the card copy (P0.2-03): key, value shape, ask-again days and uses.
  select * into d from private.card_facts(jsonb_build_object(p_field,
    case when v_list then jsonb_build_array(p_value) else p_value end));

  if p_fact is not null then
    select * into cur from public.knowledge_facts
     where id = p_fact and location_id = p_location and superseded_by is null for update;
    if not found then raise exception 'unknown_fact'; end if;
    if split_part(cur.slot, ':', 1) <> split_part(d.slot, ':', 1) then raise exception 'not a % fact', p_field; end if;
    v_slot := cur.slot;
  else
    v_slot := d.slot;
    select * into cur from public.knowledge_facts
     where location_id = p_location and slot = v_slot and superseded_by is null for update;
    if v_list and cur.id is null and (select count(*) from public.knowledge_facts
          where location_id = p_location and slot like 'card.' || p_field || ':%' and superseded_by is null
            and status <> 'rejected') >= (caps ->> p_field)::int then
      raise exception '%: up to %', p_field, caps ->> p_field;
    end if;
  end if;

  if cur.id is not null and cur.status = 'verified' and cur.value = d.value then
    update public.knowledge_facts set confirmed_by = v_uid, confirmed_at = now(), source = 'owner',
      review_after = case when d.review_days is not null then now() + make_interval(days => d.review_days) end
     where id = cur.id;
    v_new := cur.id;
  else
    v_new := gen_random_uuid();
    if cur.id is not null then
      update public.knowledge_facts set superseded_by = v_new where id = cur.id;
    end if;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
      confirmed_at, review_after, uses, version)
    values (v_new, p_location, v_slot, d.key, d.value, 'verified', 'owner', 'about_your_business', v_uid, now(),
      case when d.review_days is not null then now() + make_interval(days => d.review_days) end,
      d.uses, coalesce(cur.version, 0) + 1);
  end if;

  -- The owner's own value answers any open question about this fact.
  update public.knowledge_confirms set state = 'answered', answer = 'owner_edit', answered_by = v_uid, answered_at = now()
   where location_id = p_location and slot = v_slot and state = 'open';

  -- The log keeps which fact and version; the value stays in knowledge_facts, so removing a fact removes it (K-120.5).
  perform private.audit('user', v_uid, 'knowledge_edit', p_location, 'knowledge_facts', v_new::text, null,
    jsonb_build_object('key', d.key, 'fact_id', v_new, 'version', (select version from public.knowledge_facts where id = v_new)),
    'dashboard', 'saved');
  return v_new;
end $$;

-- "Needs your OK" or "Out of date" to Verified: the owner says the fact is right as it is.
create function public.confirm_fact(p_fact uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare f public.knowledge_facts := private.fact_for_owner(p_fact); v_days integer := private.fact_review_days(f.key);
begin
  if f.status = 'rejected' or f.value is null then raise exception 'cannot_confirm'; end if;
  update public.knowledge_facts set status = 'verified', confirmed_by = auth.uid(), confirmed_at = now(),
    review_after = case when v_days is not null then now() + make_interval(days => v_days) end
   where id = f.id;
  update public.knowledge_confirms set state = 'answered', answer = 'current', answered_by = auth.uid(), answered_at = now()
   where location_id = f.location_id and slot = f.slot and state = 'open';
  perform private.audit('user', auth.uid(), 'fact_confirmed', f.location_id, 'knowledge_facts', f.id::text, null,
    jsonb_build_object('key', f.key, 'fact_id', f.id, 'source', f.source, 'was', f.status), 'dashboard', 'confirmed');
  return f.id;
end $$;

-- "Not right": a suggestion or an out-of-date fact the owner turns down. It never reaches a draft and the same
-- value is not suggested again. A verified fact is edited or removed instead.
create function public.reject_fact(p_fact uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare f public.knowledge_facts := private.fact_for_owner(p_fact);
begin
  if f.status = 'verified' and (f.review_after is null or f.review_after > now()) then raise exception 'edit_or_remove_instead'; end if;
  update public.knowledge_facts set status = 'rejected' where id = f.id;
  perform private.audit('user', auth.uid(), 'fact_rejected', f.location_id, 'knowledge_facts', f.id::text, null,
    jsonb_build_object('key', f.key, 'fact_id', f.id, 'source', f.source), 'dashboard', 'rejected');
  return f.id;
end $$;

-- K-11: the owner answers "Which is right?". current keeps the fact Kabsi had (and confirms it); proposed makes the
-- other answer the verified fact, as a new version confirmed by the owner. Nothing is picked without them.
create function public.answer_knowledge_confirm(p_item uuid, p_answer text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare q public.knowledge_confirms; cur public.knowledge_facts; v_uid uuid := auth.uid(); v_new uuid;
  v_days integer;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  select * into q from public.knowledge_confirms where id = p_item for update;
  if not found or not public.has_location_role(q.location_id, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if q.state <> 'open' then raise exception 'already_answered'; end if;
  if p_answer not in ('current', 'proposed') then raise exception 'answer: current or proposed'; end if;
  select * into cur from public.knowledge_facts
   where location_id = q.location_id and slot = q.slot and superseded_by is null for update;
  v_days := private.fact_review_days(q.key);

  if p_answer = 'current' then
    if not found or cur.value is null then raise exception 'nothing_to_keep'; end if;
    update public.knowledge_facts set status = 'verified', confirmed_by = v_uid, confirmed_at = now(),
      review_after = case when v_days is not null then now() + make_interval(days => v_days) end
     where id = cur.id;
    v_new := cur.id;
  else
    v_new := gen_random_uuid();
    if found then
      update public.knowledge_facts set superseded_by = v_new where id = cur.id;
    end if;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
      confirmed_at, review_after, uses, version)
    values (v_new, q.location_id, q.slot, q.key, q.proposed_value, 'verified', q.proposed_source, q.proposed_source_ref,
      v_uid, now(), case when v_days is not null then now() + make_interval(days => v_days) end,
      coalesce(cur.uses, array['replies', 'posts']), coalesce(cur.version, 0) + 1);
  end if;

  update public.knowledge_confirms set state = 'answered', answer = p_answer, answered_by = v_uid, answered_at = now()
   where id = q.id;
  perform private.audit('user', v_uid, 'knowledge_confirm_answered', q.location_id, 'knowledge_confirms', q.id::text, null,
    jsonb_build_object('key', q.key, 'answer', p_answer, 'fact_id', v_new), 'dashboard', p_answer);
  return v_new;
end $$;

-- 6. The card's writer is retired ----------------------------------------------------------------------------------

create or replace function public.update_knowledge_card(p_location uuid, p_card jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'retired: About your business is saved fact by fact (save_fact)' using errcode = '0A000';
end $$;

-- Grants ------------------------------------------------------------------------------------------------------------

revoke execute on function public.update_knowledge_card(uuid, jsonb) from public, anon, authenticated, service_role;
revoke execute on function private.fact_trust(text, text, uuid), private.fact_customer_facing(text),
  private.fact_review_days(text), private.fact_for_owner(uuid) from public, anon, authenticated;
revoke execute on function public.draft_facts(uuid, text), public.propose_fact(uuid, text, text, jsonb, text, text, text[])
  from public, anon, authenticated;
grant execute on function public.draft_facts(uuid, text), public.propose_fact(uuid, text, text, jsonb, text, text, text[])
  to service_role;
revoke execute on function public.save_fact(uuid, text, jsonb, uuid), public.confirm_fact(uuid), public.reject_fact(uuid),
  public.answer_knowledge_confirm(uuid, text) from public, anon;
grant execute on function public.save_fact(uuid, text, jsonb, uuid), public.confirm_fact(uuid), public.reject_fact(uuid),
  public.answer_knowledge_confirm(uuid, text) to authenticated;
