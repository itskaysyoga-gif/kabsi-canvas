-- FIX-3 follow-up (R-165): the fixtures reset padded the demo review's publications with filler rows so that the old count-based key
-- (review_reply:<review>:<count + 1>) could not collide. approve_publication now takes the highest stored suffix plus one, so the
-- padding is not needed, and with the new keys it collided with its own earlier filler rows (23505 on publications_idempotency_key, found on
-- the production replay of 25 Nov 2026; the replay ignores the reset's error, so the hours block of the previous migration never ran).
-- The reset is now: the QA review back to a draft, its publications cancelled, the demo post back to a draft, and the demo business's
-- weekly hours (Monday to Friday 09:00 to 17:00, Saturday 09:00 to 13:00) when it has none with periods. Demo business only.
create or replace function public.qa_reset_replay_fixtures() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_review constant uuid := 'de300000-0000-4000-8000-0000000000f1';
  v_loc uuid;
  v_user uuid;
  v_fact uuid := gen_random_uuid();
  v_old uuid;
  v_raw jsonb;
begin
  select r.location_id into v_loc from public.reviews r join public.locations l on l.id = r.location_id where r.id = v_review and l.is_demo;
  if v_loc is null then
    return;
  end if;
  update public.reviews set state = 'drafted', reply_state = null, existing_reply = null where id = v_review;
  update public.mock_google_reviews set reply_comment = null, reply_update_time = null where review_id = 'demo-hlc-qa1';
  update public.publications set state = 'cancelled' where target_id in (v_review, 'de300000-0000-4000-8000-0000000000f2') and state <> 'cancelled';
  update public.gbp_posts set state = 'draft', publish_at = now() + interval '20 days' where id = 'de300000-0000-4000-8000-0000000000f2';
  select user_id into v_user from public.location_members where location_id = v_loc and role = 'owner' limit 1;
  -- The demo business's week (FIX-3).
  select id into v_old from public.knowledge_facts
   where location_id = v_loc and slot = 'profile.regular_hours' and superseded_by is null and jsonb_array_length(coalesce(value -> 'raw' -> 'periods', '[]'::jsonb)) > 0;
  if v_old is null then
    select jsonb_build_object('periods', jsonb_agg(jsonb_build_object('openDay', d.day, 'openTime', jsonb_build_object('hours', d.o), 'closeDay', d.day,
             'closeTime', jsonb_build_object('hours', d.c)) order by d.n)) into v_raw
      from (values (1, 'MONDAY', 9, 17), (2, 'TUESDAY', 9, 17), (3, 'WEDNESDAY', 9, 17), (4, 'THURSDAY', 9, 17), (5, 'FRIDAY', 9, 17),
                   (6, 'SATURDAY', 9, 13)) d(n, day, o, c);
    update public.knowledge_facts set superseded_by = v_fact
     where location_id = v_loc and slot = 'profile.regular_hours' and superseded_by is null;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by, confirmed_at, uses, version)
    values (v_fact, v_loc, 'profile.regular_hours', 'regular_hours',
      jsonb_build_object('display', 'Mon 09:00 to 17:00, Tue 09:00 to 17:00, Wed 09:00 to 17:00, Thu 09:00 to 17:00, Fri 09:00 to 17:00, Sat 09:00 to 13:00', 'raw', v_raw),
      'verified', 'owner', 'replay_fixture', v_user, now(), array['replies', 'posts', 'profile'],
      coalesce((select max(version) from public.knowledge_facts where location_id = v_loc and slot = 'profile.regular_hours'), 0) + 1);
  end if;
end $$;
