-- Sec 2 (27 Oct 2026), part 1: the stale yes, the redraft while publishing, the card code guessing, the installer's
-- reach and the unsubscribe key.
--   1. An email page opened on draft v1 and posted after a v2 draft no longer publishes v1: the page sends the draft
--      version it showed, and use_action_link acts only when that is still the newest version of the reply
--      ('reply_changed' otherwise; the page shows the new one). A yes already waiting from another channel is not
--      reported as this page's approval ('too_late'). The five-argument use_action_link the deployed code calls today
--      passes no version, so it is refused for a post the same way until the new code is live.
--   2. A new draft is saved by one function, save_reply_draft, which locks the review and refuses while its reply is
--      publishing or posted ('reply_publishing'). Before, draftReview put a review back to drafted or blocked under a
--      waiting yes. The owner is told to undo first.
--   3. activate_card: at most 10 unknown or refused codes an hour per person, and a refusal no longer says whether the
--      code exists (it is answered as text, not raised, so the try is counted: a raise would roll the count back).
--   4. Installers (staff.role = 'installer') stop reading every business: is_staff() is Kabsi admins only, and an
--      installer may only activate and switch cards (private.is_installer()).
--   5. The one-click unsubscribe links get their own signing key in Vault ('unsubscribe_key'), no longer the cron secret.
-- Additive only: create or replace, revoke, grant and a DO block that inserts the key when it is missing.

-- 4. Who is Kabsi staff. Admins read every business for support; installers only install cards.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'admin')
$$;

create or replace function private.is_installer() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'installer')
$$;
revoke all on function private.is_installer() from public, anon, authenticated;

