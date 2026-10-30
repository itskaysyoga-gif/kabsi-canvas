-- Scope 1 part 2 (30 Oct 2026, master plan 30.19 section 3 items 2 to 4): the timestamps and tables the three activation
-- measures, the staff evidence log and the validation figures read.
--   1. publications.verified_at: when Kabsi first saw the change live on Google (no existing column says it: last_checked_at
--      moves on every check). Set once by a trigger when the state becomes 'verified'. B and C end here.
--   2. locations.free_check_before_signup_at: a free check finished before the business signed up, stored apart (acquisition
--      value). Set by a trigger when a check is linked to a business. It is never the end of measure A.
--   3. locations.slow_start_alert_at: the one staff alert for a business whose first verified value (B) has not landed 48
--      hours after Google access was confirmed (claimed once, private.claim_slow_start).
--   4. public.staff_evidence: the staff evidence log, staff only, written through staff_evidence_add (staff) or by the
--      assistant function with the service role. Kept 24 months (private.retention_sources_apply).
--   5. private.activation_rows(), public.staff_activation(), public.staff_validation(): the three measures per business and
--      the validation figures, staff only.
-- Additive only: alter add, create, create or replace, comment, grant, revoke.

-- 1. publications.verified_at -----------------------------------------------------------------------------------------
alter table public.publications add column if not exists verified_at timestamptz;
comment on column public.publications.verified_at is
  'Scope 1: when Kabsi first saw this change live on Google (state became verified). Measures B and C end here.';
create or replace function private.publication_verified_at() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.state = 'verified' and new.verified_at is null then new.verified_at := now(); end if;
  return new;
end $$;
revoke all on function private.publication_verified_at() from public, anon, authenticated;
create or replace trigger publications_verified_at before insert or update of state on public.publications
  for each row when (new.state = 'verified') execute function private.publication_verified_at();

-- 2. A free check finished before sign-up, stored apart -------------------------------------------------------------------
alter table public.locations add column if not exists free_check_before_signup_at timestamptz;
comment on column public.locations.free_check_before_signup_at is
  'Scope 1: when the first free check finished, if it finished before this business signed up (created_at). Acquisition value; never the end of measure A.';
create or replace function private.record_precheck() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.location_id is not null and new.done_at is not null then
    update public.locations l
       set free_check_before_signup_at = least(coalesce(l.free_check_before_signup_at, new.done_at), new.done_at)
     where l.id = new.location_id and new.done_at < l.created_at;
  end if;
  return new;
end $$;
revoke all on function private.record_precheck() from public, anon, authenticated;
create or replace trigger free_checks_precheck after insert or update of location_id, done_at on public.free_checks
  for each row execute function private.record_precheck();

-- 3. The slow start alert, claimed once ---------------------------------------------------------------------------------------
alter table public.locations add column if not exists slow_start_alert_at timestamptz;
comment on column public.locations.slow_start_alert_at is
  'Scope 1: set once when the staff WhatsApp alert for a first verified value (B) not landed 48 hours after access was sent.';

-- 4. The staff evidence log ---------------------------------------------------------------------------------------------
-- One row per observation: the business, the date, the source, a type, and the owner's own words where there are some.
-- Staff only (public.is_staff(), as the other staff tables). Staff add and delete rows through the functions below; the
-- assistant function writes with the service role when a hand-off to a person is about something Kabsi does not do.
-- Kept 24 months (private.retention_sources_apply, privacy page, facts).
create table if not exists public.staff_evidence (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations (id) on delete set null,
  business_name text check (business_name is null or char_length(btrim(business_name)) between 1 and 200),
  observed_on date not null default current_date,
  source text not null check (source in ('call', 'whatsapp', 'email', 'nora', 'meeting', 'other')),
  type text not null check (type in ('request', 'repeated_problem', 'time_saved', 'missed_enquiry', 'support_given')),
  words text check (words is null or char_length(words) <= 1000),
  created_by uuid,
  created_at timestamptz not null default now(),
  check (location_id is not null or business_name is not null)
);
create index if not exists staff_evidence_day_idx on public.staff_evidence (observed_on desc);
create index if not exists staff_evidence_location_idx on public.staff_evidence (location_id) where location_id is not null;
alter table public.staff_evidence enable row level security;
revoke all on public.staff_evidence from public, anon, authenticated;
grant select on public.staff_evidence to authenticated;
grant select, insert on public.staff_evidence to service_role;
create policy staff_evidence_read on public.staff_evidence for select to authenticated using (public.is_staff());
comment on table public.staff_evidence is
  'Scope 1 (30.19 section 3 item 3): what staff observe and what owners say (requests for what Kabsi does not do, repeated problems, time saved, missed enquiries or sales, support given). Staff only; deleted 24 months after it was written.';

