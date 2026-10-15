-- P0.3-06: roles and approval policies (K-16, R-22, guardrail 11).
--
-- 1. Three roles on a business (location_members.role): owner, manager, staff (R-22: "reviewer" and "viewer" are not
--    separate roles; a partner member reaches a client business only through its partner link and the policy).
--      owner    sees everything; approves everything; sets the policies, the team, billing and disconnect.
--      manager  sees everything except billing; approves what the owner's policy allows.
--      staff    sees photos and the review link; uploads photos; approves nothing.
-- 2. public.approval_policies: one row per business and kind (review_reply, post, photo, profile_change, hours) when
--    the owner changes the default. owner (the default: the owner approves), owner_and_managers, partner (the partner
--    may approve) and partner_prepares (the partner prepares, the owner approves). The two partner modes are stored
--    only with the owner's consent text and date (used by P1-01). public.set_approval_policy (owner only, audited).
-- 3. private.may_approve(business, kind, user, owner_only) is the one rule every approval path asks: approve_publication
--    (dashboard, email links, Nora and the Edge Functions all reach Google through it), decide_profile_change,
--    undo_publication, skip and "I'll reply myself". Name, address, main category, open status and map pin, and
--    high-risk reviews, pass owner_only = true: always the owner, whatever the policy says.
-- 4. public.can_see(business, area) is the read rule: the RLS policies of every business table use it instead of
--    is_member (area all: owner and manager; billing: owner; photos and review_link: all three roles).
-- 5. Every browser RPC that checked membership now checks the role: billing, plan, deletion, consent and onboarding
--    are the owner's; review links, notification settings, auto posts and the activity feed are owner or manager;
--    adding a photo is any role. Owner emails with approval links go to owners only.
-- 6. Team (Settings, owner only): public.team_invites and invite_team_member, cancel_team_invite, claim_team_invites
--    (the invitee signs in with the invited address), set_member_role (never leaves a business without an owner),
--    list_team, and the team_invite_email job. Role changes are audited by the location_members audit trigger.
--    Removing a member, and the owner-only check on choose_plan and owner_submit_claim (their bodies remove rows),
--    are in 20261015120010_roles_links.sql with the two foreign keys; Hussein runs that file.
-- 7. public.my_access(business): the caller's role and what they may approve, for the screens.
--
-- Additive: two new tables, new functions, re-created functions and altered read policies (ALTER POLICY, nothing is
-- dropped). No row is removed.

-- 1. Approval policies ------------------------------------------------------------------------------------------------

create table public.approval_policies (
  location_id uuid not null,
  kind text not null check (kind in ('review_reply', 'post', 'photo', 'profile_change', 'hours')),
  policy text not null check (policy in ('owner', 'owner_and_managers', 'partner', 'partner_prepares')),
  consent_text text check (length(consent_text) <= 1000),
  consent_at timestamptz,
  set_by uuid not null,
  set_at timestamptz not null default now(),
  primary key (location_id, kind),
  constraint partner_needs_consent check (policy not in ('partner', 'partner_prepares')
    or (consent_at is not null and length(btrim(coalesce(consent_text, ''))) >= 10))
);
comment on table public.approval_policies is
  'P0.3-06 (K-16): who approves each kind for a business. No row means the owner approves.';
alter table public.approval_policies enable row level security;
revoke all on public.approval_policies from public, anon, authenticated;
create policy owners_managers_read_policies on public.approval_policies for select to authenticated
  using ((select public.has_location_role(location_id, array['owner', 'manager'])) or (select public.is_staff()));
grant select on public.approval_policies to authenticated;

-- The publication's target type as a policy kind.
create function private.approval_kind(p_target_type text) returns text
language sql immutable set search_path = '' as $$
  select case p_target_type when 'review_reply' then 'review_reply' when 'local_post' then 'post' when 'photo' then 'photo'
    when 'special_hours' then 'hours' when 'listing_revert' then 'profile_change' when 'listing_edit' then 'profile_change'
    else p_target_type end
$$;

create function private.approval_policy(p_location uuid, p_kind text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select policy from public.approval_policies where location_id = p_location and kind = p_kind), 'owner')
$$;

