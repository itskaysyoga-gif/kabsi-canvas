-- Partners 2 (master plan 30.50 items 4 to 7, as changed by 30.51; R-150, R-151): partners join, the partner home, the
-- payout method behind a fresh confirm, review at the money, the owner's referral link, and the ledger only when card
-- payments are open.
--
-- 1. partner_accounts: user_id (the signed-in account that joined), reviewed_at and reviewed_by (the review at the first
--    payout), the six kinds of item 5. A joined partner is status 'approved' at once with its code: there is no
--    application step. The first 20 reviewed partners are Founding Partners.
-- 2. public.partner_join, partner_contact, partner_home, partner_visit: what the programs function calls with the service
--    role after it checked the session. Browsers run none of them and write nothing.
-- 3. RLS: a partner reads only their own rows of partner_accounts, partner_referrals, partner_commissions, partner_payouts
--    and partner_visits, and only the columns granted (never a business id, a payment id or a Vault id).
-- 4. partner_payout_changes: a new payout method waits for a fresh confirm: "Yes, it's me" on the partner's WhatsApp, or a
--    6-digit code by email when there is no WhatsApp. The detail sits in Vault from the start; the table keeps the last 4.
-- 5. The first payout of a partner who was never reviewed waits for one staff tap in staff WhatsApp
--    (public.partner_first_payout_review); the month's approval on the staff page skips it until then.
-- 6. The owner's referral link (R-XXXXXX): one free month per referred business that pays, recorded in
--    owner_referral_rewards. One source per business: a partner referral and an owner referral never both.
-- 7. The ledger makes a commission line or an owner reward only when card payments are open (app_settings.billing_open,
--    or a Kabsi test account in test mode). Self referrals now also match the partner's own signed-in account.
-- No row is removed by this file. The kind check is replaced (no partner row exists on 10 Nov 2026: read before).

-- ─── 1. partner accounts ──────────────────────────────────────────────────────────────────────────────────────────
alter table public.partner_accounts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.partner_accounts add column if not exists reviewed_at timestamptz;
alter table public.partner_accounts add column if not exists reviewed_by text check (char_length(reviewed_by) <= 80);
create unique index if not exists partner_accounts_user on public.partner_accounts (user_id) where user_id is not null;
alter table public.partner_accounts drop constraint if exists partner_accounts_kind_check;
alter table public.partner_accounts add constraint partner_accounts_kind_check
  check (kind in ('card_seller', 'agency', 'creator', 'accountant', 'reseller', 'customer'));
comment on column public.partner_accounts.user_id is 'Partners 2: the Kabsi account that joined at kabsi.co/partners/join; the partner home reads by it.';
comment on column public.partner_accounts.reviewed_at is 'Partners 2 (30.50 item 4): review moves to the first payout, one staff tap in staff WhatsApp.';

create table if not exists public.partner_visits (
  partner_id uuid not null references public.partner_accounts(id) on delete cascade,
  day date not null,
  visits integer not null default 0 check (visits >= 0),
  primary key (partner_id, day)
);
comment on table public.partner_visits is 'Partners 2: visits through a partner link, one count per partner and day (no visitor data).';
alter table public.partner_visits enable row level security;
revoke all on public.partner_visits from public, anon, authenticated;

-- ─── 3. a partner reads only their own rows, and only these columns ─────────────────────────────────────────────────
drop policy if exists partner_accounts_own on public.partner_accounts;
create policy partner_accounts_own on public.partner_accounts for select to authenticated using (user_id = (select auth.uid()));
grant select (id, user_id, created_at, name, email, country, kind, status, code, founding_partner, reviewed_at,
  payout_method, payout_last4, terms_version, terms_accepted_at) on public.partner_accounts to authenticated;

drop policy if exists partner_referrals_own on public.partner_referrals;
create policy partner_referrals_own on public.partner_referrals for select to authenticated
  using (partner_id in (select p.id from public.partner_accounts p where p.user_id = (select auth.uid())));
grant select (id, partner_id, source, attributed_at, status, self_referral) on public.partner_referrals to authenticated;

drop policy if exists partner_commissions_own on public.partner_commissions;
create policy partner_commissions_own on public.partner_commissions for select to authenticated
  using (partner_id in (select p.id from public.partner_accounts p where p.user_id = (select auth.uid())));
grant select (id, partner_id, kind, mode, currency, commission_cents, earned_at, hold_until, state, payout_id, created_at)
  on public.partner_commissions to authenticated;

drop policy if exists partner_payouts_own on public.partner_payouts;
create policy partner_payouts_own on public.partner_payouts for select to authenticated
  using (partner_id in (select p.id from public.partner_accounts p where p.user_id = (select auth.uid())));
grant select (id, partner_id, run_on, currency, amount_cents, lines, state, sent_at, method, created_at) on public.partner_payouts to authenticated;

drop policy if exists partner_visits_own on public.partner_visits;
create policy partner_visits_own on public.partner_visits for select to authenticated
  using (partner_id in (select p.id from public.partner_accounts p where p.user_id = (select auth.uid())));
grant select (partner_id, day, visits) on public.partner_visits to authenticated;

