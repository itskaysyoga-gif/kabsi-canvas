-- P0.2-03: Business Knowledge table and the owner-approved baseline (K-10, K-18, K-20, A2, A5, R-05).
--
-- Expand only: two new tables, new functions and triggers, one new column and a wider state check on listing_changes,
-- one daily cron job. Nothing is dropped and no row is removed. knowledge_card, listing_baselines and listing_changes
-- stay readable and keep working; P0.3-01 moves the readers of the card, P0.2-04 moves Google Protection.
--
-- 1. public.knowledge_facts (K-10): one row per fact, each with key, value, status, source, who confirmed it, when to
--    ask again and where it may be used. A change is a new version; the old row points to it (superseded_by) and is
--    kept for the audit trail. `slot` names the fact across its versions (one current row per business and slot).
-- 2. The card follows into the facts: every value of locations.knowledge_card is copied as verified, source owner
--    (K-10: the owner typed it), and a trigger keeps the facts in step with every later edit of the card until P0.3-01
--    makes the facts the source.
-- 3. The baselines Protection compares against (listing_baselines) are copied as needs_confirmation, source google:
--    never as approved (fixes A2). The owner turns them into owner-approved facts with
--    public.confirm_business_details(location, details) (K-18), signed in only.
-- 4. public.profile_changes (K-20) replaces listing_changes for readers to come. While the detector still writes
--    listing_changes (until P0.2-04), a trigger mirrors every row and every state into profile_changes. A newer change
--    to the same field supersedes the open one in the database, as `superseded`, never `kept` (fixes A5); the owner's
--    own "keep" is `accepted` with who decided.
-- 5. private.profile_daily() (cron, daily): changes nobody answered in 14 days become `expired` (demo businesses
--    excluded, their staged changes are for recordings); Google's values in the new tables follow K-40
--    (google_profile_values, 30 days, read from retention_policies) and the "30 days after access is lost" rule.
--    Values are blanked, never deleted: the rows keep ids, keys, states and dates.

-- 1. Business Knowledge facts ------------------------------------------------------------------------------------------

create table public.knowledge_facts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  -- Which fact this row is a version of: 'card.<card key>[:<item>]' for About your business, 'profile.<key>' for the
  -- profile details Google Protection watches (K-18).
  slot text not null check (length(slot) between 3 and 120),
  -- The K-10 catalogue, plus the profile details of K-18 (service_area is in both).
  key text not null check (key in (
    'description', 'service', 'product', 'price_note', 'staff_member', 'policy', 'booking', 'payment_method',
    'delivery', 'service_area', 'parking', 'accessibility', 'wifi', 'language', 'contact', 'hours_note',
    'special_rule', 'phrase_use', 'phrase_avoid', 'voice', 'signature', 'escalation_rule', 'faq',
    'name', 'phone', 'website', 'address', 'regular_hours', 'main_category', 'open_status')),
  -- Null only once K-40 has cleared a value read from Google.
  value jsonb,
  status text not null default 'needs_confirmation'
    check (status in ('verified', 'needs_confirmation', 'outdated', 'rejected')),
  source text not null check (source in ('owner', 'google', 'website', 'partner', 'ai_suggestion', 'staff')),
  source_ref text check (length(source_ref) <= 200),
  -- No foreign key: like the audit log, the record outlives the user.
  confirmed_by uuid,
  confirmed_at timestamptz,
  review_after timestamptz,
  uses text[] not null default '{}' check (uses <@ array['replies', 'posts', 'profile']),
  version integer not null default 1 check (version >= 1),
  superseded_by uuid references public.knowledge_facts(id) on delete set null deferrable initially deferred,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_has_confirmation check (status <> 'verified' or confirmed_at is not null),
  -- K-11: a fact Kabsi did not get from the owner becomes verified only when a person confirmed it.
  constraint suggestions_need_a_person check (status <> 'verified' or source in ('owner', 'staff') or confirmed_by is not null),
  constraint only_google_values_cleared check (value is not null or source = 'google'),
  constraint profile_slots_hold_profile_keys check (
    (slot like 'profile.%') = (key in ('name', 'phone', 'website', 'address', 'regular_hours', 'main_category', 'open_status'))
    or (slot = 'profile.service_area' and key = 'service_area'))
);
comment on table public.knowledge_facts is
  'P0.2-03 (K-10, K-18): Business Knowledge, one row per fact and version. Current version: superseded_by is null.';
