-- UX 1 (27 Oct 2026): owners and managers add, edit and remove their own AI questions on the Kabsi website (docs/LATER.md:
-- "Owners cannot edit or add their own AI prompts"). The same rules as promptFrom (supabase/functions/_shared/visibility/
-- ai/prompts.ts), the plan's limit (entitlements' limits.ai_prompts), only after the first task is done (V4, 30.16 section 3),
-- one question once per business, at most 20 saves a day. The visibility tick asks them like the suggested ones.
-- Additive only: two functions.

create or replace function public.save_ai_prompt(p_location uuid, p_text text, p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_text text;
  v_ent jsonb;
  v_max integer;
  v_active integer;
  v_cadence text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.locations where id = p_location and first_task_done_at is not null) then
    raise exception 'after_first_task' using errcode = 'P0001';
  end if;
  -- promptFrom: trim, no wrapping quotes or end full stop, one space, 8 to 120 characters, at most 16 words, no link, email,
  -- long number, en dash, em dash or exclamation mark, lower case. Quote and dash characters by code point.
  v_text := regexp_replace(coalesce(p_text, ''), '^\s+|\s+$', '', 'g');
  v_text := regexp_replace(v_text, '^[' || chr(34) || chr(39) || chr(8220) || chr(8221) || chr(8216) || chr(8217) || ']+', '');
  v_text := regexp_replace(v_text, '[' || chr(34) || chr(39) || chr(8220) || chr(8221) || chr(8216) || chr(8217) || '.]+$', '');
  v_text := regexp_replace(v_text, '\s+', ' ', 'g');
  if char_length(v_text) < 8 or char_length(v_text) > 120 or array_length(string_to_array(v_text, ' '), 1) > 16
     or v_text ~* ('https?:|www\.|\.com\M|@|[0-9]{5,}|[' || chr(8211) || chr(8212) || '!]') then
    raise exception 'bad_prompt' using errcode = '22023';
  end if;
  v_text := lower(v_text);

  -- Editing to the same words changes nothing (and asks nothing again).
  if p_id is not null then
    select id into v_id from public.ai_visibility_prompts
     where id = p_id and location_id = p_location and active and lower(text) = v_text;
    if v_id is not null then return v_id; end if;
    if not exists (select 1 from public.ai_visibility_prompts where id = p_id and location_id = p_location and active) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
  end if;
  -- One save at a time per business, so two at once cannot pass the limit together.
  perform 1 from public.locations where id = p_location for update;
  -- At most 20 saves a day per business: every new question is asked at once, and the AI checks share one monthly cap.
  if (select count(*) from public.audit_events
       where location_id = p_location and action = 'ai_prompt_saved' and created_at > now() - interval '1 day') >= 20 then
    raise exception 'prompt_rate' using errcode = 'P0001';
  end if;

  v_ent := public.entitlements(null, p_location);
  v_max := coalesce((v_ent -> 'limits' ->> 'ai_prompts')::integer, 0);
  v_cadence := case when v_ent -> 'limits' ->> 'ai_every' = '2 weeks' then 'biweekly' else 'monthly' end;
  select count(*) into v_active from public.ai_visibility_prompts
   where location_id = p_location and active and (p_id is null or id <> p_id);
  if v_active >= v_max then raise exception 'prompt_limit' using errcode = 'P0001', detail = v_max::text; end if;
  if exists (select 1 from public.ai_visibility_prompts
              where location_id = p_location and active and lower(text) = v_text and (p_id is null or id <> p_id)) then
    raise exception 'duplicate' using errcode = '23505';
  end if;

  -- An edit is a new question: the old one stops (its answers stay with its own words), the new one is asked.
  if p_id is not null then
    update public.ai_visibility_prompts set active = false where id = p_id and location_id = p_location;
  end if;
  -- A question removed earlier comes back with its own schedule instead of a second row (the unique index is on lower(text)).
  update public.ai_visibility_prompts set active = true, kind = 'owner', cadence = v_cadence, confirmed_at = now()
   where location_id = p_location and lower(text) = v_text returning id into v_id;
  if v_id is null then
    insert into public.ai_visibility_prompts (location_id, text, kind, cadence, active, confirmed_at, next_run_at)
    values (p_location, v_text, 'owner', v_cadence, true, now(), now()) returning id into v_id;
  end if;
  perform private.audit('user', v_uid, 'ai_prompt_saved', p_location, 'ai_visibility_prompt', v_id::text, null,
    jsonb_build_object('edited', p_id is not null), 'dashboard', 'saved');
  return v_id;
end $$;
revoke all on function public.save_ai_prompt(uuid, text, uuid) from public, anon;
grant execute on function public.save_ai_prompt(uuid, text, uuid) to authenticated;

-- Removing a question stops it being asked; its earlier answers stay with the business until the usual retention.
create or replace function public.remove_ai_prompt(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_loc uuid;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  select location_id into v_loc from public.ai_visibility_prompts where id = p_id;
  if v_loc is null or not public.has_location_role(v_loc, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.ai_visibility_prompts set active = false where id = p_id;
  perform private.audit('user', v_uid, 'ai_prompt_removed', v_loc, 'ai_visibility_prompt', p_id::text, null, '{}'::jsonb, 'dashboard', 'removed');
end $$;
revoke all on function public.remove_ai_prompt(uuid) from public, anon;
grant execute on function public.remove_ai_prompt(uuid) to authenticated;
