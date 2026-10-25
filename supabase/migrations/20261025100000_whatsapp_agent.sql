-- Session 13b part 1: the WhatsApp agent (master plan 9.1 to 9.7, 18.2, 25.5, 29.7). Additive only. Builds on the owner
-- channel of 20261022034000 (opt-in by code, STOP, the window, approve and undo through the one pipeline).
--   1. phone_roles: every phone resolves to its roles (prospect, owner, manager, staff, partner, staff_admin; no row
--      means unknown). RLS: a signed-in person reads only their own rows, staff read all, nobody writes from the browser.
--   2. whatsapp_conversations: one state per phone (active role and business, open question, language, the 24-hour
--      window, the scan code, the partner code and the Click-to-WhatsApp referral data).
--   3. whatsapp_messages keeps the phone and, until the message is handled, its parsed payload (cleared once handled).
--   4. whatsapp_outbox: the one sender's queue (6 business-started messages a day, quiet hours, 15-minute batching,
--      digests, the 24-hour window, the live allow-list until launch).
--   5. whatsapp_staff_codes: the one-time staff code that binds a phone as staff_admin.
--   6. whatsapp_number_health: the hourly read of the number's health and quality.
--   7. The webhook secret in Supabase Vault (never in code or logs).
--   8. The functions the `whatsapp` Edge Function calls (service role only) and the tick that wakes it.
-- The foreign keys (on delete) are in 20261025100010_whatsapp_agent_links.sql (R-44).

