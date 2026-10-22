-- P0.4-03: the Manager guide (K-93, K-141) and the sixth-step shape of onboarding.
--
-- 1. locations.onboarding_step also takes 'confirm' (step 5 of six: "Confirm your details", shown once access works; before
--    that it shows the calm waiting screen). 'plan' stays valid for businesses already on it; the screens treat it as
--    'confirm'. set_onboarding_step accepts the new value.
-- 2. public.send_manager_steps(location): the owner or a manager asks for the steps to be emailed to themselves, to open on
--    the device that has their Google account ("Send these steps to my other device"). It goes only to the signed-in
--    person's own address, at most 3 times in 24 hours for a business, as a manager_steps_email job (sent through the one
--    notification outbox, category direct). The request is written to the audit log.
--
-- Additive: one constraint widened, one function replaced with the same signature, one function added. No row changes.

alter table public.locations drop constraint locations_onboarding_step_check;
alter table public.locations add constraint locations_onboarding_step_check
  check (onboarding_step in ('business', 'access', 'knowledge', 'confirm', 'plan', 'done'));

create or replace function public.set_onboarding_step(p_location uuid, p_step text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_step not in ('business', 'access', 'knowledge', 'confirm', 'plan', 'done') then raise exception 'bad_step'; end if;
  update public.locations set onboarding_step = p_step where id = p_location;
end $$;

create function public.send_manager_steps(p_location uuid, p_step integer default 1) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_n integer;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  select count(*) into v_n from public.audit_events
   where location_id = p_location and action = 'manager_steps_requested' and actor_id = v_uid and created_at > now() - interval '24 hours';
  if v_n >= 3 then raise exception 'rate_limited'; end if;
  perform private.audit('user', v_uid, 'manager_steps_requested', p_location, 'location', p_location::text, null,
    jsonb_build_object('step', least(greatest(coalesce(p_step, 1), 1), 5)), 'dashboard', 'sent');
  perform public.enqueue_job('manager_steps_email', p_location, 'manager_steps_email:' || p_location || ':' || v_uid || ':' || (v_n + 1),
    jsonb_build_object('user_id', v_uid, 'step', least(greatest(coalesce(p_step, 1), 1), 5)));
end $$;
revoke execute on function public.send_manager_steps(uuid, integer) from public, anon;
grant execute on function public.send_manager_steps(uuid, integer) to authenticated;

-- What the job needs to build the email: the business name and the signed-in person's own address. Service role only.
create function public.manager_steps_target(p_location uuid, p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', l.name, 'email', lower(u.email))
    from public.locations l
    join public.location_members m on m.location_id = l.id and m.user_id = p_user and m.role in ('owner', 'manager')
    join auth.users u on u.id = p_user and u.email is not null
   where l.id = p_location
$$;
revoke execute on function public.manager_steps_target(uuid, uuid) from public, anon, authenticated;
grant execute on function public.manager_steps_target(uuid, uuid) to service_role;
