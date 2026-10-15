-- P0.3-06: the foreign keys of approval_policies and team_invites, and removing a team member. Run by Hussein in the
-- SQL editor because the file holds cascade clauses and delete statements (inside functions: removing one membership
-- when an owner asks, and the pending plan rows choose_plan and owner_submit_claim already replace; running this file
-- removes no data).
alter table public.approval_policies
  add constraint approval_policies_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade;
alter table public.team_invites
  add constraint team_invites_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade;

-- Remove a member (owner only). A business always keeps at least one owner. The location_members audit trigger records
-- it; the person loses every read and every right on this business at once.
create function public.remove_member(p_location uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  perform 1 from public.location_members where location_id = p_location for update;
  select role into v_role from public.location_members where location_id = p_location and user_id = p_user;
  if v_role is null then raise exception 'not_member'; end if;
  if v_role = 'owner' and (select count(*) from public.location_members where location_id = p_location and role = 'owner') <= 1 then
    raise exception 'last_owner';
  end if;
  perform set_config('kabsi.channel', 'dashboard', true);
  delete from public.location_members where location_id = p_location and user_id = p_user;
end $$;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- choose_plan and owner_submit_claim: the owner only (K-16, billing). Their bodies are unchanged apart from the role.
-- choose_plan: owner.
CREATE OR REPLACE FUNCTION public.choose_plan(p_location uuid, p_kind text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  -- 'trial' is only an intent: the trial row is created when Google access starts.
  if p_kind <> 'trial' and not public.partner_covered(p_location) then
    if not (p_kind = any (public.owner_plan_kinds(p_location))) then raise exception 'bad_plan'; end if;
    delete from public.plans pl where pl.location_id = p_location and pl.status = 'pending'
      and not exists (select 1 from public.payments pay where pay.plan_id = pl.id);
    insert into public.plans (location_id, kind, status) values (p_location, p_kind, 'pending');
  end if;
  update public.locations set onboarding_step = 'done' where id = p_location;
  return public.refresh_location_status(p_location);
end $function$;

-- owner_submit_claim: owner.
CREATE OR REPLACE FUNCTION public.owner_submit_claim(p_location uuid, p_item text, p_network text, p_tx_ref text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if public.partner_covered(p_location) then raise exception 'plan_through_partner'; end if;
  if not (p_item = any (public.owner_plan_kinds(p_location))) then raise exception 'bad_plan'; end if;
  if p_network not in ('trc20','binance_pay') then raise exception 'bad_network'; end if;
  if exists (select 1 from public.usdt_claims where location_id = p_location and kind = 'plan' and status = 'pending') then
    raise exception 'claim_pending' using hint = 'A payment is already waiting for confirmation.';
  end if;
  -- the plan they paid for becomes the unpaid pending plan (paid plans waiting for access are kept)
  delete from public.plans pl where pl.location_id = p_location and pl.status = 'pending' and pl.kind <> p_item
    and not exists (select 1 from public.payments pay where pay.plan_id = pl.id);
  if not exists (select 1 from public.plans pl where pl.location_id = p_location and pl.status = 'pending' and pl.kind = p_item
                 and not exists (select 1 from public.payments pay where pay.plan_id = pl.id)) then
    insert into public.plans (location_id, kind, status) values (p_location, p_item, 'pending');
  end if;
  insert into public.usdt_claims (kind, location_id, item, network, tx_ref, amount_usd, submitted_by)
  values ('plan', p_location, p_item, p_network, trim(p_tx_ref), public.plan_price(p_item), auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'tx_already_used' using hint = 'This transaction ID was already submitted.';
end $function$;