-- 1. phone_roles
create table public.phone_roles (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  role text not null check (role in ('prospect', 'owner', 'manager', 'staff', 'partner', 'staff_admin')),
  user_id uuid,
  location_id uuid,
  partner_id uuid,
  source text not null check (source in ('code', 'staff_code', 'membership', 'scan', 'partner_code')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint phone_roles_business check ((role in ('owner', 'manager', 'staff')) = (location_id is not null)),
  constraint phone_roles_member check (role not in ('owner', 'manager', 'staff', 'staff_admin') or user_id is not null),
  constraint phone_roles_partner check (role <> 'partner' or partner_id is not null)
);
create unique index phone_roles_one on public.phone_roles (phone, role,
  coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(partner_id, '00000000-0000-0000-0000-000000000000'::uuid)) where revoked_at is null;
create index phone_roles_phone on public.phone_roles (phone) where revoked_at is null;
create index phone_roles_user on public.phone_roles (user_id) where revoked_at is null;
alter table public.phone_roles enable row level security;
revoke all on public.phone_roles from anon, authenticated;
grant select on public.phone_roles to authenticated;
create policy phone_roles_read_own on public.phone_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- 2. One conversation state per phone (9.2).
create table public.whatsapp_conversations (
  phone text primary key check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  active_role text check (active_role in ('business', 'partner', 'staff')),
  active_location_id uuid,
  open_question jsonb,
  language text check (language ~ '^[a-z]{2}$'),
  last_task jsonb,
  last_inbound_at timestamptz,
  window_expires_at timestamptz,
  stopped_at timestamptz,
  handoff_at timestamptz,
  abuse_notice_at timestamptz,
  scan_code text check (scan_code ~ '^KAB-[A-Z0-9]{8,12}$'),
  scan_code_at timestamptz,
  partner_code text check (partner_code ~ '^P-[A-Z0-9]{3,20}$'),
  partner_code_at timestamptz,
  -- 20.3: the Click-to-WhatsApp referral (ctwa_clid, source_id, source_type, source_url, ad ids); first and last touch.
  referral_first jsonb,
  referral_last jsonb,
  referral_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_conversations enable row level security;
revoke all on public.whatsapp_conversations from anon, authenticated;

-- 3. Inbound messages are stored once (by WhatsApp message id); the payload stays only until the message is handled.
alter table public.whatsapp_messages add column phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  add column payload jsonb, add column processed_at timestamptz, add column attempts smallint not null default 0,
  add column result text check (length(result) <= 80);
create index whatsapp_messages_unhandled on public.whatsapp_messages (created_at)
  where direction = 'in' and processed_at is null;

-- 4. The one sender's queue.
create table public.whatsapp_outbox (
  id bigint generated always as identity primary key,
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  user_id uuid,
  location_id uuid,
  kind text not null check (kind ~ '^[a-z][a-z_]*$'),
  body text not null check (length(body) between 1 and 4096),
  buttons jsonb not null default '[]'::jsonb,
  template jsonb,
  urgent boolean not null default false,
  state text not null default 'queued' check (state in ('queued', 'sending', 'sent', 'mock_sent', 'held', 'digested',
                                                         'failed', 'dropped')),
  due_at timestamptz not null default now(),
  dedupe_key text unique,
  provider_id text,
  error text check (length(error) <= 500),
  attempts smallint not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index whatsapp_outbox_due on public.whatsapp_outbox (due_at) where state in ('queued', 'held');
create index whatsapp_outbox_phone on public.whatsapp_outbox (phone, created_at desc);
alter table public.whatsapp_outbox enable row level security;
revoke all on public.whatsapp_outbox from anon, authenticated;

-- 5. The one-time staff code (29.7): made by a signed-in staff member, sent from the staff phone.
create table public.whatsapp_staff_codes (
  code_hash text primary key,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_phone text
);
alter table public.whatsapp_staff_codes enable row level security;
revoke all on public.whatsapp_staff_codes from anon, authenticated;

-- 6. The hourly number health read (9.5). No secrets, no message content.
create table public.whatsapp_number_health (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  status text not null check (length(status) <= 40),
  quality text check (length(quality) <= 40),
  messaging text check (length(messaging) <= 40),
  tier text check (length(tier) <= 40),
  detail jsonb not null default '{}'::jsonb
);
create index whatsapp_number_health_recent on public.whatsapp_number_health (checked_at desc);
alter table public.whatsapp_number_health enable row level security;
revoke all on public.whatsapp_number_health from anon, authenticated;

-- Settings: phones that may get a live message before launch (Kabsi's own test phones; staff_admin phones always may),
-- and the launch switch for everyone else (25.5 ladder: "owners switched on").
insert into public.app_settings (key, value) values
  ('whatsapp_live_phones', '[]'),
  ('whatsapp_owners_on', 'false')
on conflict (key) do nothing;

-- 7. The webhook secret Kapso returns, kept in Supabase Vault (read with public.internal_secret).
create or replace function public.whatsapp_set_webhook_secret(p_secret text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if length(coalesce(p_secret, '')) < 16 then raise exception 'bad_secret'; end if;
  select id into v_id from vault.secrets where name = 'kapso_webhook_secret';
  if v_id is null then
    perform vault.create_secret(p_secret, 'kapso_webhook_secret', 'Kapso webhook signing secret (session 13b part 1)');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
  return true;
end $$;

-- 8. Functions.

-- The local hour and day of a phone's time zone: the business's for an owner, Beirut for staff, else UTC.
create or replace function private.whatsapp_phone_tz(p_phone text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select l.time_zone from public.phone_roles r join public.whatsapp_conversations c on c.phone = r.phone
      join public.locations l on l.id = coalesce(c.active_location_id, r.location_id)
      where r.phone = p_phone and r.revoked_at is null and r.location_id is not null and l.time_zone is not null limit 1),
    (select 'Asia/Beirut' from public.phone_roles r where r.phone = p_phone and r.role = 'staff_admin' and r.revoked_at is null limit 1),
    'UTC')
$$;

-- Who this phone is (29.7). Business roles count only while the membership exists and the phone's opt-in is active, so
-- removing a manager stops their phone at once; staff_admin only while the person is still staff.
create or replace function public.whatsapp_resolve(p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'phone', p_phone,
    'roles', coalesce((
      select jsonb_agg(x order by x ->> 'kind', x ->> 'business') from (
        select jsonb_build_object('kind', 'business', 'role', m.role, 'user_id', r.user_id, 'location_id', l.id,
          'business', l.name, 'time_zone', l.time_zone, 'country', l.country, 'status', l.status,
          'pro', coalesce((private.feature_plan(l.id) ->> 'pro')::boolean, false)) x
          from public.phone_roles r
          join public.location_members m on m.user_id = r.user_id and m.location_id = r.location_id
          join public.locations l on l.id = r.location_id
          join public.whatsapp_optins o on o.user_id = r.user_id and o.phone = r.phone and o.state = 'active'
         where r.phone = p_phone and r.revoked_at is null and r.role in ('owner', 'manager', 'staff')
           and l.deletion_requested_at is null
        union all
        select jsonb_build_object('kind', 'staff_admin', 'role', 'staff_admin', 'user_id', r.user_id)
          from public.phone_roles r join public.staff s on s.user_id = r.user_id
         where r.phone = p_phone and r.revoked_at is null and r.role = 'staff_admin'
        union all
        select jsonb_build_object('kind', 'partner', 'role', 'partner', 'partner_id', r.partner_id)
          from public.phone_roles r where r.phone = p_phone and r.revoked_at is null and r.role = 'partner'
        union all
        select jsonb_build_object('kind', 'prospect', 'role', 'prospect')
          from public.phone_roles r where r.phone = p_phone and r.revoked_at is null and r.role = 'prospect'
         limit 50) q), '[]'::jsonb),
    'conversation', (select to_jsonb(c) from public.whatsapp_conversations c where c.phone = p_phone))
$$;

-- An inbound message, once (9.1): a repeat of a WhatsApp message id does nothing. Opens the 24-hour window for the phone,
-- and for an opted-in person also in the owner channel's window. Keeps the referral data of a Click-to-WhatsApp chat.
create or replace function public.whatsapp_inbound_store(p_phone text, p_provider_id text, p_kind text, p_payload jsonb,
  p_referral jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; o public.whatsapp_optins;
begin
  if p_phone !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'bad_phone'; end if;
  if p_provider_id is null or length(p_provider_id) < 3 then raise exception 'provider_id_required'; end if;
  select * into o from public.whatsapp_optins where phone = p_phone and state = 'active';
  insert into public.whatsapp_messages (user_id, direction, kind, state, provider_id, phone, payload)
  values (o.user_id, 'in', coalesce(nullif(regexp_replace(lower(coalesce(p_kind, '')), '[^a-z_]', '', 'g'), ''), 'other'),
    'received', p_provider_id, p_phone, p_payload)
  on conflict (provider_id) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('duplicate', true); end if;
  insert into public.whatsapp_conversations as c (phone, last_inbound_at, window_expires_at, referral_first, referral_last,
    referral_at)
  values (p_phone, now(), now() + interval '24 hours', p_referral, p_referral, case when p_referral is not null then now() end)
  on conflict (phone) do update set last_inbound_at = now(), window_expires_at = now() + interval '24 hours',
    referral_first = coalesce(c.referral_first, excluded.referral_first),
    referral_last = coalesce(excluded.referral_last, c.referral_last),
    referral_at = coalesce(excluded.referral_at, c.referral_at), updated_at = now();
  if o.user_id is not null then
    insert into public.whatsapp_window (user_id, phone, last_inbound_at) values (o.user_id, p_phone, now())
    on conflict (user_id) do update set phone = excluded.phone, last_inbound_at = now();
  end if;
  return jsonb_build_object('duplicate', false, 'id', v_id);
end $$;

-- A handled message: the payload is dropped, only the outcome stays.
create or replace function public.whatsapp_inbound_done(p_id uuid, p_result text) returns void
language sql security definer set search_path = '' as $$
  update public.whatsapp_messages set processed_at = now(), payload = null, result = left(p_result, 80), updated_at = now()
   where id = p_id and direction = 'in'
$$;

-- Messages the background step did not finish (a crash, a cold restart): tried once more by the tick, never twice.
create or replace function public.whatsapp_inbound_retry(p_limit integer default 20) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (
    select id from public.whatsapp_messages
     where direction = 'in' and processed_at is null and payload is not null and attempts < 1
       and created_at < now() - interval '90 seconds' and created_at > now() - interval '1 day'
     order by created_at limit p_limit for update skip locked)
  update public.whatsapp_messages m set attempts = attempts + 1, updated_at = now()
    from due where m.id = due.id
  returning jsonb_build_object('id', m.id, 'payload', m.payload);
  -- Older than a day: given up, payload dropped.
  update public.whatsapp_messages set processed_at = now(), payload = null, result = 'expired'
   where direction = 'in' and processed_at is null and created_at <= now() - interval '1 day';
end $$;

-- The conversation fields the agent may set (9.2).
create or replace function public.whatsapp_conversation_set(p_phone text, p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.whatsapp_conversations (phone) values (p_phone) on conflict (phone) do nothing;
  update public.whatsapp_conversations set
    active_role = case when p_patch ? 'active_role' then p_patch ->> 'active_role' else active_role end,
    active_location_id = case when p_patch ? 'active_location_id' then (p_patch ->> 'active_location_id')::uuid else active_location_id end,
    open_question = case when p_patch ? 'open_question' then nullif(p_patch -> 'open_question', 'null'::jsonb) else open_question end,
    language = case when p_patch ? 'language' then p_patch ->> 'language' else language end,
    last_task = case when p_patch ? 'last_task' then nullif(p_patch -> 'last_task', 'null'::jsonb) else last_task end,
    stopped_at = case when p_patch ? 'stopped' then (case when (p_patch ->> 'stopped')::boolean then now() end) else stopped_at end,
    handoff_at = case when p_patch ? 'handoff' then (case when (p_patch ->> 'handoff')::boolean then now() end) else handoff_at end,
    abuse_notice_at = case when p_patch ? 'abuse_notice' then now() else abuse_notice_at end,
    updated_at = now()
   where phone = p_phone;
end $$;

-- A scan code (24.8) or a partner code (29.4) in a message: kept on the conversation; the phone becomes a prospect.
create or replace function public.whatsapp_attach_code(p_phone text, p_scan_code text, p_partner_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.whatsapp_conversations (phone) values (p_phone) on conflict (phone) do nothing;
  update public.whatsapp_conversations set
    scan_code = coalesce(upper(p_scan_code), scan_code),
    scan_code_at = case when p_scan_code is not null then now() else scan_code_at end,
    partner_code = coalesce(upper(p_partner_code), partner_code),
    partner_code_at = case when p_partner_code is not null then now() else partner_code_at end,
    updated_at = now()
   where phone = p_phone;
  insert into public.phone_roles (phone, role, source)
  values (p_phone, 'prospect', case when p_scan_code is not null then 'scan' else 'partner_code' end)
  on conflict do nothing;
end $$;

-- The roles a bound person's memberships give their phone.
create or replace function private.whatsapp_member_roles(p_phone text, p_user uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  insert into public.phone_roles (phone, role, user_id, location_id, source)
  select p_phone, m.role, p_user, m.location_id, 'membership' from public.location_members m where m.user_id = p_user
  on conflict do nothing;
  get diagnostics v_n = row_count;
  -- An older phone of the same person stops being theirs (a changed phone needs a new code, 9.2).
  update public.phone_roles set revoked_at = now()
   where user_id = p_user and phone <> p_phone and revoked_at is null and role in ('owner', 'manager', 'staff');
  return v_n;
end $$;

-- Binding by one-time code (9.2). "KABSI 123456" from Connect WhatsApp binds an owner, manager or staff phone;
-- "STAFF ABCD2345" from the staff page binds the staff phone as staff_admin (and the staff member's own businesses).
create or replace function public.whatsapp_bind(p_phone text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb; v_user uuid; s public.whatsapp_staff_codes; v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if p_phone !~ '^\+[1-9][0-9]{6,14}$' then return jsonb_build_object('result', 'bad_phone'); end if;
  if v_code ~ '^STAFF[A-Z0-9]{8}$' then
    select * into s from public.whatsapp_staff_codes where code_hash = private.whatsapp_hash(substr(v_code, 6))
       and used_at is null and expires_at > now() for update;
    if not found or not exists (select 1 from public.staff where user_id = s.created_by) then
      return jsonb_build_object('result', 'unknown_code');
    end if;
    update public.whatsapp_staff_codes set used_at = now(), used_phone = p_phone where code_hash = s.code_hash;
    update public.phone_roles set revoked_at = now() where role = 'staff_admin' and user_id = s.created_by and phone <> p_phone and revoked_at is null;
    insert into public.phone_roles (phone, role, user_id, source) values (p_phone, 'staff_admin', s.created_by, 'staff_code')
    on conflict do nothing;
    -- The staff member's own businesses come with the phone, through the same opt-in as any owner.
    if exists (select 1 from public.location_members where user_id = s.created_by)
       and not exists (select 1 from public.whatsapp_optins where phone = p_phone and user_id <> s.created_by and state = 'active') then
      update public.whatsapp_optins set phone = null where phone = p_phone and user_id <> s.created_by;
      insert into public.whatsapp_optins as o (user_id, phone, state, consent_text, verified_at)
      values (s.created_by, p_phone, 'active', 'Staff phone bound with a one-time staff code from the staff page.', now())
      on conflict (user_id) do update set phone = excluded.phone, state = 'active', verified_at = now(), stopped_at = null,
        updated_at = now();
      perform private.whatsapp_member_roles(p_phone, s.created_by);
    end if;
    perform private.audit('user', s.created_by, 'whatsapp_optin', null, 'user', s.created_by::text, null,
      jsonb_build_object('phone_last4', right(p_phone, 4), 'role', 'staff_admin'), 'whatsapp', 'staff_admin');
    return jsonb_build_object('result', 'staff_admin', 'user_id', s.created_by);
  end if;
  if v_code !~ '^(KABSI(CODE)?:?)?[0-9]{6}$' then return jsonb_build_object('result', 'unknown_code'); end if;
  v := public.whatsapp_verify(p_phone, right(v_code, 6));
  if v ->> 'result' <> 'verified' then return v; end if;
  v_user := (v ->> 'user_id')::uuid;
  perform private.whatsapp_member_roles(p_phone, v_user);
  update public.whatsapp_conversations set stopped_at = null, updated_at = now() where phone = p_phone;
  return jsonb_build_object('result', 'verified', 'user_id', v_user,
    'first_owner_locations', coalesce((select jsonb_agg(m.location_id) from public.location_members m
      where m.user_id = v_user and m.role = 'owner'), '[]'::jsonb));
end $$;

-- A new membership of a bound person gives their phone the role at once; a removed one takes it away at once.
create or replace function private.whatsapp_membership_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.phone_roles (phone, role, user_id, location_id, source)
    select o.phone, new.role, new.user_id, new.location_id, 'membership'
      from public.whatsapp_optins o where o.user_id = new.user_id and o.state = 'active' and o.phone is not null
    on conflict do nothing;
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.role <> new.role) then
    update public.phone_roles set revoked_at = now()
     where user_id = old.user_id and location_id = old.location_id and role = old.role and revoked_at is null;
  end if;
  return null;
end $$;
create trigger location_members_whatsapp_roles after insert or update of role or delete on public.location_members
  for each row execute function private.whatsapp_membership_sync();

-- The staff page: one staff code, shown once, for 15 minutes.
create or replace function public.whatsapp_staff_code() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 31), 1), '') into v_code
    from (select extensions.gen_random_bytes(8) as b) r, generate_series(0, 7) i;
  insert into public.whatsapp_staff_codes (code_hash, created_by, expires_at)
  values (private.whatsapp_hash(v_code), auth.uid(), now() + interval '15 minutes');
  return jsonb_build_object('code', 'STAFF ' || v_code, 'expires_at', now() + interval '15 minutes');
end $$;

-- Does this token belong to this phone (25.5)? Lets an old or foreign button answer kindly instead of staying silent.
create or replace function public.whatsapp_token_owner(p_token text, p_phone text) returns text
language sql stable security definer set search_path = '' as $$
  select case when a.id is null then 'unknown'
              when o.phone is distinct from p_phone then 'not_yours'
              when not exists (select 1 from public.location_members m where m.location_id = a.location_id and m.user_id = a.user_id) then 'not_yours'
              else 'mine' end
    from (select 1) one
    left join public.whatsapp_actions a on a.token_hash = private.whatsapp_hash(p_token)
    left join public.whatsapp_optins o on o.user_id = a.user_id
$$;

-- What is waiting for a Yes from this phone: the open Approve buttons sent in the last 72 hours whose item has not
-- changed. A typed "yes" with two of them gets "Which one?" (25.5).
create or replace function public.whatsapp_open_items(p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('token', t.token, 'kind', t.kind, 'business', l.name, 'location_id', l.id)
           order by t.created_at desc), '[]'::jsonb)
    from (select distinct on (substr(b ->> 'id', 3)) substr(b ->> 'id', 3) token, ob.kind, ob.created_at
            from public.whatsapp_outbox ob, jsonb_array_elements(ob.buttons) b
           where ob.phone = p_phone and ob.created_at > now() - interval '72 hours' and b ->> 'id' like 'a:%'
             and ob.state in ('sent', 'mock_sent')) t
    join public.whatsapp_actions a on a.token_hash = private.whatsapp_hash(t.token)
    join public.locations l on l.id = a.location_id
   where a.used_at is null and a.expires_at > now()
     and (private.whatsapp_item(a.target_type, a.target_id) ->> 'ok')::boolean
     and private.whatsapp_item(a.target_type, a.target_id) ->> 'hash' = a.draft_hash
$$;

-- An exact reply typed by the owner (9.3 "set exact text"): saved as the owner's own draft version, then shown back
-- with Approve. Nothing reaches Google until the Yes.
create or replace function public.whatsapp_owner_draft(p_user uuid, p_review uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.reviews; v_ver integer; v_text text := trim(coalesce(p_text, ''));
begin
  if length(v_text) < 2 or length(v_text) > 4000 then return jsonb_build_object('ok', false, 'reason', 'bad_text'); end if;
  select * into r from public.reviews where id = p_review for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_target'); end if;
  if not exists (select 1 from public.location_members where location_id = r.location_id and user_id = p_user
                   and role in ('owner', 'manager')) then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;
  if r.state <> 'drafted' then return jsonb_build_object('ok', false, 'reason', 'not_draft'); end if;
  select coalesce(max(version), 0) + 1 into v_ver from public.reply_drafts where review_id = r.id;
  insert into public.reply_drafts (review_id, version, body, source, instruction, safety_ok)
  values (r.id, v_ver, v_text, 'owner', 'Exact text from WhatsApp', true);
  return jsonb_build_object('ok', true, 'version', v_ver, 'location_id', r.location_id);
end $$;

-- "stats": the last N days of reviews for one business (9.3).
create or replace function public.whatsapp_stats(p_location uuid, p_days integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'new_reviews', count(*) filter (where coalesce(review_created_at, created_at) > now() - make_interval(days => p_days)),
    'answered', count(*) filter (where coalesce(review_created_at, created_at) > now() - make_interval(days => p_days)
                                   and state = 'posted'),
    'waiting', count(*) filter (where state in ('new', 'drafted', 'blocked')),
    'average', round(avg(star_rating) filter (where coalesce(review_created_at, created_at) > now() - make_interval(days => p_days)), 1))
  from public.reviews where location_id = p_location
$$;

-- The review link of a business (an active link card), for "review link" and "QR".
create or replace function public.whatsapp_review_link(p_location uuid) returns text
language sql stable security definer set search_path = '' as $$
  select code from public.cards where location_id = p_location and kind = 'link' and status = 'active'
   order by activated_at desc nulls last limit 1
$$;

-- The sender's view of one phone (9.5): business-started messages today (local day), the last one, the window,
-- STOP, the live allow-list until launch, and the number's quality (Medium or worse: digests only).
create or replace function public.whatsapp_send_state(p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with tz as (select private.whatsapp_phone_tz(p_phone) tz),
  h as (select quality from public.whatsapp_number_health order by checked_at desc limit 1)
  select jsonb_build_object(
    'time_zone', tz.tz,
    'sent_today', (select count(*) from public.whatsapp_outbox o where o.phone = p_phone and o.state in ('sent', 'mock_sent')
                     and o.kind <> 'reply' and (o.sent_at at time zone tz.tz)::date = (now() at time zone tz.tz)::date),
    'last_sent_at', (select max(o.sent_at) from public.whatsapp_outbox o where o.phone = p_phone and o.state in ('sent', 'mock_sent')
                       and o.kind <> 'reply'),
    'window_expires_at', c.window_expires_at,
    'stopped', c.stopped_at is not null,
    'live_ok', coalesce((select value = 'true' from public.app_settings where key = 'whatsapp_owners_on'), false)
               or exists (select 1 from jsonb_array_elements_text(coalesce((select value from public.app_settings
                            where key = 'whatsapp_live_phones'), '[]')::jsonb) p where p = p_phone)
               or exists (select 1 from public.phone_roles r join public.staff s on s.user_id = r.user_id
                           where r.phone = p_phone and r.role = 'staff_admin' and r.revoked_at is null),
    'digest_only', coalesce((select upper(quality) in ('YELLOW', 'MEDIUM', 'RED', 'LOW') from h), false))
  from tz left join public.whatsapp_conversations c on c.phone = p_phone
$$;

create or replace function public.whatsapp_outbox_add(p_phone text, p_user uuid, p_location uuid, p_kind text, p_body text,
  p_buttons jsonb, p_template jsonb, p_urgent boolean, p_dedupe text, p_due_at timestamptz default now()) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  -- "pause <business>" (9.9): a paused business gets nothing but urgent messages.
  if not coalesce(p_urgent, false) and p_kind <> 'reply' and exists (select 1 from public.locations
       where id = p_location and emails_paused_until > now()) then
    return null;
  end if;
  insert into public.whatsapp_outbox (phone, user_id, location_id, kind, body, buttons, template, urgent, dedupe_key, due_at)
  values (p_phone, p_user, p_location, p_kind, left(p_body, 4096), coalesce(p_buttons, '[]'::jsonb), p_template,
    coalesce(p_urgent, false), p_dedupe, coalesce(p_due_at, now()))
  on conflict (dedupe_key) do nothing returning id into v_id;
  return v_id;
end $$;

create or replace function public.whatsapp_outbox_mark(p_ids bigint[], p_state text, p_provider_id text default null,
  p_error text default null, p_due_at timestamptz default null) returns void
language sql security definer set search_path = '' as $$
  update public.whatsapp_outbox set state = p_state, provider_id = coalesce(p_provider_id, provider_id),
    error = left(p_error, 500), due_at = coalesce(p_due_at, due_at), attempts = attempts + case when p_state = 'failed' or p_error like 'send:%' then 1 else 0 end,
    sent_at = case when p_state in ('sent', 'mock_sent') then now() else sent_at end
   where id = any (p_ids)
$$;

-- Due messages, claimed (sending) so two ticks never send the same one.
create or replace function public.whatsapp_outbox_claim(p_limit integer default 50) returns setof public.whatsapp_outbox
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (select id from public.whatsapp_outbox where state in ('queued', 'held') and due_at <= now()
                order by urgent desc, due_at limit p_limit for update skip locked)
  update public.whatsapp_outbox o set state = 'sending' from due where o.id = due.id returning o.*;
end $$;

-- Rows of one phone, for a digest item the person opened by its number.
create or replace function public.whatsapp_outbox_get(p_phone text, p_ids bigint[]) returns setof public.whatsapp_outbox
language sql stable security definer set search_path = '' as $$
  select * from public.whatsapp_outbox where phone = p_phone and id = any (p_ids) order by id
$$;

-- Every held message of a phone: when the owner writes, the window opens and they are delivered (9.1 point 4).
create or replace function public.whatsapp_outbox_release(p_phone text) returns integer
language sql security definer set search_path = '' as $$
  with u as (update public.whatsapp_outbox set due_at = now()
              where phone = p_phone and state = 'held' and error = 'outside_window' returning 1)
  select count(*)::integer from u
$$;

-- 18.2: the owners and managers to tell when Google needs action on a business, and when it is cleared. Read from the
-- task session 19's record_google_state creates (kind google_needs_action, evidence.action); a message already queued
-- for a person and that action is not queued again, so a changed action is told once more.
create or replace function public.whatsapp_google_action_due() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('task_id', t.id, 'location_id', t.location_id, 'business', l.name,
           'cleared', t.resolved_at is not null, 'evidence', coalesce(t.evidence, '{}'::jsonb) || coalesce(t.proposed_action, '{}'::jsonb),
           'title', t.title, 'phone', o.phone, 'user_id', o.user_id)), '[]'::jsonb)
    from public.tasks t
    join public.locations l on l.id = t.location_id
    join public.location_members m on m.location_id = t.location_id and m.role in ('owner', 'manager')
    join public.whatsapp_optins o on o.user_id = m.user_id and o.state = 'active' and o.phone is not null
   where t.kind = 'google_needs_action' and t.created_at > now() - interval '3 days'
     and (t.state = 'open' or t.resolved_at > now() - interval '3 days')
     and not exists (select 1 from public.whatsapp_outbox ob where ob.dedupe_key =
           'gna:' || t.id || ':' || case when t.resolved_at is null then coalesce(t.evidence ->> 'action', 'open') else 'cleared' end || ':' || o.user_id)
$$;

-- The hourly health read: kept, and a drop in quality or a block is an ops event (the email goes to hello@kabsi.co).
create or replace function public.whatsapp_health_record(p_status text, p_quality text, p_messaging text, p_tier text,
  p_detail jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_prev text; v_bad boolean;
begin
  select quality into v_prev from public.whatsapp_number_health order by checked_at desc limit 1;
  insert into public.whatsapp_number_health (status, quality, messaging, tier, detail)
  values (left(coalesce(p_status, 'unknown'), 40), left(p_quality, 40), left(p_messaging, 40), left(p_tier, 40),
    coalesce(p_detail, '{}'::jsonb));
  delete from public.whatsapp_number_health where checked_at < now() - interval '90 days';
  v_bad := upper(coalesce(p_quality, '')) in ('YELLOW', 'MEDIUM', 'RED', 'LOW')
        or upper(coalesce(p_messaging, '')) in ('LIMITED', 'BLOCKED') or p_status in ('unhealthy', 'error');
  if v_bad and upper(coalesce(v_prev, '')) is distinct from upper(coalesce(p_quality, '')) then
    perform public.ops_emit('whatsapp_number', 'alerts', 'WhatsApp number health changed',
      'Status ' || coalesce(p_status, '?') || ', quality ' || coalesce(p_quality, '?') || ', messaging ' || coalesce(p_messaging, '?'),
      '[]'::jsonb, '[]'::jsonb, 'whatsapp_number:' || to_char(now(), 'YYYY-MM-DD-HH24'));
  end if;
  return jsonb_build_object('bad', v_bad, 'changed', upper(coalesce(v_prev, '')) is distinct from upper(coalesce(p_quality, '')));
end $$;

-- The staff commands (9.9): "status", "waiting", "today". Counts only, no customer content.
create or replace function public.whatsapp_staff_numbers() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'jobs_failed_1h', (select count(*) from public.jobs where state in ('failed', 'dead') and finished_at > now() - interval '1 hour'),
    'jobs_waiting', (select count(*) from public.jobs where state in ('pending', 'retrying') and next_run_at < now() - interval '10 minutes'),
    'publications_stuck', (select count(*) from public.publications where state in ('approved', 'publishing')
                             and created_at < now() - interval '30 minutes'),
    'handoffs', (select count(*) from public.whatsapp_conversations where handoff_at > now() - interval '2 days'),
    'outbox_held', (select count(*) from public.whatsapp_outbox where state = 'held'),
    'signups_today', (select count(*) from public.locations where created_at > date_trunc('day', now() at time zone 'Asia/Beirut') at time zone 'Asia/Beirut'),
    'reviews_answered_today', (select count(*) from public.publications where target_type = 'review_reply' and state in ('published', 'verified')
                                 and created_at > date_trunc('day', now() at time zone 'Asia/Beirut') at time zone 'Asia/Beirut'),
    'number_quality', (select quality from public.whatsapp_number_health order by checked_at desc limit 1),
    'number_checked_at', (select checked_at from public.whatsapp_number_health order by checked_at desc limit 1))
$$;

-- "pause <business>" (9.9): stops business-started sends for one business; "resume <business>" turns them back on.
create or replace function public.whatsapp_staff_pause(p_name text, p_pause boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_names text[];
begin
  select array_agg(id), array_agg(name) into v_ids, v_names from (
    select id, name from public.locations where name ilike '%' || replace(replace(trim(p_name), '%', ''), '_', '') || '%'
     order by name limit 5) q;
  if coalesce(array_length(v_ids, 1), 0) <> 1 then
    return jsonb_build_object('ok', false, 'matches', coalesce(to_jsonb(v_names), '[]'::jsonb));
  end if;
  update public.locations set emails_paused_until = case when p_pause then now() + interval '30 days' else null end
   where id = v_ids[1];
  update public.whatsapp_outbox set state = 'dropped', error = 'paused_by_staff'
   where p_pause and location_id = v_ids[1] and state in ('queued', 'held') and not urgent;
  return jsonb_build_object('ok', true, 'business', v_names[1]);
end $$;

-- The tick (pg_cron every minute): wakes the function only when something is due, like private.dispatch_tick.
create or replace function private.whatsapp_tick() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.whatsapp_outbox where created_at < now() - interval '30 days';
  if exists (select 1 from public.whatsapp_outbox where state in ('queued', 'held') and due_at <= now())
     or exists (select 1 from public.whatsapp_messages where direction = 'in' and processed_at is null and payload is not null
                  and attempts < 1 and created_at < now() - interval '90 seconds')
     or jsonb_array_length(public.whatsapp_google_action_due()) > 0 then
    perform public.call_internal('whatsapp/tick');
  end if;
end $$;

-- 18.2 "at once": a google_needs_action task created or cleared wakes the function right away (the tick sweeps anything
-- this misses). Session 19 adds the task kind; this trigger only reads it.
create or replace function private.whatsapp_task_wake() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'google_needs_action' and (tg_op = 'INSERT' or old.state is distinct from new.state) then
    perform public.call_internal('whatsapp/tick');
  end if;
  return null;
end $$;
create trigger tasks_whatsapp_wake after insert or update of state on public.tasks
  for each row execute function private.whatsapp_task_wake();

select cron.schedule('kabsi_whatsapp_tick', '* * * * *', $$select private.whatsapp_tick()$$);
select cron.schedule('kabsi_whatsapp_health', '41 * * * *', $$select public.call_internal('whatsapp/staff/health')$$);

-- Voice notes are kept privately until V3 transcribes them (28.3); nothing else reads this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('whatsapp-voice', 'whatsapp-voice', false, 10485760, array['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'audio/webm'])
on conflict (id) do nothing;

-- Privileges: the staff code for signed-in staff, everything else for the function (service role) only.
revoke all on function public.whatsapp_set_webhook_secret(text), public.whatsapp_resolve(text),
  public.whatsapp_inbound_store(text, text, text, jsonb, jsonb), public.whatsapp_inbound_done(uuid, text),
  public.whatsapp_inbound_retry(integer), public.whatsapp_conversation_set(text, jsonb),
  public.whatsapp_attach_code(text, text, text), public.whatsapp_bind(text, text), public.whatsapp_staff_code(),
  public.whatsapp_token_owner(text, text), public.whatsapp_open_items(text), public.whatsapp_owner_draft(uuid, uuid, text),
  public.whatsapp_stats(uuid, integer), public.whatsapp_review_link(uuid), public.whatsapp_send_state(text),
  public.whatsapp_outbox_add(text, uuid, uuid, text, text, jsonb, jsonb, boolean, text, timestamptz),
  public.whatsapp_outbox_mark(bigint[], text, text, text, timestamptz), public.whatsapp_outbox_claim(integer),
  public.whatsapp_outbox_release(text), public.whatsapp_outbox_get(text, bigint[]), public.whatsapp_google_action_due(),
  public.whatsapp_health_record(text, text, text, text, jsonb), public.whatsapp_staff_numbers(),
  public.whatsapp_staff_pause(text, boolean) from public, anon, authenticated;
grant execute on function public.whatsapp_staff_code() to authenticated;
grant execute on function public.whatsapp_set_webhook_secret(text), public.whatsapp_resolve(text),
  public.whatsapp_inbound_store(text, text, text, jsonb, jsonb), public.whatsapp_inbound_done(uuid, text),
  public.whatsapp_inbound_retry(integer), public.whatsapp_conversation_set(text, jsonb),
  public.whatsapp_attach_code(text, text, text), public.whatsapp_bind(text, text),
  public.whatsapp_token_owner(text, text), public.whatsapp_open_items(text), public.whatsapp_owner_draft(uuid, uuid, text),
  public.whatsapp_stats(uuid, integer), public.whatsapp_review_link(uuid), public.whatsapp_send_state(text),
  public.whatsapp_outbox_add(text, uuid, uuid, text, text, jsonb, jsonb, boolean, text, timestamptz),
  public.whatsapp_outbox_mark(bigint[], text, text, text, timestamptz), public.whatsapp_outbox_claim(integer),
  public.whatsapp_outbox_release(text), public.whatsapp_outbox_get(text, bigint[]), public.whatsapp_google_action_due(),
  public.whatsapp_health_record(text, text, text, text, jsonb), public.whatsapp_staff_numbers(),
  public.whatsapp_staff_pause(text, boolean) to service_role;
revoke all on function private.whatsapp_phone_tz(text), private.whatsapp_member_roles(text, uuid),
  private.whatsapp_membership_sync(), private.whatsapp_tick(), private.whatsapp_task_wake() from public, anon, authenticated;
