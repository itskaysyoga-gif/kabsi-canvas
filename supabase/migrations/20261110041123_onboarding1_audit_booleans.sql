-- Onboarding 1 follow-up (10 Nov 2026, independent review of the first migration): the change log kept the old and new choices,
-- so clearing an answer did not remove it everywhere, against the privacy page and facts 11 ("Clearing an answer removes it and
-- its date at once"). The audit row now says only that answers were saved and whether each question is answered, never what the
-- choice was. Same function otherwise. Additive: create or replace.
create or replace function public.save_request_answers(p_location uuid, p_tracking text, p_app text, p_early boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  l public.locations;
  v_tracking text := nullif(btrim(p_tracking), '');
  v_app text := nullif(btrim(p_app), '');
  v_out jsonb;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_tracking is not null and v_tracking not in ('booking_app', 'chats', 'notebook', 'memory', 'other') then
    raise exception 'bad_request_tracking' using errcode = '22023';
  end if;
  if v_tracking is distinct from 'booking_app' then v_app := null; end if;
  if v_app is not null and char_length(v_app) > 80 then raise exception 'app_name_too_long' using errcode = '22023'; end if;

  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;

  update public.locations set
    request_tracking = v_tracking,
    request_tracking_app = v_app,
    request_tracking_at = case when v_tracking is null then null else coalesce(l.request_tracking_at, now()) end,
    early_access_whatsapp = p_early,
    early_access_at = case when p_early is null then null else coalesce(l.early_access_at, now()) end,
    onboarding_questions_at = coalesce(l.onboarding_questions_at, now())
   where id = p_location;

  v_out := jsonb_build_object('request_tracking', v_tracking, 'request_tracking_app', v_app, 'early_access_whatsapp', p_early);
  perform private.audit('user', v_uid, 'request_answers_saved', p_location, 'location', p_location::text,
    jsonb_build_object('answered_tracking', l.request_tracking is not null, 'answered_early', l.early_access_whatsapp is not null),
    jsonb_build_object('answered_tracking', v_tracking is not null, 'answered_early', p_early is not null), 'dashboard', 'saved');
  return v_out;
end $$;
revoke all on function public.save_request_answers(uuid, text, text, boolean) from public, anon;
grant execute on function public.save_request_answers(uuid, text, text, boolean) to authenticated;
