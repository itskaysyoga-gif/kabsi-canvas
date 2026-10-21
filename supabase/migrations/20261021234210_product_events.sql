-- P0.6-02 (G-28, G-31, G-32, G-44, K-55, K-76, K-127): product events from the server, and where a sign-up came from.
-- Additive.
--
-- 1. public.product_events: an outbox of PostHog events. Rows are written only by the database, from facts it holds:
--    the audit log (access granted, drafts, approvals, publications, decisions, details confirmed, backlog), new
--    accounts in auth.users and subscription changes. Access, publication and payment are never taken from the browser
--    (G-31). One row per source fact (source_key unique), so nothing is counted twice. Properties carry ids, counts,
--    channels and labels only: never review text, names, emails or Business Knowledge. Demo businesses send nothing;
--    nor do kabsi.co accounts (internal testers) while app_settings.events_internal is 'skip'.
-- 2. private.send_product_events(): every minute, up to 200 unsent rows go to PostHog's batch endpoint through pg_net.
--    A row whose call failed is sent again (up to 5 times); PostHog keeps one event per uuid.
-- 3. public.signup_attribution: first and last touch UTMs, fbclid, fbp, fbc and the via code, saved on the user once,
--    by public.save_signup_attribution() right after the first sign-in, checked and trimmed here. The via code (the
--    first-party via=CODE cookie, 60 days, last referral wins, K-127) is also written to the user's businesses.
--    Switch: app_settings.product_events ('on' or 'off'). It starts 'off' here so a local or CI database never sends;
--    production is switched on by the session that applies this file.

insert into public.app_settings (key, value) values ('product_events', 'off'), ('events_internal', 'skip')
on conflict (key) do nothing;

-- 1. The outbox -----------------------------------------------------------------------------------------------------

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event ~ '^[a-z]+(_[a-z]+)+$'),
  distinct_id text not null,
  location_id uuid,
  organization_id uuid,
  properties jsonb not null default '{}',
  source_key text not null unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  request_id bigint,
  attempts integer not null default 0
);
create index product_events_unsent_idx on public.product_events (created_at) where sent_at is null;
alter table public.product_events enable row level security;
revoke all on public.product_events from public, anon, authenticated;

-- A user counts as internal (not sent) when their address is a kabsi.co one and the switch says so.
create function private.internal_user(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.app_settings where key = 'events_internal'), 'skip') = 'skip'
     and coalesce((select lower(u.email) like '%@kabsi.co' from auth.users u where u.id = p_user), false)
$$;

