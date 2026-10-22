-- P0.7-05 (session 18, 22 Oct 2026): removing a post Kabsi published, through the one publication pipeline.
-- A new kind, local_post_removal: the owner approves it (dashboard only), the 10 second undo applies, the publish job
-- sends one DELETE to Google, and the item is verified once Google no longer has the post. Additive: two check
-- constraints widened and four functions gain one case each. The functions are changed by replacing only the named
-- lines in their current definitions; each replacement must match exactly once or the migration stops.

alter table public.publications drop constraint publications_target_type_check;
alter table public.publications add constraint publications_target_type_check
  check (target_type = any (array['review_reply', 'local_post', 'local_post_removal', 'photo', 'special_hours', 'listing_revert', 'listing_edit']));

-- removing: approved, on its way off Google; removed: Google no longer shows it.
alter table public.gbp_posts drop constraint gbp_posts_state_check;
alter table public.gbp_posts add constraint gbp_posts_state_check
  check (state = any (array['draft', 'publishing', 'posted', 'skipped', 'failed', 'removing', 'removed']));

do $mig$
declare
  v_def text;
  v_new text;
begin
  -- 1. approval_kind and publication_noun: a removal is approved like a post and named as one.
  v_def := pg_get_functiondef('private.approval_kind(text)'::regprocedure);
  v_new := replace(v_def, $o$when 'local_post' then 'post' when 'photo'$o$, $n$when 'local_post' then 'post' when 'local_post_removal' then 'post' when 'photo'$n$);
  if v_new = v_def then raise exception 'approval_kind: no match'; end if;
  execute v_new;

  v_def := pg_get_functiondef('private.publication_noun(text)'::regprocedure);
  v_new := replace(v_def, $o$when 'local_post' then 'post' when 'photo'$o$, $n$when 'local_post' then 'post' when 'local_post_removal' then 'post removal' when 'photo'$n$);
  if v_new = v_def then raise exception 'publication_noun: no match'; end if;
  execute v_new;

  -- 2. approve_publication: the payload (the post's Google name from its verified publication) and the state change.
  v_def := pg_get_functiondef('public.approve_publication(text,uuid,jsonb,uuid,text,integer)'::regprocedure);
  v_new := replace(v_def, $o$  when 'photo' then
    select * into ph from public.photos where id = p_target_id for update;$o$, $n$  when 'local_post_removal' then
    -- P0.7-05: only a post that is on Google, found by the name Google gave it when Kabsi published it.
    if p_channel <> 'dashboard' then raise exception 'not_on_this_channel'; end if;
    select * into po from public.gbp_posts where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := po.location_id; v_state := po.state;
    select google_ref into v_text from public.publications
     where target_type = 'local_post' and target_id = p_target_id and state = 'verified' and google_ref is not null
     order by created_at desc limit 1;
    if v_text is null then raise exception 'post_not_on_google'; end if;
    v_payload := jsonb_build_object('post_ref', v_text, 'summary', po.body);
  when 'photo' then
    select * into ph from public.photos where id = p_target_id for update;$n$);
  if v_new = v_def then raise exception 'approve_publication: no match (payload)'; end if;
  v_def := v_new;
  v_new := replace(v_def, $o$    update public.gbp_posts set state = 'publishing', body = v_text where id = p_target_id;
  when 'photo' then$o$, $n$    update public.gbp_posts set state = 'publishing', body = v_text where id = p_target_id;
  when 'local_post_removal' then
    if v_state <> 'posted' then raise exception 'already_handled'; end if;
    update public.gbp_posts set state = 'removing' where id = p_target_id;
  when 'photo' then$n$);
  if v_new = v_def then raise exception 'approve_publication: no match (state)'; end if;
  execute v_new;

  -- 3. record_publication: removed once verified; back to posted if Google refused or it failed.
  v_def := pg_get_functiondef('public.record_publication(uuid,text,text,text,text,text,jsonb,boolean)'::regprocedure);
  v_new := replace(v_def, $o$  when 'photo' then
    if v_state = 'verified' then
      update public.photos set state = 'posted'$o$, $n$  when 'local_post_removal' then
    if v_state = 'verified' then
      update public.gbp_posts set state = 'removed' where id = p.target_id and state = 'removing';
    elsif v_state in ('rejected', 'failed') then
      update public.gbp_posts set state = 'posted' where id = p.target_id and state = 'removing';
    end if;
  when 'photo' then
    if v_state = 'verified' then
      update public.photos set state = 'posted'$n$);
  if v_new = v_def then raise exception 'record_publication: no match'; end if;
  execute v_new;

  -- 4. undo_publication: an undone removal leaves the post on Google, as it was.
  v_def := pg_get_functiondef('public.undo_publication(uuid,uuid)'::regprocedure);
  v_new := replace(v_def, $o$  when 'photo' then update public.photos set state = 'draft'$o$, $n$  when 'local_post_removal' then update public.gbp_posts set state = 'posted' where id = p.target_id and state = 'removing';
  when 'photo' then update public.photos set state = 'draft'$n$);
  if v_new = v_def then raise exception 'undo_publication: no match'; end if;
  execute v_new;
end
$mig$;
