-- KABSI: migration 015: digital review links (26 Sep 2026)
-- A business can use Kabsi 100% digitally: a short link go.kabsi.co/CODE (and its printable QR) opens the
-- same Google review page as a card, for every customer (no filtering, D212). Links are cards with kind 'link',
-- so taps, switch off and the Worker work the same way.

alter table public.cards add column kind text not null default 'card' check (kind in ('card','link'));

create or replace function public.create_review_link(p_location uuid, p_label text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text; v_place text;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
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
end $$;
revoke execute on function public.create_review_link(uuid, text) from public, anon;
grant execute on function public.create_review_link(uuid, text) to authenticated;