create unique index knowledge_facts_current_slot on public.knowledge_facts (location_id, slot) where superseded_by is null;
create index knowledge_facts_location_key on public.knowledge_facts (location_id, key) where superseded_by is null;
create index knowledge_facts_google_values on public.knowledge_facts (created_at)
  where source = 'google' and status <> 'verified' and value is not null;
create trigger knowledge_facts_updated before update on public.knowledge_facts
  for each row execute function public.set_updated_at();

alter table public.knowledge_facts enable row level security;
revoke all on public.knowledge_facts from public, anon, authenticated;
grant select on public.knowledge_facts to authenticated;
create policy members_read_facts on public.knowledge_facts for select to authenticated
  using (public.is_member(location_id) or (select public.is_staff()));

-- 2. The card as facts -------------------------------------------------------------------------------------------------

-- One row per value in a card: (slot, key, value, days until Kabsi asks again, uses). Empty text, null and empty
-- lists give no row. List items are one fact each; repeated items count once.
create function private.card_facts(p_card jsonb)
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

-- Brings the card facts of one business in line with its card: a new or changed value is a new verified version
-- (source owner, confirmed by the user who saved the card), a value removed from the card makes its fact outdated.
-- Returns how many rows it wrote.
create function private.sync_card_facts(p_location uuid, p_actor uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare d record; cur public.knowledge_facts; v_card jsonb; v_new uuid; n integer := 0; v_out integer;
begin
  select knowledge_card into v_card from public.locations where id = p_location;
  if not found then return 0; end if;

  for d in select * from private.card_facts(v_card) loop
    select * into cur from public.knowledge_facts
     where location_id = p_location and slot = d.slot and superseded_by is null for update;
    if found and cur.status = 'verified' and cur.value = d.value then
      continue;
    end if;
    v_new := gen_random_uuid();
    if found then
      update public.knowledge_facts set superseded_by = v_new where id = cur.id;
    end if;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
      confirmed_at, review_after, uses, version)
    values (v_new, p_location, d.slot, d.key, d.value, 'verified', 'owner', 'knowledge_card.' || split_part(substr(d.slot, 6), ':', 1),
      p_actor, now(), case when d.review_days is not null then now() + make_interval(days => d.review_days) end,
      d.uses, coalesce(cur.version, 0) + 1);
    n := n + 1;
  end loop;

  update public.knowledge_facts f set status = 'outdated'
   where f.location_id = p_location and f.slot like 'card.%' and f.superseded_by is null and f.status = 'verified'
     and f.slot not in (select c.slot from private.card_facts(v_card) c);
  get diagnostics v_out = row_count;
  return n + v_out;
end $$;

create function private.location_sync_card_facts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.knowledge_card is distinct from old.knowledge_card then
    perform private.sync_card_facts(new.id, auth.uid());
  end if;
  return null;
end $$;
create trigger locations_card_facts after insert or update of knowledge_card on public.locations
  for each row execute function private.location_sync_card_facts();

-- Every existing card, copied as verified, source owner (K-10). Nobody is named as having confirmed them: the card
-- does not record who typed each value.
select private.sync_card_facts(id, null) from public.locations order by id;

-- 3. The baselines, not yet confirmed (A2) ------------------------------------------------------------------------------

-- Protection's field names and the K-18 keys.
create function private.profile_key(p_field text) returns text
language sql immutable set search_path = '' as $$
  select case p_field when 'title' then 'name' when 'hours' then 'regular_hours' when 'categories' then 'main_category'
                      else p_field end
$$;

-- Every baseline value is Google's or a staged one; none was confirmed by the owner as K-18 asks, so all are
-- needs_confirmation, source google, dated when Kabsi read them (the 30 day rule counts from there).
insert into public.knowledge_facts (location_id, slot, key, value, status, source, source_ref, uses, created_at, updated_at)
select b.location_id, 'profile.' || private.profile_key(f.k), private.profile_key(f.k), f.v, 'needs_confirmation', 'google',
       'listing_baselines.' || f.k || ' (' || b.updated_by || ')', array['profile'], b.updated_at, b.updated_at
  from public.listing_baselines b
 cross join lateral jsonb_each(b.fields) as f(k, v)
 where f.k in ('title', 'phone', 'address', 'website', 'hours', 'categories')
   and jsonb_typeof(f.v) = 'object' and nullif(btrim(f.v ->> 'display'), '') is not null;

-- 4. "Confirm your details" (K-18) --------------------------------------------------------------------------------------

