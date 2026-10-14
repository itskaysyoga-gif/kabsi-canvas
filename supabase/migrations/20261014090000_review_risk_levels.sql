-- P0.3-03: three review risk levels (K-13, A15, D220 adapted). Additive: reviews.urgency and urgency_reasons stay
-- (nothing reads or writes them after this change; a later contract step retires them, asking Hussein first).
--
-- 1. reviews.risk (low, medium, high) and reviews.risk_reasons (the reason keys of
--    supabase/functions/_shared/ai/risk.ts). Code rules first, then the small model, the higher level wins; written
--    by the drafting job. High risk gets no draft: the review waits as 'blocked' with its reasons and a checklist.
-- 2. Existing reviews: a rating of 1 to 3 or the old urgent flag becomes medium (never high: those already have a
--    draft). Everything else stays low.
-- 3. The three functions that read the urgent flag read the level instead: the owner-email producer (medium and high
--    are emailed right away), the ops digest (high-risk reviews waiting) and the email-link sign-in rule (K-17: the
--    high-risk class needs the recipient signed in). Bodies are the live ones with only that line changed.
-- Additive only: every row and column stays.

alter table public.reviews
  add column risk text not null default 'low' check (risk in ('low', 'medium', 'high')),
  add column risk_reasons text[] not null default '{}';

comment on column public.reviews.risk is 'K-13 risk level: low drafts normally, medium drafts carefully with the issue on top, high gets no draft.';
comment on column public.reviews.risk_reasons is 'Reason keys from _shared/ai/risk.ts (never review text).';
comment on column public.reviews.urgency is 'Retired by P0.3-03 (reviews.risk). Not read or written; retired in a later contract step.';

update public.reviews
   set risk = 'medium',
       risk_reasons = case when star_rating <= 3 then array['low_rating'] else array['complaint'] end
 where star_rating <= 3 or urgency = 'urgent';

create or replace function private.produce_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sync integer; v_draft integer; v_notify integer; v_protect integer; v_steps integer := 0; v_live boolean;
  v_publish integer; v_reconcile integer; v_stuck integer;
