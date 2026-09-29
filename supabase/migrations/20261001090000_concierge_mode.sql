-- KABSI: concierge mode, early access before Google approves the API (Q07, D267, D291).
-- A person on the team does the Google steps by hand: accepts the invitation, enters new reviews, and posts
-- what the owner approved, then marks it Posted. Owner approval and the publications ledger are unchanged
-- (D202): concierge changes who clicks the final button on Google, not who approves. The publish claim (D266)
-- is kept: one conditional update, no automatic retry.
-- A concierge business is not billed and its plan clock does not start until a person has posted its first
-- approved reply (D267). Capped at 30 businesses.

-- ─── columns
alter table public.locations
  add column concierge boolean not null default false,
  add column concierge_since timestamptz,
  add column concierge_first_post_at timestamptz,
  add column concierge_converted_at timestamptz;
alter table public.locations add constraint concierge_ids_ok check (
  (google_location_id is null or google_location_id not like 'locations/concierge-%' or concierge)
  and (not concierge or google_location_id is null or google_location_id like 'locations/concierge-%'));

alter table public.reviews
  add column source text not null default 'google' check (source in ('google','concierge')),
  add column entered_by uuid references auth.users(id) on delete set null,
  add column entry_key text;
create unique index reviews_entry_key_unique on public.reviews (location_id, entry_key) where entry_key is not null;
create index reviews_entered_by_idx on public.reviews (entered_by) where entered_by is not null;

alter table public.publications drop constraint publications_status_check;
alter table public.publications add constraint publications_status_check
  check (status in ('queued','sent','live','in_review','rejected','failed','cancelled'));
alter table public.publications
  add column route text not null default 'api' check (route in ('api','concierge')),
  add column posted_manually_by uuid references auth.users(id) on delete set null,
  add column posted_manually_at timestamptz;
create index publications_posted_by_idx on public.publications (posted_manually_by) where posted_manually_by is not null;
alter table public.publications add constraint manual_post_pair check ((posted_manually_by is null) = (posted_manually_at is null));
-- The database itself refuses a concierge reply marked live without a named person.
alter table public.publications add constraint concierge_live_needs_person
  check (route <> 'concierge' or status not in ('live','in_review') or posted_manually_by is not null);

insert into public.app_settings (key, value) values ('concierge_cap', '30') on conflict (key) do nothing;

-- ─── tasks
create table public.concierge_tasks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  kind text not null check (kind in ('invite','review_entry','post_reply')),
  state text not null default 'open' check (state in ('open','done','cancelled')),
  review_id uuid references public.reviews(id) on delete cascade,
  publication_id uuid references public.publications(id) on delete cascade,
  due_on date,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  done_by uuid references auth.users(id) on delete set null,
  done_at timestamptz,
  outcome text,
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_reply_refs check (kind <> 'post_reply' or (review_id is not null and publication_id is not null)),
  constraint done_needs_person check (state <> 'done' or (done_by is not null and done_at is not null))
);
create unique index concierge_tasks_one_open_reply on public.concierge_tasks (review_id) where kind = 'post_reply' and state = 'open';
create unique index concierge_tasks_one_per_publication on public.concierge_tasks (publication_id) where publication_id is not null;
create unique index concierge_tasks_daily on public.concierge_tasks (location_id, due_on) where kind = 'review_entry';
create unique index concierge_tasks_one_open_invite on public.concierge_tasks (location_id) where kind = 'invite' and state = 'open';
create index concierge_tasks_location_idx on public.concierge_tasks (location_id);
create index concierge_tasks_claimed_idx on public.concierge_tasks (claimed_by) where claimed_by is not null;
create index concierge_tasks_done_idx on public.concierge_tasks (done_by) where done_by is not null;
create index concierge_tasks_review_idx on public.concierge_tasks (review_id) where review_id is not null;
create trigger concierge_tasks_updated before update on public.concierge_tasks for each row execute function public.set_updated_at();
alter table public.concierge_tasks enable row level security;
revoke all on public.concierge_tasks from anon, authenticated;
create policy staff_read_concierge_tasks on public.concierge_tasks for select to authenticated using ((select public.is_staff()));
grant select on public.concierge_tasks to authenticated;

