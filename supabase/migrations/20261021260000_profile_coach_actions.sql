-- P0.8-09 part B: the Profile Coach's actions (K-136, K-83, K-18, K-116, K-126). Pro only; the owner approves each one.
--
--   coach_site_check         what the last website check found, field by field (match, mismatch or unknown); never the
--                            page's text
--   public.coach_site_check_put  keeps one result per business (service role, from the coach Edge function)
--   public.apply_profile_field   the owner's own edit of the website link or the categories: it becomes the approved
--                            fact Google Protection compares and goes to Google through the one pipeline after the 10
--                            second undo, like the opening hours (apply_regular_hours). A change to the main category is
--                            a Protection high-risk field: the owner, signed in, one a week (K-116.2). The Edge function
--                            only ever offers the website tag and additional categories; the primary category stays a
--                            suggestion
--   coach_status / coach_tasks   gain the website match item and one task per mismatch
--
-- Additive: one table (its foreign key is in the _links file), new functions, coach_status and coach_tasks replaced.

create table public.coach_site_check (
  location_id uuid primary key,
  website text not null check (length(website) between 1 and 2000),
  pages integer not null check (pages between 0 and 3),
  found jsonb not null,
  checked_at timestamptz not null default now()
);
alter table public.coach_site_check enable row level security;
revoke all on public.coach_site_check from public, anon, authenticated;
grant select, insert, update on public.coach_site_check to service_role;

