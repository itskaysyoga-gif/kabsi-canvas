-- PROOF-2 review fix: link_watch_event also takes the event 'removed' (the listing no longer has the link): it closes the
-- link watch's task and records nothing, so the report never says a removed link "loaded again". Same signature, same grants.
create or replace function public.link_watch_event(p_location uuid, p_kind text, p_event text,
  p_title text default null, p_why text default null, p_recommendation text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kind not in ('website', 'booking', 'menu') or p_event not in ('down', 'back', 'removed') then raise exception 'bad_link_event'; end if;
  if p_event <> 'removed' then
    insert into public.link_watch_events (location_id, kind, event) values (p_location, p_kind, p_event);
  end if;
  if p_event = 'down' then
    perform private.task_put(p_location, 'profile_gap', 'link_watch', p_kind, 'recommended',
      left(coalesce(p_title, 'A link on your Google profile is not loading'), 200),
      left(coalesce(p_why, 'Kabsi tried the link 3 times and it did not load.'), 500), left(p_recommendation, 300),
      jsonb_build_object('failures', 3), null, 'link_watch:' || p_kind);
  else
    update public.tasks set state = 'done', resolved_at = now()
     where location_id = p_location and kind = 'profile_gap' and dedupe_key = 'link_watch:' || p_kind
       and state in ('open', 'snoozed', 'approved', 'publishing');
  end if;
end $$;
revoke execute on function public.link_watch_event(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.link_watch_event(uuid, text, text, text, text, text) to service_role;