begin
  -- Review sync: every business whose reviews Kabsi reads from Google (concierge businesses are typed in by staff),
  -- every 5 minutes. A business seen for the first time starts at its own offset inside the 5 minutes.
  with due as (
    select g.location_id, g.next_sync_at is null as first_time
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_sync_at is null or g.next_sync_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_sync_at = case when due.first_time
                          then now() + make_interval(secs => abs(hashtext(g.location_id::text)) % 300)
                          else now() + interval '5 minutes' end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'sync_reviews', m.location_id, 'sync_reviews:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_sync from added;

  -- Drafts: new reviews of active businesses, newest first, at most 10 a minute (the old 10 per run, K-100 budget).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'draft_reply', r.location_id, 'draft_reply:' || r.id, jsonb_build_object('review_id', r.id)
      from public.reviews r join public.locations l on l.id = r.location_id
     where r.state = 'new' and r.draft_attempts < 3 and l.status = 'active'
       and not exists (select 1 from public.jobs j where j.dedupe_key = 'draft_reply:' || r.id
                         and j.state in ('pending', 'running', 'retrying'))
     order by r.review_created_at desc nulls last
     limit 10
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_draft from added;

  -- Owner emails: a business with drafted or blocked reviews not yet emailed, when one is due now (D220 adapted to K-13: medium and high right away, D221).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'notify_owner', l.id, 'notify_owner:' || l.id
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null
       and (l.emails_paused_until is null or l.emails_paused_until <= now())
       and exists (select 1 from public.reviews r
                    where r.location_id = l.id and r.state in ('drafted', 'blocked') and r.notified_at is null
                      and (r.is_backlog or r.star_rating <= 3 or r.risk <> 'low'
                           or private.local_hour(l.time_zone) >= l.digest_hour))
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_notify from added;

  -- Google Protection (D218): the same businesses as the sync, every 5 minutes on the mock and for demo businesses,
  -- once an hour on live Google. A business seen for the first time starts at its own offset inside the 5 minutes.
  v_live := public.google_mode() = 'live';
  with due as (
    select g.location_id, g.next_protection_at is null as first_time,
           case when v_live and not l.is_demo then interval '1 hour' else interval '5 minutes' end as every
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_protection_at is null or g.next_protection_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_protection_at = case when due.first_time
                                then now() + make_interval(secs => abs(hashtext('protection:' || g.location_id::text)) % 300)
                                else now() + due.every end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'protection_check', m.location_id, 'protection_check:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_protect from added;

  -- The whole-system steps the 5 minute cron ran, each at its own minute.
  v_steps := private.offer_every('access_check', interval '5 minutes', interval '0 minutes')
           + private.offer_every('ratings_snapshot', interval '5 minutes', interval '1 minute')
           + private.offer_every('weekly_reports', interval '5 minutes', interval '2 minutes')
           + private.offer_every('deletions', interval '5 minutes', interval '3 minutes')
           + private.offer_every('trial_reminders', interval '5 minutes', interval '4 minutes')
           + private.offer_every('renewal_reminders', interval '5 minutes', interval '4 minutes');

  -- P0.1-13a: a write whose worker stopped (publishing or verifying for 10 minutes) may or may not have reached
  -- Google: it goes to checking and is read, never sent again (D266).
  with moved as (
    update public.publications set state = 'checking', moderation_state = coalesce(moderation_state, 'unknown'),
      error = coalesce(error, 'stopped before Google answered'), next_check_at = now()
     where publish_after is not null and route = 'api'
       and ((state = 'publishing' and claimed_at < now() - interval '10 minutes')
         or (state = 'verifying' and last_checked_at < now() - interval '10 minutes'))
    returning 1
  )
  select count(*) into v_stuck from moved;

  -- Due approvals (approve_publication offers each one already; this is the safety net) and due checks.
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'approved' and p.publish_after <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_publish from added;
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'reconcile_publication', p.location_id, 'reconcile_publication:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'checking' and p.next_check_at <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_reconcile from added;

  return jsonb_build_object('sync_reviews', v_sync, 'draft_reply', v_draft, 'notify_owner', v_notify,
    'protection_check', v_protect, 'steps', v_steps, 'publish', v_publish, 'reconcile_publication', v_reconcile,
    'stuck_publications', v_stuck);
end $$;

create or replace function public.ops_digest(p_hours integer default 24) returns jsonb
language sql stable security definer set search_path = '' as $$
  with w as (select now() - make_interval(hours => p_hours) as since),
  d as (select id from public.locations where is_demo)
  select jsonb_build_object(
    'hours', p_hours,
    'signups', (select count(*) from auth.users, w where created_at > since and email not like '%@test.local'
                  and lower(email) is distinct from public.demo_login_email()),
    'businesses_new', (select count(*) from public.locations, w where created_at > since and not is_demo),
    'businesses_live', (select count(*) from public.locations, w where activated_at > since and not is_demo),
    'businesses_active_total', (select count(*) from public.locations where status = 'active' and not is_demo),
    'waiting_for_access', (select count(*) from public.locations where status = 'access_pending' and not is_demo),
    'reviews_new', (select count(*) from public.reviews, w where created_at > since and location_id not in (select id from d)),
    'replies_posted', (select count(*) from public.publications, w where target_type = 'review_reply' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'drafts_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and location_id not in (select id from d)),
    'high_risk_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and risk = 'high' and location_id not in (select id from d)),
    'posts_published', (select count(*) from public.publications, w where target_type = 'local_post' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'shield_changes', (select count(*) from public.profile_changes, w where detected_at > since and location_id not in (select id from d)),
    'taps', (select count(*) from public.taps, w where created_at > since and not is_bot and (location_id is null or location_id not in (select id from d))),
    'chats', (select count(*) from public.chat_conversations, w where created_at > since and message_count > 0 and (location_id is null or location_id not in (select id from d))),
    'chats_hot', (select count(*) from public.chat_conversations, w where created_at > since and lead_temperature = 'hot' and (location_id is null or location_id not in (select id from d))),
    'handoffs', (select count(*) from public.chat_conversations, w where updated_at > since and status = 'handoff' and (location_id is null or location_id not in (select id from d))),
    'contacts', (select count(*) from public.contacts, w where created_at > since),
    'leads', (select count(*) from public.leads, w where created_at > since),
    'payments_usd', (select coalesce(sum(amount_usd), 0) from public.payments, w where created_at > since),
    'claims_pending', (select count(*) from public.usdt_claims where status = 'pending'),
    'plans_ending_14d', (select count(*) from public.plans where status = 'active' and kind <> 'partner' and ends_at between now() and now() + interval '14 days'),
    'partners_active', (select count(*) from public.partners where status = 'active'),
    'invites', (select count(*) from public.partner_invites, w where created_at > since),
    'emails_sent', (select count(*) from public.emails, w where created_at > since and status in ('sent','delivered') and (location_id is null or location_id not in (select id from d))),
    'emails_failed', (select count(*) from public.emails, w where created_at > since and status in ('failed','bounced') and coalesce(error,'') not like 'test address%'),
    'jobs_failed', (select count(*) from public.jobs_log, w where created_at > since and not ok),
    'publications_failed', (select count(*) from public.publications, w where updated_at > since and state = 'failed' and (location_id is null or location_id not in (select id from d))),
    'google_mode', (select value from public.app_settings where key = 'google_mode'),
    'slack_queue', (select count(*) from public.ops_events where sent_at is null)
  )
$$;

create or replace function private.action_link_needs_sign_in(p_target_type text, p_target_id text, p_do text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_do not in ('post', 'revert', 'keep') then return false; end if;
  if p_target_type = 'photo' then return false; end if;
  if p_target_type = 'review' then
    if p_target_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return true; end if;
    return exists (select 1 from public.reviews r where r.id = p_target_id::uuid and r.risk = 'high');
  end if;
  return true;
end $$;