create function public.coach_site_check_put(p_location uuid, p_website text, p_pages integer, p_found jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;
  if p_found is null or jsonb_typeof(p_found) <> 'object' then raise exception 'bad_result'; end if;
  for k in select jsonb_object_keys(p_found) loop
    if k not in ('name', 'phone', 'address', 'hours') or p_found ->> k not in ('match', 'mismatch', 'unknown') then raise exception 'bad_result'; end if;
  end loop;
  insert into public.coach_site_check (location_id, website, pages, found, checked_at)
  values (p_location, left(p_website, 2000), least(greatest(p_pages, 0), 3), p_found, now())
  on conflict (location_id) do update set website = excluded.website, pages = excluded.pages, found = excluded.found,
    checked_at = excluded.checked_at;
end $$;
revoke execute on function public.coach_site_check_put(uuid, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.coach_site_check_put(uuid, text, integer, jsonb) to service_role;

-- 1. The checklist, with the website match item last -----------------------------------------------------------------------
create or replace function private.coach_status(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; c public.coach_profile; s public.coach_site_check; v_known boolean; v_site text; v_services boolean;
  v_area boolean; v_bad text[]; v_items jsonb := '[]';
begin
  select * into l from public.locations where id = p_location;
  if not found then return '[]'::jsonb; end if;
  select * into c from public.coach_profile where location_id = p_location;
  select * into s from public.coach_site_check where location_id = p_location;
  v_known := c.location_id is not null and (c.source = 'live' or l.is_demo);

  v_items := v_items || jsonb_build_object('id', 'description', 'status',
    case when not v_known then 'unknown' when c.description_length < 250 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('length', c.description_length, 'example', not v_known) end);

  v_items := v_items || jsonb_build_object('id', 'categories', 'status',
    case when not v_known then 'unknown' when c.additional_categories = 0 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('count', c.additional_categories, 'example', not v_known) end);

  select exists (select 1 from public.knowledge_facts f
                  where f.location_id = p_location and f.superseded_by is null and f.status = 'verified'
                    and f.slot not like 'profile.%' and f.key in ('service', 'product')) into v_services;
  v_items := v_items || jsonb_build_object('id', 'services', 'status', case when v_services then 'done' else 'todo' end, 'detail', '{}'::jsonb);

  v_items := v_items || jsonb_build_object('id', 'attributes', 'status',
    case when not v_known then 'unknown' when c.attributes = 0 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('count', c.attributes, 'example', not v_known) end);

  v_items := v_items || jsonb_build_object('id', 'photos', 'status', 'later', 'detail', jsonb_build_object('waits', 'photo_engine'));

  select exists (select 1 from public.knowledge_facts f
                  where f.location_id = p_location and f.superseded_by is null and f.status = 'verified' and f.key = 'service_area') into v_area;
  v_items := v_items || jsonb_build_object('id', 'service_area', 'status', case when v_area then 'done' else 'unknown' end,
    'detail', case when v_area then '{}'::jsonb else jsonb_build_object('question', true) end);

  select nullif(trim(coalesce(f.value ->> 'display', '')), '') into v_site from public.knowledge_facts f
   where f.location_id = p_location and f.slot = 'profile.website' and f.superseded_by is null;
  v_items := v_items || jsonb_build_object('id', 'website_tracking', 'status',
    case when v_site is null then 'later' when v_site ilike '%utm\_source=%' then 'done' else 'todo' end,
    'detail', case when v_site is null then jsonb_build_object('waits', 'website') else '{}'::jsonb end);

  -- The website match: unknown until a check has run; a field the page did not settle is unknown, never a mismatch.
  select coalesce(array_agg(k order by k), '{}') into v_bad from jsonb_each_text(coalesce(s.found, '{}'::jsonb)) as e(k, v) where v = 'mismatch';
  v_items := v_items || jsonb_build_object('id', 'website_match', 'status',
    case when v_site is null then 'later' when s.location_id is null then 'unknown' when cardinality(v_bad) > 0 then 'todo' else 'done' end,
    'detail', case when v_site is null then jsonb_build_object('waits', 'website')
                   when s.location_id is null then '{}'::jsonb
                   else jsonb_build_object('mismatches', to_jsonb(v_bad), 'checked_at', s.checked_at) end);
  return v_items;
end $$;

-- 2. The tasks, with one per website mismatch ------------------------------------------------------------------------------
create or replace function private.coach_tasks(p_location uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_keep text[] := '{}'; i jsonb; v_title text; v_why text; v_prio text; v_len integer; m text;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.status <> 'active' or l.concierge or l.disconnect_requested_at is not null then return v_keep; end if;
  if not (private.feature_plan(p_location) ->> 'essentials')::boolean then return v_keep; end if;
  for i in select * from jsonb_array_elements(private.coach_status(p_location)) loop
    if i ->> 'status' <> 'todo' then continue; end if;
    v_prio := 'nice';
    case i ->> 'id'
      when 'description' then
        v_len := coalesce((i -> 'detail' ->> 'length')::integer, 0);
        v_title := case when v_len = 0 then 'Add a description to your profile' else 'Make your profile description longer' end;
        v_why := 'Your description tells customers what you do. Google allows up to 750 characters and shows the first 250 first. Kabsi writes a draft from the facts you confirmed and you approve it.';
        v_prio := 'recommended';
      when 'categories' then
        v_title := 'Add more categories';
        v_why := 'Extra categories help Google show you for more of what you do. Kabsi suggests them and you choose. Your main category never changes unless you sign in and approve it.';
      when 'services' then
        v_title := 'Add your services and products';
        v_why := 'Customers search for what you sell. Kabsi fills these in from what you told it about your business, and you approve what goes to Google.';
        v_prio := 'recommended';
      when 'attributes' then
        v_title := 'Fill in your profile details';
        v_why := 'Details such as payment options and accessibility help customers decide. Kabsi never suggests anything about who you are or who owns the business.';
      when 'website_tracking' then
        v_title := 'See the visits Google sends to your website';
        v_why := 'A small tag on your website link shows how many visits come from your Google profile. You approve the change and Kabsi keeps it as your approved value.';
      when 'website_match' then
        -- One task for each thing the website says differently; the keys are the ones the check stores.
        for m in select jsonb_array_elements_text(i -> 'detail' -> 'mismatches') loop
          v_keep := v_keep || ('profile_gap:coach_site_' || m);
          perform private.task_put(p_location, 'profile_gap', 'profile_gap', 'coach_site_' || m, 'recommended',
            case m when 'name' then 'Your website uses a different business name than Google'
                   when 'phone' then 'Your website shows a different phone number than Google'
                   when 'address' then 'Your website shows a different address than Google'
                   else 'Your website shows different opening hours than Google' end,
            'Customers who see two versions stop trusting both. Kabsi compared what your website says with what Google shows. Fix whichever one is out of date.',
            'Open the Profile Coach to see what Kabsi found.', jsonb_build_object('coach', 'website_match', 'field', m), null,
            'profile_gap:coach_site_' || m);
        end loop;
        continue;
      else continue;
    end case;
    v_keep := v_keep || ('profile_gap:coach_' || (i ->> 'id'));
    perform private.task_put(p_location, 'profile_gap', 'profile_gap', 'coach_' || (i ->> 'id'), v_prio, v_title, v_why,
      'Open the Profile Coach to see what to do.', jsonb_build_object('coach', i ->> 'id', 'detail', i -> 'detail'), null,
      'profile_gap:coach_' || (i ->> 'id'));
  end loop;
  return v_keep;
end $$;

-- 3. The owner's own edit of the website link or the categories ---------------------------------------------------------------
create function public.apply_profile_field(p_location uuid, p_user uuid, p_channel text, p_field text, p_display text, p_raw jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.locations; f public.knowledge_facts; v_new uuid := gen_random_uuid(); v_change uuid := gen_random_uuid();
  v_open uuid; v_role text; v_last timestamptz; v_high boolean; r jsonb; c jsonb; n integer := 0;
begin
  if p_field not in ('website', 'main_category') then raise exception 'bad_field'; end if;
  -- Signed in only: a link in an email is never enough for a change to the profile (K-17).
  if p_channel <> 'dashboard' then raise exception 'bad_channel'; end if;
  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'unknown_location'; end if;
  select role into v_role from public.location_members where location_id = p_location and user_id = p_user;
  if v_role is null then raise exception 'not_member'; end if;
  v_high := private.protection_high_risk(p_field);
  if v_high and v_role <> 'owner' then raise exception 'owner_only'; end if;
  if not private.may_approve(p_location, 'profile_change', p_user, v_high) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  if l.concierge then raise exception 'concierge_profile'; end if;

  if p_display is null or length(trim(p_display)) not between 1 and 2000 then raise exception 'bad_value'; end if;
  if p_field = 'website' then
    if trim(p_display) !~ '^https?://[^[:space:]]+$' then raise exception 'bad_value'; end if;
  else
    -- Google's own shape: a primary category and up to nine more, each with a resource name and a display name.
    if p_raw is null or jsonb_typeof(p_raw) <> 'object' or jsonb_typeof(p_raw -> 'primaryCategory') is distinct from 'object'
       or length(coalesce(p_raw -> 'primaryCategory' ->> 'displayName', '')) not between 1 and 200 then
      raise exception 'bad_value';
    end if;
    if p_raw -> 'additionalCategories' is not null then
      if jsonb_typeof(p_raw -> 'additionalCategories') <> 'array' or jsonb_array_length(p_raw -> 'additionalCategories') > 9 then
        raise exception 'bad_value';
      end if;
      for c in select * from jsonb_array_elements(p_raw -> 'additionalCategories') loop
        if jsonb_typeof(c) <> 'object' or length(coalesce(c ->> 'name', '')) not between 1 and 200
           or length(coalesce(c ->> 'displayName', '')) not between 1 and 200 then
          raise exception 'bad_value';
        end if;
        n := n + 1;
      end loop;
    end if;
  end if;

  select * into f from public.knowledge_facts
   where location_id = p_location and slot = 'profile.' || p_field and superseded_by is null for update;
  -- The same value again: nothing to send. If Google shows something else, Google Protection has its own decision.
  if f.id is not null and f.status = 'verified' and f.value ->> 'display' = trim(p_display)
     and (p_field = 'website' or f.value -> 'raw' is not distinct from p_raw) then
    return jsonb_build_object('state', 'unchanged');
  end if;

  -- K-116.2: one high-risk field per approval, and 7 days between them.
  if v_high then
    select max(p.approved_at) into v_last from public.publications p
     where p.location_id = p_location and p.target_type = 'listing_revert' and p.state <> 'cancelled'
       and private.protection_high_risk(private.profile_key(p.payload ->> 'field'))
       and p.approved_at > now() - interval '7 days';
    if v_last is not null then
      raise exception 'high_risk_wait %', to_char((v_last + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');
    end if;
  end if;

  select id into v_open from public.profile_changes
   where location_id = p_location and field = p_field and status in ('detected', 'awaiting_review') for update;
  if f.id is not null then update public.knowledge_facts set superseded_by = v_new where id = f.id; end if;
  insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
    confirmed_at, uses, version)
  values (v_new, p_location, 'profile.' || p_field, p_field,
    jsonb_build_object('display', trim(p_display), 'raw', case when p_field = 'website' then to_jsonb(trim(p_display)) else p_raw end),
    'verified', 'owner', 'owner_edit:' || v_change, p_user, now(), array['replies', 'posts', 'profile'],
    coalesce(f.version, 0) + 1);

  if v_open is not null then
    update public.profile_changes set status = 'superseded', superseded_by = v_change where id = v_open;
  end if;
  insert into public.profile_changes (id, location_id, field, previous_value, previous_fact_id, google_value, source,
    severity, status, explanation)
  values (v_change, p_location, p_field, f.value, f.id, null, 'owner_edit', 'recommended', 'detected',
    case when p_field = 'website' then 'You changed your website link in Kabsi.' else 'You changed your categories in Kabsi.' end);

  r := public.approve_publication('listing_revert', v_change, '{}'::jsonb, p_user, p_channel);
  return (r - 'state') || jsonb_build_object('state', 'approved', 'publication_state', r ->> 'state', 'fact_id', v_new,
    'change_id', v_change);
end $$;
revoke execute on function public.apply_profile_field(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_profile_field(uuid, uuid, text, text, text, jsonb) to service_role;