create or replace function public.staff_evidence_add(p_location uuid, p_business text, p_observed_on date, p_source text, p_type text, p_words text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.staff_evidence (location_id, business_name, observed_on, source, type, words, created_by)
  values (p_location, nullif(btrim(p_business), ''), coalesce(p_observed_on, current_date), p_source, p_type,
          nullif(btrim(p_words), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.staff_evidence_add(uuid, text, date, text, text, text) from public, anon;
grant execute on function public.staff_evidence_add(uuid, text, date, text, text, text) to authenticated;

create or replace function public.staff_evidence_delete(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.staff_evidence where id = p_id;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.staff_evidence_delete(uuid) from public, anon;
grant execute on function public.staff_evidence_delete(uuid) to authenticated;

-- 5. The three activation measures, per business ----------------------------------------------------------------------------
-- Each is one recorded timestamp to another (30.19 section 3 item 2). Demo and test accounts are left out.
--   A: sign-up (locations.created_at) to the first verified finding or useful result produced after sign-up: the first unanswered
--      review Kabsi read (reviews.created_at), the first change found on the profile (profile_changes.detected_at) or the first
--      free check finished after sign-up (free_checks.done_at). Strictly after sign-up, so a free check finished before
--      sign-up (locations.free_check_before_signup_at) never ends A and A is never zero or negative because of it.
--   B: Google access confirmed (locations.access_granted_at) to the first verified value: the first change Kabsi saw live on
--      Google (publications.verified_at), or the first task an owner or manager closed as done where Google cannot show it
--      (a profile change or gap, or a Google action, with no publication; tasks.resolved_at).
--   C: Google access confirmed to the first owner-approved action Kabsi saw live on Google (publications.verified_at where the
--      owner approved this action: every channel but auto_fix, which the owner switched on once and approves nothing one by one).
-- A finding never counts as B or C. Cohort: founding for a Founding 25 place accepted for the organisation, else paying.
create or replace function private.activation_rows()
returns table (location_id uuid, business text, cohort text, organization_id uuid, signup_at timestamptz, access_at timestamptz,
               free_check_before_signup_at timestamptz, a_at timestamptz, b_at timestamptz, c_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id, l.name,
    case when exists (select 1 from public.founding_applications f where f.organization_id = l.organization_id and f.status = 'accepted')
         then 'founding' else 'paying' end,
    l.organization_id, l.created_at, l.access_granted_at, l.free_check_before_signup_at,
    (select min(x.t) from (
        select min(r.created_at) as t from public.reviews r
         where r.location_id = l.id and r.created_at > l.created_at and r.existing_reply is null and r.content_purged_at is null
        union all
        select min(c.detected_at) from public.profile_changes c where c.location_id = l.id and c.detected_at > l.created_at
        union all
        select min(k.done_at) from public.free_checks k where k.location_id = l.id and k.state = 'done' and k.done_at > l.created_at
     ) x),
    case when l.access_granted_at is null then null else (select min(y.t) from (
        select min(p.verified_at) as t from public.publications p
         where p.location_id = l.id and p.verified_at is not null and p.verified_at >= l.access_granted_at
        union all
        select min(k.resolved_at) from public.tasks k
         where k.location_id = l.id and k.state = 'done' and k.publication_id is null and k.resolved_at >= l.access_granted_at
           and k.kind in ('profile_change', 'profile_gap', 'google_needs_action')
           and exists (select 1 from public.location_members m
                        where m.location_id = k.location_id and m.user_id = k.resolved_by and m.role in ('owner', 'manager'))
     ) y) end,
    case when l.access_granted_at is null then null else (select min(p.verified_at) from public.publications p
         where p.location_id = l.id and p.channel <> 'auto_fix' and p.verified_at is not null and p.verified_at >= l.access_granted_at) end
  from public.locations l
  join public.organizations o on o.id = l.organization_id
  where not l.is_demo and not o.is_demo and not coalesce(o.billing_test, false)
$$;
revoke all on function private.activation_rows() from public, anon, authenticated;

create or replace function private.hours_between(p_from timestamptz, p_to timestamptz) returns numeric
language sql immutable set search_path = '' as $$
  select case when p_from is null or p_to is null then null else round(extract(epoch from (p_to - p_from)) / 3600.0, 1) end
$$;
revoke all on function private.hours_between(timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.staff_activation() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'location_id', r.location_id, 'business', r.business, 'cohort', r.cohort,
      'signup_at', r.signup_at, 'access_at', r.access_at,
      'free_check_before_signup_at', r.free_check_before_signup_at,
      'a_at', r.a_at, 'b_at', r.b_at, 'c_at', r.c_at,
      'a_hours', private.hours_between(r.signup_at, r.a_at),
      'b_hours', private.hours_between(r.access_at, r.b_at),
      'c_hours', private.hours_between(r.access_at, r.c_at)) order by r.signup_at desc)
    from private.activation_rows() r), '[]'::jsonb);
end $$;
revoke all on function public.staff_activation() from public, anon;
grant execute on function public.staff_activation() to authenticated;

-- 6. The slow start: one staff alert per business -------------------------------------------------------------------------------
-- A business whose Google access was confirmed 48 hours ago (and less than 14 days ago) with no first verified value (B),
-- and with real work waiting: a task that needs the owner's yes, or a change sent to Google and not yet seen there. Claimed
-- once (locations.slow_start_alert_at); the WhatsApp tick sends the alert to the staff phones with the existing template.
create or replace function public.slow_start_due(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  with due as (
    select r.location_id, r.business,
      case
        when exists (select 1 from public.tasks t where t.location_id = r.location_id and t.state = 'open'
                        and t.kind in ('review_reply', 'post', 'profile_change', 'photo_batch', 'hours_confirm', 'knowledge_confirm'))
          then 'the owner''s yes on ' || (select case t.kind when 'review_reply' then 'a reply' when 'post' then 'a post'
                    when 'profile_change' then 'a profile change' when 'photo_batch' then 'photos' when 'hours_confirm' then 'the opening hours'
                    else 'a fact about the business' end
                  from public.tasks t where t.location_id = r.location_id and t.state = 'open'
                   and t.kind in ('review_reply', 'post', 'profile_change', 'photo_batch', 'hours_confirm', 'knowledge_confirm')
                  order by t.created_at limit 1)
        when exists (select 1 from public.publications p where p.location_id = r.location_id
                        and p.state in ('approved', 'publishing', 'published', 'checking', 'verifying'))
          then 'the read-back from Google'
        else null end as step
      from private.activation_rows() r
      join public.locations l on l.id = r.location_id
     where r.access_at is not null and r.access_at < now() - interval '48 hours' and r.access_at > now() - interval '14 days'
       and r.b_at is null and l.slow_start_alert_at is null and l.access_lost_at is null
     order by r.access_at
  ), picked as (
    select * from due where step is not null limit greatest(least(coalesce(p_limit, 20), 100), 1)
  ), claimed as (
    update public.locations l set slow_start_alert_at = now() from picked p
     where l.id = p.location_id and l.slow_start_alert_at is null
    returning l.id
  )
  select coalesce(jsonb_agg(jsonb_build_object('location_id', p.location_id, 'business', p.business, 'step', p.step)), '[]'::jsonb)
    into v from picked p join claimed c on c.id = p.location_id;
  return v;
end $$;
revoke all on function public.slow_start_due(integer) from public, anon, authenticated;
grant execute on function public.slow_start_due(integer) to service_role;

-- 7. The validation figures (30.19 section 3 item 4) ---------------------------------------------------------------------------
-- Two cohorts apart: founding (Founding 25, free) and paying (trial, then a plan). Counts, A, B and C (median and slowest, in
-- hours, with a free check before sign-up apart), weekly approvals, retention by month, trial to paid, support effort per
-- account. Money from verified Creem events only (billing_events, live mode): MRR, cash by month, contribution margin.
-- A figure whose events or costs do not reconcile is {"status": "no_data"}, never an estimate.
create or replace function private.hours_stat(p_vals numeric[]) returns jsonb
language sql immutable set search_path = '' as $$
  select case when coalesce(cardinality(p_vals), 0) = 0
    then jsonb_build_object('n', 0, 'median', null, 'slowest', null)
    else jsonb_build_object('n', cardinality(p_vals),
      'median', round((select percentile_cont(0.5) within group (order by v) from unnest(p_vals) v)::numeric, 1),
      'slowest', (select max(v) from unnest(p_vals) v)) end
$$;
revoke all on function private.hours_stat(numeric[]) from public, anon, authenticated;

create or replace function private.cohort_figures(p_cohort text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  with r as (select * from private.activation_rows() where cohort = p_cohort),
  kept as (  -- still with Kabsi now: active, access not lost or removed, no deletion requested
    select r.location_id, r.access_at from r join public.locations l on l.id = r.location_id
     where l.status = 'active' and l.access_lost_at is null and l.access_removed_at is null and l.deletion_requested_at is null
  ),
  trials as (
    select r.organization_id, s.trial_ends_at from r join public.subscriptions s on s.organization_id = r.organization_id
     where s.trial_started_at is not null group by r.organization_id, s.trial_ends_at
  )
  select jsonb_build_object(
    'businesses', (select count(*) from r),
    'access_confirmed', (select count(*) from r where access_at is not null),
    'free_check_before_signup', (select count(*) from r where free_check_before_signup_at is not null),
    'a', private.hours_stat((select array_agg(private.hours_between(signup_at, a_at)) from r where a_at is not null)),
    'a_after_a_free_check', private.hours_stat((select array_agg(private.hours_between(signup_at, a_at)) from r where a_at is not null and free_check_before_signup_at is not null)),
    'a_with_no_free_check', private.hours_stat((select array_agg(private.hours_between(signup_at, a_at)) from r where a_at is not null and free_check_before_signup_at is null)),
    'b', private.hours_stat((select array_agg(private.hours_between(access_at, b_at)) from r where b_at is not null)),
    'c', private.hours_stat((select array_agg(private.hours_between(access_at, c_at)) from r where c_at is not null)),
    'approvals_last_7_days', (select count(*) from public.publications p join r on r.location_id = p.location_id
                               where p.channel <> 'auto_fix' and p.approved_at > now() - interval '7 days'),
    'businesses_approving_last_7_days', (select count(distinct p.location_id) from public.publications p join r on r.location_id = p.location_id
                               where p.channel <> 'auto_fix' and p.approved_at > now() - interval '7 days'),
    'weekly_approvals', coalesce((select jsonb_agg(jsonb_build_object('week', q.w, 'approvals', q.n, 'businesses', q.b) order by q.w)
        from (select date_trunc('week', p.approved_at)::date as w, count(*) as n, count(distinct p.location_id) as b
                from public.publications p join r on r.location_id = p.location_id
               where p.channel <> 'auto_fix' and p.approved_at > now() - interval '8 weeks' group by 1) q), '[]'::jsonb),
    'retention', jsonb_build_object(
      'month_1', jsonb_build_object('eligible', (select count(*) from r where access_at <= now() - interval '1 month'),
                                    'still_with_kabsi', (select count(*) from kept where access_at <= now() - interval '1 month')),
      'month_2', jsonb_build_object('eligible', (select count(*) from r where access_at <= now() - interval '2 months'),
                                    'still_with_kabsi', (select count(*) from kept where access_at <= now() - interval '2 months')),
      'month_3', jsonb_build_object('eligible', (select count(*) from r where access_at <= now() - interval '3 months'),
                                    'still_with_kabsi', (select count(*) from kept where access_at <= now() - interval '3 months'))),
    'trials_ended', (select count(*) from trials where trial_ends_at < now()),
    'trials_paid', (select count(*) from trials t where t.trial_ends_at < now() and exists (
        select 1 from public.billing_events e where e.organization_id = t.organization_id and e.mode = 'live' and e.event_type = 'subscription.paid')),
    'handoffs_to_a_person', (select count(*) from public.chat_conversations c join r on r.location_id = c.location_id where c.status = 'handoff')
        + (select count(*) from public.whatsapp_conversations w where w.handoff_at is not null and exists (
            select 1 from public.phone_roles pr join r on r.location_id = pr.location_id where pr.phone = w.phone and pr.revoked_at is null)),
    'support_rows', (select count(*) from public.staff_evidence e join r on r.location_id = e.location_id where e.type = 'support_given')
  ) into v;
  return v;
end $$;
revoke all on function private.cohort_figures(text) from public, anon, authenticated;

-- Money. USD only; test mode and demo accounts left out.
create or replace function private.money_figures() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_mrr jsonb; v_cash jsonb; v_margin jsonb;
  v_subs integer; v_unmatched integer; v_other_currency integer; v_mrr_cents numeric;
begin
  -- MRR: each active paid live subscription (the plan and each extra location's own subscription) at its latest paid event,
  -- a yearly one divided by 12. Trials, Founding 25, ended and unpaid subscriptions are not active paid ones.
  with live as (
    select s.provider_subscription_id as psid, s.period from public.subscriptions s
      join public.organizations o on o.id = s.organization_id
     where s.state = 'active' and s.mode = 'live' and s.plan <> 'free' and not coalesce(o.billing_test, false) and not o.is_demo
    union all
    select x.provider_subscription_id, x.period from public.billing_extras x
      join public.organizations o on o.id = x.organization_id
     where x.state = 'active' and x.mode = 'live' and not coalesce(o.billing_test, false) and not o.is_demo
  ), paid as (
    select l.psid, l.period, e.amount, e.currency from live l
      left join lateral (select e.amount, e.currency from public.billing_events e
                          where e.provider_subscription_id = l.psid and e.event_type = 'subscription.paid' and e.mode = 'live' and e.amount is not null
                          order by e.event_created_at desc limit 1) e on true
  )
  select count(*), count(*) filter (where amount is null), count(*) filter (where amount is not null and coalesce(currency, '') <> 'USD'),
         sum(amount / case period when 'year' then 12.0 else 1.0 end) filter (where amount is not null and currency = 'USD')
    into v_subs, v_unmatched, v_other_currency, v_mrr_cents from paid;
  v_mrr := case when v_unmatched > 0 or v_other_currency > 0 then jsonb_build_object('status', 'no_data', 'subscriptions', v_subs)
                else jsonb_build_object('status', 'ok', 'subscriptions', v_subs, 'usd_per_month', round(coalesce(v_mrr_cents, 0) / 100.0, 2)) end;

  -- Cash by month (live): each payment once by its payment id; refunds and chargebacks from their own events. A payment
  -- with no payment id, an amount in another currency, or a refund or chargeback with no business makes the month no_data.
  with ev as (
    select date_trunc('month', e.event_created_at)::date as month, e.event_type, e.payment_id, e.amount, e.currency, e.organization_id
      from public.billing_events e
     where e.mode = 'live' and e.event_type in ('subscription.paid', 'checkout.completed', 'refund.created', 'dispute.created')
       and e.event_created_at > now() - interval '12 months'
  ), pay as (
    select distinct on (payment_id) month, amount, currency, organization_id from ev
     where event_type in ('subscription.paid', 'checkout.completed') and amount is not null and payment_id is not null
     order by payment_id, month
  ), months as (select distinct month from ev)
  select coalesce(jsonb_agg(jsonb_build_object('month', m.month,
        'status', case when exists (select 1 from ev where ev.month = m.month and (ev.amount is null or coalesce(ev.currency, '') <> 'USD'
                                      or (ev.event_type in ('subscription.paid', 'checkout.completed') and ev.payment_id is null)
                                      or (ev.event_type in ('refund.created', 'dispute.created') and ev.organization_id is null)))
                   then 'no_data' else 'ok' end,
        'payments_usd', (select round(sum(p.amount) / 100.0, 2) from pay p where p.month = m.month),
        'refunds_usd', (select round(coalesce(sum(ev.amount), 0) / 100.0, 2) from ev where ev.month = m.month and ev.event_type = 'refund.created'),
        'chargebacks_usd', (select round(coalesce(sum(ev.amount), 0) / 100.0, 2) from ev where ev.month = m.month and ev.event_type = 'dispute.created'))
      order by m.month), '[]'::jsonb)
    into v_cash from months m;
  -- A no_data month shows no amounts.
  v_cash := coalesce((select jsonb_agg(case when x ->> 'status' = 'no_data'
      then jsonb_build_object('month', x -> 'month', 'status', 'no_data') else x end) from jsonb_array_elements(v_cash) x), '[]'::jsonb);

  -- Contribution margin per paying account: cash collected, less refunds and chargebacks, less the cost per business already
  -- measured (AI use by agent, free check data cost). Tax and Creem's fees are not in the events, so they are not taken off,
  -- and the figure says so. An account with an unreconciled event shows no_data.
  select coalesce(jsonb_agg(row_to_json(q)::jsonb order by q.business), '[]'::jsonb) into v_margin from (
    select l.name as business, o.id as organization_id,
      case when bad.n > 0 then 'no_data' else 'ok' end as status,
      case when bad.n > 0 then null else round(coalesce(pay.cents, 0) / 100.0, 2) end as cash_usd,
      case when bad.n > 0 then null else round(coalesce(rf.cents, 0) / 100.0, 2) end as refunds_and_chargebacks_usd,
      case when bad.n > 0 then null else round(coalesce(cost.micros, 0) / 1000000.0, 2) end as cost_usd,
      case when bad.n > 0 then null else round((coalesce(pay.cents, 0) - coalesce(rf.cents, 0)) / 100.0 - coalesce(cost.micros, 0) / 1000000.0, 2) end as margin_usd,
      'before tax and Creem fees' as basis
    from public.organizations o
    join lateral (select l.* from public.locations l where l.organization_id = o.id order by l.created_at limit 1) l on true
    left join lateral (select sum(a.amount)::numeric as cents from (select distinct on (e.payment_id) e.amount from public.billing_events e
        where e.organization_id = o.id and e.mode = 'live' and e.event_type in ('subscription.paid', 'checkout.completed') and e.amount is not null and e.payment_id is not null
        order by e.payment_id, e.event_created_at) a) pay on true
    left join lateral (select sum(e.amount)::numeric as cents from public.billing_events e
        where e.organization_id = o.id and e.mode = 'live' and e.event_type in ('refund.created', 'dispute.created')) rf on true
    left join lateral (select coalesce((select sum(u.cost_micros) from public.ai_agent_usage u join public.locations x on x.id = u.location_id where x.organization_id = o.id), 0)
                              + coalesce((select sum(k.cost_micros) from public.free_checks k join public.locations x on x.id = k.location_id where x.organization_id = o.id), 0) as micros) cost on true
    left join lateral (select count(*)::int as n from public.billing_events e where e.organization_id = o.id and e.mode = 'live'
        and ((e.event_type in ('subscription.paid', 'checkout.completed') and (e.amount is null or e.payment_id is null))
          or (e.amount is not null and coalesce(e.currency, '') <> 'USD')
          or (e.event_type in ('refund.created', 'dispute.created') and e.amount is null))) bad on true
    where not coalesce(o.billing_test, false) and not o.is_demo
      and exists (select 1 from public.billing_events e where e.organization_id = o.id and e.mode = 'live' and e.event_type in ('subscription.paid', 'checkout.completed'))
  ) q;
  return jsonb_build_object('mrr', v_mrr, 'cash_by_month', v_cash, 'margin_per_account', v_margin);
end $$;
revoke all on function private.money_figures() from public, anon, authenticated;

create or replace function public.staff_validation() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('generated_at', now(),
    'founding', private.cohort_figures('founding'), 'paying', private.cohort_figures('paying'), 'money', private.money_figures());
end $$;
revoke all on function public.staff_validation() from public, anon;
grant execute on function public.staff_validation() to authenticated;

-- 8. Retention: the evidence log is deleted 24 months after it was written (private.retention_sources, switched on).
create or replace function private.retention_sources_apply() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := '{}'::jsonb; n integer;
  d_found_dec constant int := 90; d_found_wait constant int := 180; d_partner constant int := 90;
  d_jobs constant int := 30; d_events constant int := 90; d_product constant int := 30; d_ops constant int := 90;
  d_follow constant int := 180; d_notes constant int := 366; d_ai constant int := 366; d_log constant int := 60;
  d_lost int := coalesce(private.retention_days('google_data_after_access_lost'), 7);
begin
  delete from public.founding_applications
   where coalesce(delete_after, decided_at + make_interval(days => case status when 'declined' then d_found_dec else d_found_wait end))
         < now()
     and status in ('declined', 'waitlisted');
  get diagnostics n = row_count; v := v || jsonb_build_object('founding_applications', n);

  delete from public.partner_accounts
   where status = 'declined' and coalesce(delete_after, decided_at + make_interval(days => d_partner)) < now()
     -- A partner with any money record is kept (payment records follow tax law, not this rule).
     and not exists (select 1 from public.partner_referrals r where r.partner_id = partner_accounts.id)
     and not exists (select 1 from public.partner_commissions c where c.partner_id = partner_accounts.id)
     and not exists (select 1 from public.partner_payouts o where o.partner_id = partner_accounts.id);
  get diagnostics n = row_count; v := v || jsonb_build_object('partner_applications', n);

  delete from public.jobs where state in ('succeeded', 'dead', 'failed')
     and coalesce(finished_at, created_at) < now() - make_interval(days => d_jobs);
  get diagnostics n = row_count; v := v || jsonb_build_object('jobs', n);

  delete from public.google_events where received_at < now() - make_interval(days => d_events);
  get diagnostics n = row_count; v := v || jsonb_build_object('google_events', n);

  delete from public.product_events where created_at < now() - make_interval(days => d_product)
     and (sent_at is not null or created_at < now() - make_interval(days => d_product * 2));
  get diagnostics n = row_count; v := v || jsonb_build_object('product_events', n);

  delete from public.whatsapp_number_health where checked_at < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('number_health', n);
  delete from public.invitation_lookups where checked_at < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('invitation_lookups', n);
  delete from public.whatsapp_actions where coalesce(used_at, expires_at) < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('whatsapp_buttons', n);
  delete from public.webhook_rejections where hour < now() - make_interval(days => d_ops);

  delete from public.staff_followups where done_at < now() - make_interval(days => d_follow);
  get diagnostics n = row_count; v := v || jsonb_build_object('staff_followups', n);

  delete from public.notifications where created_at < now() - make_interval(days => d_notes);
  get diagnostics n = row_count; v := v || jsonb_build_object('notifications', n);

  delete from public.ai_runs where created_at < now() - make_interval(days => d_ai);
  get diagnostics n = row_count; v := v || jsonb_build_object('ai_runs', n);

  -- The photo files of a business that left: due now; the photo_files job removes them from Storage.
  update public.photos p set file_due_at = now()
    from public.locations l
   where l.id = p.location_id and p.file_due_at is null and p.file_deleted_at is null
     and ((l.access_removed_at < now() - make_interval(days => d_lost) and (l.access_granted_at is null or l.access_granted_at < l.access_removed_at))
       or (l.access_lost_at < now() - make_interval(days => d_lost) and l.access_granted_at is null));
  get diagnostics n = row_count; v := v || jsonb_build_object('photo_files_due', n);
  if n > 0 then
    insert into public.jobs (kind, location_id, dedupe_key) values ('photo_files', null, 'photo_files')
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing;
  end if;

  delete from public.deletion_log where deleted_at < now() - make_interval(days => d_log);
  get diagnostics n = row_count; v := v || jsonb_build_object('deletion_log', n);

  -- Scope 1 (30.19): a WhatsApp message is deleted 12 months after it was sent (received, for an incoming one).
  -- Nothing younger is touched. The outbox needs no block: private.whatsapp_tick() already deletes its rows after 30 days
  -- and clear_sent_alert_texts() blanks a sent text after one day, both sooner than 12 months.
  delete from public.whatsapp_messages where created_at < now() - interval '12 months';
  get diagnostics n = row_count; v := v || jsonb_build_object('whatsapp_messages', n);

  -- Scope 1 (30.19): the staff evidence log is kept 24 months.
  delete from public.staff_evidence where created_at < now() - interval '24 months';
  get diagnostics n = row_count; v := v || jsonb_build_object('staff_evidence', n);

  return v;
end $$;
revoke all on function private.retention_sources_apply() from public, anon, authenticated;