-- ─── helpers
create or replace function public.is_concierge_gid(p_id text) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_id like 'locations/concierge-%', false)
$$;

create or replace function public.concierge_unbilled(p_location uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.locations where id = p_location and concierge and concierge_first_post_at is null)
$$;

-- Q05 hook: the plan clock (trial, paid plans) starts with real access, or, for concierge, with the first reply a
-- person posted (D267).
create or replace function public.plan_clock_ready(p_location uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.locations
    where id = p_location
      and ((access_granted_at is not null and not concierge and not public.is_concierge_gid(google_location_id))
           or concierge_first_post_at is not null)
  )
$$;

-- Same body as 20260930090000_plans_v2_trial.sql; the only change is concierge_unbilled in v_paid.
create or replace function public.refresh_location_status(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_paid boolean; v_new text;
begin
  perform public.start_paid_plans(p_location);
  select * into l from public.locations where id = p_location for update;
  if not found then return null; end if;
  if l.status in ('paused','disabled') then return l.status; end if;
  v_paid := public.partner_covered(l.id)
    or public.concierge_unbilled(l.id)
    or exists (select 1 from public.plans p where p.location_id = l.id and p.status = 'active'
               and ((p.ends_at is null and p.kind = 'partner') or p.ends_at > now()));
  v_new := case
    when l.consent_at is not null and l.access_granted_at is not null and l.google_location_id is not null and v_paid then 'active'
    when l.access_granted_at is not null then 'awaiting_payment'
    when l.consent_at is not null then 'access_pending'
    else 'onboarding' end;
  update public.locations set status = v_new,
    activated_at = case when v_new = 'active' then coalesce(activated_at, now()) else activated_at end
  where id = l.id and status is distinct from v_new;
  return v_new;
end $$;

-- Same body as Q05's plan_summary, plus the concierge key and the early_access tier.
create or replace function public.plan_summary(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; cur public.plans; v_tier text; v_covered boolean; v_tz text; v_unbilled boolean;
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found then return null; end if;
  v_tz := coalesce(l.time_zone, 'UTC');
  v_covered := public.partner_covered(l.id);
  v_unbilled := public.concierge_unbilled(l.id);
  select * into cur from public.plans where location_id = l.id and status = 'active' and kind <> 'partner'
    and starts_at <= now() and ends_at > now() order by (kind = 'trial') asc, ends_at desc limit 1;
  v_tier := case
    when v_unbilled then 'early_access'
    when not public.plan_clock_ready(l.id) then 'none'
    when v_covered then 'partner'
    when cur.id is not null and cur.kind = 'trial' then 'trial'
    when cur.id is not null then 'pro'
    else 'free' end;
  return jsonb_build_object(
    'tier', v_tier,
    'v2', public.plans_v2_on(),
    'partner_covered', v_covered,
    'concierge', jsonb_build_object('on', l.concierge, 'since', l.concierge_since, 'first_post_at', l.concierge_first_post_at, 'unbilled', v_unbilled),
    'plan', case when cur.id is null then null else jsonb_build_object(
      'kind', cur.kind, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at,
      'last_day', ((cur.ends_at - interval '1 second') at time zone v_tz)::date) end,
    'queued', coalesce((select jsonb_agg(jsonb_build_object('kind', q.kind, 'starts_at', q.starts_at, 'ends_at', q.ends_at,
        'last_day', ((q.ends_at - interval '1 second') at time zone v_tz)::date) order by q.starts_at)
      from public.plans q where q.location_id = l.id and q.status = 'active' and q.kind <> 'partner' and q.starts_at > now()), '[]'::jsonb),
    'paid_waiting', exists (select 1 from public.plans w where w.location_id = l.id and w.status = 'pending'
      and exists (select 1 from public.payments pay where pay.plan_id = w.id)),
    'unpaid_kind', (select w.kind from public.plans w where w.location_id = l.id and w.status = 'pending'
      and not exists (select 1 from public.payments pay where pay.plan_id = w.id) order by w.created_at desc limit 1),
    'trial_used', exists (select 1 from public.plans t where t.location_id = l.id and t.kind = 'trial')
      or (l.place_id is not null and exists (select 1 from public.trial_grants g where g.place_id = l.place_id)),
    'trial_days', public.trial_days_for(l.signup_source),
    'offer', to_jsonb(public.owner_plan_kinds(l.id))
  );
end $$;

-- Partner billing ignores concierge ids, and counts a converted business from its conversion date.
create or replace function public.partner_invoice_calc(p_partner uuid, p_month date)
returns table (active_count int, free_count int, rate_usd numeric, amount_usd numeric)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end timestamptz := (date_trunc('month', p_month) + interval '1 month');
  v_active int; v_free int := 0; v_rate numeric; v_first public.locations;
begin
  if not (public.is_partner_member(p_partner) or public.is_staff() or auth.role() = 'service_role' or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select count(*) into v_active from public.locations l
  where l.partner_id = p_partner and l.status = 'active' and coalesce(l.concierge_converted_at, l.activated_at) < v_end
    and l.google_location_id is not null and l.google_location_id not like 'locations/mock-%'
    and l.google_location_id not like 'locations/concierge-%';

  if exists (select 1 from public.partners p where p.id = p_partner and p.founding) then
    select * into v_first from public.locations l
    where l.partner_id = p_partner and l.activated_at is not null
      and l.google_location_id is not null and l.google_location_id not like 'locations/mock-%'
      and l.google_location_id not like 'locations/concierge-%'
    order by coalesce(l.concierge_converted_at, l.activated_at) limit 1;
    if found and v_first.status = 'active' and coalesce(v_first.concierge_converted_at, v_first.activated_at) < v_end
       and v_end < coalesce(v_first.concierge_converted_at, v_first.activated_at) + interval '30 days' then
      v_free := 1;
    end if;
  end if;

  v_rate := public.partner_rate(p_partner, v_start);
  return query select v_active, v_free, v_rate, round(greatest(v_active - v_free, 0) * v_rate, 2);
end $$;

-- ─── the cap: every path obeys it, not only the staff function
create or replace function public.concierge_cap_guard() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cap int; v_n int;
begin
  if new.concierge and (tg_op = 'INSERT' or not old.concierge) then
    perform pg_advisory_xact_lock(hashtext('concierge_cap'));
    select coalesce((select value::int from public.app_settings where key = 'concierge_cap'), 30) into v_cap;
    select count(*) into v_n from public.locations where concierge and id <> new.id;
    if v_n >= v_cap then raise exception 'concierge_full' using hint = 'Early access is limited to ' || v_cap || ' businesses.'; end if;
  end if;
  return new;
end $$;
create trigger concierge_cap before insert or update of concierge on public.locations
  for each row execute function public.concierge_cap_guard();

-- ─── staff controls
create or replace function public.staff_set_concierge(p_location uuid, p_on boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'unknown_location'; end if;
  if p_on then
    if l.concierge then return 'already_on'; end if;
    if l.google_location_id is not null and not public.is_concierge_gid(l.google_location_id) and l.google_location_id not like 'locations/mock-%' then
      raise exception 'has_google_access' using hint = 'This business already has real Google access.';
    end if;
    update public.locations set concierge = true, concierge_since = now(),
      google_account_id = case when l.google_location_id like 'locations/mock-%' then null else google_account_id end,
      google_location_id = case when l.google_location_id like 'locations/mock-%' then null else google_location_id end,
      access_granted_at = case when l.google_location_id like 'locations/mock-%' then null else access_granted_at end,
      status = case when l.google_location_id like 'locations/mock-%' and status = 'active' then 'access_pending' else status end
    where id = p_location;
    if not exists (select 1 from public.locations where id = p_location and access_granted_at is not null) then
      insert into public.concierge_tasks (location_id, kind) values (p_location, 'invite') on conflict do nothing;
    end if;
    return public.refresh_location_status(p_location);
  end if;
  if not l.concierge then return 'already_off'; end if;
  if exists (select 1 from public.concierge_tasks where location_id = p_location and kind = 'post_reply' and state = 'open') then
    raise exception 'open_reply_tasks' using hint = 'Post or cancel the waiting replies first.';
  end if;
  update public.concierge_tasks set state = 'cancelled', outcome = 'concierge_off' where location_id = p_location and state = 'open';
  update public.locations set concierge = false, google_account_id = null, google_location_id = null, access_granted_at = null,
    status = case when status = 'active' then 'access_pending' else status end
  where id = p_location;
  return public.refresh_location_status(p_location);
end $$;

create or replace function public.staff_concierge_convert(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if public.google_mode() <> 'live' then raise exception 'not_live' using hint = 'Google is not connected yet.'; end if;
  select * into l from public.locations where id = p_location for update;
  if not found or not l.concierge then raise exception 'not_concierge'; end if;
  if exists (select 1 from public.concierge_tasks where location_id = p_location and kind = 'post_reply' and state = 'open') then
    raise exception 'open_reply_tasks';
  end if;
  update public.concierge_tasks set state = 'cancelled', outcome = 'converted' where location_id = p_location and state = 'open';
  update public.locations set concierge = false, concierge_converted_at = now(), google_account_id = null, google_location_id = null,
    access_granted_at = null, reviews_synced_at = null, backlog_emailed_at = null,
    status = case when status = 'active' then 'access_pending' else status end
  where id = p_location;
  return public.refresh_location_status(p_location);
end $$;

create or replace function public.staff_concierge_task_done(p_task uuid, p_note text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare t public.concierge_tasks; l public.locations;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.concierge_tasks set state = 'done', done_by = auth.uid(), done_at = now(), note = nullif(left(coalesce(p_note, ''), 500), '')
   where id = p_task and state = 'open' and kind in ('invite','review_entry') returning * into t;
  if not found then raise exception 'already_done'; end if;
  if t.kind = 'invite' then
    select * into l from public.locations where id = t.location_id for update;
    if l.consent_at is null then raise exception 'no_consent'; end if;
    update public.locations set google_account_id = 'accounts/concierge', google_location_id = 'locations/concierge-' || id::text,
      access_granted_at = coalesce(access_granted_at, now())
    where id = t.location_id and concierge;
    return public.refresh_location_status(t.location_id);
  end if;
  return 'done';
end $$;

create or replace function public.staff_concierge_add_review(
  p_location uuid, p_rating int, p_comment text, p_reviewer text, p_review_date date, p_backlog boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_id uuid; v_key text; v_at timestamptz; v_comment text := nullif(left(trim(coalesce(p_comment, '')), 4000), '');
  v_name text := left(coalesce(nullif(trim(p_reviewer), ''), 'A customer'), 80);
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found or not l.concierge or l.access_granted_at is null then raise exception 'not_concierge_ready'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'bad_rating'; end if;
  if p_review_date is null or p_review_date > (now() at time zone coalesce(l.time_zone, 'UTC'))::date then raise exception 'bad_date'; end if;
  v_at := ((p_review_date::timestamp + interval '12 hours') at time zone coalesce(l.time_zone, 'UTC'));
  v_key := md5(lower(v_name) || '|' || p_rating || '|' || p_review_date || '|' || left(lower(regexp_replace(coalesce(v_comment, ''), '\s+', ' ', 'g')), 200));
  insert into public.reviews (location_id, google_review_id, reviewer_name, star_rating, comment, review_created_at, review_updated_at,
    fetched_at, state, is_backlog, source, entered_by, entry_key)
  values (p_location, 'concierge-' || gen_random_uuid()::text, v_name, p_rating, v_comment, v_at, v_at, now(), 'new', coalesce(p_backlog, false),
    'concierge', auth.uid(), v_key)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'duplicate_review' using hint = 'This review was already entered.';
end $$;

-- Fix a typo before it is drafted or approved: the review is redrafted from scratch.
create or replace function public.staff_concierge_edit_review(p_review uuid, p_rating int, p_comment text, p_reviewer text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reviews;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.reviews where id = p_review for update;
  if not found or r.source <> 'concierge' or r.state not in ('new','drafted','blocked') then raise exception 'cannot_edit'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'bad_rating'; end if;
  update public.reviews set star_rating = p_rating, comment = nullif(left(trim(coalesce(p_comment, '')), 4000), ''),
    reviewer_name = left(coalesce(nullif(trim(p_reviewer), ''), reviewer_name), 80),
    state = 'new', draft_attempts = 0, language = null, notified_at = null
  where id = p_review;
end $$;

-- ─── approval becomes a task (called only by publishReply, after the owner approved: D202)
create or replace function public.concierge_queue_reply(p_review uuid, p_text text, p_approved_by uuid, p_channel text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.reviews; l public.locations; v_pub uuid; v_text text := trim(coalesce(p_text, ''));
begin
  if length(v_text) < 1 or length(v_text) > 4000 then raise exception 'bad_reply_text'; end if;
  select * into r from public.reviews where id = p_review;
  if not found then raise exception 'unknown_review'; end if;
  select * into l from public.locations where id = r.location_id;
  if not l.concierge or l.status <> 'active' then raise exception 'location_not_active'; end if;
  -- defence in depth: the approver must be a member of this business
  if not exists (select 1 from public.location_members where location_id = r.location_id and user_id = p_approved_by) then
    raise exception 'approver_not_member';
  end if;
  -- D266 claim: only the request that flips drafted or blocked to publishing continues
  update public.reviews set state = 'publishing' where id = p_review and state in ('drafted','blocked');
  if not found then raise exception 'already_posted'; end if;
  insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, status, route)
  values (r.location_id, 'review_reply', p_review, jsonb_build_object('text', v_text), p_approved_by, p_channel, 'queued', 'concierge')
  returning id into v_pub;
  insert into public.concierge_tasks (location_id, kind, review_id, publication_id) values (r.location_id, 'post_reply', p_review, v_pub);
  return v_pub;
end $$;

create or replace function public.staff_concierge_claim_task(p_task uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.concierge_tasks set claimed_by = auth.uid(), claimed_at = now()
   where id = p_task and state = 'open'
     and (claimed_by is null or claimed_by = auth.uid() or claimed_at < now() - interval '30 minutes');
  if not found then raise exception 'claimed_by_other'; end if;
end $$;

create or replace function public.staff_concierge_mark_posted(p_task uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.concierge_tasks; p public.publications; v_text text; v_first boolean := false; l public.locations;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.concierge_tasks set state = 'done', done_by = auth.uid(), done_at = now()
   where id = p_task and kind = 'post_reply' and state = 'open' returning * into t;
  if not found then raise exception 'already_done'; end if;
  select * into p from public.publications where id = t.publication_id for update;
  v_text := p.payload ->> 'text';
  if p.payload_redacted_at is not null or v_text is null then raise exception 'text_redacted'; end if;
  update public.publications set status = 'live', posted_manually_by = auth.uid(), posted_manually_at = now()
   where id = p.id and status = 'queued';
  if not found then raise exception 'publication_not_queued'; end if;
  update public.reviews set state = 'posted', existing_reply = v_text, reply_state = 'live'
   where id = t.review_id and state = 'publishing';
  select * into l from public.locations where id = t.location_id for update;
  if l.concierge_first_post_at is null then
    v_first := true;
    update public.locations set concierge_first_post_at = now() where id = l.id;
    -- the clock starts now: a trial for a staff-vetted business even while the public trial is off (D267)
    perform public.grant_trial_if_eligible(l.id, true);
    perform public.refresh_location_status(l.id);
    perform public.ops_emit('concierge_first_post', 'money', ':tada: First concierge reply posted: ' || l.name,
      'The plan clock started for this business.', '[]', public.ops_staff_btn(), 'cfirst:' || l.id);
  end if;
  return jsonb_build_object('ok', true, 'first_post', v_first);
end $$;

create or replace function public.staff_concierge_cancel_task(p_task uuid, p_outcome text, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.concierge_tasks;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_outcome not in ('redo','gone','access_lost') then raise exception 'bad_outcome'; end if;
  update public.concierge_tasks set state = 'cancelled', outcome = p_outcome, note = nullif(left(coalesce(p_reason, ''), 500), ''),
    done_by = auth.uid(), done_at = now()
   where id = p_task and state = 'open' and kind = 'post_reply' returning * into t;
  if not found then raise exception 'already_done'; end if;
  update public.publications set status = 'cancelled', error = left(coalesce(p_reason, p_outcome), 500) where id = t.publication_id and status = 'queued';
  if p_outcome = 'gone' then
    update public.reviews set state = 'archived' where id = t.review_id and state = 'publishing';
  else
    update public.reviews set state = 'drafted' where id = t.review_id and state = 'publishing';
  end if;
  if p_outcome = 'access_lost' then
    update public.locations set google_account_id = null, google_location_id = null, access_granted_at = null,
      status = case when status = 'active' then 'access_pending' else status end where id = t.location_id;
    insert into public.concierge_tasks (location_id, kind) values (t.location_id, 'invite') on conflict do nothing;
    perform public.refresh_location_status(t.location_id);
  end if;
end $$;

create or replace function public.staff_concierge_queue() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'count', (select count(*) from public.locations where concierge),
    'cap', coalesce((select value::int from public.app_settings where key = 'concierge_cap'), 30),
    'tasks', coalesce((select jsonb_agg(x order by x->>'created_at') from (
      select jsonb_build_object(
        'id', t.id, 'kind', t.kind, 'created_at', t.created_at, 'due_on', t.due_on,
        'location_id', l.id, 'business', l.name, 'address', l.address, 'consented', l.consent_at is not null,
        'claimed_by', (select coalesce(s.name, u.email) from auth.users u left join public.staff s on s.user_id = u.id where u.id = t.claimed_by),
        'claimed_at', t.claimed_at,
        'review', case when r.id is null then null else jsonb_build_object('id', r.id, 'stars', r.star_rating, 'reviewer', r.reviewer_name,
            'date', r.review_created_at, 'text', r.comment) end,
        'reply_text', p.payload ->> 'text', 'approved_at', p.approved_at
      ) x
      from public.concierge_tasks t
      join public.locations l on l.id = t.location_id
      left join public.reviews r on r.id = t.review_id
      left join public.publications p on p.id = t.publication_id
      where t.state = 'open' and t.kind <> 'review_entry'
    ) q), '[]'::jsonb),
    'businesses', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'status', l.status,
        'access', l.access_granted_at is not null, 'first_post_at', l.concierge_first_post_at,
        'checked_today', exists (select 1 from public.concierge_tasks c where c.location_id = l.id and c.kind = 'review_entry'
            and c.due_on = current_date and c.state = 'done')) order by l.name)
      from public.locations l where l.concierge), '[]'::jsonb)
  );
end $$;

-- "Checked Google for new reviews" reminders: one per concierge business per working day.
create or replace function public.concierge_daily_tasks() returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.concierge_tasks (location_id, kind, due_on)
  select l.id, 'review_entry', current_date from public.locations l
   where l.concierge and l.access_granted_at is not null and extract(isodow from current_date) < 6
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.concierge_overdue_alerts() returns int language plpgsql security definer set search_path = '' as $$
declare t record; n int := 0;
begin
  for t in
    select ct.id, ct.kind, l.name from public.concierge_tasks ct join public.locations l on l.id = ct.location_id
    where ct.state = 'open' and ct.kind in ('post_reply','invite') and ct.created_at < now() - interval '24 hours'
  loop
    perform public.ops_emit('concierge_overdue', 'alerts', ':alarm_clock: Concierge task overdue: ' || t.name,
      'A ' || replace(t.kind, '_', ' ') || ' task has waited more than a working day. The owner was promised one working day.',
      '[]', public.ops_staff_btn('Open the queue'), 'coverdue:' || t.id || ':' || to_char(now(), 'YYYYMMDD'));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Slack: a thread per reply task
create or replace function public.ops_on_concierge_task() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_who text;
begin
  if new.kind <> 'post_reply' then return new; end if;
  select name into v_name from public.locations where id = new.location_id;
  if tg_op = 'INSERT' then
    perform public.ops_emit('concierge_reply', 'customers', ':writing_hand: Reply to post by hand: ' || coalesce(v_name, 'a business'),
      'The owner approved a reply. Open the queue, copy the exact text, post it on Google, then mark it posted.',
      '[]', public.ops_staff_btn('Open the queue'), 'ctask:' || new.id);
  elsif new.state <> old.state then
    select coalesce(s.name, u.email) into v_who from auth.users u left join public.staff s on s.user_id = u.id where u.id = new.done_by;
    perform public.ops_emit('concierge_reply_' || new.state, 'customers',
      case when new.state = 'done' then ':white_check_mark: Posted by ' else ':x: Cancelled by ' end || coalesce(v_who, 'staff'),
      null, '[]', '[]', 'ctask_done:' || new.id, 'ctask:' || new.id, 'reply');
  end if;
  return new;
end $$;
create trigger ops_concierge_task after insert or update of state on public.concierge_tasks
  for each row execute function public.ops_on_concierge_task();

select cron.schedule('kabsi_concierge_daily', '0 5 * * 1-5', $$select public.concierge_daily_tasks()$$);
select cron.schedule('kabsi_concierge_overdue', '17 * * * *', $$select public.concierge_overdue_alerts()$$);

-- ─── privileges
revoke execute on function public.concierge_queue_reply(uuid, text, uuid, text), public.concierge_unbilled(uuid),
  public.concierge_daily_tasks(), public.concierge_overdue_alerts(), public.concierge_cap_guard(),
  public.ops_on_concierge_task() from public, anon, authenticated;
grant execute on function public.concierge_queue_reply(uuid, text, uuid, text), public.concierge_unbilled(uuid),
  public.concierge_daily_tasks(), public.concierge_overdue_alerts() to service_role;
revoke execute on function public.staff_set_concierge(uuid, boolean), public.staff_concierge_convert(uuid),
  public.staff_concierge_task_done(uuid, text), public.staff_concierge_add_review(uuid, int, text, text, date, boolean),
  public.staff_concierge_edit_review(uuid, int, text, text), public.staff_concierge_claim_task(uuid),
  public.staff_concierge_mark_posted(uuid), public.staff_concierge_cancel_task(uuid, text, text),
  public.staff_concierge_queue() from public, anon;
grant execute on function public.staff_set_concierge(uuid, boolean), public.staff_concierge_convert(uuid),
  public.staff_concierge_task_done(uuid, text), public.staff_concierge_add_review(uuid, int, text, text, date, boolean),
  public.staff_concierge_edit_review(uuid, int, text, text), public.staff_concierge_claim_task(uuid),
  public.staff_concierge_mark_posted(uuid), public.staff_concierge_cancel_task(uuid, text, text),
  public.staff_concierge_queue() to authenticated;
