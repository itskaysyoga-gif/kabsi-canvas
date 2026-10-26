-- V4: onboarding in four stages, the first task, every task closes, the work receipt, the nearby places, the free check,
-- the category proposal and the monthly answer as Business Knowledge proposals (master plan 28.1, 30.15 sections 2 and 3,
-- 30.16 section 3, 30.17 sections 1 and 3).
--
-- Additive only, nothing removed: new columns, new tables (RLS on, no browser grants), new functions, one trigger on publications
-- (sets first_task_done_at once), app settings. The only row changes are the backfills of the new locations columns for
-- businesses that already have Google access (they are past onboarding), and the voice notes setting (off until the 20-note
-- test passes in every language).

-- 1. Where a business is in onboarding -------------------------------------------------------------------------------------
alter table public.locations
  add column if not exists manage_confirmed_at timestamptz,
  add column if not exists setup_whatsapp_at timestamptz,
  add column if not exists first_task_done_at timestamptz,
  add column if not exists resume_code text check (resume_code is null or resume_code ~ '^[0-9a-f]{20}$');
comment on column public.locations.manage_confirmed_at is 'V4 stage 2: the owner confirmed the business and that they can manage its Google profile.';
comment on column public.locations.setup_whatsapp_at is 'V4 stage 3: the owner said Yes to setup updates and approvals on WhatsApp.';
comment on column public.locations.first_task_done_at is 'V4: the first task Kabsi saw on Google (a verified publication). Competitors, extra searches, tone, AI questions, team and photos wait for it.';
comment on column public.locations.resume_code is 'V4: the resume link code (20 hex characters). Opens the next unfinished step on any device after sign-in; never signs anyone in.';
create unique index if not exists locations_resume_code_key on public.locations (resume_code) where resume_code is not null;

-- Businesses that already have Google access are past onboarding: nothing is held back from them.
update public.locations set
  manage_confirmed_at = coalesce(manage_confirmed_at, consent_at, access_granted_at),
  setup_whatsapp_at = coalesce(setup_whatsapp_at, access_granted_at),
  first_task_done_at = coalesce(first_task_done_at, activated_at, access_granted_at)
 where access_granted_at is not null and (manage_confirmed_at is null or setup_whatsapp_at is null or first_task_done_at is null);

-- 2. The free check (28.1, 30.15 3.10) ------------------------------------------------------------------------------------
create table if not exists public.free_checks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{8}$'),
  business text not null check (length(business) between 1 and 200),
  term text not null check (length(term) between 2 and 60),
  industry text check (industry is null or industry ~ '^[a-z0-9-]{2,40}$'),
  country text not null check (country ~ '^[A-Z]{2}$'),
  city text check (city is null or length(city) <= 80),
  self jsonb not null,
  center jsonb not null,
  radius_km numeric not null,
  category text,
  source text not null check (source in ('mock', 'live')),
  state text not null default 'mapping' check (state in ('mapping', 'done', 'failed')),
  fast jsonb not null,
  ai jsonb,
  points jsonb not null default '[]'::jsonb,
  nearby jsonb,
  cost_micros integer not null default 0,
  location_id uuid references public.locations (id) on delete set null,
  map_sent_at timestamptz,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
comment on table public.free_checks is 'V4: the free check. Public Google Maps results from DataForSEO only (30.10.2): the business, its rank at its address, three rivals, one AI answer, the queued 7 by 7 search and the nearby places. Nothing from Places. Deleted after 30 days, or 90 days once a business that signed up claims it.';
alter table public.free_checks enable row level security;
revoke all on public.free_checks from anon, authenticated;
create index if not exists free_checks_mapping_idx on public.free_checks (created_at) where state = 'mapping';
create index if not exists free_checks_location_idx on public.free_checks (location_id) where location_id is not null;
create index if not exists free_checks_created_idx on public.free_checks (created_at);

-- Search terms per industry and market, from DataForSEO keyword data only (30.17 section 2: never guessed). Filled by the staff
-- op POST /visibility/terms; the free check reads it to prefill an industry page's search.
create table if not exists public.industry_search_terms (
  industry text not null check (industry ~ '^[a-z0-9-]{2,40}$'),
  market text not null check (market ~ '^[A-Z]{2}$'),
  term text not null check (length(term) between 2 and 60),
  volume integer,
  candidates jsonb not null default '[]'::jsonb,
  source text not null default 'dataforseo_google_ads',
  checked_on date not null default current_date,
  primary key (industry, market)
);
alter table public.industry_search_terms enable row level security;
revoke all on public.industry_search_terms from anon, authenticated;

