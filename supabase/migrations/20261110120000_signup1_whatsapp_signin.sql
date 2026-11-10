-- Signup 1 (master plan 30.50 item 3, R-150): Continue with WhatsApp, the new sign-in notice, and the contact email.
--
-- 1. public.wa_signins: one row per WhatsApp sign-in started on kabsi.co. It keeps the code's hash, the hash of a secret
--    only the starting browser holds, the browser and system read from its user agent, and the approximate city and country
--    (never an IP address). The code lives 10 minutes and works once. The browser, system, city and country are shown to
--    the owner in the confirm message and are not kept: they are cleared when the sign-in is confirmed or ends. Rows are
--    deleted after a day.
-- 2. public.signin_notices: one row per new web session of an owner with WhatsApp connected, found by a scan of
--    auth.sessions every minute (a token refresh keeps its session, so it is never a new sign-in). The notice goes on
--    WhatsApp inside the 24 hour window, else by email. Rows are deleted after 30 days.
-- 3. public.account_contacts: the contact email an owner who signed up with WhatsApp gives in onboarding ("Where should
--    receipts go?"). Their sign-in address is a placeholder under wa.kabsi.co that is never mailed; notices use the contact
--    email instead.
-- The browser never reads or writes the first two tables: the auth-whatsapp and whatsapp Edge Functions use the
-- service-role functions below. Additive: three tables, functions, one cron job; notification_recipients is replaced with
-- the same answer for every existing owner.

create table public.wa_signins (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  browser_hash text not null check (browser_hash ~ '^[0-9a-f]{64}$'),
  browser text check (length(browser) <= 40),
  os text check (length(os) <= 40),
  city text check (length(city) <= 60),
  country text check (country ~ '^[A-Z]{2}$'),
  state text not null default 'waiting' check (state in ('waiting', 'asked', 'confirmed', 'used')),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  asked_at timestamptz,
  confirmed_at timestamptz,
  used_at timestamptz
);
comment on table public.wa_signins is
  'Signup 1 (30.50 item 3): WhatsApp sign-ins started on kabsi.co. Hashes only; no IP address. Service role only; deleted after a day.';
alter table public.wa_signins enable row level security;
revoke all on public.wa_signins from public, anon, authenticated;

create table public.signin_notices (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'new' check (state in ('new', 'sending', 'sent', 'emailed', 'skipped', 'failed', 'signed_out')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index signin_notices_new on public.signin_notices (created_at) where state = 'new';
comment on table public.signin_notices is
  'Signup 1 (30.50 item 3): the new sign-in notice for each new web session of an owner with WhatsApp connected. Service role only; deleted after 30 days.';
alter table public.signin_notices enable row level security;
revoke all on public.signin_notices from public, anon, authenticated;

create table public.account_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$' and email !~ '@wa\.kabsi\.co$'),
  set_at timestamptz not null default now()
);
comment on table public.account_contacts is
  'Signup 1 (30.50 item 3e): the contact email of an owner who signed up with WhatsApp. Their own row only, through set_contact_email.';
alter table public.account_contacts enable row level security;
revoke all on public.account_contacts from public, anon, authenticated;
grant select on public.account_contacts to authenticated;
create policy account_contacts_own on public.account_contacts for select to authenticated using (user_id = (select auth.uid()));

-- The sign-in address of an owner who signed up with WhatsApp. Never mailed.
create function private.is_whatsapp_email(p_email text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(lower(p_email) like '%@wa.kabsi.co', false)
$$;

-- ─── Continue with WhatsApp.

create function public.wa_signin_start(p_code_hash text, p_browser_hash text, p_browser text, p_os text, p_city text, p_country text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.wa_signins (code_hash, browser_hash, browser, os, city, country, expires_at)
  values (p_code_hash, p_browser_hash, left(p_browser, 40), left(p_os, 40), left(p_city, 60), p_country, now() + interval '10 minutes')
  returning id into v_id;
  return v_id;
end $$;

-- "Kabsi sign in CODE" from a phone: the first phone to send a live code claims it; any other phone, a used code or one past
-- its 10 minutes reads as unknown. The same phone sending it again gets the question again.
create function public.wa_signin_claim(p_code_hash text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.wa_signins;
begin
  if p_phone !~ '^\+[1-9][0-9]{6,14}$' then return jsonb_build_object('result', 'unknown'); end if;
  select * into r from public.wa_signins where code_hash = p_code_hash and expires_at > now() for update;
  if not found or not (r.state = 'waiting' or (r.state = 'asked' and r.phone = p_phone)) then
    return jsonb_build_object('result', 'unknown');
  end if;
  update public.wa_signins set state = 'asked', phone = p_phone, asked_at = coalesce(asked_at, now()) where id = r.id;
  return jsonb_build_object('result', 'asked', 'id', r.id, 'browser', r.browser, 'os', r.os, 'city', r.city);
end $$;

-- "Yes, it's me" from the phone that claimed the code, inside its 10 minutes. A phone already connected to a user signs that
-- user in. A new phone answers need_user; the Edge Function makes the user and calls again with it (a user made in the last
-- 10 minutes, with nothing connected yet). The opt-in is stored with the consent text shown beside the button.
create function public.wa_signin_confirm(p_id uuid, p_phone text, p_consent text, p_new_user uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.wa_signins; v_user uuid;
begin
  select * into r from public.wa_signins where id = p_id for update;
  if not found or r.state <> 'asked' or r.phone is distinct from p_phone or r.expires_at <= now() then
    return jsonb_build_object('result', 'unknown');
  end if;
  select user_id into v_user from public.whatsapp_optins where phone = p_phone and state in ('active', 'stopped');
  if v_user is null then
    if p_new_user is null then return jsonb_build_object('result', 'need_user'); end if;
    if not exists (select 1 from auth.users where id = p_new_user and created_at > now() - interval '10 minutes')
       or exists (select 1 from public.whatsapp_optins where user_id = p_new_user)
       or exists (select 1 from public.location_members where user_id = p_new_user) then
      return jsonb_build_object('result', 'unknown');
    end if;
    v_user := p_new_user;
  end if;
  -- The opt-in: sending the code from this phone and tapping Yes is the person's own opt-in (as a connect code is, 9.2).
  update public.whatsapp_optins set phone = null where phone = p_phone and user_id <> v_user;
  insert into public.whatsapp_optins as o (user_id, phone, state, consent_text, verified_at)
  values (v_user, p_phone, 'active', left(p_consent, 2000), now())
  on conflict (user_id) do update set phone = excluded.phone, state = 'active', stopped_at = null, updated_at = now(),
    verified_at = case when o.state = 'active' and o.phone = excluded.phone then o.verified_at else now() end,
    consent_text = case when o.state = 'active' and o.phone = excluded.phone then o.consent_text else excluded.consent_text end;
  insert into public.whatsapp_window (user_id, phone, last_inbound_at) values (v_user, p_phone, now())
  on conflict (user_id) do update set phone = excluded.phone, last_inbound_at = now();
  perform private.whatsapp_member_roles(p_phone, v_user);
  insert into public.whatsapp_conversations (phone) values (p_phone) on conflict (phone) do nothing;
  update public.whatsapp_conversations set stopped_at = null, updated_at = now() where phone = p_phone;
  update public.wa_signins set state = 'confirmed', user_id = v_user, confirmed_at = now(),
    browser = null, os = null, city = null, country = null where id = r.id;
  perform private.audit('user', v_user, 'whatsapp_signin_confirmed', null, 'user', v_user::text, null,
    jsonb_build_object('phone_last4', right(p_phone, 4), 'new_user', p_new_user is not null), 'whatsapp', 'confirmed');
  return jsonb_build_object('result', 'confirmed');
end $$;

-- The starting browser's check: by id and the hash of its own secret. A confirmed sign-in is spent here (it works once) and
-- answers its user, for the Edge Function to mint the session. Any other browser reads unknown.
create function public.wa_signin_check(p_id uuid, p_browser_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.wa_signins;
begin
  select * into r from public.wa_signins where id = p_id and browser_hash = p_browser_hash for update;
  if not found then return jsonb_build_object('result', 'unknown'); end if;
  if r.state = 'used' then return jsonb_build_object('result', 'used'); end if;
  if r.state = 'confirmed' then
    if r.confirmed_at < now() - interval '2 minutes' then return jsonb_build_object('result', 'expired'); end if;
    update public.wa_signins set state = 'used', used_at = now() where id = r.id;
    return jsonb_build_object('result', 'take', 'user_id', r.user_id);
  end if;
  if r.expires_at <= now() then return jsonb_build_object('result', 'expired'); end if;
  return jsonb_build_object('result', r.state);
end $$;

-- ─── The new sign-in notice.

-- Every minute: new web sessions (made after the owner connected WhatsApp) become notices; old rows go.
create function private.signin_notice_scan() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.wa_signins where created_at < now() - interval '1 day';
  update public.wa_signins set browser = null, os = null, city = null, country = null
   where expires_at <= now() and (browser is not null or os is not null or city is not null or country is not null);
  delete from public.signin_notices where created_at < now() - interval '30 days';
  -- A notice is news only while it is fresh: one not sent within 30 minutes is skipped, never sent late.
  update public.signin_notices set state = 'skipped' where state in ('new', 'sending') and created_at < now() - interval '30 minutes';
  insert into public.signin_notices (session_id, user_id, created_at)
  select s.id, s.user_id, s.created_at
    from auth.sessions s
    join public.whatsapp_optins o on o.user_id = s.user_id and o.state = 'active' and o.phone is not null
   where s.created_at > now() - interval '10 minutes' and s.created_at > coalesce(o.verified_at, now())
  on conflict (session_id) do nothing;
  if exists (select 1 from public.signin_notices where state = 'new') then
    perform public.call_internal('auth-whatsapp/notices');
  end if;
end $$;

create function public.signin_notices_claim(p_limit integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  with picked as (
    select id from public.signin_notices where state = 'new' or (state = 'sending' and attempts < 3 and created_at < now() - interval '5 minutes')
     order by created_at limit greatest(1, least(p_limit, 50)) for update skip locked
  ), c as (
    update public.signin_notices n set state = 'sending', attempts = n.attempts + 1 from picked where n.id = picked.id returning n.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'user_id', c.user_id, 'phone', o.phone, 'user_agent', left(s.user_agent, 512),
    'email', case when private.is_whatsapp_email(u.email) then ac.email else lower(u.email) end)), '[]'::jsonb) into v
    from c
    left join public.whatsapp_optins o on o.user_id = c.user_id and o.state = 'active'
    left join auth.sessions s on s.id = c.session_id
    left join auth.users u on u.id = c.user_id
    left join public.account_contacts ac on ac.user_id = c.user_id;
  return v;
end $$;

create function public.signin_notice_mark(p_id uuid, p_state text) returns void
language sql security definer set search_path = '' as $$
  update public.signin_notices set state = p_state, sent_at = case when p_state in ('sent', 'emailed') then now() else sent_at end
   where id = p_id and p_state in ('sent', 'emailed', 'skipped', 'failed')
$$;

-- "Sign me out everywhere" under a notice sent in the last 7 days, from the phone it was sent to: every session of that user ends.
create function public.signout_everywhere(p_notice uuid, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n public.signin_notices; v_count integer;
begin
  select n0.* into n from public.signin_notices n0
    join public.whatsapp_optins o on o.user_id = n0.user_id and o.phone = p_phone and o.state = 'active'
   where n0.id = p_notice and n0.state in ('sent', 'signed_out') and n0.created_at > now() - interval '7 days' for update of n0;
  if not found then return jsonb_build_object('result', 'unknown'); end if;
  delete from auth.sessions where user_id = n.user_id;
  get diagnostics v_count = row_count;
  update public.signin_notices set state = 'signed_out' where id = n.id;
  perform private.audit('user', n.user_id, 'signout_everywhere', null, 'user', n.user_id::text, null,
    jsonb_build_object('sessions', v_count, 'phone_last4', right(p_phone, 4)), 'whatsapp', 'done');
  return jsonb_build_object('result', 'done', 'sessions', v_count);
end $$;

-- ─── The contact email ("Where should receipts go?").

create function public.contact_email_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('needed', private.is_whatsapp_email(u.email), 'email', c.email)
    from auth.users u left join public.account_contacts c on c.user_id = u.id
   where u.id = (select auth.uid())
$$;

create function public.set_contact_email(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if v !~ '^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$' or private.is_whatsapp_email(v) then
    return jsonb_build_object('ok', false, 'error', 'bad_email');
  end if;
  insert into public.account_contacts (user_id, email) values (auth.uid(), v)
  on conflict (user_id) do update set email = excluded.email, set_at = now();
  perform private.audit('user', auth.uid(), 'contact_email_set', null, 'user', auth.uid()::text, null, null, 'dashboard', 'set');
  return jsonb_build_object('ok', true, 'email', v);
end $$;

-- The owners' and managers' addresses for email notices: an owner who signed up with WhatsApp gets their contact email, or no
-- email at all until they give one. Every other row is exactly as before.
create or replace function public.notification_recipients(p_location uuid, p_roles text[])
returns table(user_id uuid, email text, role text)
language sql stable security definer set search_path = '' as $$
  select u.id, lower(case when private.is_whatsapp_email(u.email) then c.email else u.email end), m.role
    from public.location_members m join auth.users u on u.id = m.user_id
    left join public.account_contacts c on c.user_id = u.id
   where m.location_id = p_location and m.role = any (p_roles) and u.email is not null and u.email <> ''
     and (not private.is_whatsapp_email(u.email) or c.email is not null)
  union all
  select null::uuid, lower(a.e), 'alert'
    from public.locations l, unnest(l.alert_emails) as a(e)
   where l.id = p_location and a.e <> ''
     and not exists (select 1 from public.location_members m2 join auth.users u2 on u2.id = m2.user_id
                      where m2.location_id = p_location and lower(u2.email) = lower(a.e))
$$;

revoke all on function public.wa_signin_start(text, text, text, text, text, text), public.wa_signin_claim(text, text),
  public.wa_signin_confirm(uuid, text, text, uuid), public.wa_signin_check(uuid, text), public.signin_notices_claim(integer),
  public.signin_notice_mark(uuid, text), public.signout_everywhere(uuid, text) from public, anon, authenticated;
grant execute on function public.wa_signin_start(text, text, text, text, text, text), public.wa_signin_claim(text, text),
  public.wa_signin_confirm(uuid, text, text, uuid), public.wa_signin_check(uuid, text), public.signin_notices_claim(integer),
  public.signin_notice_mark(uuid, text), public.signout_everywhere(uuid, text) to service_role;
revoke all on function public.contact_email_status(), public.set_contact_email(text) from public, anon;
grant execute on function public.contact_email_status(), public.set_contact_email(text) to authenticated;
revoke all on function private.signin_notice_scan(), private.is_whatsapp_email(text) from public, anon, authenticated;

select cron.schedule('kabsi_signin_notices', '* * * * *', $$select private.signin_notice_scan()$$);
