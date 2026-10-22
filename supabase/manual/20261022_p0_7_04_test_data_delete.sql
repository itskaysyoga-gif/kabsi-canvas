-- P0.7-04 (session 18, 22 Oct 2026): test data deleted before Google goes live.
-- Rashid runs this file once, in the Supabase SQL editor (project ynjdqjlmdwjgbfezevxy), after saying yes in the chat
-- to the list below. One transaction: it stops and changes nothing if any count differs from the list.
-- It keeps: Yawmiyati (its location, its owner, its connection, the owner's own Business Knowledge card facts, one
-- plan and its payment so it can still publish), the demo workspace (Harbour Lane Coffee, Juniper Hair Studio and
-- their mock rows, R-17), every audit event and the email records that are not listed.
-- The read-back at the end must show 0 in every line.
-- Run by Rashid on 22 Oct 2026 (yes to the list). The tasks check below was relaxed to `n < 9` in his run: the daily
-- care_posts routine had added one post task at 06:13 UTC, so 10 Yawmiyati tasks were deleted, not 9.
begin;

do $$
declare
  qa_loc constant uuid := '00000000-0000-4000-8000-0000000000c2';
  qa_org constant uuid := '3fe14fc9-d3d1-4ca9-b737-0e3a140fd4fe';
  safa_loc constant uuid := '06ee2022-b1bc-40a4-9493-b46e2e055f1c';
  safa_org constant uuid := '128ab881-761e-401c-b758-81941629be69';
  yaw constant uuid := '9803ee99-fee8-4c6a-abb4-1a830fcbb438';
  -- Two of Yawmiyati's three overlapping pro_6m test plans (25 Sep); the third (1ea8da5f) and its payment stay.
  extra_plans constant uuid[] := array['31db2214-f3a6-473f-b54a-3643ff61a139', '97c84f2c-549c-47dd-a51d-f70e061bb399']::uuid[];
  test_users constant uuid[] := array[
    '00000000-0000-4000-8000-0000000000c1', -- qa-owner@test.local (QA Bakery)
    '46abcd0e-3260-471d-899b-310f9c9dbc2a', -- Safa Chicken's owner account
    'dd0e13fa-5bcf-4bd0-979d-1d3d36d27895'  -- the gmail.co typo account, never confirmed
  ]::uuid[];
  test_chats constant uuid[] := array[
    '4b15d515-09b6-4737-a3cd-27ead27d31b9', 'd2588411-7370-4bff-90be-0e26ebfa8955', '5497d213-f768-47e7-b533-ce8071c42873', -- qa- visitors
    'c89df65b-6725-49cd-a91a-bcbd8e3d2597' -- contact "Kay"
  ]::uuid[];
  n int;
