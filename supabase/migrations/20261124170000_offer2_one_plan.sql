-- OFFER-2 (blueprint 3.1, R-163): one plan, the costly jobs off by setting, two posts a month.
-- Additive and reversible: settings, one column, two schedules removed (their functions stay), three functions replaced
-- with one new check each. A later migration turns any of it back on by setting the value again.
--
-- 1. Off by setting, code kept: the request book, AI answer checks (owners and the free scan) and the DataForSEO map.
--    Any value other than 'on' or 'live' means off: no provider call (whatsapp/db.ts bookDb.on, visibility/index.ts).
-- 2. Unscheduled, functions kept: the map and AI answer ticks, Outbound (prepare, send, inbox) and the partner payout run.
-- 3. Automatic posts: 2 a month on every location and as the default (blueprint section 3).
-- 4. The one offer: no new Pro plans (billing.ts refuses Pro and yearly checkouts and upgrades), the trial is Creem's 14 days
--    with a card (trial_mode 'card': no Kabsi trial without a card starts), and the founding price is private: only a
--    business with an accepted Founding 25 application gets it (founding_public 'off'). founding_ends_at is 12 months after
--    the first payment, when the price becomes 29.

-- 1 and 4: settings ----------------------------------------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('request_book', 'off'), ('ai_visibility_mode', 'off'), ('ai_visibility_free_scan', 'off'), ('dataforseo_mode', 'off'),
  ('new_pro_signups', 'off'), ('trial_mode', 'card'), ('founding_public', 'off')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- 2: schedules ----------------------------------------------------------------------------------------------------------
select cron.unschedule(j.jobname) from cron.job j
 where j.jobname in ('kabsi_visibility_tick', 'kabsi_ai_visibility_tick', 'kabsi_outbound_prepare', 'kabsi_outbound_send',
                     'kabsi_outbound_inbox', 'kabsi_partner_payout_run', 'kabsi_partner_billing');

-- 3: posts --------------------------------------------------------------------------------------------------------------
alter table public.locations alter column posts_per_month set default 2;
update public.locations set posts_per_month = 2 where posts_per_month <> 2;

-- 4a: the founding price ends 12 months after the first payment ---------------------------------------------------------
alter table public.subscriptions add column if not exists founding_ends_at timestamptz;
comment on column public.subscriptions.founding_ends_at is
  'OFFER-2: when the founding price (19 a month) ends and the list price (29) starts: 12 months after the first payment. Set once by billing.ts.';

-- 4b: a trial without a card starts only when trial_mode is 'kabsi' -------------------------------------------------------
-- grant_trial_if_eligible as it stands live (20261022063000), with one change: the trial_mode check first.
create or replace function public.grant_trial_if_eligible(p_location uuid, p_ignore_flag boolean default false, p_days integer default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select s.value from public.app_settings s where s.key = 'trial_mode'), 'kabsi') = 'card' then return null; end if;
  if private.trial_blocked(p_location) then return null; end if;
  return private.start_trial(p_location, p_days);
end $$;

