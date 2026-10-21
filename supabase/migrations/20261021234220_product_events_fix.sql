-- P0.6-02 fix: PostgreSQL regular expressions allow at most 255 repeats, so the click id checks in
-- 20261021234210_product_events.sql failed on every call. Same rules, with the length checked apart. Additive.
create or replace function public.save_signup_attribution(p jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_created timestamptz; v_via text; v_done boolean;
  v_fbclid text := p ->> 'fbclid'; v_fbp text := p ->> 'fbp'; v_fbc text := p ->> 'fbc';
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '1 day' then return false; end if;
  v_via := upper(substring(p ->> 'via' from '^[A-Za-z0-9_-]{2,40}$'));
  insert into public.signup_attribution (user_id, first_touch, last_touch, fbclid, fbp, fbc, via_code, via_at)
  values (v_uid, private.clean_touch(p -> 'first'), private.clean_touch(p -> 'last'),
    case when length(v_fbclid) <= 500 and v_fbclid ~ '^[A-Za-z0-9_-]+$' then v_fbclid end,
    case when length(v_fbp) <= 80 and v_fbp ~ '^fb\.[0-9]\.[0-9]{10,16}\.[0-9]{1,30}$' then v_fbp end,
    case when length(v_fbc) <= 540 and v_fbc ~ '^fb\.[0-9]\.[0-9]{10,16}\.[A-Za-z0-9_-]+$' then v_fbc end,
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
