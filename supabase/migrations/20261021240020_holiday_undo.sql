-- P0.5-03 part B: the 10 second undo on the holiday link page (K-70). The page cancels the approval this link made, inside
-- its undo window, and the question goes back to "asked" so the owner can answer again. Additive: one function.
create function public.undo_holiday_link(p_token_hash text, p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pr public.holiday_prompts; pub uuid; r jsonb;
begin
  select * into pr from public.holiday_prompts where token_hash = p_token_hash for update;
  if not found then raise exception 'invalid_link'; end if;
  if p_user is null then raise exception 'sign_in_required'; end if;
  if pr.special_hours_id is null then raise exception 'not_allowed'; end if;
  select id into pub from public.publications
   where target_type = 'special_hours' and target_id = pr.special_hours_id and state = 'approved'
   order by created_at desc limit 1;
  if pub is null then raise exception 'too_late'; end if;
  r := public.undo_publication(pub, p_user);
  -- The dates are free again, and the question is open.
  update public.special_hours set state = 'skipped' where id = pr.special_hours_id and state = 'draft';
  update public.holiday_prompts set state = 'asked', answer = null, answered_at = null, answered_by = null, channel = null,
    special_hours_id = null where id = pr.id;
  return r;
end $$;
revoke execute on function public.undo_holiday_link(text, uuid) from public, anon, authenticated;
grant execute on function public.undo_holiday_link(text, uuid) to service_role;