-- 4c: the founding price only through the private invitation -------------------------------------------------------------
-- billing_checkout_family as it stands live (20261030165233), with one change: with founding_public 'off' the count of
-- places no longer gives the founding price; only an accepted Founding 25 application does.
create or replace function public.billing_checkout_family(p_org uuid, p_request_id text, p_mode text, p_plan text,
  p_period text, p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.billing_checkouts; v_family text; v_had boolean;
begin
  if p_org is null or coalesce(p_request_id, '') = '' or p_mode not in ('test', 'live')
     or p_plan not in ('essentials', 'pro') or p_period not in ('month', 'year') then
    raise exception 'bad_input';
  end if;
  perform pg_advisory_xact_lock(hashtext('kabsi_founding_places'));
  select * into r from public.billing_checkouts where request_id = p_request_id;
  v_had := found;
  if v_had and not (r.price_family = 'list' and exists (select 1 from public.founding_applications a
                     where a.organization_id = p_org and a.status = 'accepted')) then
    return jsonb_build_object('family', coalesce(r.price_family, case when r.product_key like '%\_list' then 'list' else 'founding' end),
      'checkout_url', r.checkout_url, 'completed', r.completed_at is not null);
  end if;
  if exists (select 1 from public.founding_applications a where a.organization_id = p_org and a.status = 'accepted') then
    v_family := 'founding';
  else
    select c.price_family into v_family from public.billing_checkouts c
     where c.organization_id = p_org and c.mode = p_mode and c.price_family is not null
       and c.completed_at is null and c.created_at > now() - interval '24 hours'
     order by c.created_at desc limit 1;
  end if;
  if v_family is null then
    v_family := case when coalesce((select s.value from public.app_settings s where s.key = 'founding_public'), 'on') = 'on'
                       and private.founding_places_left_in(p_mode) > 0 then 'founding' else 'list' end;
  end if;
  if v_had then
    update public.billing_checkouts set price_family = v_family, product_key = p_plan || '_' || p_period,
      checkout_id = null, checkout_url = null where request_id = p_request_id;
    return jsonb_build_object('family', v_family, 'checkout_url', null, 'completed', false);
  end if;
  insert into public.billing_checkouts (request_id, organization_id, product_key, units, mode, created_by, price_family)
  values (p_request_id, p_org, p_plan || '_' || p_period || case when v_family = 'list' then '_list' else '' end, 1, p_mode,
          p_user, v_family);
  return jsonb_build_object('family', v_family, 'checkout_url', null, 'completed', false);
end $$;
revoke all on function public.billing_checkout_family(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.billing_checkout_family(uuid, text, text, text, text, uuid) to service_role;

-- The public count: 0 while the founding price is private, so no public page shows founding places.
create or replace function public.founding_places_left() returns integer
language sql stable security definer set search_path = '' as $$
  select case when coalesce((select s.value from public.app_settings s where s.key = 'founding_public'), 'on') = 'on'
              then private.founding_places_left_in('live') else 0 end
$$;
revoke all on function public.founding_places_left() from public, anon, authenticated;
grant execute on function public.founding_places_left() to service_role;

-- 5. WhatsApp (blueprint 11.2 row 6a): a new phone number or website, shown back exactly and approved with a tap, goes through
-- the existing owner write (apply_profile_field) and its listing_revert publication. apply_profile_field as it stands live
-- (20261021260000) with its conditions widened for the phone from WhatsApp only, each replaced in its current text; the migration stops if a text is not
-- found, so nothing else in the function changes. The phone is not a high-risk field (private.protection_high_risk) and the
-- publication already sends it as phoneNumbers.primaryPhone. The phone is accepted from WhatsApp only (no screen offers it);
-- the main category stays dashboard only.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.apply_profile_field(uuid, uuid, text, text, text, jsonb)'::regprocedure);
  n := replace(d, $x$if p_field not in ('website', 'main_category') then raise exception 'bad_field'; end if;$x$,
                  $x$if p_field not in ('website', 'main_category') and not (p_field = 'phone' and p_channel = 'whatsapp') then raise exception 'bad_field'; end if;$x$);
  n := replace(n, $x$if p_channel <> 'dashboard' then raise exception 'bad_channel'; end if;$x$,
                  $x$if p_channel <> 'dashboard' and not (p_channel = 'whatsapp' and p_field in ('website', 'phone')) then raise exception 'bad_channel'; end if;$x$);
  n := replace(n, $x$    if trim(p_display) !~ '^https?://[^[:space:]]+$' then raise exception 'bad_value'; end if;
  else$x$, $x$    if trim(p_display) !~ '^https?://[^[:space:]]+$' then raise exception 'bad_value'; end if;
  elsif p_field = 'phone' then
    if trim(p_display) !~ '^\+?[0-9][0-9 ().-]{5,22}[0-9]$'
       or length(regexp_replace(p_display, '[^0-9]', '', 'g')) not between 7 and 15 then raise exception 'bad_value'; end if;
  else$x$);
  n := replace(n, $x$and (p_field = 'website' or f.value -> 'raw' is not distinct from p_raw) then$x$,
                  $x$and (p_field in ('website', 'phone') or f.value -> 'raw' is not distinct from p_raw) then$x$);
  n := replace(n, $x$jsonb_build_object('display', trim(p_display), 'raw', case when p_field = 'website' then to_jsonb(trim(p_display)) else p_raw end),$x$,
                  $x$jsonb_build_object('display', trim(p_display), 'raw', case when p_field = 'website' then to_jsonb(trim(p_display))
      when p_field = 'phone' then jsonb_build_object('primaryPhone', trim(p_display)) else p_raw end),$x$);
  n := replace(n, $x$case when p_field = 'website' then 'You changed your website link in Kabsi.' else 'You changed your categories in Kabsi.' end);$x$,
                  $x$case when p_field = 'website' then 'You changed your website link in Kabsi.'
         when p_field = 'phone' then 'You changed your phone number in Kabsi.' else 'You changed your categories in Kabsi.' end);$x$);
  if n = d or n !~ $x$p_field = 'phone' and p_channel = 'whatsapp'\) then raise exception 'bad_field'$x$ or n !~ $x$p_channel = 'whatsapp' and p_field in$x$ or n !~ $x$elsif p_field = 'phone' then$x$
     or n !~ $x$p_field in \('website', 'phone'\) or f.value$x$ or n !~ 'primaryPhone' or n !~ 'You changed your phone number' then
    raise exception 'apply_profile_field: the text was not found';
  end if;
  execute n;
end $$;

-- 6. The pipeline's WhatsApp rule (K-129 point 2) refuses identity fields, the phone among them. OFFER-2 narrows it for one
-- case only: a phone number the owner typed on WhatsApp, saw shown back exactly and approved with a tap (a profile_changes row
-- of source owner_edit, made only by apply_profile_field). A phone change Google made, and every other identity field, stay
-- refused on WhatsApp. approve_publication as it stands live, with that one condition replaced in its current text.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure);
  n := replace(d, $x$where (id = p_target_id or listing_change_id = p_target_id) and private.whatsapp_identity_field(field)))) then$x$,
                  $x$where (id = p_target_id or listing_change_id = p_target_id) and private.whatsapp_identity_field(field)
               and not (field = 'phone' and source = 'owner_edit')))) then$x$);
  if n = d then raise exception 'approve_publication: the WhatsApp identity condition was not found'; end if;
  execute n;
end $$;
