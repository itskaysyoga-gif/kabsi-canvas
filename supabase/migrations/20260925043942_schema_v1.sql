-- KABSI — schema v1 (D200 baseline, 25 Sep 2026)
-- Supabase project: kabsi-prod (ynjdqjlmdwjgbfezevxy, eu-central-1)
-- Applied 25 Sep 2026 as migration `schema_v1`; RLS verified by rollback tests (owner/stranger/anon/staff).
--
-- Rules this schema enforces:
--   * RLS on every table. Browsers READ through member-scoped policies; they never write directly.
--     All writes go through Edge Functions (service role) or SECURITY DEFINER RPCs that check membership.
--   * Nothing is written to Google unless a row exists in `publications` with approved_by + approved_at set
--     (D202). The publish Edge Function refuses anything else.
--   * No IP address is stored anywhere (taps, emails, logs).

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- ─────────────────────────────────────────────────────────── helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- ─────────────────────────────────────────────────────────── people
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'admin' check (role in ('admin','installer')),
  created_at timestamptz not null default now()
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text unique check (handle ~ '^[a-z0-9-]{3,30}$'),
  contact_email text,
  instagram text,
  country text,
  status text not null default 'onboarding' check (status in ('lead','onboarding','active','paused','ended')),
  billing_term text check (billing_term in ('monthly','3m','6m','12m')),
  rate_usd numeric(8,2) check (rate_usd >= 0),
  founding boolean not null default false,
  price_locked_until date,
  white_label_name text,               -- partner name shown on reports when white-label is on
  white_label_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger partners_updated before update on public.partners for each row execute function public.set_updated_at();

create table public.partner_members (
  partner_id uuid not null references public.partners(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);
create index partner_members_user_idx on public.partner_members(user_id);

-- ─────────────────────────────────────────────────────────── locations (one Google Business Profile each)
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place_id text unique,
  address text,
  country text,                                   -- ISO-2
  time_zone text not null default 'Asia/Beirut',
  google_account_id text,                         -- accounts/{id} as seen by hello@kabsi.co
  google_location_id text unique,                 -- locations/{id}
  status text not null default 'onboarding' check (status in
    ('onboarding','access_pending','awaiting_payment','waiting_list','active','paused','disabled')),
  signup_source text not null default 'self' check (signup_source in ('self','staff','partner_link','partner_invite')),
  partner_id uuid references public.partners(id) on delete set null,
  onboarding_step text not null default 'business' check (onboarding_step in ('business','access','knowledge','plan','done')),
  consent_text text,
  consent_at timestamptz,
  access_granted_at timestamptz,
  activated_at timestamptz,
  knowledge_card jsonb not null default jsonb_build_object(
    'signature','', 'tone','warm', 'contact_phone','', 'hours_note','', 'parking','', 'wifi','',
    'delivery', null, 'mention','', 'staff_names', '[]'::jsonb, 'faqs', '[]'::jsonb, 'custom_rules','[]'::jsonb),
  alert_emails text[] not null default '{}' check (cardinality(alert_emails) <= 3),
  digest_hour smallint not null default 19 check (digest_hour between 0 and 23),
  emails_paused_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_needs_access check (status <> 'active' or (consent_at is not null and access_granted_at is not null and google_location_id is not null))
);
create index locations_partner_idx on public.locations(partner_id);
create index locations_status_idx on public.locations(status);
create index locations_created_by_idx on public.locations(created_by);
create trigger locations_updated before update on public.locations for each row execute function public.set_updated_at();

create table public.location_members (
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager')),
  created_at timestamptz not null default now(),
  primary key (location_id, user_id)
);
create index location_members_user_idx on public.location_members(user_id);

-- membership helpers (used by policies and RPCs)
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid())
$$;

create or replace function public.is_member(p_location uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.location_members m where m.location_id = p_location and m.user_id = auth.uid())
$$;

create or replace function public.is_partner_member(p_partner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.partner_members m where m.partner_id = p_partner and m.user_id = auth.uid())
$$;