-- ─── 4. payout method changes ─────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.partner_payout_changes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_accounts(id) on delete cascade,
  method text not null check (method in ('usdt', 'usdc', 'paypal')),
  last4 text not null check (char_length(last4) <= 4),
  secret_id uuid,
  channel text not null check (channel in ('whatsapp', 'email')),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  code_hash text,
  tries integer not null default 0,
  state text not null default 'asked' check (state in ('asked', 'done', 'ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  done_at timestamptz,
  constraint partner_payout_changes_channel check ((channel = 'whatsapp') = (phone is not null) and (channel = 'email') = (code_hash is not null))
);
comment on table public.partner_payout_changes is 'Partners 2 (30.51 item 6): a payout method waits for a fresh confirm on WhatsApp, or an email code without WhatsApp. The detail is in Vault (secret_id) and blanked when the request ends.';
create index if not exists partner_payout_changes_partner on public.partner_payout_changes (partner_id, created_at desc);
alter table public.partner_payout_changes enable row level security;
revoke all on public.partner_payout_changes from public, anon, authenticated;

-- ─── 6. the owner's referral link ─────────────────────────────────────────────────────────────────────────────────
create table if not exists public.owner_referral_codes (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  code text not null unique check (code ~ '^R-[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.owner_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_org uuid not null references public.organizations(id) on delete cascade,
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  code text not null,
  touched_at timestamptz not null,
  attributed_at timestamptz not null default now(),
  self_referral boolean not null default false,
  status text not null default 'active' check (status in ('active', 'void'))
);
create table if not exists public.owner_referral_rewards (
  id bigint generated always as identity primary key,
  referral_id uuid not null unique references public.owner_referrals(id) on delete cascade,
  referrer_org uuid not null,
  organization_id uuid not null,
  billing_event_id bigint not null references public.billing_events(id) on delete restrict,
  payment_id text,
  mode text,
  earned_at timestamptz not null,
  state text not null default 'earned' check (state in ('earned', 'applied', 'void')),
  applied_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now()
);
comment on table public.owner_referrals is 'Partners 2 (30.50 item 5): a business that came through another owner''s link, saved at sign-up, never changed. One source per business: never also a partner referral.';
comment on table public.owner_referral_rewards is 'Partners 2: one free month for the referring business per referred business that pays (its first payment). Applied by staff until billing applies it (docs/LATER.md).';
alter table public.owner_referral_codes enable row level security;
alter table public.owner_referrals enable row level security;
alter table public.owner_referral_rewards enable row level security;
revoke all on public.owner_referral_codes, public.owner_referrals, public.owner_referral_rewards from public, anon, authenticated;

-- ─── shared helpers ───────────────────────────────────────────────────────────────────────────────────────────────
-- 6 characters from the card alphabet (no 0, 1, I, L or O).
create or replace function private.card_code6() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(r.b, i) % 31), 1), '' order by i)
    from (select extensions.gen_random_bytes(6) as b) r, generate_series(0, 5) i
$$;

-- 30.50 item 7: partner links pay from the day card payments open. A Kabsi test account may try it in test mode first.
create or replace function private.card_payments_open(p_org uuid, p_mode text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select value = 'on' from public.app_settings where key = 'billing_open'), false)
      or (coalesce(p_mode, 'test') <> 'live'
          and coalesce((select o.billing_test from public.organizations o where o.id = p_org), false))
$$;