-- 3. The first 48 hours on WhatsApp: one row per business and message, claimed before it is sent ---------------------------
create table if not exists public.onboarding_messages (
  location_id uuid not null references public.locations (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z0-9_]{3,40}$'),
  sent_at timestamptz not null default now(),
  detail jsonb,
  primary key (location_id, kind)
);
alter table public.onboarding_messages enable row level security;
revoke all on public.onboarding_messages from anon, authenticated;

-- 4. Founder-assisted start for Founding 25 (30.15 3.2): a staff checklist per business ------------------------------------
create table if not exists public.founding_checklist (
  location_id uuid not null references public.locations (id) on delete cascade,
  item text not null check (item in ('old_reviews', 'wrong_details', 'booking_link', 'menu_link')),
  done_at timestamptz,
  done_by uuid,
  note text check (note is null or length(note) <= 300),
  primary key (location_id, item)
);
alter table public.founding_checklist enable row level security;
revoke all on public.founding_checklist from anon, authenticated;

-- 5. Every task closes (30.15 3.1): what the owner was told about a publication on WhatsApp --------------------------------
alter table public.publications
  add column if not exists owner_told text check (owner_told is null or owner_told in ('sent', 'final')),
  add column if not exists owner_told_at timestamptz;

-- Nothing from before V4 is told again: publications already decided count as told, and businesses that already have Google
-- access count every onboarding message as sent (they are past onboarding).
update public.publications set owner_told = 'final', owner_told_at = now() where owner_told is null;

-- 6. The nearby places on subscriber maps (30.15 section 2) ---------------------------------------------------------------
alter table public.visibility_scans add column if not exists nearby jsonb;
comment on column public.visibility_scans.nearby is 'V4: the three nearby places (reverse-geocoded names of the real checked points, or the distance and side) and the one count.';

-- 7. Settings ----------------------------------------------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('voice_notes', 'off'),              -- on only after the 20-note test passes in every language (POST /whatsapp/staff/voice-eval)
  ('free_check_daily_cap', '100'),     -- free checks a day for the whole site; 0 shows the waiting list
  ('onboarding_whatsapp', 'on')        -- the first-48-hours messages (still only to live phones until owners are switched on)
on conflict (key) do nothing;
-- 28.1: the free check's one AI answer (built in V2, switched on here). Still mock until ai_visibility_mode is live.
update public.app_settings set value = 'on' where key = 'ai_visibility_free_scan' and value = 'off';

-- 8. Functions --------------------------------------------------------------------------------------------------------

-- The facts the stages are read from (_shared/onboarding/stages.ts). Service role only.
create or replace function private.onboarding_facts(p_location uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'location_id', l.id, 'business', l.name, 'time_zone', coalesce(l.time_zone, 'UTC'), 'is_demo', l.is_demo,
    'check', (select jsonb_build_object('code', f.code, 'term', f.term) from public.free_checks f
               where f.location_id = l.id order by f.created_at desc limit 1),
    'confirmed', l.manage_confirmed_at is not null,
    'whatsapp', exists (select 1 from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
                         where m.location_id = l.id and m.role = 'owner' and o.state = 'active' and o.phone is not null),
    'setup_ok', l.setup_whatsapp_at is not null,
    'keyword', (select k.keyword from public.visibility_keywords k where k.location_id = l.id and k.active
                  and k.confirmed_at is not null order by k.created_at limit 1),
    'consent', l.consent_at is not null,
    'accepted', l.access_granted_at is not null,
    'checked', coalesce(g.access_state = 'granted' and g.voice_of_merchant is true and g.last_successful_sync_at is not null, false),
    'trial_ends_at', (select s.trial_ends_at from public.subscriptions s where s.organization_id = l.organization_id
                       order by s.created_at desc limit 1),
    'first_task_done', l.first_task_done_at is not null)
  from public.locations l
  left join public.google_connections g on g.location_id = l.id
  where l.id = p_location
$$;
revoke all on function private.onboarding_facts(uuid) from public, anon, authenticated;

