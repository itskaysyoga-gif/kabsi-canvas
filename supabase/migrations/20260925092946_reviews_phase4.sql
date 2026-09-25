-- KABSI — migration 005: Phase 4 reviews (sync → classify → draft → safety → email → approve → publish)

-- Review lifecycle additions
alter table public.reviews drop constraint reviews_state_check;
alter table public.reviews add constraint reviews_state_check
  check (state in ('new','drafted','blocked','posted','skipped','handled_offline','archived'));
alter table public.reviews
  add column is_backlog boolean not null default false,        -- existed before Kabsi went live (D221)
  add column notified_at timestamptz,                          -- owner email sent (or included in a digest)
  add column draft_attempts smallint not null default 0,
  add column reply_state text check (reply_state in ('live','in_review','rejected')),
  add column reply_state_reason text;
create index reviews_to_draft_idx on public.reviews(created_at) where state = 'new';
create index reviews_to_notify_idx on public.reviews(location_id) where state in ('drafted','blocked') and notified_at is null;

alter table public.locations
  add column reviews_synced_at timestamptz,
  add column backlog_emailed_at timestamptz;

-- Simulated Google (GOOGLE_MODE=mock). Staff add test reviews; "posting" a reply writes here.
create table public.mock_google_reviews (
  review_id text primary key default ('mock-' || replace(gen_random_uuid()::text, '-', '')),
  google_location_id text not null,
  reviewer_name text not null,
  star_rating smallint not null check (star_rating between 1 and 5),
  comment text,
  create_time timestamptz not null default now(),
  reply_comment text,
  reply_update_time timestamptz
);
create index mock_google_reviews_loc_idx on public.mock_google_reviews(google_location_id, create_time desc);
alter table public.mock_google_reviews enable row level security;
revoke all on public.mock_google_reviews from anon, authenticated;
create policy staff_read_mock on public.mock_google_reviews for select to authenticated using ((select public.is_staff()));

create or replace function public.staff_mock_review(p_location uuid, p_rating int, p_comment text, p_reviewer text default 'Test customer')
returns text language plpgsql security definer set search_path = '' as $$
declare v_gl text; v_id text;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select google_location_id into v_gl from public.locations where id = p_location;
  if v_gl is null then raise exception 'location_not_connected'; end if;
  if v_gl not like 'locations/mock-%' then raise exception 'not_a_mock_location'; end if;
  insert into public.mock_google_reviews (google_location_id, reviewer_name, star_rating, comment)
  values (v_gl, left(coalesce(nullif(trim(p_reviewer), ''), 'Test customer'), 80), p_rating, left(p_comment, 4000))
  returning review_id into v_id;
  return v_id;
end $$;

-- Owner skips a review (dashboard). Posting always goes through the `approve` Edge Function.
create or replace function public.skip_review(p_review uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid;
begin
  select location_id into v_loc from public.reviews where id = p_review;
  if v_loc is null or not public.is_member(v_loc) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.reviews set state = 'skipped' where id = p_review and state in ('new','drafted','blocked');
end $$;

-- Owner or alert emails that should get action links: only real members (links carry who approved).
create or replace function public.location_member_recipients(p_location uuid)
returns table (user_id uuid, email text) language sql stable security definer set search_path = '' as $$
  select u.id, lower(u.email) from public.location_members m join auth.users u on u.id = m.user_id
  where m.location_id = p_location and u.email is not null
$$;

revoke execute on function public.staff_mock_review(uuid, int, text, text), public.skip_review(uuid),
  public.location_member_recipients(uuid) from public, anon, authenticated;
grant execute on function public.staff_mock_review(uuid, int, text, text), public.skip_review(uuid) to authenticated;
grant execute on function public.location_member_recipients(uuid) to service_role;