-- p_details: {"<key>": {"display": "<text the owner saw>", "raw": <Google's shape, optional>}, ...} for name, phone,
-- website, address, service_area, regular_hours, main_category, open_status. Signed-in owner only (not from an email
-- link, not a manager or partner). Each value becomes the current verified owner fact for that detail; a value that
-- is already the confirmed one is only re-dated. Returns the fact ids by key.
create function public.confirm_business_details(p_location uuid, p_details jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); k text; v jsonb; v_display text; cur public.knowledge_facts; v_new uuid;
  v_result jsonb := '{}'::jsonb; v_changed text[] := '{}';
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_details) is distinct from 'object' or p_details = '{}'::jsonb then
    raise exception 'details must be an object with at least one detail';
  end if;
  if pg_column_size(p_details) > 16384 then raise exception 'details are too large'; end if;

  for k, v in select * from jsonb_each(p_details) loop
    if k not in ('name', 'phone', 'website', 'address', 'service_area', 'regular_hours', 'main_category', 'open_status') then
      raise exception 'unknown detail: %', k;
    end if;
    v_display := btrim(v ->> 'display');
    if jsonb_typeof(v) <> 'object' or v_display is null or v_display = '' then raise exception '%: display text is required', k; end if;
    if length(v_display) > 1000 or (k = 'name' and length(v_display) > 100) then raise exception '%: too long', k; end if;
    if k = 'phone' and v_display !~ '^\+?[0-9 ()./-]{4,30}$' then raise exception 'phone: not a phone number'; end if;
    if k = 'website' and v_display !~* '^https?://[^\s/]+\.[^\s]+$' then raise exception 'website: must start with https://'; end if;
    if k = 'open_status' and coalesce(v ->> 'raw', v_display) not in ('OPEN', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY') then
      raise exception 'open_status: OPEN, CLOSED_TEMPORARILY or CLOSED_PERMANENTLY';
    end if;
    v := jsonb_build_object('display', v_display, 'raw', coalesce(v -> 'raw', 'null'::jsonb));

    select * into cur from public.knowledge_facts
     where location_id = p_location and slot = 'profile.' || k and superseded_by is null for update;
    if found and cur.status = 'verified' and cur.source = 'owner' and cur.value = v then
      update public.knowledge_facts set confirmed_by = v_uid, confirmed_at = now() where id = cur.id;
      v_result := v_result || jsonb_build_object(k, cur.id);
      continue;
    end if;
    v_new := gen_random_uuid();
    if found then
      update public.knowledge_facts set superseded_by = v_new where id = cur.id;
    end if;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
      confirmed_at, uses, version)
    values (v_new, p_location, 'profile.' || k, k, v, 'verified', 'owner', 'confirm_business_details', v_uid, now(),
      array['profile'], coalesce(cur.version, 0) + 1);
    v_result := v_result || jsonb_build_object(k, v_new);
    v_changed := v_changed || k;
  end loop;

  -- The log keeps which details and their fact ids; the values stay in knowledge_facts (the owner's own data).
  perform private.audit('user', v_uid, 'details_confirmed', p_location, 'knowledge_facts', p_location::text,
    null, jsonb_build_object('facts', v_result, 'changed', to_jsonb(v_changed)), 'dashboard', 'confirmed');
  return v_result;
end $$;

-- 5. Profile changes (K-20) ---------------------------------------------------------------------------------------------

create table public.profile_changes (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  field text not null check (field in ('name', 'main_category', 'categories', 'phone', 'website', 'address',
    'service_area', 'regular_hours', 'special_hours', 'description', 'open_status', 'attributes', 'map_pin', 'verification')),
  -- The value Kabsi compared against. previous_fact_id is set only when that value is the owner's confirmed fact;
  -- null means "Not yet confirmed by you" (K-18) and the change is never offered for restore.
  previous_value jsonb,
  previous_fact_id uuid references public.knowledge_facts(id) on delete set null,
  google_value jsonb,
  source text not null check (source in ('google_update', 'notification', 'scheduled_check')),
  detected_at timestamptz not null default now(),
  severity text not null check (severity in ('urgent', 'recommended')),
  status text not null default 'detected' check (status in ('detected', 'awaiting_review', 'accepted', 'rejected',
    'corrected', 'failed', 'expired', 'superseded')),
  decided_by uuid,
  decided_at timestamptz,
  publication_id uuid references public.publications(id) on delete set null,
  superseded_by uuid references public.profile_changes(id) on delete set null deferrable initially deferred,
  -- The row of the detector that still writes listing_changes (until P0.2-04).
  listing_change_id uuid unique references public.listing_changes(id) on delete set null,
  values_cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint superseded_points_on check (status <> 'superseded' or superseded_by is not null or listing_change_id is not null)
);
comment on table public.profile_changes is
  'P0.2-03 (K-20): one row per change Google Protection found, with the owner''s decision. Replaces listing_changes.';
create unique index profile_changes_one_open on public.profile_changes (location_id, field)
  where status in ('detected', 'awaiting_review');
create index profile_changes_location on public.profile_changes (location_id, detected_at desc);
create trigger profile_changes_updated before update on public.profile_changes
  for each row execute function public.set_updated_at();

alter table public.profile_changes enable row level security;
revoke all on public.profile_changes from public, anon, authenticated;
grant select on public.profile_changes to authenticated;
create policy members_read_profile_changes on public.profile_changes for select to authenticated
  using (public.is_member(location_id) or (select public.is_staff()));

-- K-20: urgent for open status, phone, hours and address.
create function private.change_severity(p_field text) returns text
language sql immutable set search_path = '' as $$
  select case when p_field in ('open_status', 'phone', 'regular_hours', 'special_hours', 'address') then 'urgent' else 'recommended' end
$$;

create function private.change_status(p_state text) returns text
language sql immutable set search_path = '' as $$
  select case p_state when 'open' then 'awaiting_review' when 'reverting' then 'rejected' when 'reverted' then 'corrected'
    when 'revert_failed' then 'failed' when 'kept' then 'accepted' when 'superseded' then 'superseded'
    when 'expired' then 'expired' end
$$;

-- listing_changes: who decided, and the two states that are not decisions.
alter table public.listing_changes add column decided_by uuid;
do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.listing_changes'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~ '\mstate\M'
  loop
    execute format('alter table public.listing_changes drop constraint %I', c);
  end loop;
end $$;
alter table public.listing_changes add constraint listing_changes_state_check
  check (state in ('open', 'reverting', 'reverted', 'kept', 'revert_failed', 'superseded', 'expired'));

-- A5: a newer change to a field replaces the open one as superseded, in the database, whoever writes the new one.
create function private.listing_change_supersede() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.state = 'open' then
    update public.listing_changes set state = 'superseded', decided_at = now()
     where location_id = new.location_id and field = new.field and state = 'open';
  end if;
  return new;
end $$;
create trigger listing_changes_supersede before insert on public.listing_changes
  for each row execute function private.listing_change_supersede();

-- The mirror. Insert: a new profile change (awaiting the owner's answer, since the detector alerts at once) and the
-- superseded one points to it. Update of state: the K-20 status, who decided and the publication of a put-back.
create function private.listing_change_mirror() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_field text := private.profile_key(new.field); v_fact uuid; v_pub uuid; v_pub_by uuid; v_status text; v_id uuid;
begin
  v_status := private.change_status(new.state);
  if tg_op = 'INSERT' then
    select f.id into v_fact from public.knowledge_facts f
     where f.location_id = new.location_id and f.slot = 'profile.' || v_field and f.superseded_by is null
       and f.status = 'verified' and f.value ->> 'display' = new.old_value ->> 'display';
    insert into public.profile_changes (location_id, field, previous_value, previous_fact_id, google_value, source,
      detected_at, severity, status, decided_by, decided_at, listing_change_id)
    values (new.location_id, v_field, new.old_value, v_fact, new.new_value,
      case new.detected_by when 'pubsub' then 'notification' else 'scheduled_check' end,
      new.created_at, private.change_severity(v_field), v_status, new.decided_by,
      case when v_status not in ('awaiting_review', 'superseded', 'expired') then new.decided_at end, new.id)
    returning id into v_id;
    if new.state = 'open' then
      update public.profile_changes set superseded_by = v_id
       where location_id = new.location_id and field = v_field and status = 'superseded' and superseded_by is null
         and id <> v_id;
    end if;
    return null;
  end if;

  if new.state is distinct from old.state or new.decided_by is distinct from old.decided_by then
    if new.state in ('reverting', 'reverted', 'revert_failed') then
      select p.id, p.approved_by into v_pub, v_pub_by from public.publications p
       where p.target_type = 'listing_revert' and p.target_id = new.id order by p.created_at desc limit 1;
    end if;
    update public.profile_changes set
      status = v_status,
      decided_by = case when v_status in ('awaiting_review', 'superseded', 'expired') then null
                        else coalesce(new.decided_by, v_pub_by, decided_by) end,
      decided_at = case when v_status in ('awaiting_review', 'superseded', 'expired') then null
                        when v_status in ('corrected', 'failed') then coalesce(decided_at, new.decided_at)
                        else new.decided_at end,
      publication_id = coalesce(v_pub, publication_id)
     where listing_change_id = new.id;
  end if;
  return null;
end $$;
create trigger listing_changes_mirror after insert or update of state, decided_by on public.listing_changes
  for each row execute function private.listing_change_mirror();

-- The changes already recorded. None was superseded through the old "kept" path on 9 Oct (checked live: 0 rows in
-- state kept), so each state maps as it stands.
insert into public.profile_changes (location_id, field, previous_value, google_value, source, detected_at, severity,
  status, decided_by, decided_at, publication_id, listing_change_id, created_at)
select c.location_id, private.profile_key(c.field), c.old_value, c.new_value,
  case c.detected_by when 'pubsub' then 'notification' else 'scheduled_check' end, c.created_at,
  private.change_severity(private.profile_key(c.field)), private.change_status(c.state), p.approved_by,
  case when c.state <> 'open' then c.decided_at end, p.id, c.id, c.created_at
  from public.listing_changes c
  left join lateral (select p.id, p.approved_by from public.publications p
                      where p.target_type = 'listing_revert' and p.target_id = c.id
                      order by p.created_at desc limit 1) p on true;

-- 6. Daily: expiry (K-20) and Google's values (K-40) --------------------------------------------------------------------

create function private.profile_daily() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile int := private.retention_days('google_profile_values');
  v_lost int := private.retention_days('google_data_after_access_lost');
  v_expired int; v_expired_new int; v_facts int; v_changes int; v_lost_facts int; v_lost_changes int; v_result jsonb;
begin
  -- K-20: no answer in 14 days. Through listing_changes while it is the detector's table (the mirror follows), then
  -- any profile change the detector of P0.2-04 writes directly.
  update public.listing_changes c set state = 'expired', decided_at = now()
   where c.state = 'open' and c.created_at < now() - interval '14 days'
     and not exists (select 1 from public.locations l where l.id = c.location_id and l.is_demo);
  get diagnostics v_expired = row_count;
  update public.profile_changes c set status = 'expired'
   where c.status in ('detected', 'awaiting_review') and c.listing_change_id is null
     and c.detected_at < now() - interval '14 days'
     and not exists (select 1 from public.locations l where l.id = c.location_id and l.is_demo);
  get diagnostics v_expired_new = row_count;

  -- K-40 google_profile_values: Google's values Kabsi read, 30 days. The owner's confirmed values stay.
  update public.knowledge_facts set value = null, status = case when status = 'needs_confirmation' then 'outdated' else status end
   where source = 'google' and status <> 'verified' and value is not null
     and created_at < now() - make_interval(days => v_profile);
  get diagnostics v_facts = row_count;
  update public.profile_changes set google_value = null,
      previous_value = case when previous_fact_id is null then null else previous_value end, values_cleared_at = now()
   where values_cleared_at is null and status not in ('detected', 'awaiting_review')
     and detected_at < now() - make_interval(days => v_profile);
  get diagnostics v_changes = row_count;

  -- K-40: Google data 30 days after access is lost (the same businesses run_retention clears).
  update public.knowledge_facts f set value = null, status = case when status = 'needs_confirmation' then 'outdated' else status end
   where f.source = 'google' and f.status <> 'verified' and f.value is not null
     and f.location_id in (select id from public.locations
                            where access_lost_at < now() - make_interval(days => v_lost) and access_granted_at is null);
  get diagnostics v_lost_facts = row_count;
  update public.profile_changes c set google_value = null,
      previous_value = case when previous_fact_id is null then null else previous_value end, values_cleared_at = now()
   where c.values_cleared_at is null
     and c.location_id in (select id from public.locations
                            where access_lost_at < now() - make_interval(days => v_lost) and access_granted_at is null);
  get diagnostics v_lost_changes = row_count;

  v_result := jsonb_build_object('expired', v_expired + v_expired_new, 'google_facts', v_facts + v_lost_facts,
    'change_values', v_changes + v_lost_changes);
  insert into public.jobs_log (job, ok, detail)
  select 'profile_daily', true, v_result where exists (select 1 from jsonb_each_text(v_result) where value::int > 0);
  return v_result;
end $$;

select cron.schedule('kabsi_profile_daily', '7 3 * * *', $$select private.profile_daily()$$);

-- 7. Who can run what ---------------------------------------------------------------------------------------------------

revoke execute on function public.confirm_business_details(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_business_details(uuid, jsonb) to authenticated;
revoke execute on function private.card_facts(jsonb), private.sync_card_facts(uuid, uuid),
  private.location_sync_card_facts(), private.profile_key(text), private.change_severity(text),
  private.change_status(text), private.listing_change_supersede(), private.listing_change_mirror(),
  private.profile_daily() from public, anon, authenticated;
