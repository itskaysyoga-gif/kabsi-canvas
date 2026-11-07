-- R-123 G: a temporary auditor can never write signup attribution.
-- This is an exact replacement of the existing RPC with a deny-first guard.
-- The guard is based on staff identity, not only an unexpired audit grant.
create or replace function public.save_signup_attribution(p jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_created timestamptz;
  v_via text;
  v_done boolean;
  v_fbclid text := p ->> 'fbclid';
  v_fbp text := p ->> 'fbp';
  v_fbc text := p ->> 'fbc';
  v_gclid text := p ->> 'gclid';
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;

  -- The UI also skips this call on audit pages, but the DB guard is authoritative.
  if exists (
    select 1 from public.staff s
    where s.user_id = v_uid and s.role = 'auditor'
  ) then
    raise exception 'This access is read-only.' using errcode = '42501';
  end if;

  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '1 day' then return false; end if;
  v_via := upper(substring(p ->> 'via' from '^[A-Za-z0-9_-]{2,40}$'));
  insert into public.signup_attribution (user_id, first_touch, last_touch, fbclid, fbp, fbc, gclid, ads_ok, via_code, via_at)
  values (v_uid, private.clean_touch(p -> 'first'), private.clean_touch(p -> 'last'),
    case when length(v_fbclid) <= 500 and v_fbclid ~ '^[A-Za-z0-9_-]+$' then v_fbclid end,
    case when length(v_fbp) <= 80 and v_fbp ~ '^fb\\.[0-9]\\.[0-9]{10,16}\\.[0-9]{1,30}$' then v_fbp end,
    case when length(v_fbc) <= 540 and v_fbc ~ '^fb\\.[0-9]\\.[0-9]{10,16}\\.[A-Za-z0-9_-]+$' then v_fbc end,
    case when length(v_gclid) <= 300 and v_gclid ~ '^[A-Za-z0-9_-]+$' then v_gclid end,
    case when jsonb_typeof(p -> 'ads') = 'boolean' then (p ->> 'ads')::boolean end,
    v_via, case when v_via is not null then now() end)
  on conflict (user_id) do nothing
  returning true into v_done;
  if v_via is not null then
    update public.locations set via_code = v_via where created_by = v_uid and via_code is null;
  end if;
  return coalesce(v_done, false);
end;
$$;
