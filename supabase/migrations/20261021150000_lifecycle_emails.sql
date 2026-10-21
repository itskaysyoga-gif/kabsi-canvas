-- P0.4-10: behaviour-triggered lifecycle emails (G-25, G-24, G-30, K-101).
--
-- public.lifecycle_snapshots(now) is what the lifecycle job reads, for the service role only: for every business that is
-- new (created in the last 14 days) or in or just after a trial (trial started in the last 75 days, so the day-30
-- win-back is still in reach), one JSON object with the facts the rules need: its owners (the people the emails go to),
-- the owner's country, when access was asked for and granted, the entitlements state (private.entitlements, P0.4-06),
-- the trial dates, whether the owner gave marketing consent, how many replies are still waiting, and the recap counts.
-- The recap counts come only from the audit log (audit_events), never from a counter kept next to it: replies drafted,
-- replies sent to Google (a reply counts once however many events it left), posts sent, profile changes caught.
-- The rules themselves (which email is due when, who may get it) are in supabase/functions/_shared/lifecycle.ts, tested
-- with a clock that moves through a whole trial.
-- app_settings: lifecycle_emails ('off' until Hussein switches it on) and lifecycle_since (the moment it was switched on:
-- an event before it never sends an email); news_domain_verified ('off' until news.kabsi.co is verified in Resend: until then
-- the tip emails that go from it are not sent); signup_marketing_notice ('off' until the signup screen carries a clear
-- marketing notice: until then a win-back needs the owner's own yes in every country).
--
-- Additive: one function and two settings. Nothing is taken away and no row is changed.

insert into public.app_settings (key, value) values ('lifecycle_emails', 'off'), ('lifecycle_since', ''), ('news_domain_verified', 'off'), ('signup_marketing_notice', 'off')
  on conflict (key) do nothing;

create function public.lifecycle_snapshots(p_now timestamptz default now()) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j), '[]'::jsonb) from (
    select jsonb_build_object(
      'location_id', l.id,
      'organization_id', l.organization_id,
      'name', l.name,
      'time_zone', l.time_zone,
      'country', l.country,
      'status', l.status,
      'created_at', l.created_at,
      'consent_at', l.consent_at,
      'access_granted_at', l.access_granted_at,
      'entitlement', e2.ent ->> 'state',
      'trial_started_at', ts.trial_started_at,
      'trial_ends_at', ts.trial_ends_at,
      'owners', coalesce((select jsonb_agg(jsonb_build_object('user_id', o.user_id, 'email', o.email)) from public.notification_recipients(l.id, array['owner']) o where o.user_id is not null), '[]'::jsonb),
      'marketing_consent', exists (select 1 from public.contacts c where c.marketing_consent
                                    and lower(c.email) in (select o.email from public.notification_recipients(l.id, array['owner']) o)),
      'waiting_reviews', (select count(*) from public.reviews r where r.location_id = l.id and r.state in ('drafted', 'blocked')),
      'waiting_changes', (select count(*) from public.profile_changes c where c.location_id = l.id and c.status = 'awaiting_review'),
      'first_approval_at', (select min(e.created_at) from public.audit_events e where e.location_id = l.id and e.action = 'approval' and e.object_type = 'review_reply'),
      'recap', jsonb_build_object(
        'replies_prepared', (select count(*) from public.audit_events e where e.location_id = l.id and e.action = 'reply_drafted'
                               and e.created_at >= coalesce(ts.trial_started_at, l.created_at)),
        'replies_sent', (select count(distinct e.after ->> 'publication_id') from public.audit_events e where e.location_id = l.id and e.action = 'publication'
                           and e.object_type = 'review_reply' and e.result in ('live', 'in_review') and e.created_at >= coalesce(ts.trial_started_at, l.created_at)),
        'posts_sent', (select count(distinct e.after ->> 'publication_id') from public.audit_events e where e.location_id = l.id and e.action = 'publication'
                         and e.object_type = 'local_post' and e.result in ('live', 'in_review') and e.created_at >= coalesce(ts.trial_started_at, l.created_at)),
        'changes_caught', (select count(distinct e.object_id) from public.audit_events e where e.location_id = l.id and e.action = 'protection_change'
                             and e.result = 'awaiting_review' and e.created_at >= coalesce(ts.trial_started_at, l.created_at)))
    ) as j
    from public.locations l
    left join lateral (select s.trial_started_at, s.trial_ends_at from public.subscriptions s
                        where s.organization_id = l.organization_id and s.trial_started_at is not null
                        order by s.trial_started_at desc limit 1) ts on true
    cross join lateral (select private.entitlements(l.organization_id, l.id) as ent) e2
    where not l.is_demo and not l.concierge
      and (l.created_at > p_now - interval '14 days' or ts.trial_started_at > p_now - interval '75 days')
  ) x
$$;
revoke execute on function public.lifecycle_snapshots(timestamptz) from public, anon, authenticated;
grant execute on function public.lifecycle_snapshots(timestamptz) to service_role;
