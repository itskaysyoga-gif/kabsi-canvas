-- QA 1 (master plan 30.12): the first-time rows for the web journeys and the WhatsApp card scenarios, on the demo business Harbour
-- Lane Coffee (mock Google, R-17). Insert only (no delete), so the Supabase connector runs it without asking; run it once. Later
-- runs use qa-reset.sql, which deletes what a run made and so is asked about.
--   review  de300000-0000-4000-8000-0000000000f1  one invented review with a draft waiting
--   post    de300000-0000-4000-8000-0000000000f2  one invented post draft due in 20 days
--   user    qa-demo@test.local                    the web journeys' demo account, an owner of Harbour Lane Coffee
do $$
declare
  v_cafe constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_rev constant uuid := 'de300000-0000-4000-8000-0000000000f1';
  v_post constant uuid := 'de300000-0000-4000-8000-0000000000f2';
  v_user constant uuid := 'de300000-0000-4000-8000-0000000000a0';
begin
  if not exists (select 1 from public.locations where id = v_cafe and is_demo) then raise exception 'Run supabase/seed/demo.sql first'; end if;
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qa-demo@test.local', now(),
    '{"provider":"email","providers":["email"]}', '{"qa":"qa-1"}', now(), now(), false, '', '', '', '', '', '', '', '')
  on conflict (id) do nothing;
  insert into public.location_members (location_id, user_id, role) values (v_cafe, v_user, 'owner') on conflict do nothing;
  insert into public.mock_google_reviews (review_id, google_location_id, reviewer_name, star_rating, comment, create_time)
  values ('demo-hlc-qa1', 'locations/demo-harbour-lane-coffee', 'Quinn Tester', 4, 'Good flat white and a friendly welcome. The oat milk option is a nice touch.', timestamptz '2026-10-25 06:00:00+00')
  on conflict (review_id) do nothing;
  insert into public.reviews (id, location_id, google_review_id, reviewer_name, star_rating, comment, language, urgency, urgency_reasons,
    state, review_created_at, is_backlog, notified_at, fetched_at, source)
  values (v_rev, v_cafe, 'demo-hlc-qa1', 'Quinn Tester', 4, 'Good flat white and a friendly welcome. The oat milk option is a nice touch.', 'en', 'normal', '{}',
    'drafted', timestamptz '2026-10-25 06:00:00+00', false, now(), now(), 'google')
  on conflict (id) do nothing;
  insert into public.reply_drafts (review_id, version, body, source, safety_ok, safety_notes, model)
  values (v_rev, 1, 'Thank you, Quinn. We are glad you enjoyed the flat white, and the oat milk is there for exactly that. See you again soon. Maya and the Harbour Lane team', 'ai', true, '[]'::jsonb, 'qa-seed')
  on conflict (review_id, version) do nothing;
  insert into public.gbp_posts (id, location_id, owner_input, body, cta_type, state, source, publish_at)
  values (v_post, v_cafe, 'QA 1 journey post', 'Our winter menu starts next month: spiced oat latte, cardamom buns and a new filter roast. Come and try it by the window.',
    'CALL', 'draft', 'auto', now() + interval '20 days')
  on conflict (id) do nothing;
end $$;
select (select state from public.reviews where id = 'de300000-0000-4000-8000-0000000000f1') as review_state,
       (select count(*) from public.reply_drafts where review_id = 'de300000-0000-4000-8000-0000000000f1') as drafts,
       (select state from public.gbp_posts where id = 'de300000-0000-4000-8000-0000000000f2') as post_state;
-- Expect: drafted | 1 | draft
