-- PILOT-READY (R-165): the channel of the filler rows is "dashboard" (publications_channel_check); the first version above used "api" and failed. publish_approve names its idempotency key review_reply:<review>:<count of publications + 1>. Retention removed older
-- publications of the QA review, so the count fell below the highest key still there and a fresh approval of the demo review failed on
-- publications_idempotency (live run of 25 Nov 2026, old_card step 2). The replay fixtures reset now pads the demo review with cancelled
-- filler rows until the count reaches the highest key. Demo review only; nothing reaches Google. (The same fragility in the pipeline is a LATER row.)
create or replace function public.qa_reset_replay_fixtures() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_review constant uuid := 'de300000-0000-4000-8000-0000000000f1';
  v_loc uuid;
  v_user uuid;
  v_count int;
  v_max int;
begin
  select r.location_id into v_loc from public.reviews r join public.locations l on l.id = r.location_id where r.id = v_review and l.is_demo;
  if v_loc is null then
    return;
  end if;
  update public.reviews set state = 'drafted', reply_state = null, existing_reply = null where id = v_review;
  update public.mock_google_reviews set reply_comment = null, reply_update_time = null where review_id = 'demo-hlc-qa1';
  update public.publications set state = 'cancelled' where target_id in (v_review, 'de300000-0000-4000-8000-0000000000f2') and state <> 'cancelled';
  update public.gbp_posts set state = 'draft', publish_at = now() + interval '20 days' where id = 'de300000-0000-4000-8000-0000000000f2';
  select count(*), coalesce(max(nullif(regexp_replace(idempotency_key, '^.*:', ''), '')::int), 0) into v_count, v_max
    from public.publications where target_type = 'review_reply' and target_id = v_review and idempotency_key ~ ':[0-9]+$';
  select user_id into v_user from public.location_members where location_id = v_loc and role = 'owner' limit 1;
  while v_count < v_max loop
    insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route, idempotency_key, publish_after)
    values (v_loc, 'review_reply', v_review, '{"text":"replay filler"}'::jsonb, v_user, 'dashboard', 'cancelled', 'api', 'review_reply:' || v_review || ':filler-' || v_count || '-' || v_max, now());
    v_count := v_count + 1;
  end loop;
end $$;
