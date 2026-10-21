-- P0.8-05 (K-132): the review link page. Additive.
--
-- 1. cards.page_mode: per link, 'direct' (the default: every existing link and printed QR code keeps redirecting
--    straight to Google) or 'page' (the link opens the Kabsi page with the Google review button first). The owner or a
--    manager switches it with set_review_link_mode(); the edge copy at go.kabsi.co follows through cards_kv_sync.
-- 2. The manager's WhatsApp number is a Business Knowledge fact: field manager_whatsapp in About your business, fact key
--    contact, part whatsapp, never used in drafts (uses is empty, K-113: a phone number is never written in a reply).
--    private.card_facts and public.save_fact are made again with that one field added; nothing else in them changes.
-- The page itself reads the business name, the Google link and the WhatsApp number through the review-page Edge
-- Function (service role), only for an active link set to page; no new function is open to anon.

alter table public.cards add column page_mode text not null default 'direct' check (page_mode in ('direct', 'page'));

create or replace function public.cards_kv_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'UPDATE'
     or old.status is distinct from new.status
     or old.destination is distinct from new.destination
     or old.location_id is distinct from new.location_id
     or old.page_mode is distinct from new.page_mode then
    perform public.call_internal('kv-sync', jsonb_build_object('code', coalesce(new.code, old.code)));
  end if;
  return null;
end $$;

create or replace function public.set_review_link_mode(p_code text, p_mode text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid; v_kind text; v_code text := upper(trim(p_code));
begin
  if p_mode not in ('direct', 'page') then raise exception 'bad_mode'; end if;
  select location_id, kind into v_loc, v_kind from public.cards where code = v_code;
  if not found then raise exception 'unknown_link'; end if;
  if not (v_loc is not null and public.has_location_role(v_loc, array['owner', 'manager'])) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_kind <> 'link' then raise exception 'not_a_link'; end if;
  update public.cards set page_mode = p_mode where code = v_code;
end $$;
revoke execute on function public.set_review_link_mode(text, text) from public, anon;
grant execute on function public.set_review_link_mode(text, text) to authenticated;

-- private.card_facts: one more mapping row.
create or replace function private.card_facts(p_card jsonb)
returns table (slot text, key text, value jsonb, review_days integer, uses text[])
language sql immutable set search_path = '' as $$
  with c as (select k, v from jsonb_each(coalesce(p_card, '{}'::jsonb)) as e(k, v)),
  m (card_key, fact_key, part, review_days, uses) as (values
    ('about', 'description', null, null, array['replies', 'posts']),
    ('services', 'service', null, null, array['replies', 'posts']),
    ('price_notes', 'price_note', null, 90, array['replies', 'posts']),
    ('booking', 'booking', null, null, array['replies', 'posts']),
    ('payment_methods', 'payment_method', null, null, array['replies', 'posts']),
    ('delivery', 'delivery', null, null, array['replies', 'posts']),
    ('service_area', 'service_area', null, null, array['replies', 'posts']),
    ('parking', 'parking', null, null, array['replies', 'posts']),
    ('accessibility', 'accessibility', null, null, array['replies', 'posts']),
    ('wifi', 'wifi', null, null, array['replies', 'posts']),
    ('languages', 'language', null, null, array['replies', 'posts']),
    ('policies', 'policy', null, null, array['replies', 'posts']),
    -- K-113: a phone number never goes into a reply or a post, so the contact for unhappy customers has no public use.
    ('contact_phone', 'contact', 'phone', null, array[]::text[]),
    -- P0.8-05 (K-132): the number behind "Need help now? Message the manager" on the review link page. Never used in drafts.
    ('manager_whatsapp', 'contact', 'whatsapp', null, array[]::text[]),
    ('hours_note', 'hours_note', null, 60, array['replies', 'posts']),
    ('mention', 'phrase_use', null, null, array['replies', 'posts']),
    ('avoid', 'phrase_avoid', null, null, array['replies', 'posts']),
    ('tone', 'voice', 'tone', null, array['replies', 'posts']),
    ('tone_notes', 'voice', 'notes', null, array['replies', 'posts']),
    ('signature', 'signature', null, null, array['replies']),
    ('signature_ar', 'signature', 'ar', null, array['replies']),
    ('staff_names', 'staff_member', null, 180, array['replies']),
    ('custom_rules', 'special_rule', null, null, array['replies', 'posts']),
    ('faqs', 'faq', null, null, array['replies', 'posts']))
  -- Single values: text, or a yes or no (delivery).
  select 'card.' || c.k, m.fact_key,
    case when m.fact_key = 'contact' then jsonb_build_object('kind', m.part, 'text', c.v #>> '{}')
         when m.fact_key = 'voice' then jsonb_build_object('part', m.part, 'text', c.v #>> '{}')
         when m.fact_key = 'signature' and m.part is not null then jsonb_build_object('language', m.part, 'text', c.v #>> '{}')
         when jsonb_typeof(c.v) = 'boolean' then jsonb_build_object('offered', c.v)
         else jsonb_build_object('text', c.v #>> '{}') end,
    m.review_days, m.uses
  from c join m on m.card_key = c.k
  where jsonb_typeof(c.v) in ('string', 'boolean', 'number') and nullif(btrim(c.v #>> '{}'), '') is not null
  union all
  -- Lists: one fact per distinct item, named by the item so a reorder is not a change.
  select distinct on ('card.' || c.k || ':' || md5(i.item::text))
    'card.' || c.k || ':' || md5(i.item::text), m.fact_key,
    case when m.fact_key = 'staff_member' and jsonb_typeof(i.item) = 'string' then jsonb_build_object('name', i.item #>> '{}')
         when jsonb_typeof(i.item) = 'string' then jsonb_build_object('text', i.item #>> '{}')
         else jsonb_build_object('item', i.item) end,
    m.review_days, m.uses
  from c join m on m.card_key = c.k
  cross join lateral jsonb_array_elements(case when jsonb_typeof(c.v) = 'array' then c.v else '[]'::jsonb end) as i(item)
  where i.item <> 'null'::jsonb and (jsonb_typeof(i.item) <> 'string' or nullif(btrim(i.item #>> '{}'), '') is not null)
    and i.item not in ('{}'::jsonb, '[]'::jsonb)
$$;

-- public.save_fact: the same function with manager_whatsapp among the fields (a number with a country code).
create or replace function public.save_fact(p_location uuid, p_field text, p_value jsonb, p_fact uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_text text; v_list boolean; d record; cur public.knowledge_facts; v_slot text; v_new uuid;
  limits constant jsonb := jsonb_build_object(
    'signature', 80, 'signature_ar', 80, 'tone', 10, 'tone_notes', 200, 'contact_phone', 30, 'manager_whatsapp', 30,
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
    if p_field = 'manager_whatsapp' and (v_text !~ '^\+[0-9 ()-]+$' or length(regexp_replace(v_text, '[^0-9]', '', 'g')) not between 8 and 15) then
      raise exception 'manager_whatsapp: a number with its country code, like +971 50 123 4567';
    end if;
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