begin
  -- 1. Nora test chats of 27 Sep and their two contacts (messages go with the chats).
  update public.chat_conversations set contact_id = null where id = any(test_chats);
  delete from public.contacts where conversation_id = any(test_chats);
  get diagnostics n = row_count; if n <> 2 then raise exception 'contacts: % not 2', n; end if;
  delete from public.chat_conversations where id = any(test_chats);
  get diagnostics n = row_count; if n <> 4 then raise exception 'chat_conversations: % not 4', n; end if;

  -- 2. QA Bakery and Safa Chicken: rows that do not go with the business by themselves, then the businesses.
  delete from public.emails where location_id in (qa_loc, safa_loc);
  get diagnostics n = row_count; if n <> 11 then raise exception 'QA emails: % not 11', n; end if;
  delete from public.locations where id in (qa_loc, safa_loc);
  get diagnostics n = row_count; if n <> 2 then raise exception 'locations: % not 2', n; end if;
  delete from public.organizations where id in (qa_org, safa_org);
  get diagnostics n = row_count; if n <> 2 then raise exception 'organizations: % not 2', n; end if;

  -- 3. The three test accounts (their sessions and memberships go with them).
  delete from auth.users where id = any(test_users);
  get diagnostics n = row_count; if n <> 3 then raise exception 'users: % not 3', n; end if;

  -- 4. Yawmiyati's mock-era content: everything Kabsi read from or sent to the mock listing, so the live listing
  --    and its one real review start clean.
  delete from public.tasks where location_id = yaw;
  get diagnostics n = row_count; if n <> 9 then raise exception 'tasks: % not 9', n; end if;
  delete from public.action_tokens where location_id = yaw;
  get diagnostics n = row_count; if n <> 14 then raise exception 'action_tokens: % not 14', n; end if;
  delete from public.publications where location_id = yaw;
  get diagnostics n = row_count; if n <> 10 then raise exception 'publications: % not 10', n; end if;
  delete from public.reviews where location_id = yaw;
  get diagnostics n = row_count; if n <> 5 then raise exception 'reviews: % not 5', n; end if;
  delete from public.gbp_posts where location_id = yaw;
  get diagnostics n = row_count; if n <> 2 then raise exception 'gbp_posts: % not 2', n; end if;
  delete from public.special_hours where location_id = yaw;
  get diagnostics n = row_count; if n <> 2 then raise exception 'special_hours: % not 2', n; end if;
  delete from public.photos where location_id = yaw;
  get diagnostics n = row_count; if n <> 2 then raise exception 'photos: % not 2', n; end if;
  delete from public.profile_changes where location_id = yaw;
  get diagnostics n = row_count; if n <> 3 then raise exception 'profile_changes: % not 3', n; end if;
  delete from public.listing_changes where location_id = yaw;
  get diagnostics n = row_count; if n <> 3 then raise exception 'listing_changes: % not 3', n; end if;
  delete from public.listing_baselines where location_id = yaw;
  get diagnostics n = row_count; if n <> 1 then raise exception 'listing_baselines: % not 1', n; end if;
  delete from public.rating_snapshots where location_id = yaw;
  get diagnostics n = row_count; if n <> 18 then raise exception 'rating_snapshots: % not 18', n; end if;
  delete from public.weekly_reports where location_id = yaw;
  get diagnostics n = row_count; if n <> 5 then raise exception 'weekly_reports: % not 5', n; end if;
  -- The five profile facts read from the mock listing (a made-up phone, "Restaurant"); the owner's own card facts stay.
  delete from public.knowledge_facts where location_id = yaw and source = 'google' and slot like 'profile.%';
  get diagnostics n = row_count; if n <> 5 then raise exception 'knowledge_facts: % not 5', n; end if;
  delete from public.payments where location_id = yaw and plan_id = any(extra_plans);
  get diagnostics n = row_count; if n <> 2 then raise exception 'payments: % not 2', n; end if;
  delete from public.plans where id = any(extra_plans);
  get diagnostics n = row_count; if n <> 2 then raise exception 'plans: % not 2', n; end if;

  -- 5. Mock rows of the two non-demo businesses (the demo's 2 listings and 24 reviews stay, R-17).
  delete from public.mock_google_reviews where google_location_id in ('locations/mock-9803ee99', 'locations/mock-qac00000');
  get diagnostics n = row_count; if n <> 7 then raise exception 'mock_google_reviews: % not 7', n; end if;
  delete from public.mock_listings where google_location_id in ('locations/mock-9803ee99', 'locations/mock-qac00000');
  get diagnostics n = row_count; if n <> 2 then raise exception 'mock_listings: % not 2', n; end if;
end $$;

-- Read-back: every line 0, except the last three (what stays).
select 'QA Bakery and Safa Chicken' what, count(*) n from public.locations where id in ('00000000-0000-4000-8000-0000000000c2', '06ee2022-b1bc-40a4-9493-b46e2e055f1c')
union all select 'test accounts', count(*) from auth.users where id in ('00000000-0000-4000-8000-0000000000c1', '46abcd0e-3260-471d-899b-310f9c9dbc2a', 'dd0e13fa-5bcf-4bd0-979d-1d3d36d27895')
union all select 'test chats', count(*) from public.chat_conversations where id in ('4b15d515-09b6-4737-a3cd-27ead27d31b9', 'd2588411-7370-4bff-90be-0e26ebfa8955', '5497d213-f768-47e7-b533-ce8071c42873', 'c89df65b-6725-49cd-a91a-bcbd8e3d2597')
union all select 'Yawmiyati mock-era reviews, publications, tasks', (select count(*) from public.reviews where location_id = '9803ee99-fee8-4c6a-abb4-1a830fcbb438') + (select count(*) from public.publications where location_id = '9803ee99-fee8-4c6a-abb4-1a830fcbb438') + (select count(*) from public.tasks where location_id = '9803ee99-fee8-4c6a-abb4-1a830fcbb438')
union all select 'non-demo mock rows', (select count(*) from public.mock_listings where google_location_id not like 'locations/demo-%') + (select count(*) from public.mock_google_reviews where google_location_id not like 'locations/demo-%')
union all select 'stays: Yawmiyati plans (1)', count(*) from public.plans where location_id = '9803ee99-fee8-4c6a-abb4-1a830fcbb438'
union all select 'stays: Yawmiyati card facts (10)', count(*) from public.knowledge_facts where location_id = '9803ee99-fee8-4c6a-abb4-1a830fcbb438'
union all select 'stays: demo mock rows (26)', (select count(*) from public.mock_listings) + (select count(*) from public.mock_google_reviews);

commit;
