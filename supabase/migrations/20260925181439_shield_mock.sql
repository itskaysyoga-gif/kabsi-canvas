-- Phase 7 Listing Shield (D218) in mock mode: a simulated Google listing per mock location.
create table public.mock_listings (
  google_location_id text primary key,
  fields jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.mock_listings enable row level security;
revoke all on public.mock_listings from anon, authenticated;

alter table public.locations add column shield_checked_at timestamptz;

-- Staff test tool: simulate someone editing the listing on Google ("Suggest an edit").
create or replace function public.staff_mock_listing_edit(p_location uuid, p_field text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gl text;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_field not in ('title','phone','address','hours','website','categories') then raise exception 'bad_field'; end if;
  select google_location_id into v_gl from public.locations where id = p_location;
  if v_gl is null or v_gl not like 'locations/mock-%' then raise exception 'not_a_mock_location'; end if;
  update public.mock_listings set fields = jsonb_set(fields, array[p_field], to_jsonb(left(p_value, 200))), updated_at = now()
  where google_location_id = v_gl;
  if not found then raise exception 'no_listing_yet'; end if;
end $$;
revoke execute on function public.staff_mock_listing_edit(uuid, text, text) from public, anon;
grant execute on function public.staff_mock_listing_edit(uuid, text, text) to authenticated;