-- Queue one event. Never raises: an analytics problem must never stop the action that caused it.
create function private.product_event(p_event text, p_user uuid, p_location uuid, p_props jsonb, p_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := p_user; v_org uuid;
begin
  if p_location is not null then
    if public.is_demo_location(p_location) then return; end if;
    select organization_id, coalesce(v_user, created_by) into v_org, v_user from public.locations where id = p_location;
  end if;
  if v_user is null or private.internal_user(v_user) then return; end if;
  insert into public.product_events (event, distinct_id, location_id, organization_id, properties, source_key)
  values (p_event, v_user::text, p_location, v_org,
    coalesce(p_props, '{}') || jsonb_strip_nulls(jsonb_build_object('location_id', p_location, 'organization_id', v_org,
      '$groups', case when p_location is not null then jsonb_build_object('business', p_location) end)),
    p_key)
  on conflict (source_key) do nothing;
exception when others then
  raise warning 'product_event % skipped: %', p_event, sqlerrm;
end $$;
revoke execute on function private.product_event(text, uuid, uuid, jsonb, text) from public;
revoke execute on function private.internal_user(uuid) from public;

-- From the audit log (G-31 and G-44 names exactly).
create function private.audit_product_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_key text := 'audit:' || new.id;
  v_user uuid := case when new.actor_type = 'user' then new.actor_id end;
  v_signup timestamptz;
  v_review public.reviews%rowtype;
  v_drafted timestamptz;
  v_text text;
  v_draft text;
begin
  if new.action = 'google_access_granted' then
    select u.created_at into v_signup from public.locations l join auth.users u on u.id = l.created_by where l.id = new.location_id;
    perform private.product_event('google_access_granted', null, new.location_id, jsonb_build_object(
      'route', coalesce(nullif(current_setting('kabsi.access_route', true), ''), 'manual'),
      'minutes_since_signup', case when v_signup is not null then floor(extract(epoch from (new.created_at - v_signup)) / 60)::int end), v_key);

  elsif new.action = 'reply_drafted' then
    select * into v_review from public.reviews where id::text = new.object_id;
    perform private.product_event('reply_draft_ready', null, new.location_id,
      jsonb_build_object('rating', v_review.star_rating, 'risk', v_review.risk), v_key);

  elsif new.action = 'approval' and new.object_type = 'review_reply' then
    select p.payload ->> 'text' into v_text from public.publications p where p.id::text = new.after ->> 'publication_id';
    select d.body, d.created_at into v_draft, v_drafted from public.reply_drafts d
      where d.review_id::text = new.object_id order by d.version desc limit 1;
    perform private.product_event('reply_approved', v_user, new.location_id, jsonb_build_object(
      'edited', case when v_text is not null and v_draft is not null then trim(v_text) <> trim(v_draft) end,
      'seconds_to_approve', case when v_drafted is not null then greatest(0, floor(extract(epoch from (new.created_at - v_drafted))))::int end,
      'channel', coalesce(new.channel, 'dashboard')), v_key);

  elsif new.action = 'publication' and new.result = 'live' and new.object_type in ('review_reply', 'local_post', 'photo') then
    perform private.product_event(case new.object_type when 'review_reply' then 'reply_published'
      when 'local_post' then 'post_published' else 'photo_published' end, null, new.location_id,
      jsonb_build_object('channel', coalesce(new.channel, 'dashboard')), v_key);

  elsif new.action = 'protection_change' and new.actor_type = 'user' and new.result in ('accepted', 'rejected') then
    perform private.product_event('profile_change_decided', v_user, new.location_id, jsonb_build_object(
      'field', new.after ->> 'field', 'decision', case new.result when 'accepted' then 'keep' else 'put_back' end,
      'channel', coalesce(new.channel, 'dashboard')), v_key);

  elsif new.action = 'details_confirmed' then
    perform private.product_event('details_confirmed', v_user, new.location_id,
      jsonb_build_object('changed_count', coalesce(jsonb_array_length(new.after -> 'changed'), 0)), v_key);

  elsif new.action = 'backlog_approved' then
    perform private.product_event('backlog_cleared', v_user, new.location_id,
      jsonb_build_object('count', coalesce((new.after ->> 'count')::int, 0)), v_key);
  end if;
  return null;
exception when others then
  raise warning 'audit_product_event skipped: %', sqlerrm;
  return null;
end $$;
create trigger audit_events_product after insert on public.audit_events
  for each row when (new.action in ('google_access_granted', 'reply_drafted', 'approval', 'publication',
    'protection_change', 'details_confirmed', 'backlog_approved'))
  execute function private.audit_product_event();

-- A new account (registration_completed with its method: google or email).
create function private.user_product_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.product_event('registration_completed', new.id, null, jsonb_build_object(
    'method', case when coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google' then 'google' else 'email' end),
    'user:' || new.id || ':registration');
  return null;
exception when others then
  return null;
end $$;
create trigger users_product_event after insert on auth.users
  for each row execute function private.user_product_event();

-- Payment changes, from the subscription row Creem's webhook writes (P0.4-07). No browser input.
create function private.subscription_product_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_loc uuid; v_key text := 'sub:' || new.id || ':' || extract(epoch from clock_timestamp())::bigint;
begin
  select m.user_id into v_user from public.organization_members m
    where m.organization_id = new.organization_id and m.role = 'owner' order by m.created_at limit 1;
  select l.id into v_loc from public.locations l where l.organization_id = new.organization_id order by l.created_at limit 1;
  if v_loc is not null and public.is_demo_location(v_loc) then return null; end if;
  if v_user is null or private.internal_user(v_user) then return null; end if;
  if old.state = 'trialing' and new.state = 'active' then
    perform private.product_event('trial_converted', v_user, v_loc,
      jsonb_build_object('plan', new.plan, 'period', new.period, 'currency', 'usd'), v_key || ':converted');
  end if;
  if new.state = 'past_due' and old.state is distinct from 'past_due' then
    perform private.product_event('payment_failed', v_user, v_loc, jsonb_build_object('plan', new.plan), v_key || ':failed');
  end if;
  if (new.cancel_at_period_end and not old.cancel_at_period_end)
     or (new.state = 'cancelled' and old.state is distinct from 'cancelled' and not old.cancel_at_period_end) then
    perform private.product_event('subscription_cancelled', v_user, v_loc, jsonb_build_object('plan', new.plan), v_key || ':cancelled');
  end if;
  return null;
exception when others then
  return null;
end $$;
create trigger subscriptions_product_event after update of state, cancel_at_period_end on public.subscriptions
  for each row execute function private.subscription_product_event();

-- 2. The sender -----------------------------------------------------------------------------------------------------

create function private.send_product_events() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_batch jsonb; v_ids uuid[]; v_req bigint;
begin
  if coalesce((select value from public.app_settings where key = 'product_events'), 'off') <> 'on' then return 0; end if;
  -- Calls that failed or timed out go back in the queue.
  update public.product_events e set sent_at = null, request_id = null
    from net._http_response r
    where e.request_id = r.id and e.sent_at is not null and e.attempts < 5
      and (r.timed_out or r.status_code is null or r.status_code >= 300);
  with picked as (
    select * from public.product_events where sent_at is null and attempts < 5
    order by created_at limit 200 for update skip locked
  )
  select jsonb_agg(jsonb_build_object('event', event, 'distinct_id', distinct_id, 'uuid', id,
           'timestamp', to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'properties', properties || jsonb_build_object('$lib', 'kabsi-server', 'source', 'server'))),
         array_agg(id)
    into v_batch, v_ids from picked;
  if v_ids is null then return 0; end if;
  select net.http_post(
    url := 'https://us.i.posthog.com/batch/',
    headers := jsonb_build_object('content-type', 'application/json'),
    -- PostHog's project key is public by design (it is in every page of kabsi.co, src/lib/telemetry.ts).
    body := jsonb_build_object('api_key', 'phc_rDzVWhoR2wSXyVHVMypztnf8YKHCszd9c9mryMv6W4mW', 'batch', v_batch),
    timeout_milliseconds := 10000) into v_req;
  update public.product_events set sent_at = now(), request_id = v_req, attempts = attempts + 1 where id = any (v_ids);
  return cardinality(v_ids);
end $$;
revoke execute on function private.send_product_events() from public;
select cron.schedule('kabsi_product_events', '* * * * *', $$select private.send_product_events()$$);

-- 3. Where a sign-up came from ----------------------------------------------------------------------------------------

create table public.signup_attribution (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_touch jsonb,
  last_touch jsonb,
  fbclid text,
  fbp text,
  fbc text,
  via_code text,
  via_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.signup_attribution enable row level security;
revoke all on public.signup_attribution from public, anon, authenticated;

alter table public.locations add column via_code text;

create function private.clean_touch(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select nullif(jsonb_strip_nulls(jsonb_build_object(
    'utm_source', substring(p ->> 'utm_source' from '^[A-Za-z0-9_.+-]{1,100}$'),
    'utm_medium', substring(p ->> 'utm_medium' from '^[A-Za-z0-9_.+-]{1,100}$'),
    'utm_campaign', substring(p ->> 'utm_campaign' from '^[A-Za-z0-9_.+-]{1,100}$'),
    'utm_content', substring(p ->> 'utm_content' from '^[A-Za-z0-9_.+-]{1,100}$'),
    'utm_term', substring(p ->> 'utm_term' from '^[A-Za-z0-9_.+ -]{1,100}$'),
    'landing', substring(p ->> 'landing' from '^/[A-Za-z0-9_./-]{0,199}$'),
    'referrer', substring(p ->> 'referrer' from '^[a-z0-9.-]{1,100}$'),
    'at', case when (p ->> 'at') ~ '^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$' then p ->> 'at' end)), '{}'::jsonb)
$$;

-- Called once by the browser right after the first sign-in. Saves nothing for an account older than a day or one
-- that already has its record, so a later visit never rewrites where the account came from.
create function public.save_signup_attribution(p jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_created timestamptz; v_via text; v_done boolean;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '1 day' then return false; end if;
  v_via := upper(substring(p ->> 'via' from '^[A-Za-z0-9_-]{2,40}$'));
  insert into public.signup_attribution (user_id, first_touch, last_touch, fbclid, fbp, fbc, via_code, via_at)
  values (v_uid, private.clean_touch(p -> 'first'), private.clean_touch(p -> 'last'),
    substring(p ->> 'fbclid' from '^[A-Za-z0-9_-]{1,500}$'),
    substring(p ->> 'fbp' from '^fb\.[0-9]\.[0-9]{10,16}\.[0-9]{1,30}$'),
    substring(p ->> 'fbc' from '^fb\.[0-9]\.[0-9]{10,16}\.[A-Za-z0-9_-]{1,500}$'),
    v_via, case when v_via is not null then now() end)
  on conflict (user_id) do nothing
  returning true into v_done;
  if v_via is not null then
    update public.locations set via_code = v_via where created_by = v_uid and via_code is null;
  end if;
  return coalesce(v_done, false);
end $$;
revoke execute on function public.save_signup_attribution(jsonb) from public, anon;
grant execute on function public.save_signup_attribution(jsonb) to authenticated;

-- A business created after the record was saved takes the same via code.
create function private.location_via_code() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.via_code is null and new.created_by is not null then
    select a.via_code into new.via_code from public.signup_attribution a where a.user_id = new.created_by;
  end if;
  return new;
end $$;
create trigger locations_via_code before insert on public.locations
  for each row execute function private.location_via_code();