-- The same facts for the Edge Functions (service role only).
create or replace function public.onboarding_facts(p_location uuid) returns jsonb
language sql stable security definer set search_path = '' as $$ select private.onboarding_facts(p_location) $$;
revoke all on function public.onboarding_facts(uuid) from public, anon, authenticated;
grant execute on function public.onboarding_facts(uuid) to service_role;

-- The signed-in member's view of the stages; the owner also gets the resume code (made once).
create or replace function public.onboarding_status(p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code text; v_owner boolean;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager', 'staff']) then raise exception 'forbidden' using errcode = '42501'; end if;
  v_owner := public.has_location_role(p_location, array['owner']);
  if v_owner then
    update public.locations set resume_code = substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 20)
     where id = p_location and resume_code is null;
    select resume_code into v_code from public.locations where id = p_location;
  end if;
  return private.onboarding_facts(p_location) || jsonb_build_object('resume_code', v_code);
end $$;
revoke all on function public.onboarding_status(uuid) from public, anon;
grant execute on function public.onboarding_status(uuid) to authenticated;

-- Stage 2: the owner confirms the business and that they can manage its Google profile.
create or replace function public.confirm_business(p_location uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.locations set manage_confirmed_at = coalesce(manage_confirmed_at, now()) where id = p_location;
  perform private.audit('user', v_uid, 'business_confirmed', p_location, 'location', p_location::text, null, '{}'::jsonb, 'dashboard', 'confirmed');
end $$;
revoke all on function public.confirm_business(uuid) from public, anon;
grant execute on function public.confirm_business(uuid) to authenticated;

-- The resume link: the business a code belongs to (service role; the onboarding function checks the signed-in owner).
create or replace function public.onboarding_resume(p_code text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.locations where resume_code = p_code and p_code ~ '^[0-9a-f]{20}$' and deletion_requested_at is null
$$;
revoke all on function public.onboarding_resume(text) from public, anon, authenticated;
grant execute on function public.onboarding_resume(text) to service_role;

-- Stage 3: the owner said Yes to setup updates on WhatsApp (the agent, service role, for an owner of the business).
create or replace function public.onboarding_setup_ok(p_location uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.location_members where location_id = p_location and user_id = p_user and role = 'owner') then
    return false;
  end if;
  update public.locations set setup_whatsapp_at = coalesce(setup_whatsapp_at, now()) where id = p_location;
  perform private.audit('user', p_user, 'whatsapp_setup_ok', p_location, 'location', p_location::text, null, '{}'::jsonb, 'whatsapp', 'yes');
  return true;
end $$;
revoke all on function public.onboarding_setup_ok(uuid, uuid) from public, anon, authenticated;
grant execute on function public.onboarding_setup_ok(uuid, uuid) to service_role;

-- One onboarding message per business and kind: true when this call claimed it.
create or replace function public.onboarding_claim(p_location uuid, p_kind text, p_detail jsonb default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  insert into public.onboarding_messages (location_id, kind, detail) values (p_location, p_kind, p_detail) on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;
revoke all on function public.onboarding_claim(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.onboarding_claim(uuid, text, jsonb) to service_role;

-- The businesses the onboarding tick looks at: in their first 30 days or not yet past the first task, with an owner on WhatsApp.
create or replace function public.onboarding_due(p_limit integer default 50) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j), '[]'::jsonb) from (
    select private.onboarding_facts(l.id) || jsonb_build_object(
      'place_id', l.place_id,
      'setup_at', l.setup_whatsapp_at, 'accepted_at', l.access_granted_at, 'created_at', l.created_at,
      'owner', (select jsonb_build_object('user_id', o.user_id, 'phone', o.phone,
                  'name', coalesce(u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name'))
                  from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
                  join auth.users u on u.id = m.user_id
                 where m.location_id = l.id and m.role = 'owner' and o.state = 'active' and o.phone is not null
                 order by m.created_at limit 1),
      'sent', coalesce((select jsonb_object_agg(om.kind, jsonb_build_object('at', om.sent_at, 'detail', om.detail))
                         from public.onboarding_messages om where om.location_id = l.id), '{}'::jsonb),
      'done', coalesce((select jsonb_agg(jsonb_build_object('target_type', p.target_type, 'response', p.google_response) order by p.approved_at)
                          from public.publications p where p.location_id = l.id and p.state = 'verified'), '[]'::jsonb),
      'approved_since_first', exists (select 1 from public.publications p join public.onboarding_messages om
                   on om.location_id = p.location_id and om.kind = 'first_task_sent'
                   where p.location_id = l.id and p.approved_at > om.sent_at),
      'waiting', (select count(*) from public.tasks t where t.location_id = l.id and t.state = 'open')
                 + (select count(*) from public.reviews r where r.location_id = l.id and r.state = 'drafted')) as j
    from public.locations l
    where not l.is_demo and l.deletion_requested_at is null and l.disconnect_requested_at is null
      and (l.first_task_done_at is null or l.first_task_done_at > now() - interval '3 days')
      and l.created_at > now() - interval '30 days'
      and exists (select 1 from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
                   where m.location_id = l.id and m.role = 'owner' and o.state = 'active' and o.phone is not null)
    order by l.created_at
    limit greatest(least(coalesce(p_limit, 50), 200), 1)
  ) x
$$;
revoke all on function public.onboarding_due(integer) from public, anon, authenticated;
grant execute on function public.onboarding_due(integer) to service_role;

-- What the first task can be, in the order of 30.16 section 3 (the choice is _shared/onboarding/stages.ts pickFirstTask).
create or replace function public.first_task_candidates(p_location uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'categories', (select to_jsonb(array_remove(array[l.category_label, l.category], null)) from public.locations l where l.id = p_location),
    -- Unanswered reviews with a current draft, newest first.
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('review_id', r.id, 'stars', r.star_rating, 'text', r.comment,
                  'risk', r.risk, 'reasons', to_jsonb(coalesce(r.risk_reasons, '{}'::text[])),
                  'draft', d.body, 'draft_ok', coalesce(d.safety_ok, false)) order by coalesce(r.review_created_at, r.created_at) desc)
                 from public.reviews r
                 join lateral (select body, safety_ok from public.reply_drafts x where x.review_id = r.id and x.redacted_at is null
                                order by x.version desc limit 1) d on true
                where r.location_id = p_location and r.state = 'drafted' and r.existing_reply is null
                  and r.content_purged_at is null), '[]'::jsonb),
    -- Services the owner confirmed in About your business.
    'posts', coalesce((select jsonb_agg(jsonb_build_object('fact_id', f.id, 'service', f.value ->> 'text') order by f.confirmed_at desc)
                 from public.knowledge_facts f
                where f.location_id = p_location and f.key = 'service' and f.status = 'verified' and f.superseded_by is null
                  and nullif(btrim(f.value ->> 'text'), '') is not null), '[]'::jsonb),
    -- Hours on Google that differ from the hours the owner confirmed: a real error, never a change made to show activity.
    'hours', coalesce((select jsonb_agg(jsonb_build_object('change_id', c.id, 'shown', 'different opening hours') order by c.detected_at desc)
                 from public.profile_changes c
                where c.location_id = p_location and c.field = 'regular_hours' and c.status in ('detected', 'awaiting_review')
                  and exists (select 1 from public.knowledge_facts k where k.location_id = p_location
                               and k.slot = 'profile.regular_hours' and k.status = 'verified' and k.superseded_by is null)), '[]'::jsonb))
$$;
revoke all on function public.first_task_candidates(uuid) from public, anon, authenticated;
grant execute on function public.first_task_candidates(uuid) to service_role;

-- The first task Kabsi saw on Google unlocks the rest (30.16 section 3).
create or replace function private.first_task_done() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.locations set first_task_done_at = now() where id = new.location_id and first_task_done_at is null;
  return new;
end $$;
revoke all on function private.first_task_done() from public, anon, authenticated;
create or replace trigger publications_first_task_done after update of state on public.publications
  for each row when (new.state = 'verified' and old.state is distinct from 'verified') execute function private.first_task_done();

-- Every task closes (30.15 3.1): publications approved on WhatsApp whose state the approver has not been told yet. Claimed
-- here (owner_told), so a repeat tick never sends twice. "Sent" is told once, after 30 minutes with no read-back from Google.
create or replace function public.publication_outcomes_due(p_limit integer default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  with due as (
    select p.id, p.location_id, p.target_type, p.state, p.google_response, p.approved_by,
      case when p.state in ('verified', 'rejected', 'failed') then 'final' else 'sent' end as told
      from public.publications p
     where p.approved_at > now() - interval '8 days'
       and p.approved_by is not null and p.channel = 'whatsapp'
       and p.target_type <> 'local_post_removal'
       and ((p.state in ('verified', 'rejected', 'failed') and p.owner_told is distinct from 'final')
         or (p.state in ('published', 'checking', 'verifying') and p.owner_told is null and p.approved_at < now() - interval '30 minutes'))
       and exists (select 1 from public.whatsapp_optins o where o.user_id = p.approved_by and o.state = 'active' and o.phone is not null)
     order by p.approved_at
     limit greatest(least(coalesce(p_limit, 50), 200), 1)
     for update of p skip locked
  ), claimed as (
    update public.publications p set owner_told = d.told, owner_told_at = now()
      from due d where p.id = d.id
    returning p.id
  )
  select coalesce(jsonb_agg(jsonb_build_object('publication_id', d.id, 'location_id', d.location_id, 'business', l.name,
           'place_id', l.place_id, 'target_type', d.target_type, 'state', d.state, 'response', d.google_response,
           'user_id', d.approved_by,
           'phone', (select o.phone from public.whatsapp_optins o where o.user_id = d.approved_by and o.state = 'active'))), '[]'::jsonb)
    into v
    from due d join claimed c on c.id = d.id join public.locations l on l.id = d.location_id;
  return v;
end $$;
revoke all on function public.publication_outcomes_due(integer) from public, anon, authenticated;
grant execute on function public.publication_outcomes_due(integer) to service_role;

-- Founding 25, founder-assisted start (30.15 3.2): what to do with the owner in the first days. Staff only.
create or replace function public.staff_founding_checklist(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; v_food boolean;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found then raise exception 'unknown_location'; end if;
  v_food := coalesce(l.category, '') || ' ' || coalesce(l.category_label, '') ~* '(restaurant|cafe|café|coffee|bakery|bar|food|pizza|dessert|juice)';
  return jsonb_build_object('business', l.name, 'items', jsonb_build_array(
    jsonb_build_object('item', 'old_reviews', 'label', 'Old reviews with no reply',
      'found', (select count(*) from public.reviews r where r.location_id = p_location and r.existing_reply is null
                  and r.state in ('new', 'drafted', 'blocked') and coalesce(r.review_created_at, r.created_at) < now() - interval '14 days')),
    jsonb_build_object('item', 'wrong_details', 'label', 'Details on Google that differ from the owner''s',
      'found', (select count(*) from public.profile_changes c where c.location_id = p_location and c.status in ('detected', 'awaiting_review'))),
    jsonb_build_object('item', 'booking_link', 'label', 'Booking link on the profile',
      'found', case when exists (select 1 from public.knowledge_facts k where k.location_id = p_location and k.key = 'booking'
                                   and k.status = 'verified' and k.superseded_by is null) then 0 else 1 end),
    jsonb_build_object('item', 'menu_link', 'label', 'Menu link on the profile (food and drink)',
      'found', case when v_food then 1 else 0 end, 'applies', v_food)),
    'done', coalesce((select jsonb_object_agg(c.item, jsonb_build_object('done_at', c.done_at, 'note', c.note))
                        from public.founding_checklist c where c.location_id = p_location), '{}'::jsonb));
end $$;
revoke all on function public.staff_founding_checklist(uuid) from public, anon;
grant execute on function public.staff_founding_checklist(uuid) to authenticated;

create or replace function public.staff_founding_check(p_location uuid, p_item text, p_done boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.founding_checklist (location_id, item, done_at, done_by, note)
  values (p_location, p_item, case when p_done then now() end, case when p_done then auth.uid() end, left(p_note, 300))
  on conflict (location_id, item) do update set done_at = excluded.done_at, done_by = excluded.done_by, note = coalesce(excluded.note, founding_checklist.note);
  perform private.audit('staff', auth.uid(), 'founding_checklist', p_location, 'location', p_location::text, null,
    jsonb_build_object('item', p_item, 'done', p_done), 'dashboard', case when p_done then 'done' else 'open' end);
end $$;
revoke all on function public.staff_founding_check(uuid, text, boolean, text) from public, anon;
grant execute on function public.staff_founding_check(uuid, text, boolean, text) to authenticated;

-- The monthly answer as Business Knowledge proposals (30.15 3.3): sentences that state a new service or price, kept as
-- "needs your OK" facts in the owner's own words. Nothing is used in a draft until the owner confirms it.
create or replace function public.propose_monthly_facts(p_location uuid, p_items jsonb, p_month text) returns integer
language plpgsql security definer set search_path = '' as $$
declare i jsonb; v_n integer := 0; v_text text; v_key text; v_slot text;
begin
  if p_month !~ '^\d{4}-\d{2}$' then raise exception 'bad_month'; end if;
  for i in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 3 loop
    v_text := btrim(i ->> 'text'); v_key := i ->> 'key';
    if v_key not in ('service', 'price_note') or v_text is null or length(v_text) not between 3 and 200 then continue; end if;
    v_slot := 'card.update:' || md5(lower(v_text));
    if exists (select 1 from public.knowledge_facts where location_id = p_location and slot = v_slot) then continue; end if;
    insert into public.knowledge_facts (location_id, slot, key, value, status, source, source_ref, uses, version)
    values (p_location, v_slot, v_key, jsonb_build_object('text', v_text), 'needs_confirmation', 'owner', 'monthly_update:' || p_month,
      array['replies', 'posts'], 1);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.propose_monthly_facts(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.propose_monthly_facts(uuid, jsonb, text) to service_role;

-- The owner's Yes on WhatsApp to the month's proposals (owner or manager of the business only).
create or replace function public.confirm_monthly_facts(p_location uuid, p_user uuid, p_month text) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if not exists (select 1 from public.location_members where location_id = p_location and user_id = p_user and role in ('owner', 'manager')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.knowledge_facts set status = 'verified', confirmed_by = p_user, confirmed_at = now()
   where location_id = p_location and source_ref = 'monthly_update:' || p_month and status = 'needs_confirmation' and superseded_by is null;
  get diagnostics v_n = row_count;
  perform private.audit('user', p_user, 'fact_confirmed', p_location, 'knowledge_facts', p_month, null,
    jsonb_build_object('source', 'monthly_update', 'count', v_n), 'whatsapp', 'confirmed');
  return v_n;
end $$;
revoke all on function public.confirm_monthly_facts(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_monthly_facts(uuid, uuid, text) to service_role;

-- The category check as a proposal the owner answers (27.3 item 4; LATER). Kabsi never changes a category itself: the task
-- asks the owner, and the steps are theirs to do on Google. The task closes when a later map shows the category.
create or replace function public.category_task_from_scan(p_scan uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare s public.visibility_scans; v_cat text; v_by text;
begin
  select * into s from public.visibility_scans where id = p_scan and state = 'done';
  if not found then return false; end if;
  v_cat := s.category_check ->> 'suggested';
  if v_cat is null then
    update public.tasks set state = 'done', resolved_at = now()
     where location_id = s.location_id and source_type = 'category_check' and state in ('open', 'snoozed');
    return false;
  end if;
  select string_agg(x, ' and ') into v_by from (select jsonb_array_elements_text(s.category_check -> 'shared_by') x limit 2) y;
  return private.task_put(s.location_id, 'profile_gap', 'category_check', lower(v_cat), 'recommended',
    left('Add the category ' || v_cat || ' on Google?', 200),
    left(coalesce(v_by, 'Two businesses') || ' come up near you with ' || v_cat || ' as their main category, and your profile does not list it. Add it only if it describes what you do.', 500),
    'On Google: Edit profile, Business category, Add another category.',
    jsonb_build_object('scan_id', s.id, 'suggested', v_cat, 'current', s.category_check ->> 'current', 'shared_by', s.category_check -> 'shared_by'),
    jsonb_build_object('type', 'owner_steps', 'change', 'add_category', 'category', v_cat),
    'category_check:' || lower(v_cat));
end $$;
revoke all on function public.category_task_from_scan(uuid) from public, anon, authenticated;
grant execute on function public.category_task_from_scan(uuid) to service_role;

insert into public.onboarding_messages (location_id, kind, detail)
select l.id, k.kind, jsonb_build_object('backfill', true)
  from public.locations l
 cross join (values ('invite'), ('access_works'), ('first_task'), ('first_task_sent'), ('after48'), ('unlock'), ('still_blocked')) k(kind)
 where l.access_granted_at is not null
on conflict do nothing;

-- A free check joins the business that signed up from it (stage 1 to stage 2), so its search and its line carry over. The owner
-- from the website; the WhatsApp agent (service role) when the owner's phone sent the code before connecting.
create or replace function public.claim_free_check(p_location uuid, p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.free_checks set location_id = p_location
   where code = upper(regexp_replace(coalesce(p_code, ''), '^KAB-', '', 'i')) and location_id is null and created_at > now() - interval '30 days';
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;
revoke all on function public.claim_free_check(uuid, text) from public, anon;
grant execute on function public.claim_free_check(uuid, text) to authenticated;

create or replace function public.attach_free_check(p_location uuid, p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.free_checks set location_id = p_location
   where code = upper(regexp_replace(coalesce(p_code, ''), '^KAB-', '', 'i')) and location_id is null and created_at > now() - interval '30 days';
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;
revoke all on function public.attach_free_check(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_free_check(uuid, text) to service_role;

-- A search confirmed before Google access (parked far ahead) runs once access is checked, with or without WhatsApp.
create or replace function public.release_parked_searches() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.visibility_keywords k set next_run_at = now()
    from public.google_connections g
   where g.location_id = k.location_id and k.active and k.next_run_at > '9000-01-01'::timestamptz
     and g.access_state = 'granted' and g.voice_of_merchant is true and g.last_successful_sync_at is not null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.release_parked_searches() from public, anon, authenticated;
grant execute on function public.release_parked_searches() to service_role;

-- 9. Retention: free checks go after 30 days, or 90 once claimed by a business that signed up ------------------------------
create or replace function private.purge_free_checks() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  delete from public.free_checks
   where (location_id is null and created_at < now() - interval '30 days') or created_at < now() - interval '90 days';
  get diagnostics v_n = row_count;
  delete from public.onboarding_messages om using public.locations l
   where l.id = om.location_id and l.first_task_done_at < now() - interval '90 days';
  return v_n;
end $$;
revoke all on function private.purge_free_checks() from public, anon, authenticated;
select cron.schedule('kabsi_purge_free_checks', '41 3 * * *', $$select private.purge_free_checks()$$);

-- 10. When the crons call the functions ------------------------------------------------------------------------------------
-- The WhatsApp tick also runs for task outcomes, the onboarding messages (checked every 5 minutes while a business is in its
-- first 30 days) and a free check's nearby places waiting for the phone that sent the code.
create or replace function private.v4_whatsapp_due() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.publications p
                  where p.approved_at > now() - interval '8 days' and p.approved_by is not null and p.channel = 'whatsapp'
                    and p.target_type <> 'local_post_removal'
                    and ((p.state in ('verified', 'rejected', 'failed') and p.owner_told is distinct from 'final')
                      or (p.state in ('published', 'checking', 'verifying') and p.owner_told is null and p.approved_at < now() - interval '30 minutes'))
                    and exists (select 1 from public.whatsapp_optins o where o.user_id = p.approved_by and o.state = 'active'))
      or (extract(minute from now())::int % 5 = 0
          and exists (select 1 from public.locations l where not l.is_demo and l.created_at > now() - interval '30 days'
                        and (l.first_task_done_at is null or l.first_task_done_at > now() - interval '3 days')))
      or exists (select 1 from public.free_checks f join public.whatsapp_conversations c on c.scan_code = 'KAB-' || f.code
                  where f.map_sent_at is null and f.state <> 'failed' and c.scan_code_at > now() - interval '1 day')
$$;
revoke all on function private.v4_whatsapp_due() from public, anon, authenticated;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('private.whatsapp_tick()'::regprocedure);
  n := replace(d, $x$     or private.review_growth_due() then$x$, $x$     or private.review_growth_due()
     or private.v4_whatsapp_due() then$x$);
  if n = d then raise exception 'whatsapp_tick: the text was not found'; end if;
  execute n;
  -- The visibility tick also collects free checks whose 7 by 7 search is still running.
  d := pg_get_functiondef('private.visibility_tick()'::regprocedure);
  n := replace(d, $x$     or exists (select 1 from public.visibility_scans where state = 'queued') then$x$,
                  $x$     or exists (select 1 from public.visibility_scans where state = 'queued')
     or exists (select 1 from public.free_checks where state = 'mapping')
     or exists (select 1 from public.visibility_keywords k join public.google_connections g on g.location_id = k.location_id
                 where k.active and k.next_run_at > '9000-01-01'::timestamptz and g.access_state = 'granted'
                   and g.voice_of_merchant is true and g.last_successful_sync_at is not null) then$x$);
  if n = d then raise exception 'visibility_tick: the text was not found'; end if;
  execute n;
end $$;