-- ─────────────────────────────────────────────────────────── plans & money
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  kind text not null check (kind in ('pro_6m','pro_12m','partner')),
  status text not null default 'pending' check (status in ('pending','active','ended','refunded')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index plans_location_idx on public.plans(location_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  item text not null check (item in ('card','cards_5','extra_card','pro_6m','pro_12m')),
  amount_usd numeric(8,2) not null check (amount_usd >= 0),
  method text not null check (method in ('cash','whish','omt','usdt')),
  reference text,
  receipt_path text,                              -- storage: receipts/ (private)
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_location_idx on public.payments(location_id);
create index payments_plan_idx on public.payments(plan_id);
create index payments_recorded_by_idx on public.payments(recorded_by);

create table public.partner_invoices (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  active_count int not null check (active_count >= 0),
  free_count int not null default 0 check (free_count >= 0),
  rate_usd numeric(8,2) not null,
  amount_usd numeric(10,2) not null,
  status text not null default 'unpaid' check (status in ('unpaid','paid','waived')),
  tx_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (partner_id, month)
);

-- ─────────────────────────────────────────────────────────── cards & taps
create table public.cards (
  code text primary key check (code ~ '^[2-9A-HJKMNP-Z]{6}$'),
  location_id uuid references public.locations(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  label text,                                     -- placement, e.g. "Counter"
  status text not null default 'unassigned' check (status in ('unassigned','active','disabled')),
  destination text,                               -- Google review URL, set on activation
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_card_has_target check (status <> 'active' or (location_id is not null and destination is not null))
);
create index cards_location_idx on public.cards(location_id);
create index cards_partner_idx on public.cards(partner_id);
create trigger cards_updated before update on public.cards for each row execute function public.set_updated_at();

create table public.taps (
  id bigint generated always as identity primary key,
  code text not null,
  location_id uuid references public.locations(id) on delete set null,
  source text not null check (source in ('nfc','qr')),
  country text,
  device text check (device in ('ios','android','other')),
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);
create index taps_location_time_idx on public.taps(location_id, created_at desc);
create index taps_code_idx on public.taps(code);

create table public.card_orders (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  quantity int not null check (quantity between 1 and 1000),
  status text not null default 'requested' check (status in ('requested','paid','encoding','shipped','installed','cancelled')),
  notes text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index card_orders_location_idx on public.card_orders(location_id);
create index card_orders_partner_idx on public.card_orders(partner_id);
create index card_orders_requested_by_idx on public.card_orders(requested_by);
create trigger card_orders_updated before update on public.card_orders for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────── reviews & drafts
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  google_review_id text not null unique,
  reviewer_name text,
  star_rating smallint not null check (star_rating between 1 and 5),
  comment text,
  language text,                                  -- detected, e.g. 'ar','en','fr','franco'
  urgency text not null default 'normal' check (urgency in ('normal','urgent')),
  urgency_reasons text[] not null default '{}',
  state text not null default 'new' check (state in ('new','drafted','blocked','posted','skipped','handled_offline')),
  existing_reply text,                            -- a reply already on Google (e.g. written by the owner)
  review_created_at timestamptz not null,
  review_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_location_state_idx on public.reviews(location_id, state);
create index reviews_location_time_idx on public.reviews(location_id, review_created_at desc);
create trigger reviews_updated before update on public.reviews for each row execute function public.set_updated_at();

create table public.reply_drafts (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  version int not null,
  body text not null,
  source text not null check (source in ('ai','ai_edit','owner')),
  instruction text,                               -- the owner's edit instruction, if any
  safety_ok boolean not null,
  safety_notes jsonb not null default '[]',
  model text,
  created_at timestamptz not null default now(),
  unique (review_id, version)
);

-- ─────────────────────────────────────────────────────────── other owner-approved content
create table public.gbp_posts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  owner_input text not null,                      -- what the owner said is new; posts are drafted from this
  body text,
  cta_type text check (cta_type in ('CALL','BOOK','ORDER','LEARN_MORE','GET_DIRECTIONS')),
  cta_url text,
  photo_path text,
  state text not null default 'draft' check (state in ('draft','posted','skipped','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gbp_posts_location_idx on public.gbp_posts(location_id, state);
create trigger gbp_posts_updated before update on public.gbp_posts for each row execute function public.set_updated_at();

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  storage_path text not null,                     -- storage: owner-photos/ (private)
  category text check (category in ('EXTERIOR','INTERIOR','PRODUCT','TEAMS','FOOD_AND_DRINK','ADDITIONAL')),
  suitable boolean,
  suitability_note text,
  caption text,
  state text not null default 'checking' check (state in ('checking','draft','posted','skipped','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index photos_location_idx on public.photos(location_id, state);
create trigger photos_updated before update on public.photos for each row execute function public.set_updated_at();

create table public.special_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  closed boolean not null,
  open_time time,
  close_time time,
  reason text,
  state text not null default 'draft' check (state in ('draft','posted','skipped','failed')),
  created_at timestamptz not null default now(),
  constraint dates_ok check (end_date >= start_date),
  constraint times_ok check (closed or (open_time is not null and close_time is not null))
);
create index special_hours_location_idx on public.special_hours(location_id);

-- ─────────────────────────────────────────────────────────── Listing Shield
create table public.listing_baselines (
  location_id uuid primary key references public.locations(id) on delete cascade,
  fields jsonb not null,                          -- title, phone, address, hours, website, categories
  updated_by text not null default 'system',
  updated_at timestamptz not null default now()
);

create table public.listing_changes (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  field text not null check (field in ('title','phone','address','hours','website','categories')),
  old_value jsonb,
  new_value jsonb,
  detected_by text not null check (detected_by in ('pubsub','scheduled_check')),
  state text not null default 'open' check (state in ('open','reverted','kept','revert_failed')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index listing_changes_location_idx on public.listing_changes(location_id, state);

-- ─────────────────────────────────────────────────────────── approval ledger: the ONLY path to Google writes
create table public.publications (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  target_type text not null check (target_type in ('review_reply','local_post','photo','special_hours','listing_revert')),
  target_id uuid not null,
  payload jsonb not null,                         -- the EXACT content shown on the confirm screen
  approved_by uuid not null references auth.users(id),
  approved_at timestamptz not null default now(),
  channel text not null check (channel in ('dashboard','email_link')),
  status text not null default 'queued' check (status in ('queued','sent','live','in_review','rejected','failed')),
  google_response jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index publications_location_idx on public.publications(location_id, created_at desc);
create index publications_target_idx on public.publications(target_type, target_id);
create index publications_approved_by_idx on public.publications(approved_by);
create index publications_status_idx on public.publications(status) where status in ('queued','sent','in_review');
create trigger publications_updated before update on public.publications for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────── email & signed action links
create table public.action_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,                -- sha256 hex; the raw token is never stored
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,   -- who the link was sent to
  action text not null check (action in ('post','edit','skip','post_all','see_draft','handle_myself','revert','keep','open')),
  target_type text not null check (target_type in ('review','digest','local_post','photo','special_hours','listing_change','inbox')),
  target_id text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index action_tokens_location_idx on public.action_tokens(location_id);
create index action_tokens_user_idx on public.action_tokens(user_id);
create index action_tokens_expiry_idx on public.action_tokens(expires_at);

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  kind text not null,
  to_address text not null,
  subject text not null,
  resend_id text,
  status text not null default 'queued' check (status in ('queued','sent','delivered','bounced','failed')),
  error text,
  dedupe_key text unique,                         -- makes every job safe to re-run
  created_at timestamptz not null default now()
);
create index emails_location_idx on public.emails(location_id, created_at desc);
create index emails_partner_idx on public.emails(partner_id);

-- ─────────────────────────────────────────────────────────── ops
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'partner' check (kind in ('partner','business')),
  name text not null,
  email text not null,
  instagram text,
  country text,
  volume text,
  message text,
  created_at timestamptz not null default now()
);

create table public.jobs_log (
  id bigint generated always as identity primary key,
  job text not null,
  ok boolean not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index jobs_log_job_time_idx on public.jobs_log(job, created_at desc);

-- ─────────────────────────────────────────────────────────── RLS: on everywhere
do $$
declare t text;
begin
  foreach t in array array['staff','partners','partner_members','locations','location_members','plans','payments',
    'partner_invoices','cards','taps','card_orders','reviews','reply_drafts','gbp_posts','photos','special_hours',
    'listing_baselines','listing_changes','publications','action_tokens','emails','leads','jobs_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Read policies (authenticated only). No insert/update/delete policies: writes go through server code.
create policy staff_read_all_locations on public.locations for select to authenticated using ((select public.is_staff()) or public.is_member(id));
create policy members_read_own on public.location_members for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy members_read_plans on public.plans for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_payments on public.payments for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_cards on public.cards for select to authenticated
  using (public.is_member(location_id) or public.is_partner_member(partner_id) or (select public.is_staff()));
create policy members_read_taps on public.taps for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_card_orders on public.card_orders for select to authenticated
  using (public.is_member(location_id) or public.is_partner_member(partner_id) or (select public.is_staff()));
create policy members_read_reviews on public.reviews for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_drafts on public.reply_drafts for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and (public.is_member(r.location_id) or (select public.is_staff()))));
create policy members_read_posts on public.gbp_posts for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_photos on public.photos for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_hours on public.special_hours for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_baselines on public.listing_baselines for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_changes on public.listing_changes for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy members_read_publications on public.publications for select to authenticated using (public.is_member(location_id) or (select public.is_staff()));
create policy partners_read_own on public.partners for select to authenticated using (public.is_partner_member(id) or (select public.is_staff()));
create policy partner_members_read_own on public.partner_members for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy partners_read_invoices on public.partner_invoices for select to authenticated using (public.is_partner_member(partner_id) or (select public.is_staff()));
create policy staff_read_staff on public.staff for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy staff_read_emails on public.emails for select to authenticated using ((select public.is_staff()));
create policy staff_read_leads on public.leads for select to authenticated using ((select public.is_staff()));
create policy staff_read_jobs on public.jobs_log for select to authenticated using ((select public.is_staff()));
-- action_tokens: no policy at all (server only).

-- ─────────────────────────────────────────────────────────── partner view (aggregates only, never review content)
create or replace function public.partner_locations(p_partner uuid)
returns table (location_id uuid, name text, country text, status text, activated_at timestamptz, taps_7d bigint, taps_30d bigint)
language sql stable security definer set search_path = '' as $$
  select l.id, l.name, l.country, l.status, l.activated_at,
    (select count(*) from public.taps t where t.location_id = l.id and not t.is_bot and t.created_at > now() - interval '7 days'),
    (select count(*) from public.taps t where t.location_id = l.id and not t.is_bot and t.created_at > now() - interval '30 days')
  from public.locations l
  where l.partner_id = p_partner and (public.is_partner_member(p_partner) or public.is_staff())
  order by l.created_at desc
$$;

-- ─────────────────────────────────────────────────────────── owner-editable settings (RPCs check membership)
create or replace function public.update_knowledge_card(p_location uuid, p_card jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_card) <> 'object' then raise exception 'knowledge card must be an object'; end if;
  update public.locations set knowledge_card = p_card where id = p_location;
end $$;

create or replace function public.update_notification_settings(p_location uuid, p_alert_emails text[], p_digest_hour smallint, p_time_zone text, p_pause_days int default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_time_zone is not null and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'unknown time zone';
  end if;
  update public.locations set
    alert_emails = coalesce(p_alert_emails, alert_emails),
    digest_hour = coalesce(p_digest_hour, digest_hour),
    time_zone = coalesce(p_time_zone, time_zone),
    emails_paused_until = case when p_pause_days is null then emails_paused_until
                               when p_pause_days = 0 then null
                               else now() + make_interval(days => least(p_pause_days, 30)) end
  where id = p_location;
end $$;

create or replace function public.rename_card(p_code text, p_label text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid;
begin
  select location_id into v_loc from public.cards where code = p_code;
  if v_loc is null or not public.is_member(v_loc) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.cards set label = left(p_label, 60) where code = p_code;
end $$;

-- staff: mint card codes
create or replace function public.generate_card_codes(p_count int, p_partner uuid default null) returns setof text
language plpgsql security definer set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text; made int := 0;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_count not between 1 and 1000 then raise exception 'count must be 1..1000'; end if;
  while made < p_count loop
    select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 31), 1), '')
      into v_code
      from (select extensions.gen_random_bytes(6) as b) r, generate_series(0,5) i;
    begin
      insert into public.cards(code, partner_id) values (v_code, p_partner);
      made := made + 1;
      return next v_code;
    exception when unique_violation then null;
    end;
  end loop;
end $$;

-- lock the RPCs to signed-in users
revoke execute on all functions in schema public from anon, public;
grant execute on function public.is_staff(), public.is_member(uuid), public.is_partner_member(uuid),
  public.partner_locations(uuid), public.update_knowledge_card(uuid, jsonb),
  public.update_notification_settings(uuid, text[], smallint, text, int),
  public.rename_card(text, text), public.generate_card_codes(int, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────── cleanup jobs
select cron.schedule('kabsi_cleanup_action_tokens', '17 3 * * *',
  $$delete from public.action_tokens where expires_at < now() - interval '30 days'$$);
select cron.schedule('kabsi_cleanup_jobs_log', '27 3 * * 0',
  $$delete from public.jobs_log where created_at < now() - interval '90 days'$$);