-- 3. Cards. A refused code is answered with its reason as the return value ('unknown_card', 'card_in_use',
-- 'card_disabled', 'rate_limited'); the app turns it into the same message as before. The destination always starts
-- with https://, so the two never mix.
CREATE OR REPLACE FUNCTION public.activate_card(p_code text, p_location uuid, p_label text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.cards; v_place text; v_code text := upper(trim(coalesce(p_code, ''))); v_dest text;
  v_admin boolean := public.is_staff(); v_key text := 'card_try:' || coalesce(auth.uid()::text, 'none'); v_refused text;
begin
  if not (public.has_location_role(p_location, array['owner', 'manager']) or v_admin or private.is_installer()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Sec 2: ten refused codes an hour per person. Checked before the lookup, counted only on a refusal.
  if not v_admin and exists (select 1 from public.rate_limits r where r.key = v_key and r.hits >= 10
                               and r.window_start > now() - interval '1 hour') then
    return 'rate_limited';
  end if;
  select * into c from public.cards where code = v_code for update;
  if not found then v_refused := 'unknown_card';
  -- Sec 2 review: another business's card reads like an unknown code to a non-Kabsi caller (no existence oracle).
  elsif c.location_id is not null and c.location_id <> p_location and not v_admin then
    v_refused := case when private.is_installer() then 'card_in_use' else 'unknown_card' end;
  elsif c.status = 'disabled' and not v_admin then v_refused := 'card_disabled';
  end if;
  if v_refused is not null then
    if not v_admin then perform public.hit_rate_limit(v_key, 10, 3600); end if;
    return v_refused;
  end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  v_dest := 'https://search.google.com/local/writereview?placeid=' || v_place;
  update public.cards set location_id = p_location, destination = v_dest, status = 'active',
    activated_at = coalesce(activated_at, now()), label = coalesce(left(p_label, 60), label)
  where code = v_code;
  return v_dest;
end $function$;

-- set_card_active: a stranger learns nothing about a code (unknown and not yours read the same).
CREATE OR REPLACE FUNCTION public.set_card_active(p_code text, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_loc uuid; v_found boolean; v_code text := upper(trim(coalesce(p_code, ''))); v_kabsi boolean := public.is_staff() or private.is_installer();
begin
  select location_id, true into v_loc, v_found from public.cards where code = v_code;
  if not (v_kabsi or (v_loc is not null and public.has_location_role(v_loc, array['owner', 'manager']))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_found is null then raise exception 'unknown_card'; end if;
  update public.cards set status = case
      when p_active and location_id is not null and destination is not null then 'active'
      when p_active then 'unassigned'
      else 'disabled' end
  where code = v_code;
end $function$;

-- 2. Saving a new draft version. Service role only (draftReview in _shared/reviews.ts).
create or replace function public.save_reply_draft(p_review uuid, p_body text, p_source text, p_instruction text,
  p_safety_ok boolean, p_safety_notes jsonb, p_model text, p_prompt_version text, p_facts_used uuid[],
  p_language text, p_risk text, p_risk_reasons text[], p_renotify boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.reviews; v_ver integer; v_id uuid;
begin
  select * into r from public.reviews where id = p_review for update;
  if not found then raise exception 'unknown_review'; end if;
  -- A yes is waiting or the reply is on Google: a new version would put the review back to a draft under it.
  if r.state in ('publishing', 'posted') then raise exception 'reply_publishing'; end if;
  select coalesce(max(version), 0) + 1 into v_ver from public.reply_drafts where review_id = r.id;
  insert into public.reply_drafts (review_id, version, body, source, instruction, safety_ok, safety_notes, model,
    prompt_version, facts_used)
  values (r.id, v_ver, coalesce(p_body, ''), p_source, p_instruction, p_safety_ok, coalesce(p_safety_notes, '[]'::jsonb),
    p_model, p_prompt_version, coalesce(p_facts_used, '{}'::uuid[]))
  returning id into v_id;
  update public.reviews set language = p_language, risk = p_risk, risk_reasons = p_risk_reasons,
    state = case when p_safety_ok then 'drafted' else 'blocked' end, draft_attempts = draft_attempts + 1,
    notified_at = case when p_renotify then null else notified_at end
   where id = r.id;
  return jsonb_build_object('id', v_id, 'version', v_ver);
end $$;
revoke all on function public.save_reply_draft(uuid, text, text, text, boolean, jsonb, text, text, uuid[], text, text, text[], boolean)
  from public, anon, authenticated;
grant execute on function public.save_reply_draft(uuid, text, text, text, boolean, jsonb, text, text, uuid[], text, text, text[], boolean)
  to service_role;

-- The "no draft" path of draftReview (a high-risk review waits as blocked), with the same guard.
create or replace function public.block_reply_draft(p_review uuid, p_language text, p_risk text, p_risk_reasons text[])
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.reviews set language = p_language, risk = p_risk, risk_reasons = p_risk_reasons, state = 'blocked',
    draft_attempts = draft_attempts + 1, notified_at = null
   where id = p_review and state not in ('publishing', 'posted');
  return found;
end $$;
revoke all on function public.block_reply_draft(uuid, text, text, text[]) from public, anon, authenticated;
grant execute on function public.block_reply_draft(uuid, text, text, text[]) to service_role;

-- 1. The email link acts only on the draft version its page showed.
CREATE OR REPLACE FUNCTION public.use_action_link(p_token_hash text, p_do text, p_text text, p_session_user uuid, p_publication uuid, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.action_tokens; v_need boolean; v_signed_in boolean; v_result jsonb; r jsonb; v_state text; v_current integer;
begin
  select * into t from public.action_tokens where token_hash = p_token_hash for update;
  if not found then raise exception 'invalid_link'; end if;

  -- Bound to one recipient: another account's session gets nothing, not even a result (Sec 1: every kind of link, not
  -- only the kinds that need sign-in, so nobody acts in the recipient's name).
  v_need := private.action_link_needs_sign_in(t.target_type, t.target_id,
    case when p_do = 'undo' then private.action_link_verb(t.action) else p_do end);
  if p_session_user is not null and p_session_user is distinct from t.user_id then
    raise exception 'wrong_account';
  end if;

  -- Undo (K-70): only the publication this link made, only inside its 10 seconds (undo_publication checks the time).
  if p_do = 'undo' then
    if t.result ->> 'done' = 'undone' then return t.result || jsonb_build_object('repeat', true); end if;
    if t.used_at is null or p_publication is null or t.result ->> 'publication_id' is distinct from p_publication::text then
      raise exception 'not_allowed';
    end if;
    perform public.undo_publication(p_publication, t.user_id);
    v_result := jsonb_build_object('done', 'undone', 'state', 'cancelled');
    update public.action_tokens set result = v_result where id = t.id;
    perform private.audit('user', t.user_id, 'email_link_used', t.location_id,
      case t.target_type when 'listing_change' then 'profile_change' else t.target_type end, t.target_id, null,
      jsonb_build_object('link', t.action, 'do', 'undo', 'signed_in', p_session_user is not null and p_session_user = t.user_id,
        'publication_id', p_publication), 'email_link', 'undone');
    return v_result;
  end if;

  if t.expires_at <= now() then raise exception 'link_expired'; end if;

  -- K-38: a second POST, whatever it asks, gets the first result, with the publication's state as it is now.
  if t.used_at is not null then
    if t.result is null then raise exception 'link_used'; end if;
    v_result := t.result;
    if v_result ? 'publication_id' then
      select state into v_state from public.publications where id = (v_result ->> 'publication_id')::uuid;
      if found then v_result := v_result || jsonb_build_object('state', v_state); end if;
    end if;
    return v_result || jsonb_build_object('repeat', true);
  end if;

  if t.user_id is null or t.target_type not in ('review', 'listing_change') or not (p_do = any (case t.action
      when 'post' then array['post', 'skip'] when 'edit' then array['post', 'skip']
      when 'see_draft' then array['post', 'handle_myself'] when 'skip' then array['skip']
      when 'handle_myself' then array['handle_myself'] when 'revert' then array['revert', 'keep']
      when 'keep' then array['keep', 'revert'] else array[]::text[] end)) then
    raise exception 'not_allowed';
  end if;

  v_signed_in := p_session_user is not null and p_session_user = t.user_id;
  if v_need and not v_signed_in then raise exception 'sign_in_required'; end if;
  if not exists (select 1 from public.location_members where location_id = t.location_id and user_id = t.user_id) then
    raise exception 'not_member';
  end if;

  -- Sec 2: a yes is for the draft the page showed. A newer version since then (a redraft, a WhatsApp edit) means the
  -- page is stale: nothing is approved and the page shows the new one. The link stays unused.
  -- A yes from another channel already waits or the reply is on Google: this page's words are not approved on top
  -- of it (before, the page said "Approved" for the other yes's words).
  if t.target_type = 'review' and p_do = 'post' then
    select state into v_state from public.reviews where id = t.target_id::uuid for update;
    select coalesce(max(version), 0) into v_current from public.reply_drafts where review_id = t.target_id::uuid;
    if p_version is null or p_version <> v_current then raise exception 'reply_changed'; end if;
    if v_state = 'publishing' then raise exception 'too_late'; end if;
    if v_state = 'posted' then raise exception 'already_posted'; end if;
  end if;

  -- For this call only: the channel for the audit triggers, and the checked sign-in for the high-risk fields.
  perform set_config('kabsi.channel', 'email_link', true);
  perform set_config('kabsi.signed_in_user', case when v_signed_in then t.user_id::text else '' end, true);

  if t.target_type = 'listing_change' then
    -- "revert" is "Keep my information" (reject Google's value), "keep" is "Google is right" (accept it).
    r := public.decide_profile_change(t.target_id::uuid, case when p_do = 'revert' then 'reject' else 'accept' end,
      t.user_id, 'email_link');
    v_result := jsonb_build_object('done', case r ->> 'state' when 'rejected' then 'reverting' when 'accepted' then 'kept'
        else r ->> 'state' end,
      'state', coalesce(r ->> 'publication_state', r ->> 'state'));
    if r ? 'publication_id' then
      v_result := v_result || jsonb_build_object('publication_id', r -> 'publication_id', 'publish_after', r -> 'publish_after');
    end if;
  elsif p_do = 'post' then
    r := public.approve_publication('review_reply', t.target_id::uuid, jsonb_build_object('text', coalesce(p_text, '')),
      t.user_id, 'email_link');
    v_result := jsonb_build_object('done', case when r ->> 'route' = 'concierge' then 'queued_manual' else 'approved' end,
      'state', r ->> 'state', 'publication_id', r -> 'publication_id', 'publish_after', r -> 'publish_after');
  else
    -- P0.3-06 (K-16): skipping from a link is a decision on the review, like approving it.
    if not private.may_approve(t.location_id, 'review_reply', t.user_id,
         coalesce((select risk = 'high' from public.reviews where id = t.target_id::uuid), false)) then
      raise exception 'not_allowed_to_approve' using errcode = '42501';
    end if;
    update public.reviews set state = case when p_do = 'skip' then 'skipped' else 'handled_offline' end
     where id = t.target_id::uuid and location_id = t.location_id and state in ('new', 'drafted', 'blocked');
    if not found then raise exception 'already_handled'; end if;
    v_result := jsonb_build_object('done', case when p_do = 'skip' then 'skipped' else 'handled_offline' end);
  end if;

  update public.action_tokens set used_at = now(), result = v_result where id = t.id;
  perform private.audit('user', t.user_id, 'email_link_used', t.location_id,
    case t.target_type when 'listing_change' then 'profile_change' else t.target_type end, t.target_id, null,
    jsonb_build_object('link', t.action, 'do', p_do, 'signed_in', v_signed_in, 'publication_id', v_result -> 'publication_id',
      'version', p_version),
    'email_link', v_result ->> 'done');

  perform set_config('kabsi.channel', '', true);
  perform set_config('kabsi.signed_in_user', '', true);
  return v_result;
end $function$;
revoke all on function public.use_action_link(text, text, text, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.use_action_link(text, text, text, uuid, uuid, integer) to service_role;

-- The five-argument form the code deployed before Sec 2 calls: the same, with no version, so a post is refused
-- ('reply_changed') and the page reloads the newest draft. Kept so the two deploys need no order.
CREATE OR REPLACE FUNCTION public.use_action_link(p_token_hash text, p_do text, p_text text DEFAULT NULL::text, p_session_user uuid DEFAULT NULL::uuid, p_publication uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.use_action_link(p_token_hash, p_do, p_text, p_session_user, p_publication, null::integer)
$function$;

-- 5. The unsubscribe signing key: 32 random bytes made in the database, never shown anywhere. Read by the email
-- function through public.internal_secret('unsubscribe_key') (service role only).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'unsubscribe_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'unsubscribe_key',
      'Sec 2: signs the one-click unsubscribe links (supabase/functions/_shared/email/unsubscribe.ts)');
  end if;
end $$;

-- 6. Privacy trace (docs/security/privacy-trace.md): a WhatsApp alert's text (review excerpt, reviewer first name, the
-- draft) stays in whatsapp_outbox only until it is sent; one day after it was sent, failed, dropped or put in a digest
-- the text is replaced. The privacy page says alert review text is not kept. Run inside the retention job, so it is a
-- dry run until Rashid switches retention_sources on.
create or replace function private.clear_sent_alert_texts() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.whatsapp_outbox set body = '[sent]'
   where state in ('sent', 'mock_sent', 'failed', 'dropped', 'digested') and body <> '[sent]'
     and coalesce(sent_at, created_at) < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function private.clear_sent_alert_texts() from public, anon, authenticated;

create or replace function private.retention_sources() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := '{}'::jsonb;
  v_on boolean := coalesce((select value from public.app_settings where key = 'retention_sources'), 'dry_run') = 'on';
begin
  begin
    v := private.retention_sources_apply() || jsonb_build_object('alert_texts', private.clear_sent_alert_texts());
    if not v_on then raise exception 'retention_dry_run'; end if;
  exception when raise_exception then
    if sqlerrm <> 'retention_dry_run' then raise; end if;
  end;
  v := v || jsonb_build_object('mode', case when v_on then 'on' else 'dry_run' end);
  insert into public.jobs_log (job, ok, detail)
  select 'retention_sources', true, v
   where exists (select 1 from jsonb_each_text(v - 'mode') where value::int > 0);
  return v;
end $$;
revoke all on function private.retention_sources() from public, anon, authenticated;

-- 7. Nora's save_contact (Sec 1 LATER row): a yes to news counts at once only for the address the visitor is signed in
-- with; for any other typed address only the request and its time are kept, until that inbox confirms.
alter table public.contacts add column if not exists news_requested_at timestamptz;
comment on column public.contacts.news_requested_at is
  'Sec 2: when a visitor asked Nora for news emails for this address; marketing_consent stays false until the inbox confirms.';

-- 8. Sec 2 review: the WhatsApp staff_admin role joins public.staff without a role check (whatsapp_agent migration), so
-- an installer bound as staff_admin would keep staff powers on WhatsApp. No such binding exists (no installer today);
-- this trigger keeps it that way: a staff_admin phone role is only for a Kabsi admin.
create or replace function private.phone_role_staff_admin_only() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'staff_admin' and new.revoked_at is null
     and not exists (select 1 from public.staff s where s.user_id = new.user_id and s.role = 'admin') then
    raise exception 'staff_admin_needs_admin' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.phone_role_staff_admin_only() from public, anon, authenticated;
create or replace trigger phone_role_staff_admin_only before insert or update on public.phone_roles
  for each row execute function private.phone_role_staff_admin_only();