-- ─── 2. join, contact, home, visit ────────────────────────────────────────────────────────────────────────────────
-- The account is made at once, with its code (P- and 6 card letters). One partner account per Kabsi account.
create or replace function public.partner_join(p_user uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_phone text; v_email text := lower(btrim(coalesce(p ->> 'email', ''))); v_country text := upper(btrim(coalesce(p ->> 'country', '')));
  v_permit text := nullif(btrim(coalesce(p ->> 'uae_permit', '')), ''); x public.partner_accounts;
begin
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then raise exception 'no_user'; end if;
  select * into x from public.partner_accounts where user_id = p_user;
  if found then return jsonb_build_object('result', 'exists', 'id', x.id, 'code', x.code); end if;
  if v_country !~ '^[A-Z]{2}$' then raise exception 'bad_country' using errcode = 'P0001'; end if;
  if v_country = 'AE' and v_permit is null then raise exception 'uae_permit' using errcode = 'P0001'; end if;
  if char_length(btrim(coalesce(p ->> 'reach', ''))) < 3 then raise exception 'bad_reach' using errcode = 'P0001'; end if;
  if coalesce(p ->> 'terms_version', '') = '' then raise exception 'terms' using errcode = 'P0001'; end if;
  -- The WhatsApp number is the one the account confirmed, never one typed in the form.
  select o.phone into v_phone from public.whatsapp_optins o where o.user_id = p_user and o.state = 'active' and o.verified_at is not null;
  for i in 1..5 loop
    v_code := 'P-' || private.card_code6();
    exit when not exists (select 1 from public.partner_accounts where code = v_code);
  end loop;
  begin
    insert into public.partner_accounts (user_id, name, email, phone, country, kind, reach, uae_permit, source, terms_version,
      terms_accepted_at, status, code)
    values (p_user, btrim(p ->> 'name'), v_email, v_phone, v_country, p ->> 'kind', left(btrim(p ->> 'reach'), 300),
      case when v_country = 'AE' then left(v_permit, 60) end, 'web', p ->> 'terms_version', now(), 'approved', v_code)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'email_taken' using errcode = 'P0001';
  end;
  perform private.audit('partner', p_user, 'partner_joined', null, 'partner', v_id::text, null,
    jsonb_build_object('kind', p ->> 'kind', 'country', v_country, 'terms_version', p ->> 'terms_version'), 'partner', 'joined');
  return jsonb_build_object('result', 'joined', 'id', v_id, 'code', v_code);
end $$;

-- The partner's confirmed WhatsApp number and email, for the programs function's choice of channel. Never sent to a browser.
create or replace function public.partner_contact(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'phone', o.phone, 'email', p.email, 'code', p.code)
    from public.partner_accounts p
    left join public.whatsapp_optins o on o.user_id = p.user_id and o.state = 'active' and o.verified_at is not null
   where p.user_id = p_user and p.status in ('approved', 'paused')
$$;

-- What the partner home shows: the link, the numbers from the one ledger, the payout method (last 4 only), and the
-- trade and area of each referred business (29.2: never its name). Money in live mode; test mode apart.
create or replace function public.partner_home(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare x public.partner_accounts; v_cleared int; v_paid int; v_next date;
begin
  select * into x from public.partner_accounts where user_id = p_user;
  if not found then return jsonb_build_object('result', 'not_partner'); end if;
  select coalesce(sum(k.commission_cents) filter (where k.state = 'cleared' and k.payout_id is null), 0),
         coalesce(sum(k.commission_cents) filter (where k.state = 'paid' or (k.payout_id is not null and k.state = 'cleared')), 0)
    into v_cleared, v_paid
    from public.partner_commissions k where k.partner_id = x.id and k.mode = 'live';
  v_next := case when extract(day from current_date) <= 5 then date_trunc('month', current_date)::date + 4
                 else (date_trunc('month', current_date) + interval '1 month')::date + 4 end;
  return jsonb_build_object(
    'result', 'ok',
    'partner', jsonb_build_object('code', x.code, 'name', x.name, 'kind', x.kind, 'country', x.country, 'status', x.status,
      'founding_partner', x.founding_partner, 'reviewed', x.reviewed_at is not null, 'joined_at', x.created_at,
      'terms_version', x.terms_version, 'payout_method', x.payout_method, 'payout_last4', x.payout_last4),
    'numbers', jsonb_build_object(
      'visits', (select coalesce(sum(v.visits), 0) from public.partner_visits v where v.partner_id = x.id),
      'visits_30d', (select coalesce(sum(v.visits), 0) from public.partner_visits v where v.partner_id = x.id and v.day > current_date - 30),
      'trials', (select count(*) from public.partner_referrals r where r.partner_id = x.id and not r.self_referral
                  and exists (select 1 from public.subscriptions s where s.organization_id = r.organization_id and s.trial_started_at is not null)),
      'paying', (select count(*) from public.partner_referrals r where r.partner_id = x.id and not r.self_referral
                  and exists (select 1 from public.subscriptions s where s.organization_id = r.organization_id and s.provider = 'creem'
                               and s.state in ('active', 'past_due'))),
      'cancelled', (select count(*) from public.partner_referrals r where r.partner_id = x.id and not r.self_referral
                  and exists (select 1 from public.subscriptions s where s.organization_id = r.organization_id and s.provider = 'creem')
                  and not exists (select 1 from public.subscriptions s where s.organization_id = r.organization_id and s.provider = 'creem'
                               and s.state in ('active', 'past_due'))),
      'earned_cents', (select coalesce(sum(k.commission_cents), 0) from public.partner_commissions k
                        where k.partner_id = x.id and k.mode = 'live' and k.state <> 'void'),
      'pending_cents', (select coalesce(sum(k.commission_cents), 0) from public.partner_commissions k
                        where k.partner_id = x.id and k.mode = 'live' and k.state = 'held'),
      'cleared_cents', v_cleared,
      'paid_cents', v_paid,
      'test_cents', (select coalesce(sum(k.commission_cents), 0) from public.partner_commissions k
                      where k.partner_id = x.id and k.mode is distinct from 'live' and k.state <> 'void'),
      'next_payout_on', v_next),
    -- 29.1: the payout method is asked only once 50 US dollars has cleared (or once one is on file).
    'payout_ask', x.payout_method is not null or v_cleared + v_paid >= 5000,
    'businesses', coalesce((select jsonb_agg(jsonb_build_object('trade', l.category_label, 'area', l.area,
        'state', case when exists (select 1 from public.subscriptions s where s.organization_id = r.organization_id and s.provider = 'creem'
                                     and s.state in ('active', 'past_due')) then 'paying'
                      when exists (select 1 from public.subscriptions s where s.organization_id = r.organization_id and s.provider = 'creem') then 'stopped'
                      when exists (select 1 from public.subscriptions s where s.organization_id = r.organization_id and s.trial_started_at is not null) then 'trial'
                      else 'joined' end,
        'since', r.attributed_at) order by r.attributed_at desc)
      from public.partner_referrals r left join public.locations l on l.id = r.location_id
     where r.partner_id = x.id and not r.self_referral), '[]'::jsonb));
end $$;

-- One visit through a partner link (the programs function rate-limits per visitor first).
create or replace function public.partner_visit(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if v_code !~ '^P-' then v_code := 'P-' || v_code; end if;
  select id into v_id from public.partner_accounts where code = v_code and status in ('approved', 'paused');
  if v_id is null then return false; end if;
  insert into public.partner_visits (partner_id, day, visits) values (v_id, current_date, 1)
  on conflict (partner_id, day) do update set visits = public.partner_visits.visits + 1;
  return true;
end $$;

-- ─── 4. payout method: ask, then confirm ──────────────────────────────────────────────────────────────────────────
create or replace function private.partner_payout_end(p_change uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.partner_payout_changes;
begin
  select * into c from public.partner_payout_changes where id = p_change;
  if c.secret_id is not null then
    perform vault.update_secret(c.secret_id, '', 'partner_payout_change_' || c.id::text, 'ended');
  end if;
  update public.partner_payout_changes set state = case when state = 'asked' then 'ended' else state end, secret_id = null where id = p_change;
end $$;

create or replace function public.partner_payout_request(p_user uuid, p_method text, p_detail text, p_channel text, p_code_hash text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.partner_accounts; v_detail text := btrim(coalesce(p_detail, '')); v_secret uuid; v_id uuid; v_phone text; h jsonb; r record;
begin
  select * into x from public.partner_accounts where user_id = p_user and status in ('approved', 'paused') for update;
  if not found then return jsonb_build_object('result', 'not_partner'); end if;
  h := public.partner_home(p_user);
  if not (h ->> 'payout_ask')::boolean then return jsonb_build_object('result', 'not_yet'); end if;
  if p_method not in ('usdt', 'usdc', 'paypal') then raise exception 'bad_method' using errcode = 'P0001'; end if;
  if char_length(v_detail) < 6 or char_length(v_detail) > 200 then raise exception 'bad_detail' using errcode = 'P0001'; end if;
  if (select count(*) from public.partner_payout_changes where partner_id = x.id and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('result', 'slow_down');
  end if;
  if p_channel = 'whatsapp' then
    select o.phone into v_phone from public.whatsapp_optins o where o.user_id = p_user and o.state = 'active' and o.verified_at is not null;
    if v_phone is null then raise exception 'no_whatsapp' using errcode = 'P0001'; end if;
  elsif p_channel = 'email' then
    if coalesce(p_code_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'bad_code' using errcode = 'P0001'; end if;
  else
    raise exception 'bad_channel' using errcode = 'P0001';
  end if;
  -- Only the newest request can be confirmed.
  for r in select id from public.partner_payout_changes where partner_id = x.id and state = 'asked' loop
    perform private.partner_payout_end(r.id);
  end loop;
  v_id := gen_random_uuid();
  v_secret := vault.create_secret(v_detail, 'partner_payout_change_' || v_id::text, 'Kabsi partner payout details, waiting for a confirm');
  insert into public.partner_payout_changes (id, partner_id, method, last4, secret_id, channel, phone, code_hash, expires_at)
  values (v_id, x.id, p_method, right(v_detail, 4), v_secret, p_channel, v_phone,
    case when p_channel = 'email' then p_code_hash end, now() + interval '10 minutes');
  perform private.audit('partner', p_user, 'partner_payout_asked', null, 'partner', x.id::text, null,
    jsonb_build_object('method', p_method, 'channel', p_channel), 'partner', 'asked');
  return jsonb_build_object('result', 'asked', 'id', v_id, 'channel', p_channel, 'phone', v_phone, 'email', x.email,
    'method', p_method, 'last4', right(v_detail, 4));
end $$;

-- Moves the waiting detail onto the partner (the old detail in Vault is blanked).
create or replace function private.partner_payout_apply(p_change uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.partner_payout_changes; x public.partner_accounts;
begin
  select * into c from public.partner_payout_changes where id = p_change for update;
  select * into x from public.partner_accounts where id = c.partner_id for update;
  if x.payout_secret_id is not null then
    perform vault.update_secret(x.payout_secret_id, '', 'partner_payout_old_' || x.payout_secret_id::text, 'replaced');
  end if;
  perform vault.update_secret(c.secret_id, (select s.decrypted_secret from vault.decrypted_secrets s where s.id = c.secret_id),
    'partner_payout_' || x.id::text || '_' || c.id::text, 'Kabsi partner payout details');
  update public.partner_accounts set payout_method = c.method, payout_last4 = c.last4, payout_secret_id = c.secret_id, updated_at = now()
   where id = x.id;
  update public.partner_payout_changes set state = 'done', done_at = now(), secret_id = null where id = c.id;
  perform private.audit('partner', x.user_id, 'partner_payout_changed', null, 'partner', x.id::text,
    jsonb_build_object('method', x.payout_method), jsonb_build_object('method', c.method, 'channel', c.channel), 'partner', 'confirmed');
  return jsonb_build_object('result', 'confirmed', 'method', c.method, 'last4', c.last4);
end $$;

-- "Yes, it's me" from the partner's own WhatsApp number: the phone that was asked, and still the account's number.
create or replace function public.partner_payout_confirm_whatsapp(p_id uuid, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.partner_payout_changes;
begin
  select * into c from public.partner_payout_changes where id = p_id for update;
  if not found or c.state <> 'asked' or c.channel <> 'whatsapp' or c.expires_at <= now() or c.phone is distinct from p_phone
     or not exists (select 1 from public.partner_accounts p join public.whatsapp_optins o on o.user_id = p.user_id
                     where p.id = c.partner_id and o.phone = p_phone and o.state = 'active' and o.verified_at is not null) then
    return jsonb_build_object('result', 'unknown');
  end if;
  return private.partner_payout_apply(c.id);
end $$;

-- The email code, from the signed-in partner's browser. Five tries, ten minutes.
create or replace function public.partner_payout_confirm_code(p_user uuid, p_id uuid, p_code_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.partner_payout_changes;
begin
  select k.* into c from public.partner_payout_changes k join public.partner_accounts p on p.id = k.partner_id
   where k.id = p_id and p.user_id = p_user for update of k;
  if not found or c.state <> 'asked' or c.channel <> 'email' or c.expires_at <= now() or c.tries >= 5 then
    return jsonb_build_object('result', 'ended');
  end if;
  if c.code_hash is distinct from p_code_hash then
    update public.partner_payout_changes set tries = tries + 1 where id = c.id;
    if c.tries + 1 >= 5 then perform private.partner_payout_end(c.id); return jsonb_build_object('result', 'ended'); end if;
    return jsonb_build_object('result', 'wrong_code');
  end if;
  return private.partner_payout_apply(c.id);
end $$;

-- ─── 5. review at the money ───────────────────────────────────────────────────────────────────────────────────────
-- The first payouts that wait for a staff tap (the partner was never reviewed).
create or replace function public.partner_first_payouts(p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not exists (select 1 from public.phone_roles r where r.phone = p_phone and r.role = 'staff_admin' and r.revoked_at is null)
    then null else coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'code', p.code, 'kind', p.kind, 'country', p.country,
      'amount_cents', o.amount_cents, 'lines', o.lines, 'run_on', o.run_on, 'joined_at', p.created_at) order by o.run_on, o.created_at)
      from public.partner_payouts o join public.partner_accounts p on p.id = o.partner_id
     where o.state = 'proposed' and p.reviewed_at is null), '[]'::jsonb) end
$$;

-- One staff tap: the partner is reviewed, the first 20 reviewed are Founding Partners, and this first payout is approved.
create or replace function public.partner_first_payout_review(p_payout uuid, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.partner_payouts; x public.partner_accounts; v_founding boolean;
begin
  if not exists (select 1 from public.phone_roles r where r.phone = p_phone and r.role = 'staff_admin' and r.revoked_at is null) then
    return jsonb_build_object('result', 'forbidden');
  end if;
  perform pg_advisory_xact_lock(hashtext('partners_approve'));
  select * into o from public.partner_payouts where id = p_payout for update;
  if not found or o.state <> 'proposed' then return jsonb_build_object('result', 'unknown'); end if;
  select * into x from public.partner_accounts where id = o.partner_id for update;
  if x.reviewed_at is not null then return jsonb_build_object('result', 'unknown'); end if;
  v_founding := x.founding_partner or (select count(*) from public.partner_accounts where founding_partner) < 20;
  update public.partner_accounts set reviewed_at = now(), reviewed_by = 'whatsapp:' || p_phone, founding_partner = v_founding, updated_at = now()
   where id = x.id;
  update public.partner_payouts set state = 'approved', approved_at = now() where id = o.id;
  perform private.audit('staff', null, 'partner_first_payout_approved', null, 'partner_payout', o.id::text, null,
    jsonb_build_object('partner', x.code, 'amount_cents', o.amount_cents, 'founding_partner', v_founding), 'whatsapp', 'approved');
  return jsonb_build_object('result', 'approved', 'code', x.code, 'amount_cents', o.amount_cents, 'founding_partner', v_founding,
    'founding_count', (select count(*) from public.partner_accounts where founding_partner));
end $$;

-- The month's approval on the staff page covers reviewed partners only; a first payout waits for its WhatsApp tap.
create or replace function public.staff_payouts_approve(p_run date) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.partner_payouts o set state = 'approved', approved_at = now(), approved_by = auth.uid()
   where o.run_on = p_run and o.state = 'proposed'
     and exists (select 1 from public.partner_accounts p where p.id = o.partner_id and p.reviewed_at is not null);
  get diagnostics v_n = row_count;
  perform private.audit('staff', auth.uid(), 'partner_payouts_approved', null, 'partner_payouts', p_run::text, null,
    jsonb_build_object('payouts', v_n), 'staff', v_n::text);
  return v_n;
end $$;

-- staff_partner_decide as it stands live (20261026165709), with one change: an approval by staff on the staff page is a
-- review too (reviewed_at), so the founding count and the first payout follow it.
create or replace function public.staff_partner_decide(p_id uuid, p_status text, p_handle text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.partner_accounts; v_handle text; v_founding boolean;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('approved', 'declined', 'paused', 'left') then raise exception 'bad_status'; end if;
  perform pg_advisory_xact_lock(hashtext('partners_approve'));
  select * into x from public.partner_accounts where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if p_status = 'approved' and x.handle is null and (x.code is null or nullif(btrim(coalesce(p_handle, '')), '') is not null) then
    v_handle := lower(coalesce(nullif(btrim(p_handle), ''), regexp_replace(lower(x.name), '[^a-z0-9]', '', 'g')));
    v_handle := left(v_handle, 20);
    if not private.partner_handle_ok(v_handle) then raise exception 'bad_handle' using hint = '3 to 20 lowercase letters and numbers, no brand or Google words.'; end if;
    if exists (select 1 from public.partner_accounts where handle = v_handle) then raise exception 'handle_taken'; end if;
    update public.partner_accounts set handle = v_handle, code = coalesce(code, 'P-' || upper(v_handle)) where id = p_id;
  end if;
  if p_status = 'approved' and x.reviewed_at is null then
    v_founding := x.founding_partner or (select count(*) from public.partner_accounts where founding_partner) < 20;
    update public.partner_accounts set reviewed_at = now(), reviewed_by = 'staff:' || coalesce(auth.uid()::text, 'unknown'),
      founding_partner = v_founding where id = p_id;
  end if;
  update public.partner_accounts set status = p_status, decided_at = now(), decided_by = auth.uid(), updated_at = now(),
    decision_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), decision_note),
    left_at = case when p_status = 'left' then now() else left_at end
   where id = p_id;
  perform private.audit('staff', auth.uid(), 'partner_' || p_status, null, 'partner', p_id::text,
    jsonb_build_object('status', x.status), jsonb_build_object('status', p_status), 'staff', p_status);
  return (select jsonb_build_object('id', id, 'status', status, 'handle', handle, 'code', code, 'founding_partner', founding_partner)
            from public.partner_accounts where id = p_id);
end $$;

-- ─── self referral: also the partner's own signed-in account ──────────────────────────────────────────────────────
-- private.partner_self_reason as it stands live (20261026165709), with the partner's user_id added: a business the
-- partner's own account belongs to is a self referral, whatever email or number the partner gave.
create or replace function private.partner_self_reason(p_partner uuid, p_org uuid) returns text
language sql stable security definer set search_path = '' as $$
  with x as (select * from public.partner_accounts where id = p_partner),
  mine as (
    select m.organization_id from public.organization_members m, x where x.user_id is not null and m.user_id = x.user_id
    union
    select m.organization_id from public.organization_members m join auth.users u on u.id = m.user_id, x
     where lower(u.email) = lower(x.email)
    union
    select m.organization_id from public.organization_members m join public.whatsapp_optins o on o.user_id = m.user_id, x
     where x.phone is not null and o.phone = x.phone)
  select case
    when exists (select 1 from public.organization_members m, x where m.organization_id = p_org and m.role = 'owner'
                  and x.user_id is not null and m.user_id = x.user_id) then 'owner_account'
    when exists (select 1 from public.organization_members m join auth.users u on u.id = m.user_id, x
                  where m.organization_id = p_org and m.role = 'owner' and lower(u.email) = lower(x.email)) then 'owner_email'
    when exists (select 1 from public.whatsapp_optins o join public.organization_members m on m.user_id = o.user_id, x
                  where m.organization_id = p_org and m.role = 'owner' and x.phone is not null and o.phone = x.phone) then 'owner_phone'
    when p_org in (select organization_id from mine) then 'team_member'
    when exists (select 1 from public.locations y where y.organization_id = p_org and y.place_id is not null
                  and (y.place_id = (select own_place_id from x)
                       or y.place_id in (select z.place_id from public.locations z where z.organization_id in (select organization_id from mine)
                                          and z.organization_id <> p_org))) then 'google_place'
    end
  from x
$$;
revoke all on function private.partner_self_reason(uuid, uuid) from public, anon, authenticated;

-- An owner referral is the business's own when the two businesses share a member or a Google place.
create or replace function private.owner_self_referral(p_referrer uuid, p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_referrer = p_org
      or exists (select 1 from public.organization_members a join public.organization_members b on b.user_id = a.user_id
                  where a.organization_id = p_referrer and b.organization_id = p_org)
      or exists (select 1 from public.locations a join public.locations b on b.place_id = a.place_id
                  where a.organization_id = p_referrer and b.organization_id = p_org and a.place_id is not null)
$$;

-- ─── 6. the owner's link ──────────────────────────────────────────────────────────────────────────────────────────
-- "my link" on WhatsApp: the phone must belong to an owner or manager of the business. When that person is also a
-- Kabsi partner, the link is their partner link (25 percent instead of the free month, never both).
create or replace function public.owner_referral_link(p_location uuid, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_user uuid; v_partner text; v_code text;
begin
  select l.organization_id into v_org from public.locations l join public.organizations o on o.id = l.organization_id
   where l.id = p_location and not l.is_demo and not coalesce(o.is_demo, false);
  if v_org is null then return jsonb_build_object('result', 'none'); end if;
  select m.user_id into v_user from public.organization_members m join public.whatsapp_optins w on w.user_id = m.user_id
   where m.organization_id = v_org and w.phone = p_phone and w.state = 'active' and m.role in ('owner', 'admin', 'manager')
   order by (m.role = 'owner') desc limit 1;
  if v_user is null then return jsonb_build_object('result', 'none'); end if;
  select p.code into v_partner from public.partner_accounts p where p.user_id = v_user and p.status in ('approved', 'paused') and p.code is not null;
  if v_partner is not null then return jsonb_build_object('result', 'partner', 'code', v_partner); end if;
  select code into v_code from public.owner_referral_codes where organization_id = v_org;
  if v_code is null then
    for i in 1..5 loop
      v_code := 'R-' || private.card_code6();
      begin
        insert into public.owner_referral_codes (organization_id, code) values (v_org, v_code);
        exit;
      exception when unique_violation then
        select code into v_code from public.owner_referral_codes where organization_id = v_org;
        exit when v_code is not null;
      end;
    end loop;
  end if;
  return jsonb_build_object('result', 'owner', 'code', v_code);
end $$;

-- ─── attribution: partner links and owner links, one source per business ──────────────────────────────────────────
-- private.partner_attribute as it stands live (20261026165709), with three changes: a business that already has an
-- owner referral is never given a partner one; an R- code is an owner's link (or, when that owner is a partner, the
-- partner's); and the partner's own signed-in account counts as a self referral (private.partner_self_reason).
create or replace function private.partner_attribute(p_location uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_created timestamptz; v_via text; v_via_at timestamptz; v_wa text; v_wa_at timestamptz;
  v_code text; v_touch timestamptz; v_src text; x public.partner_accounts; v_self text; v_id uuid; v_ref_org uuid;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.organization_id is null or l.is_demo then return null; end if;
  if exists (select 1 from public.partner_referrals r where r.organization_id = l.organization_id)
     or exists (select 1 from public.owner_referrals r where r.organization_id = l.organization_id) then
    return null;
  end if;
  select o.created_at into v_created from public.organizations o where o.id = l.organization_id;
  v_via := nullif(upper(btrim(coalesce(l.via_code, ''))), '');
  v_via_at := coalesce((select a.via_at from public.signup_attribution a where a.user_id = l.created_by), l.created_at);
  if v_via like 'R-%' then
    select c.organization_id into v_ref_org from public.owner_referral_codes c where c.code = v_via;
    if v_ref_org is null then
      v_via := null;
    else
      -- An owner who is a partner earns as a partner (30.50 item 5).
      select p.code into v_code from public.partner_accounts p join public.organization_members m on m.user_id = p.user_id
       where m.organization_id = v_ref_org and m.role = 'owner' and p.status in ('approved', 'paused') and p.code is not null
       order by p.created_at limit 1;
      if v_code is null then
        insert into public.owner_referrals (referrer_org, organization_id, location_id, code, touched_at, self_referral)
        values (v_ref_org, l.organization_id, l.id, v_via, v_via_at, private.owner_self_referral(v_ref_org, l.organization_id))
        on conflict (organization_id) do nothing;
        return null;
      end if;
      v_via := v_code;
    end if;
  elsif v_via is not null then
    v_via := case when v_via like 'P-%' then v_via else 'P-' || v_via end;
    if not exists (select 1 from public.partner_accounts p where p.code = v_via and p.status in ('approved', 'paused')) then
      v_via := null;
    end if;
  end if;
  select c.partner_code, c.partner_code_at into v_wa, v_wa_at
    from public.whatsapp_conversations c
   where c.partner_code is not null
     and c.partner_code_at between v_created - interval '60 days' and v_created + interval '1 day'
     and c.phone in (select o.phone from public.whatsapp_optins o join public.organization_members m on m.user_id = o.user_id
                      where m.organization_id = l.organization_id and m.role = 'owner')
     and exists (select 1 from public.partner_accounts p where p.code = c.partner_code and p.status in ('approved', 'paused'))
   order by c.partner_code_at desc limit 1;
  if v_via is not null and (v_wa is null or v_via_at >= v_wa_at) then
    v_code := v_via; v_touch := v_via_at; v_src := 'via';
  elsif v_wa is not null then
    v_code := v_wa; v_touch := v_wa_at; v_src := 'whatsapp';
  else
    return null;
  end if;
  select * into x from public.partner_accounts p where p.code = v_code and p.status in ('approved', 'paused');
  if not found then return null; end if;
  v_self := private.partner_self_reason(x.id, l.organization_id);
  insert into public.partner_referrals (partner_id, organization_id, location_id, source, code, touched_at, self_referral, self_reason)
  values (x.id, l.organization_id, l.id, v_src, v_code, coalesce(v_touch, now()), v_self is not null, v_self)
  on conflict (organization_id) do nothing
  returning id into v_id;
  return v_id;
end $$;
revoke all on function private.partner_attribute(uuid) from public, anon, authenticated;

-- ─── 7. the ledger ────────────────────────────────────────────────────────────────────────────────────────────────
-- The owner's reward: the referred business's first payment earns the referring business one free month; a refund of
-- that payment before the month is applied takes it back.
create or replace function private.owner_referral_event(e public.billing_events) returns text
language plpgsql security definer set search_path = '' as $$
declare r public.owner_referrals; w public.owner_referral_rewards; v_pay text; v_mode text;
begin
  select * into r from public.owner_referrals where organization_id = e.organization_id;
  if not found then return 'no_referral'; end if;
  v_mode := case when e.mode in ('live', 'prod', 'production') then 'live' else coalesce(e.mode, 'unknown') end;
  if e.event_type = 'subscription.paid' then
    if r.status <> 'active' or r.self_referral or private.owner_self_referral(r.referrer_org, r.organization_id) then return 'no_reward'; end if;
    if not private.card_payments_open(e.organization_id, v_mode) then return 'payments_closed'; end if;
    insert into public.owner_referral_rewards (referral_id, referrer_org, organization_id, billing_event_id, payment_id, mode, earned_at)
    values (r.id, r.referrer_org, r.organization_id, e.id, e.payment_id, v_mode, coalesce(e.event_created_at, e.received_at))
    on conflict (referral_id) do nothing;
    return 'owner_reward';
  end if;
  if e.event_type in ('refund.created', 'dispute.created') then
    v_pay := coalesce(e.detail #>> '{object,transaction,id}', e.payment_id);
    select * into w from public.owner_referral_rewards where referral_id = r.id for update;
    if found and w.state = 'earned' and (w.payment_id = v_pay or v_pay is null) then
      update public.owner_referral_rewards set state = 'void', void_reason = e.event_type where id = w.id;
      return 'owner_reward_void';
    end if;
  end if;
  return 'skip';
end $$;

-- private.partner_ledger_event as it stands live (20261026165709), with two changes: a business with no partner goes to
-- the owner reward, and a commission line is made only when card payments are open (private.card_payments_open).
create or replace function private.partner_ledger_event(p_event bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.billing_events; r public.partner_referrals; x public.partner_accounts; c public.partner_commissions;
  v_base int; v_paid int; v_back int; v_pay text; v_at timestamptz; v_full boolean; v_done int; v_cdone int; v_cback int; v_mode text;
begin
  select * into e from public.billing_events where id = p_event;
  if not found or e.organization_id is null or e.provider <> 'creem' then return 'skip'; end if;
  select * into r from public.partner_referrals where organization_id = e.organization_id;
  if not found then return private.owner_referral_event(e); end if;
  v_at := coalesce(e.event_created_at, e.received_at);
  v_mode := case when e.mode in ('live', 'prod', 'production') then 'live' else coalesce(e.mode, 'unknown') end;

  if e.event_type = 'subscription.paid' then
    if r.status <> 'active' or r.self_referral then return 'no_commission'; end if;
    if private.partner_self_reason(r.partner_id, r.organization_id) is not null then
      update public.partner_referrals set self_referral = true,
        self_reason = private.partner_self_reason(r.partner_id, r.organization_id) where id = r.id;
      return 'self_referral';
    end if;
    select * into x from public.partner_accounts where id = r.partner_id;
    if x.status not in ('approved', 'paused') then return 'partner_inactive'; end if;
    if not private.card_payments_open(e.organization_id, v_mode) then return 'payments_closed'; end if;
    v_base := private.creem_base_cents(e.detail);
    if v_base is null then v_base := e.amount; end if;
    if v_base is null or v_base <= 0 then return 'no_amount'; end if;
    insert into public.partner_commissions (partner_id, referral_id, organization_id, billing_event_id, kind, mode, payment_id,
      provider_subscription_id, currency, base_cents, commission_cents, earned_at, hold_until)
    values (r.partner_id, r.id, e.organization_id, e.id, 'commission', v_mode, e.payment_id, e.provider_subscription_id,
      coalesce(e.currency, 'USD'), v_base, round(v_base * 0.25)::int, v_at, v_at + interval '30 days')
    on conflict (billing_event_id, kind) do nothing;
    return 'commission';
  end if;

  if e.event_type in ('refund.created', 'dispute.created') then
    v_pay := coalesce(e.detail #>> '{object,transaction,id}', e.payment_id);
    select * into c from public.partner_commissions k
     where k.organization_id = e.organization_id and k.kind = 'commission'
       and (k.payment_id = v_pay or (v_pay is null and k.provider_subscription_id = e.provider_subscription_id))
     order by (k.payment_id = v_pay) desc nulls last, k.earned_at desc limit 1
     for update;
    if not found then return 'no_line'; end if;
    if c.state = 'void' then return 'already_void'; end if;
    select coalesce(sum(-k.base_cents), 0), coalesce(sum(-k.commission_cents), 0) into v_done, v_cdone
      from public.partner_commissions k where k.reverses_id = c.id;
    if v_done >= c.base_cents then return 'already_reversed'; end if;
    v_paid := nullif(private.cents(e.detail #>> '{object,transaction,amount_paid}'), 0);
    v_back := case when e.event_type = 'refund.created' then private.cents(e.detail #>> '{object,refund_amount}')
                   else private.cents(e.detail #>> '{object,amount}') end;
    v_full := v_back is null or v_paid is null or v_back >= v_paid;
    v_base := case when v_full then c.base_cents - v_done
                   else least(c.base_cents - v_done, round(v_back::numeric * c.base_cents / v_paid)::int) end;
    v_cback := case when v_base >= c.base_cents - v_done then c.commission_cents - v_cdone
                    else least(c.commission_cents - v_cdone, round(v_base * c.rate)::int) end;
    if c.state in ('held', 'cleared') and c.payout_id is null and v_full and v_done = 0 then
      update public.partner_commissions set state = 'void', void_reason = e.event_type where id = c.id;
      return 'voided';
    end if;
    insert into public.partner_commissions (partner_id, referral_id, organization_id, billing_event_id, kind, mode, payment_id,
      provider_subscription_id, currency, base_cents, commission_cents, earned_at, hold_until, state, reverses_id)
    values (c.partner_id, c.referral_id, c.organization_id, e.id, 'reversal', c.mode, c.payment_id, c.provider_subscription_id,
      c.currency, -v_base, -v_cback, v_at,
      case when c.payout_id is null then c.hold_until else v_at end,
      case when c.payout_id is null then c.state else 'cleared' end, c.id)
    on conflict (billing_event_id, kind) do nothing;
    return 'reversed';
  end if;
  return 'skip';
end $$;
revoke all on function private.partner_ledger_event(bigint) from public, anon, authenticated;

-- The daily step as it stands live, plus: waiting payout requests past their 10 minutes are ended (Vault blanked).
create or replace function private.programs_daily() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_attr int := 0; v_loc uuid; v_ended int := 0; r record;
begin
  for v_loc in
    select distinct on (l.organization_id) l.id from public.locations l join public.organizations o on o.id = l.organization_id
     where o.created_at > now() - interval '14 days' and not l.is_demo
       and not exists (select 1 from public.partner_referrals r where r.organization_id = l.organization_id)
       and not exists (select 1 from public.owner_referrals r where r.organization_id = l.organization_id)
     order by l.organization_id, l.created_at
  loop
    if private.partner_attribute(v_loc) is not null then v_attr := v_attr + 1; end if;
  end loop;
  for r in select id from public.partner_payout_changes where state = 'asked' and expires_at <= now() loop
    perform private.partner_payout_end(r.id);
    v_ended := v_ended + 1;
  end loop;
  return jsonb_build_object('attributed', v_attr, 'payout_requests_ended', v_ended, 'founding_messages', private.founding_tick());
end $$;
revoke all on function private.programs_daily() from public, anon, authenticated;

-- ─── grants: the browser roles run none of the new functions ──────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['public.partner_join(uuid,jsonb)', 'public.partner_contact(uuid)', 'public.partner_home(uuid)',
    'public.partner_visit(text)', 'public.partner_payout_request(uuid,text,text,text,text)',
    'public.partner_payout_confirm_whatsapp(uuid,text)', 'public.partner_payout_confirm_code(uuid,uuid,text)',
    'public.partner_first_payouts(text)', 'public.partner_first_payout_review(uuid,text)', 'public.owner_referral_link(uuid,text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['private.card_code6()', 'private.card_payments_open(uuid,text)', 'private.partner_payout_end(uuid)',
    'private.partner_payout_apply(uuid)', 'private.owner_self_referral(uuid,uuid)', 'private.owner_referral_event(public.billing_events)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
-- staff_payouts_approve and staff_partner_decide keep their grants (create or replace keeps them); restated for a fresh stack.
revoke all on function public.staff_payouts_approve(date), public.staff_partner_decide(uuid, text, text, text) from public, anon;
grant execute on function public.staff_payouts_approve(date), public.staff_partner_decide(uuid, text, text, text) to authenticated, service_role;