-- The one approval rule. The owner always may. owner_only (high-risk fields and reviews) stops everyone else. A manager
-- may when the policy is owner_and_managers. A member of the business's partner organisation may when the policy is
-- partner and the partner link is live. Staff, strangers and every other case may not.
create function private.may_approve(p_location uuid, p_kind text, p_user uuid, p_owner_only boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_role text; v_policy text;
begin
  if p_user is null or p_location is null then return false; end if;
  select role into v_role from public.location_members where location_id = p_location and user_id = p_user;
  if v_role = 'owner' then return true; end if;
  if coalesce(p_owner_only, false) then return false; end if;
  v_policy := private.approval_policy(p_location, p_kind);
  if v_role = 'manager' then return v_policy = 'owner_and_managers'; end if;
  if v_role is null and v_policy = 'partner' then
    return exists (select 1 from public.partner_clients pc
                     join public.organization_members om on om.organization_id = pc.partner_organization_id
                    where pc.location_id = p_location and pc.status in ('onboarding', 'active') and om.user_id = p_user);
  end if;
  return false;
end $$;

-- The read rule for business rows: all (owner, manager), billing (owner), photos and review_link (every role).
create function public.can_see(p_location uuid, p_area text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.location_members m
    where m.location_id = p_location and m.user_id = auth.uid()
      and case p_area when 'billing' then m.role = 'owner'
                      when 'photos' then m.role in ('owner', 'manager', 'staff')
                      when 'review_link' then m.role in ('owner', 'manager', 'staff')
                      else m.role in ('owner', 'manager') end)
$$;
revoke execute on function public.can_see(uuid, text) from public, anon;
grant execute on function public.can_see(uuid, text) to authenticated;

-- What the signed-in person is on this business and what they may approve (for the screens; the database decides).
create function public.my_access(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_role text; v_uid uuid := auth.uid();
begin
  select role into v_role from public.location_members where location_id = p_location and user_id = v_uid;
  if v_role is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('role', v_role,
    'approve', (select jsonb_object_agg(k, private.may_approve(p_location, k, v_uid, false))
                  from unnest(array['review_reply', 'post', 'photo', 'profile_change', 'hours']) k),
    'approve_high_risk', v_role = 'owner');
end $$;

-- The owner sets who approves one kind. The partner modes need the consent text the owner agreed to.
create function public.set_approval_policy(p_location uuid, p_kind text, p_policy text, p_consent_text text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_old text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('review_reply', 'post', 'photo', 'profile_change', 'hours') then raise exception 'bad_kind'; end if;
  if p_policy not in ('owner', 'owner_and_managers', 'partner', 'partner_prepares') then raise exception 'bad_policy'; end if;
  if p_policy in ('partner', 'partner_prepares') and length(btrim(coalesce(p_consent_text, ''))) < 10 then
    raise exception 'consent_required';
  end if;
  v_old := private.approval_policy(p_location, p_kind);
  insert into public.approval_policies (location_id, kind, policy, consent_text, consent_at, set_by, set_at)
  values (p_location, p_kind, p_policy,
    case when p_policy in ('partner', 'partner_prepares') then btrim(p_consent_text) end,
    case when p_policy in ('partner', 'partner_prepares') then now() end, v_uid, now())
  on conflict (location_id, kind) do update set policy = excluded.policy, consent_text = excluded.consent_text,
    consent_at = excluded.consent_at, set_by = excluded.set_by, set_at = excluded.set_at;
  perform private.audit('user', v_uid, 'approval_policy_set', p_location, 'approval_policies', p_kind,
    jsonb_build_object('policy', v_old), jsonb_build_object('policy', p_policy), 'dashboard', p_policy);
  return jsonb_build_object('kind', p_kind, 'policy', p_policy);
end $$;

-- 2. Read rules ---------------------------------------------------------------------------------------------------------

alter policy audit_events_read on public.audit_events
  using (((location_id is not null) and public.can_see(location_id, 'all'))
         or ((organization_id is not null) and public.is_org_member(organization_id, array['owner', 'admin']))
         or public.is_staff());
alter policy members_read_card_orders on public.card_orders
  using (public.can_see(location_id, 'billing') or public.is_partner_member(partner_id) or (select public.is_staff()));
alter policy members_read_cards on public.cards
  using (public.can_see(location_id, 'review_link') or public.is_partner_member(partner_id) or (select public.is_staff()));
alter policy members_read_posts on public.gbp_posts using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_google_connections on public.google_connections
  using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_confirms on public.knowledge_confirms
  using ((select public.can_see(knowledge_confirms.location_id, 'all')) or (select public.is_staff()));
alter policy members_read_facts on public.knowledge_facts using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_baselines on public.listing_baselines using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_changes on public.listing_changes using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy owner_or_partner_read_partner_clients on public.partner_clients
  using (public.can_see(location_id, 'all') or public.is_org_member(partner_organization_id) or (select public.is_staff()));
alter policy members_read_payments on public.payments using (public.can_see(location_id, 'billing') or (select public.is_staff()));
alter policy members_read_photos on public.photos using (public.can_see(location_id, 'photos') or (select public.is_staff()));
alter policy members_read_plans on public.plans using (public.can_see(location_id, 'billing') or (select public.is_staff()));
alter policy members_read_profile_changes on public.profile_changes using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_profile_tasks on public.profile_tasks
  using ((select public.can_see(profile_tasks.location_id, 'all')) or (select public.is_staff()));
alter policy members_read_publications on public.publications using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_snapshots on public.rating_snapshots using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_drafts on public.reply_drafts
  using (exists (select 1 from public.reviews r where r.id = reply_drafts.review_id
                  and (public.can_see(r.location_id, 'all') or (select public.is_staff()))));
alter policy members_read_reviews on public.reviews using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_hours on public.special_hours using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_offers on public.style_offers
  using ((select public.can_see(style_offers.location_id, 'all')) or (select public.is_staff()));
alter policy members_read_taps on public.taps using (public.can_see(location_id, 'review_link') or (select public.is_staff()));
alter policy read_own_claims on public.usdt_claims
  using (public.is_partner_member(partner_id) or public.can_see(location_id, 'billing') or (select public.is_staff()));
alter policy members_read_reports on public.weekly_reports using (public.can_see(location_id, 'all') or (select public.is_staff()));
alter policy members_read_tasks on public.tasks
  using ((select public.can_see(location_id, 'all')) or (select public.is_staff()));

-- 3. Every browser RPC that checked membership now checks the role ---------------------------------------------------

-- billing_invoice_status: owner.
CREATE OR REPLACE FUNCTION public.billing_invoice_status(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare inv public.billing_invoices;
begin
  select * into inv from public.billing_invoices where id = p_id;
  if not found or not public.has_location_role(inv.location_id, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('status', inv.status, 'last_payment_status', inv.last_payment_status);
end $function$;

-- billing_prepare_invoice: owner.
CREATE OR REPLACE FUNCTION public.billing_prepare_invoice(p_location uuid, p_item text, p_pay_currency text, p_test boolean DEFAULT false)
 RETURNS TABLE(id uuid, order_id text, amount_usd numeric, invoice_url text, reused boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_open public.billing_invoices; v_amount numeric; v_id uuid; v_order text;
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if public.partner_covered(p_location) then raise exception 'plan_through_partner'; end if;
  if not (p_item = any (public.owner_plan_kinds(p_location))) then raise exception 'bad_plan'; end if;
  if p_pay_currency not in ('usdttrc20','usdtbsc') then raise exception 'bad_currency'; end if;
  if not public.billing_enabled_for(p_location) then raise exception 'not_available'; end if;
  if p_test and not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into v_open from public.billing_invoices b
   where b.location_id = p_location and b.item = p_item and b.pay_currency = p_pay_currency and b.status = 'open'
     and b.is_test = coalesce(p_test, false) and b.created_at > now() - interval '60 minutes' and b.invoice_url is not null
   order by b.created_at desc limit 1;
  if found then
    return query select v_open.id, v_open.order_id, v_open.amount_usd, v_open.invoice_url, true;
    return;
  end if;
  if (select count(*) from public.billing_invoices b where b.location_id = p_location and b.status in ('creating','open')) >= 3 then
    raise exception 'too_many_invoices';
  end if;
  v_amount := case when p_test then 1.00 else public.plan_price(p_item) end;
  v_id := gen_random_uuid();
  v_order := 'kb1.' || p_item || '.' || p_location::text || '.' || encode(extensions.gen_random_bytes(6), 'hex');
  insert into public.billing_invoices (id, location_id, item, amount_usd, pay_currency, order_id, is_test, created_by)
  values (v_id, p_location, p_item, v_amount, p_pay_currency, v_order, coalesce(p_test, false), auth.uid());
  return query select v_id, v_order, v_amount, null::text, false;
end $function$;

-- plan_summary: owner.
CREATE OR REPLACE FUNCTION public.plan_summary(p_location uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.locations; cur public.plans; v_tier text; v_covered boolean; v_tz text; v_unbilled boolean;
begin
  if not (public.has_location_role(p_location, array['owner']) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
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
    'nowpayments', public.billing_enabled_for(l.id) and not v_covered,
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
end $function$;

-- cancel_location_deletion: owner.
CREATE OR REPLACE FUNCTION public.cancel_location_deletion(p_location uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.locations set deletion_requested_at = null, deletion_requested_by = null, deletion_notice_at = null
  where id = p_location;
end $function$;

-- request_location_deletion: owner.
CREATE OR REPLACE FUNCTION public.request_location_deletion(p_location uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.locations set deletion_requested_at = coalesce(deletion_requested_at, now()),
    deletion_requested_by = coalesce(deletion_requested_by, auth.uid())
  where id = p_location;
  return (select deletion_requested_at + interval '7 days' from public.locations where id = p_location);
end $function$;

-- save_consent: owner.
CREATE OR REPLACE FUNCTION public.save_consent(p_location uuid, p_text text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(trim(p_text), '') = '' then raise exception 'consent_text_required'; end if;
  update public.locations set consent_text = left(p_text, 1000), consent_at = now() where id = p_location;
  return public.refresh_location_status(p_location);
end $function$;

-- set_onboarding_step: owner.
CREATE OR REPLACE FUNCTION public.set_onboarding_step(p_location uuid, p_step text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_step not in ('business','access','knowledge','plan','done') then raise exception 'bad_step'; end if;
  update public.locations set onboarding_step = p_step where id = p_location;
end $function$;

-- activate_card: owner or manager.
CREATE OR REPLACE FUNCTION public.activate_card(p_code text, p_location uuid, p_label text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.cards; v_place text; v_code text := upper(trim(p_code)); v_dest text;
begin
  if not (public.has_location_role(p_location, array['owner', 'manager']) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into c from public.cards where code = v_code for update;
  if not found then raise exception 'unknown_card'; end if;
  if c.status = 'disabled' and not public.is_staff() then raise exception 'card_disabled'; end if;
  if c.location_id is not null and c.location_id <> p_location and not public.is_staff() then raise exception 'card_in_use'; end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  v_dest := 'https://search.google.com/local/writereview?placeid=' || v_place;
  update public.cards set location_id = p_location, destination = v_dest, status = 'active',
    activated_at = coalesce(activated_at, now()), label = coalesce(left(p_label, 60), label)
  where code = v_code;
  return v_dest;
end $function$;

-- create_review_link: owner or manager.
CREATE OR REPLACE FUNCTION public.create_review_link(p_location uuid, p_label text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text; v_place text;
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  if (select count(*) from public.cards where location_id = p_location and kind = 'link') >= 5 then
    raise exception 'too_many_links';
  end if;
  loop
    select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 31), 1), '') into v_code
      from (select extensions.gen_random_bytes(6) as b) r, generate_series(0,5) i;
    begin
      insert into public.cards(code, kind) values (v_code, 'link');
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  -- The update (not the insert) fires cards_kv_sync, which publishes the code to the Worker.
  update public.cards set location_id = p_location, status = 'active', activated_at = now(),
    destination = 'https://search.google.com/local/writereview?placeid=' || v_place,
    label = coalesce(nullif(left(trim(p_label), 60), ''), 'Review link')
  where code = v_code;
  return v_code;
end $function$;

-- rename_card: owner or manager.
CREATE OR REPLACE FUNCTION public.rename_card(p_code text, p_label text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_loc uuid;
begin
  select location_id into v_loc from public.cards where code = p_code;
  if v_loc is null or not public.has_location_role(v_loc, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.cards set label = left(p_label, 60) where code = p_code;
end $function$;

-- set_card_active: owner or manager.
CREATE OR REPLACE FUNCTION public.set_card_active(p_code text, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_loc uuid; v_code text := upper(trim(p_code));
begin
  select location_id into v_loc from public.cards where code = v_code;
  if not found then raise exception 'unknown_card'; end if;
  if not (public.is_staff() or (v_loc is not null and public.has_location_role(v_loc, array['owner', 'manager']))) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.cards set status = case
      when p_active and location_id is not null and destination is not null then 'active'
      when p_active then 'unassigned'
      else 'disabled' end
  where code = v_code;
end $function$;

-- activity_feed: owner or manager.
CREATE OR REPLACE FUNCTION public.activity_feed(p_location uuid, p_days integer DEFAULT 7)
 RETURNS TABLE(day date, happened_at timestamp with time zone, action text, line text, times integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare v_tz text; v_days integer := least(greatest(coalesce(p_days, 7), 1), 90);
begin
  if not (public.has_location_role(p_location, array['owner', 'manager']) or public.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(nullif(l.time_zone, ''), 'UTC') into v_tz from public.locations l where l.id = p_location;
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;

  return query
  with ev as (
    select e.*, (e.created_at at time zone v_tz)::date as d, e.after ->> 'target_type' as target
    from public.audit_events e
    where e.location_id = p_location and e.created_at >= now() - make_interval(days => v_days)
      and (e.action in ('google_check', 'reply_drafted')
        or (e.action = 'publication' and e.result in ('live', 'in_review')))
  ), grouped as (
    select ev.d, max(ev.created_at) as happened_at, ev.action, null::text as target, null::text as result, null::text as actor_type,
           null::text as object_id, count(*)::integer as n
    from ev where ev.action = 'google_check' group by ev.d, ev.action
    union all
    select ev.d, max(ev.created_at), ev.action, ev.target, 'live', null, null, count(*)::integer
    from ev where ev.action = 'publication' and ev.target = 'photo' and ev.result = 'live' group by ev.d, ev.action, ev.target
    union all
    select ev.d, ev.created_at, ev.action, ev.target, ev.result, ev.actor_type, ev.object_id, 1
    from ev where ev.action = 'reply_drafted'
       or (ev.action = 'publication' and not (ev.target = 'photo' and ev.result = 'live'))
  )
  select g.d, g.happened_at, g.action,
    case
      when g.action = 'google_check' then 'Checked your Google profile'
      when g.action = 'reply_drafted' then
        coalesce('Prepared a reply to ' || nullif(split_part(trim(r.reviewer_name), ' ', 1), '') || '''s review',
                 'Prepared a reply to a review')
      when g.target = 'photo' and g.result = 'live' then
        case when g.n = 1 then 'Added 1 approved photo' else 'Added ' || g.n || ' approved photos' end
      when g.target = 'review_reply' and g.actor_type = 'staff' then 'Our team posted your approved reply on Google'
      when g.target = 'review_reply' and g.result = 'in_review' then 'Sent your approved reply to Google, which is checking it'
      when g.target = 'review_reply' then 'Published your approved reply'
      when g.target = 'local_post' and g.result = 'in_review' then 'Sent your approved post to Google, which is checking it'
      when g.target = 'local_post' then 'Published your approved post'
      when g.target = 'photo' then 'Sent your approved photo to Google, which is checking it'
      when g.target = 'special_hours' then 'Updated your special hours on Google'
      when g.target = 'listing_edit' then 'Updated your Google profile with the change you approved'
      when g.target = 'listing_revert' then 'Restored your approved information on Google'
      else 'Updated Google with something you approved'
    end,
    g.n
  from grouped g
  left join public.reviews r on g.action = 'reply_drafted' and r.id::text = g.object_id and r.content_purged_at is null
  order by g.happened_at desc
  limit 200;
end $function$;

-- set_auto_posts: owner or manager.
CREATE OR REPLACE FUNCTION public.set_auto_posts(p_location uuid, p_enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.locations set auto_posts = coalesce(p_enabled, true) where id = p_location;
end $function$;

-- update_notification_settings: owner or manager.
CREATE OR REPLACE FUNCTION public.update_notification_settings(p_location uuid, p_alert_emails text[], p_digest_hour smallint, p_time_zone text, p_pause_days integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_time_zone is not null and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'unknown time zone';
  end if;
  update public.locations set
    alert_emails = coalesce(p_alert_emails, alert_emails),
    digest_hour = coalesce(p_digest_hour, digest_hour),
    time_zone = coalesce(p_time_zone, time_zone),
    emails_paused_until = case when p_pause_days is null then emails_paused_until
                               when p_pause_days = 0 then null
                               else now() + make_interval(days => least(p_pause_days, 30)) end
  where id = p_location;
end $function$;

-- add_photo: owner, manager or staff.
CREATE OR REPLACE FUNCTION public.add_photo(p_location uuid, p_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if not public.has_location_role(p_location, array['owner', 'manager', 'staff']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if split_part(p_path, '/', 1) <> p_location::text then raise exception 'bad_path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'owner-photos' and name = p_path) then raise exception 'not_uploaded'; end if;
  insert into public.photos (location_id, storage_path) values (p_location, p_path) returning id into v_id;
  return v_id;
end $function$;

-- skip_review: whoever may approve review replies (K-16).
CREATE OR REPLACE FUNCTION public.skip_review(p_review uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_loc uuid; v_high boolean;
begin
  select location_id, risk = 'high' into v_loc, v_high from public.reviews where id = p_review;
  if v_loc is null or not public.is_member(v_loc) then raise exception 'forbidden' using errcode = '42501'; end if;
  -- P0.3-06 (K-16): choosing not to reply is a decision on the review, so it follows the approval policy.
  if not private.may_approve(v_loc, 'review_reply', auth.uid(), coalesce(v_high, false)) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  update public.reviews set state = 'skipped' where id = p_review and state in ('new','drafted','blocked');
end $function$;

-- handle_review_offline: whoever may approve review replies (K-16).
CREATE OR REPLACE FUNCTION public.handle_review_offline(p_review uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_loc uuid; v_high boolean;
begin
  select location_id, risk = 'high' into v_loc, v_high from public.reviews where id = p_review;
  if v_loc is null or not public.is_member(v_loc) then raise exception 'forbidden' using errcode = '42501'; end if;
  -- P0.3-06 (K-16): choosing not to reply is a decision on the review, so it follows the approval policy.
  if not private.may_approve(v_loc, 'review_reply', auth.uid(), coalesce(v_high, false)) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  update public.reviews set state = 'handled_offline' where id = p_review and state in ('new','drafted','blocked');
end $function$;

-- Approval paths ----------------------------------------------------------------------------------------------------

-- approve_publication: the approval policy decides who may approve (was: any member).
CREATE OR REPLACE FUNCTION public.approve_publication(p_target_type text, p_target_id uuid, p_payload jsonb, p_approved_by uuid, p_channel text, p_undo_seconds integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.locations; p public.publications; v_loc uuid; v_state text; v_payload jsonb; v_text text;
  v_n integer; r public.reviews; po public.gbp_posts; ph public.photos; sh public.special_hours;
  pc public.profile_changes; kf public.knowledge_facts; v_cat text; v_target uuid := p_target_id;
begin
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;

  -- Lock the item: approvals of the same item take turns, and the second finds the first's publication.
  case p_target_type
  when 'review_reply' then
    v_text := trim(coalesce(p_payload ->> 'text', ''));
    if length(v_text) < 1 or length(v_text) > 4000 then raise exception 'bad_reply_text'; end if;
    select * into r from public.reviews where id = p_target_id for update;
    if not found then raise exception 'unknown_review'; end if;
    v_loc := r.location_id; v_state := r.state;
    v_payload := jsonb_build_object('text', v_text);
  when 'local_post' then
    v_text := trim(coalesce(p_payload ->> 'summary', ''));
    if length(v_text) < 10 or length(v_text) > 1500 then raise exception 'bad_post_text'; end if;
    select * into po from public.gbp_posts where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := po.location_id; v_state := po.state;
    v_payload := jsonb_build_object('summary', v_text, 'language', coalesce(nullif(p_payload ->> 'language', ''), 'en'),
      'cta_type', po.cta_type, 'cta_url', po.cta_url);
  when 'photo' then
    select * into ph from public.photos where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_cat := coalesce(nullif(p_payload ->> 'category', ''), ph.category, 'ADDITIONAL');
    if v_cat not in ('EXTERIOR', 'INTERIOR', 'PRODUCT', 'TEAMS', 'FOOD_AND_DRINK', 'ADDITIONAL') then
      raise exception 'bad_category';
    end if;
    v_loc := ph.location_id; v_state := ph.state;
    v_payload := jsonb_build_object('storage_path', ph.storage_path, 'category', v_cat);
  when 'special_hours' then
    select * into sh from public.special_hours where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := sh.location_id; v_state := sh.state;
    v_payload := jsonb_build_object('start_date', sh.start_date, 'end_date', sh.end_date, 'closed', sh.closed,
      'open_time', to_char(sh.open_time, 'HH24:MI'), 'close_time', to_char(sh.close_time, 'HH24:MI'));
  when 'listing_revert' then
    -- P0.2-04: a Google Protection change (profile_changes). An id of the retired listing_changes resolves to its
    -- mirrored change, for the Edge Function code that runs until this task deploys.
    select * into pc from public.profile_changes where id = p_target_id for update;
    if not found then
      select * into pc from public.profile_changes where listing_change_id = p_target_id for update;
      if not found then raise exception 'unknown_target'; end if;
    end if;
    v_target := pc.id;
    v_loc := pc.location_id; v_state := pc.status;
    -- K-19, A4: the high-risk fields never go from an email link, unless the owner is signed in on its page (P0.2-05).
    if private.protection_high_risk(pc.field) and p_channel <> 'dashboard' and not private.signed_in_as(p_approved_by) then raise exception 'sign_in_required'; end if;
    -- The value to put back is the owner's approved fact, read here, never from the screen (K-18).
    select * into kf from public.knowledge_facts
     where location_id = pc.location_id and slot = 'profile.' || pc.field and superseded_by is null;
    if not found or kf.status <> 'verified' or kf.value is null then raise exception 'not_confirmed'; end if;
    v_payload := jsonb_build_object('field', pc.field, 'value', coalesce(kf.value ->> 'display', ''),
      'raw', kf.value -> 'raw', 'fact_id', kf.id);
  else
    raise exception 'unsupported_target';
  end case;

  -- P0.3-06 (K-16): who may approve this kind for this business. Name, address, main category, open status and map
  -- pin, and high-risk reviews, always need the owner; staff never approve.
  if not private.may_approve(v_loc, private.approval_kind(p_target_type), p_approved_by,
       (p_target_type = 'review_reply' and r.risk = 'high')
       or (p_target_type = 'listing_revert' and private.protection_high_risk(pc.field))) then
    if not exists (select 1 from public.location_members where location_id = v_loc and user_id = p_approved_by) then
      raise exception 'approver_not_member';
    end if;
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;

  -- K-38: a second tap, a second email click or the other channel gets the existing result.
  select * into p from public.publications
   where target_type = p_target_type and target_id = v_target
     and state in ('approved', 'publishing', 'published', 'checking', 'verifying', 'verified')
   order by created_at desc limit 1;
  if found then
    return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
      'publish_after', p.publish_after, 'created', false);
  end if;

  select * into l from public.locations where id = v_loc;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  -- Early access (D267): a person posts replies by hand; posts, photos, hours and Protection wait for Google access.
  if l.concierge and p_target_type <> 'review_reply' then raise exception 'concierge_profile'; end if;

  case p_target_type
  when 'review_reply' then
    if v_state not in ('drafted', 'blocked') then raise exception 'already_posted'; end if;
    update public.reviews set state = 'publishing', reply_state_reason = null where id = p_target_id;
  when 'local_post' then
    if v_state <> 'draft' then raise exception 'already_handled'; end if;
    update public.gbp_posts set state = 'publishing', body = v_text where id = p_target_id;
  when 'photo' then
    if v_state <> 'draft' then raise exception 'already_handled'; end if;
    update public.photos set state = 'publishing', category = v_cat where id = p_target_id;
  when 'special_hours' then
    if v_state <> 'draft' then raise exception 'already_handled'; end if;
    update public.special_hours set state = 'publishing' where id = p_target_id;
  when 'listing_revert' then
    if v_state not in ('detected', 'awaiting_review') then raise exception 'already_decided'; end if;
    update public.profile_changes set status = 'rejected', decided_at = now(), decided_by = p_approved_by
     where id = v_target;
  end case;

  select count(*) into v_n from public.publications where target_type = p_target_type and target_id = v_target;
  insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route,
    idempotency_key, publish_after)
  values (v_loc, p_target_type, v_target, v_payload, p_approved_by, p_channel, 'approved',
    case when l.concierge then 'concierge' else 'api' end, p_target_type || ':' || v_target || ':' || (v_n + 1),
    now() + make_interval(secs => greatest(coalesce(p_undo_seconds, 10), 0)))
  returning * into p;
  if p_target_type = 'listing_revert' then
    update public.profile_changes set publication_id = p.id where id = v_target;
  end if;
  perform public.enqueue_job('publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id),
    p.publish_after);
  return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
    'publish_after', p.publish_after, 'created', true);
end $function$;

-- decide_profile_change: owners, and managers when the policy allows (was: any member).
CREATE OR REPLACE FUNCTION public.decide_profile_change(p_change uuid, p_decision text, p_user uuid, p_channel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.profile_changes; l public.locations; f public.knowledge_facts; v_role text; v_new uuid; v_last timestamptz;
  v_n integer; r jsonb;
begin
  if p_decision not in ('accept', 'reject') then raise exception 'bad_decision'; end if;
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;
  select * into c from public.profile_changes where id = p_change for update;
  if not found then raise exception 'unknown_change'; end if;
  select role into v_role from public.location_members where location_id = c.location_id and user_id = p_user;
  if v_role is null then raise exception 'not_member'; end if;
  if c.status not in ('detected', 'awaiting_review') then raise exception 'already_decided'; end if;
  -- K-19, K-64, A4: name, address, main category, open status and map pin: the owner, signed in.
  if private.protection_high_risk(c.field) then
    if p_channel <> 'dashboard' and not private.signed_in_as(p_user) then raise exception 'sign_in_required'; end if;
    if v_role <> 'owner' then raise exception 'owner_only'; end if;
  end if;
  -- P0.3-06 (K-16): a decision on a Google change is an approval of the profile_change kind.
  if not private.may_approve(c.location_id, 'profile_change', p_user, private.protection_high_risk(c.field)) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  select * into l from public.locations where id = c.location_id;

  select * into f from public.knowledge_facts
   where location_id = c.location_id and slot = 'profile.' || c.field and superseded_by is null for update;

  if p_decision = 'accept' then
    -- Google's value becomes the owner-approved fact (K-18: the owner's own data from now on).
    if c.google_value is null then raise exception 'values_cleared'; end if;
    v_new := gen_random_uuid();
    if f.id is not null then update public.knowledge_facts set superseded_by = v_new where id = f.id; end if;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
      confirmed_at, uses, version)
    values (v_new, c.location_id, 'profile.' || c.field, c.field,
      jsonb_build_object('display', coalesce(c.google_value ->> 'display', ''), 'raw', coalesce(c.google_value -> 'raw', 'null'::jsonb)),
      'verified', 'google', 'profile_change:' || c.id, p_user, now(), array['profile'], coalesce(f.version, 0) + 1);
    update public.profile_changes set status = 'accepted', decided_by = p_user, decided_at = now() where id = c.id;
    return jsonb_build_object('state', 'accepted', 'fact_id', v_new);
  end if;

  -- "Keep my information": only a value the owner confirmed is ever put back (K-18).
  if f.id is null or f.status <> 'verified' or f.value is null then raise exception 'not_confirmed'; end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;

  -- K-116.2: one high-risk field per approval (each approval is one field), and 7 days between them.
  if private.protection_high_risk(c.field) then
    select max(p.approved_at) into v_last from public.publications p
     where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
       and private.protection_high_risk(private.profile_key(p.payload ->> 'field'))
       and p.approved_at > now() - interval '7 days';
    if v_last is not null then
      raise exception 'high_risk_wait %', to_char((v_last + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');
    end if;
  end if;

  -- K-19: never re-sent more than twice in 30 days. The third conflict goes to Google support, by a person.
  select count(*) into v_n from public.publications p
   where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
     and private.profile_key(p.payload ->> 'field') = c.field and p.approved_at > now() - interval '30 days';
  if v_n >= 2 then
    insert into public.staff_followups (kind, location_id, location_name, detail, due_at)
    select 'google_support', l.id, l.name,
      left(format('Google changed the %s again after Kabsi put the owner''s approved value back %s times in 30 days. '
        || 'Kabsi does not send it a third time (K-19). Contact Google Business Profile support: say the owner confirmed '
        || 'this value, Google keeps replacing it, and ask Google to keep the owner''s value. The values are on change %s '
        || 'in Google Protection.', private.protection_label(c.field), v_n, c.id), 500),
      private.add_business_days(now(), 2)
     where not exists (select 1 from public.staff_followups s
                        where s.kind = 'google_support' and s.location_id = l.id and s.done_at is null);
    update public.profile_changes set status = 'rejected', decided_by = p_user, decided_at = now(),
      support_requested_at = now() where id = c.id;
    perform public.ops_emit('protection_support', 'customers', ':telephone_receiver: Google support needed: ' || l.name,
      'Google keeps changing the ' || private.protection_label(c.field) || '. Kabsi put it back twice in 30 days; contact Google support (staff follow-up).',
      '[]', public.ops_staff_btn(), 'protection_support:' || c.id);
    return jsonb_build_object('state', 'support');
  end if;

  r := public.approve_publication('listing_revert', c.id, '{}'::jsonb, p_user, p_channel);
  return (r - 'state') || jsonb_build_object('state', 'rejected', 'publication_state', r ->> 'state');
end $function$;

-- undo_publication: the approver or someone who may approve that kind.
CREATE OR REPLACE FUNCTION public.undo_publication(p_publication uuid, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.publications;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found then raise exception 'unknown_publication'; end if;
  if not exists (select 1 from public.location_members where location_id = p.location_id and user_id = p_user) then
    raise exception 'not_member';
  end if;
  -- P0.3-06: the person who approved it, or someone who may approve that kind.
  if p_user is distinct from p.approved_by and not private.may_approve(p.location_id, private.approval_kind(p.target_type), p_user, false) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  if p.state = 'cancelled' then return jsonb_build_object('state', 'cancelled'); end if;
  if p.state <> 'approved' or now() >= p.publish_after then raise exception 'too_late'; end if;
  update public.publications set state = 'cancelled', error = 'undone' where id = p.id;
  case p.target_type
  when 'review_reply' then update public.reviews set state = 'drafted' where id = p.target_id and state = 'publishing';
  when 'local_post' then update public.gbp_posts set state = 'draft' where id = p.target_id and state = 'publishing';
  when 'photo' then update public.photos set state = 'draft' where id = p.target_id and state = 'publishing';
  when 'special_hours' then update public.special_hours set state = 'draft' where id = p.target_id and state = 'publishing';
  when 'listing_revert' then
    update public.profile_changes set status = 'awaiting_review', decided_at = null, decided_by = null, publication_id = null
     where id = p.target_id and status = 'rejected';
  else null;
  end case;
  return jsonb_build_object('state', 'cancelled');
end $function$;

-- use_action_link: a skip from an email link follows the approval policy.
CREATE OR REPLACE FUNCTION public.use_action_link(p_token_hash text, p_do text, p_text text DEFAULT NULL::text, p_session_user uuid DEFAULT NULL::uuid, p_publication uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.action_tokens; v_need boolean; v_signed_in boolean; v_result jsonb; r jsonb; v_state text;
begin
  select * into t from public.action_tokens where token_hash = p_token_hash for update;
  if not found then raise exception 'invalid_link'; end if;

  -- Bound to one recipient: for the kinds that need sign-in, another account's session gets nothing, not even a result.
  v_need := private.action_link_needs_sign_in(t.target_type, t.target_id,
    case when p_do = 'undo' then private.action_link_verb(t.action) else p_do end);
  if v_need and p_session_user is not null and p_session_user is distinct from t.user_id then
    raise exception 'wrong_account';
  end if;

  -- Undo (K-70): only the publication this link made, only inside its 10 seconds (undo_publication checks the time).
  if p_do = 'undo' then
    if t.result ->> 'done' = 'undone' then return t.result || jsonb_build_object('repeat', true); end if;
    if t.used_at is null or p_publication is null or t.result ->> 'publication_id' is distinct from p_publication::text then
      raise exception 'not_allowed';
    end if;
    perform public.undo_publication(p_publication, t.user_id);
    v_result := jsonb_build_object('done', 'undone', 'state', 'cancelled');
    update public.action_tokens set result = v_result where id = t.id;
    perform private.audit('user', t.user_id, 'email_link_used', t.location_id,
      case t.target_type when 'listing_change' then 'profile_change' else t.target_type end, t.target_id, null,
      jsonb_build_object('link', t.action, 'do', 'undo', 'signed_in', p_session_user is not null and p_session_user = t.user_id,
        'publication_id', p_publication), 'email_link', 'undone');
    return v_result;
  end if;

  if t.expires_at <= now() then raise exception 'link_expired'; end if;

  -- K-38: a second POST, whatever it asks, gets the first result, with the publication's state as it is now.
  if t.used_at is not null then
    if t.result is null then raise exception 'link_used'; end if;
    v_result := t.result;
    if v_result ? 'publication_id' then
      select state into v_state from public.publications where id = (v_result ->> 'publication_id')::uuid;
      if found then v_result := v_result || jsonb_build_object('state', v_state); end if;
    end if;
    return v_result || jsonb_build_object('repeat', true);
  end if;

  if t.user_id is null or t.target_type not in ('review', 'listing_change') or not (p_do = any (case t.action
      when 'post' then array['post', 'skip'] when 'edit' then array['post', 'skip']
      when 'see_draft' then array['post', 'handle_myself'] when 'skip' then array['skip']
      when 'handle_myself' then array['handle_myself'] when 'revert' then array['revert', 'keep']
      when 'keep' then array['keep', 'revert'] else array[]::text[] end)) then
    raise exception 'not_allowed';
  end if;

  v_signed_in := p_session_user is not null and p_session_user = t.user_id;
  if v_need and not v_signed_in then raise exception 'sign_in_required'; end if;
  if not exists (select 1 from public.location_members where location_id = t.location_id and user_id = t.user_id) then
    raise exception 'not_member';
  end if;

  -- For this call only: the channel for the audit triggers, and the checked sign-in for the high-risk fields.
  perform set_config('kabsi.channel', 'email_link', true);
  perform set_config('kabsi.signed_in_user', case when v_signed_in then t.user_id::text else '' end, true);

  if t.target_type = 'listing_change' then
    -- "revert" is "Keep my information" (reject Google's value), "keep" is "Google is right" (accept it).
    r := public.decide_profile_change(t.target_id::uuid, case when p_do = 'revert' then 'reject' else 'accept' end,
      t.user_id, 'email_link');
    v_result := jsonb_build_object('done', case r ->> 'state' when 'rejected' then 'reverting' when 'accepted' then 'kept'
        else r ->> 'state' end,
      'state', coalesce(r ->> 'publication_state', r ->> 'state'));
    if r ? 'publication_id' then
      v_result := v_result || jsonb_build_object('publication_id', r -> 'publication_id', 'publish_after', r -> 'publish_after');
    end if;
  elsif p_do = 'post' then
    r := public.approve_publication('review_reply', t.target_id::uuid, jsonb_build_object('text', coalesce(p_text, '')),
      t.user_id, 'email_link');
    v_result := jsonb_build_object('done', case when r ->> 'route' = 'concierge' then 'queued_manual' else 'approved' end,
      'state', r ->> 'state', 'publication_id', r -> 'publication_id', 'publish_after', r -> 'publish_after');
  else
    -- P0.3-06 (K-16): skipping from a link is a decision on the review, like approving it.
    if not private.may_approve(t.location_id, 'review_reply', t.user_id,
         coalesce((select risk = 'high' from public.reviews where id = t.target_id::uuid), false)) then
      raise exception 'not_allowed_to_approve' using errcode = '42501';
    end if;
    update public.reviews set state = case when p_do = 'skip' then 'skipped' else 'handled_offline' end
     where id = t.target_id::uuid and state in ('new', 'drafted', 'blocked');
    if not found then raise exception 'already_handled'; end if;
    v_result := jsonb_build_object('done', case when p_do = 'skip' then 'skipped' else 'handled_offline' end);
  end if;

  update public.action_tokens set used_at = now(), result = v_result where id = t.id;
  perform private.audit('user', t.user_id, 'email_link_used', t.location_id,
    case t.target_type when 'listing_change' then 'profile_change' else t.target_type end, t.target_id, null,
    jsonb_build_object('link', t.action, 'do', p_do, 'signed_in', v_signed_in, 'publication_id', v_result -> 'publication_id'),
    'email_link', v_result ->> 'done');

  perform set_config('kabsi.channel', '', true);
  perform set_config('kabsi.signed_in_user', '', true);
  return v_result;
end $function$;

-- location_owner_emails: owners only (and the alert addresses the owner set); managers and staff get no approval links.
CREATE OR REPLACE FUNCTION public.location_owner_emails(p_location uuid)
 RETURNS SETOF text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select distinct lower(e) from (
    select u.email as e from public.location_members m join auth.users u on u.id = m.user_id
      where m.location_id = p_location and m.role = 'owner' and u.email is not null
    union
    select unnest(l.alert_emails) from public.locations l where l.id = p_location
  ) x where e is not null and e <> ''
$function$;

-- list_tasks: owners and managers (staff see photos and the review link only).
CREATE OR REPLACE FUNCTION public.list_tasks(p_location uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not (public.has_location_role(p_location, array['owner', 'manager']) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'kind', t.kind, 'priority', t.priority, 'title', t.title,
               'why', t.why, 'recommendation', t.recommendation, 'path', private.task_path(t.kind, t.source_id),
               'evidence', t.evidence, 'created_at', t.created_at)
             order by case t.priority when 'urgent' then 1 when 'recommended' then 2 else 3 end, t.created_at, t.id)
        from public.tasks t
       where t.location_id = p_location
         and (t.state = 'open' or (t.state = 'snoozed' and t.snooze_until <= now()))), '[]'::jsonb),
    'snoozed', (select count(*) from public.tasks t where t.location_id = p_location and t.state = 'snoozed'
                  and t.snooze_until > now()));
end $function$;


-- 4. Team -------------------------------------------------------------------------------------------------------------

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  role text not null check (role in ('manager', 'staff')),
  invited_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid,
  cancelled_at timestamptz,
  constraint accepted_has_user check ((accepted_at is null) = (accepted_by is null))
);
comment on table public.team_invites is
  'P0.3-06 (K-16): an owner invites a manager or a staff member by email; the invite is used when that address signs in.';
create unique index team_invites_one_open on public.team_invites (location_id, email)
  where accepted_at is null and cancelled_at is null;
alter table public.team_invites enable row level security;
revoke all on public.team_invites from public, anon, authenticated;
create policy owners_read_invites on public.team_invites for select to authenticated
  using ((select public.has_location_role(location_id, array['owner'])) or (select public.is_staff()));
grant select on public.team_invites to authenticated;

-- Invite one person (owner only). An open invite for the same address is replaced by the new role. The email goes out
-- through the team_invite_email job.
create function public.invite_team_member(p_location uuid, p_email text, p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text := lower(btrim(coalesce(p_email, ''))); v_id uuid;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role not in ('manager', 'staff') then raise exception 'bad_role'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then raise exception 'bad_email'; end if;
  if exists (select 1 from public.location_members m join auth.users u on u.id = m.user_id
              where m.location_id = p_location and lower(u.email) = v_email) then
    raise exception 'already_member';
  end if;
  update public.team_invites set cancelled_at = now()
   where location_id = p_location and email = v_email and accepted_at is null and cancelled_at is null;
  insert into public.team_invites (location_id, email, role, invited_by) values (p_location, v_email, p_role, v_uid)
  returning id into v_id;
  perform private.audit('user', v_uid, 'team_invited', p_location, 'team_invites', v_id::text, null,
    jsonb_build_object('role', p_role), 'dashboard', p_role);
  perform public.enqueue_job('team_invite_email', p_location, 'team_invite_email:' || v_id, jsonb_build_object('invite_id', v_id));
  return v_id;
end $$;

create function public.cancel_team_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.team_invites;
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  select * into i from public.team_invites where id = p_invite for update;
  if not found or not public.has_location_role(i.location_id, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if i.accepted_at is not null or i.cancelled_at is not null then return; end if;
  update public.team_invites set cancelled_at = now() where id = i.id;
  perform private.audit('user', auth.uid(), 'team_invite_cancelled', i.location_id, 'team_invites', i.id::text, null,
    jsonb_build_object('role', i.role), 'dashboard', 'cancelled');
end $$;

-- Called after sign-in: every open, unexpired invite for the signed-in, confirmed address becomes a membership with its
-- role. Someone already on the business keeps their role.
create function public.claim_team_invites() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text; i record; n integer := 0;
begin
  if v_uid is null then return 0; end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  for i in select * from public.team_invites
            where email = v_email and accepted_at is null and cancelled_at is null and expires_at > now() for update loop
    insert into public.location_members (location_id, user_id, role) values (i.location_id, v_uid, i.role)
    on conflict do nothing;
    update public.team_invites set accepted_at = now(), accepted_by = v_uid where id = i.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Change a member's role (owner only). A business always keeps at least one owner.
create function public.set_member_role(p_location uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role not in ('owner', 'manager', 'staff') then raise exception 'bad_role'; end if;
  perform 1 from public.location_members where location_id = p_location for update;
  select role into v_old from public.location_members where location_id = p_location and user_id = p_user;
  if v_old is null then raise exception 'not_member'; end if;
  if v_old = p_role then return; end if;
  if v_old = 'owner' and (select count(*) from public.location_members where location_id = p_location and role = 'owner') <= 1 then
    raise exception 'last_owner';
  end if;
  perform set_config('kabsi.channel', 'dashboard', true);
  update public.location_members set role = p_role where location_id = p_location and user_id = p_user;
end $$;

-- The team for Settings (owner only): members with their address and role, and the open invites.
create function public.list_team(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', lower(u.email), 'role', m.role,
                 'you', m.user_id = auth.uid()) order by case m.role when 'owner' then 1 when 'manager' then 2 else 3 end, lower(u.email))
               from public.location_members m join auth.users u on u.id = m.user_id where m.location_id = p_location), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'role', i.role, 'created_at', i.created_at,
                 'expires_at', i.expires_at) order by i.created_at)
               from public.team_invites i where i.location_id = p_location and i.accepted_at is null
                and i.cancelled_at is null and i.expires_at > now()), '[]'::jsonb),
    'policies', coalesce((select jsonb_object_agg(k, private.approval_policy(p_location, k))
               from unnest(array['review_reply', 'post', 'photo', 'profile_change', 'hours']) k), '{}'::jsonb));
end $$;

-- What the invite email needs (the job, service role only).
create function public.team_invite_for_email(p_invite uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('email', i.email, 'role', i.role, 'business', l.name, 'invited_by', lower(u.email),
           'open', i.accepted_at is null and i.cancelled_at is null and i.expires_at > now(), 'expires_at', i.expires_at)
    from public.team_invites i join public.locations l on l.id = i.location_id left join auth.users u on u.id = i.invited_by
   where i.id = p_invite
$$;

revoke execute on function public.my_access(uuid), public.set_approval_policy(uuid, text, text, text),
  public.invite_team_member(uuid, text, text), public.cancel_team_invite(uuid), public.claim_team_invites(),
  public.set_member_role(uuid, uuid, text), public.list_team(uuid) from public, anon;
grant execute on function public.my_access(uuid), public.set_approval_policy(uuid, text, text, text),
  public.invite_team_member(uuid, text, text), public.cancel_team_invite(uuid), public.claim_team_invites(),
  public.set_member_role(uuid, uuid, text), public.list_team(uuid) to authenticated;
revoke execute on function public.team_invite_for_email(uuid) from public, anon, authenticated;
grant execute on function public.team_invite_for_email(uuid) to service_role;
revoke execute on function private.approval_kind(text), private.approval_policy(uuid, text),
  private.may_approve(uuid, text, uuid, boolean) from public, anon, authenticated, service_role;
