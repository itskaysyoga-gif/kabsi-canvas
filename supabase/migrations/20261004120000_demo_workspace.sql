-- P0.1-06 (R-17, K-56, R-09): the demo workspace. Fictional businesses flagged locations.is_demo, kept apart from
-- real data: always mock Google (google_location_id starts with 'locations/demo-'), email only to the demo login,
-- never in Slack, metrics, billing or plans. organizations.is_demo follows with P0.1-09.
-- Additive only: one column, one check, five helper functions, trigger conditions on the existing ops triggers,
-- two functions redefined with a demo guard (refresh_location_status, ops_digest), concierge_cap set to 20.
-- The demo login address is set by the seed (supabase/seed/demo.sql) in app_settings.demo_login_email, so no
-- personal address is written in the repository.

alter table public.locations add column is_demo boolean not null default false;
-- A demo business never belongs to a partner, so partner billing can never count it.
alter table public.locations add constraint demo_has_no_partner check (not is_demo or partner_id is null);

create or replace function public.is_demo_location(p_location uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select l.is_demo from public.locations l where l.id = p_location), false)
$$;

create or replace function public.demo_login_email() returns text
language sql stable security definer set search_path = '' as $$
  select nullif(lower(trim(s.value)), '') from public.app_settings s where s.key = 'demo_login_email'
$$;
revoke execute on function public.demo_login_email() from public, anon, authenticated;
grant execute on function public.demo_login_email() to service_role;

create or replace function public.is_demo_user(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (
    select 1 from auth.users u where u.id = p_user and lower(u.email) = public.demo_login_email())
$$;

-- For the signup trigger: the new auth.users row is not visible to a query yet, so match on the address itself.
create or replace function public.is_demo_login(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(lower(trim(p_email)) = public.demo_login_email(), false)
$$;

-- sendEmail asks this before writing an emails row: a demo business only ever emails the demo login.
create or replace function public.email_allowed_for_location(p_location uuid, p_to text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.is_demo_location(p_location) or lower(trim(p_to)) = public.demo_login_email()
$$;
revoke execute on function public.email_allowed_for_location(uuid, text) from public, anon, authenticated;
grant execute on function public.email_allowed_for_location(uuid, text) to service_role;

-- Slack (ops_events): the same triggers, now skipped for demo rows. create or replace keeps each trigger's events.
create or replace trigger ops_user_created after insert on auth.users
  for each row when (not public.is_demo_login(new.email)) execute function public.ops_on_user();
create or replace trigger ops_location after insert or update on public.locations
  for each row when (not new.is_demo) execute function public.ops_on_location();
create or replace trigger ops_email after insert or update of status on public.emails
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_email();
create or replace trigger ops_payment after insert on public.payments
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_payment();
create or replace trigger ops_plan after insert or update of status on public.plans
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_plan();
create or replace trigger ops_publication after update of status on public.publications
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_publication();
create or replace trigger ops_concierge_task after insert or update of state on public.concierge_tasks
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_concierge_task();
create or replace trigger ops_card_order after insert or update of status on public.card_orders
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_card_order();
create or replace trigger ops_chat after insert or update of reported_at, status on public.chat_conversations
  for each row when (not public.is_demo_location(new.location_id) and not public.is_demo_user(new.user_id))
  execute function public.ops_on_chat();

-- Plans and billing: a demo business keeps its status (active) without a plan, a trial or a payment.
-- Same body as before plus the first check.
create or replace function public.refresh_location_status(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_paid boolean; v_new text;
begin
  if public.is_demo_location(p_location) then
    return (select status from public.locations where id = p_location);
  end if;
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

-- Metrics: the Slack daily digest leaves demo businesses and the demo login out of every count.
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
    'replies_posted', (select count(*) from public.publications, w where target_type = 'review_reply' and status in ('live','in_review') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'drafts_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and location_id not in (select id from d)),
    'urgent_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and urgency = 'urgent' and location_id not in (select id from d)),
    'posts_published', (select count(*) from public.publications, w where target_type = 'local_post' and status in ('live','in_review') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'shield_changes', (select count(*) from public.listing_changes, w where created_at > since and location_id not in (select id from d)),
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
    'publications_failed', (select count(*) from public.publications, w where updated_at > since and status = 'failed' and (location_id is null or location_id not in (select id from d))),
    'google_mode', (select value from public.app_settings where key = 'google_mode'),
    'slack_queue', (select count(*) from public.ops_events where sent_at is null)
  )
$$;

-- R-09: the concierge ceiling follows K-88 (20, not 30).
update public.app_settings set value = '20', updated_at = now() where key = 'concierge_cap';
