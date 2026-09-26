-- KABSI: migration 014: keyword posts engine, weekly drafts, no em dashes in AI text (26 Sep 2026)
-- * AI-written text (reply drafts, post drafts) never contains em dashes: a trigger cleans it on save.
--   The owner's own edits are not touched (they go straight into publications at approval).
-- * Post buttons match what Google's localPosts API accepts (BOOK, ORDER, SHOP, LEARN_MORE, SIGN_UP, CALL).
--   GET_DIRECTIONS is not a Google post button and is removed.
-- * Locations cache their Google category and area (Places API) for keywords like "bakery in Hamra" and to
--   pick the weekly draft slot: shops and dining on Thursday 09:00, professional services on Tuesday 08:30.
-- * posts-weekly (pg_cron every 30 min) drafts one post a week per active business; the owner still approves.

create or replace function public.no_dashes(t text) returns text
language sql immutable set search_path = '' as $$
  select case when t is null then null else
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(t,
      '\s*—\s*', ', ', 'g'),
      '\s+–\s+', ', ', 'g'),
      ',\s*,', ',', 'g'),
      ',\s*([.!?])', '\1', 'g') end
$$;

create or replace function public.clean_ai_text() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'reply_drafts' and coalesce(new.source, 'ai') like 'ai%' then
    new.body := public.no_dashes(new.body);
  elsif tg_table_name = 'gbp_posts' and new.state = 'draft' then
    new.body := public.no_dashes(new.body);
  end if;
  return new;
end $$;
create trigger reply_drafts_no_dashes before insert or update of body on public.reply_drafts
  for each row execute function public.clean_ai_text();
create trigger gbp_posts_no_dashes before insert or update of body on public.gbp_posts
  for each row execute function public.clean_ai_text();

-- post buttons
alter table public.gbp_posts drop constraint gbp_posts_cta_type_check;
alter table public.gbp_posts add constraint gbp_posts_cta_type_check
  check (cta_type in ('CALL','BOOK','ORDER','SHOP','LEARN_MORE','SIGN_UP'));
alter table public.gbp_posts add column source text not null default 'owner' check (source in ('owner','auto'));
alter table public.gbp_posts add column keywords text[] not null default '{}';

-- category, area and weekly slot
alter table public.locations add column category text;             -- Places primaryType, e.g. "bakery"
alter table public.locations add column category_label text;       -- e.g. "Bakery"
alter table public.locations add column area text;                 -- neighborhood or city, e.g. "Hamra"
alter table public.locations add column post_slot text check (post_slot in ('retail','pro'));
alter table public.locations add column auto_posts boolean not null default true;
alter table public.locations add column last_auto_post_at timestamptz;

-- owner switch for the weekly draft (members only)
create or replace function public.set_auto_posts(p_location uuid, p_enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.locations set auto_posts = coalesce(p_enabled, true) where id = p_location;
end $$;

revoke execute on function public.no_dashes(text), public.clean_ai_text(), public.set_auto_posts(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_auto_posts(uuid, boolean) to authenticated;
grant execute on function public.no_dashes(text) to service_role;

select cron.schedule('kabsi_posts_weekly', '*/30 * * * *', $$select public.call_internal('posts-weekly')$$);