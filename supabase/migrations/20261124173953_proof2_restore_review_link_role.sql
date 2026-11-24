-- PROOF-2 fix: the first PROOF-2 migration replaced create_review_link from the 26 Sep version and so dropped the role check
-- of 20261015120000_roles_policies.sql (owner or manager only). This puts it back, keeps the cap that ignores placement links,
-- and gives create_placement_link the same role check. Same signatures and grants.
create or replace function public.create_review_link(p_location uuid, p_label text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text; v_place text;
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  if (select count(*) from public.cards where location_id = p_location and kind = 'link' and placement is null) >= 5 then
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
  update public.cards set location_id = p_location, status = 'active', activated_at = now(),
    destination = 'https://search.google.com/local/writereview?placeid=' || v_place,
    label = coalesce(nullif(left(trim(p_label), 60), ''), 'Review link')
  where code = v_code;
  return v_code;
end $$;
revoke execute on function public.create_review_link(uuid, text) from public, anon;
grant execute on function public.create_review_link(uuid, text) to authenticated;

create or replace function public.create_placement_link(p_location uuid, p_placement text) returns text
language plpgsql security definer set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text; v_place text; v_label text;
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_placement is null or p_placement not in ('booking', 'receipt', 'email_signature', 'social_bio') then
    raise exception 'bad_placement';
  end if;
  perform pg_advisory_xact_lock(hashtext('placement:' || p_location::text));
  select code into v_code from public.cards where location_id = p_location and placement = p_placement;
  if found then return v_code; end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  v_label := case p_placement when 'booking' then 'Booking confirmation' when 'receipt' then 'Receipt'
                              when 'email_signature' then 'Email signature' else 'Social bio' end;
  loop
    select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 31), 1), '') into v_code
      from (select extensions.gen_random_bytes(6) as b) r, generate_series(0,5) i;
    begin
      insert into public.cards(code, kind, placement) values (v_code, 'link', p_placement);
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  update public.cards set location_id = p_location, status = 'active', activated_at = now(),
    destination = 'https://search.google.com/local/writereview?placeid=' || v_place, label = v_label
  where code = v_code;
  return v_code;
end $$;
revoke execute on function public.create_placement_link(uuid, text) from public, anon;
grant execute on function public.create_placement_link(uuid, text) to authenticated;
