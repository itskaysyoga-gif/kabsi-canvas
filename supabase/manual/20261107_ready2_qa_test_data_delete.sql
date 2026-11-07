-- Ready 2 part G (master plan 30.19 section 6, LATER "replay harness personas"): delete the QA test people and the QA test
-- business before the first paying business. Rashid runs this file once, in the Supabase SQL editor (project
-- ynjdqjlmdwjgbfezevxy, SQL Editor, New query, paste, Run). CLAUDE.md: real deletions go to Rashid.
-- One transaction: it stops and changes nothing if a count differs from what the session read on 7 Nov 2026.
--
-- It deletes:
--   - the five replay harness personas qa-wa-owner, qa-wa-manager, qa-wa-two, qa-wa-multi, qa-wa-staff (all @test.local,
--     phones +1 212 555 0101 to 0105, fictional), their WhatsApp opt-ins, phone roles, conversations, messages and outbox rows;
--   - the QA test account delivered+kabsi-qa@resend.dev, its business "Kabsi QA Cafe" (380a9be9, not a demo, no Google
--     connection, no card, no payment) with everything that goes with a business, its two email records and its
--     organisation (billing_test, no other business or member).
-- It keeps: the demo workspace (Harbour Lane Coffee, Juniper Hair Studio, R-17) and its demo viewer qa-demo@test.local
-- (screenshots and the public demo), Yawmiyati, every audit event. It also deletes the four cancelled demo publications
-- (Harbour Lane Coffee) that a persona approved through the replay harness, because a publication must name its approver.
-- After this runs, the WhatsApp replay harness and the QA owner journeys stop working until
-- tests/e2e/seed/qa-whatsapp-personas.sql and qa-owner-reset.sql part 1 are run again (only if a test needs them).
--
-- Expected result: the final select shows 0 in every column.
begin;

do $$
declare
  qa_loc constant uuid := '380a9be9-3afa-4a02-b41c-a78baefeb515';
  qa_org constant uuid := '1583d936-ce8a-4e0f-8733-90baf1bbbbf2';
  people constant uuid[] := array[
    'de300000-0000-4000-8000-0000000000a1', -- qa-wa-owner@test.local
    'de300000-0000-4000-8000-0000000000a2', -- qa-wa-manager@test.local
    'de300000-0000-4000-8000-0000000000a3', -- qa-wa-two@test.local
    'de300000-0000-4000-8000-0000000000a4', -- qa-wa-multi@test.local
    'de300000-0000-4000-8000-0000000000a5', -- qa-wa-staff@test.local
    'de300000-0000-4000-8000-0000000000a6'  -- delivered+kabsi-qa@resend.dev (owner of Kabsi QA Cafe)
  ]::uuid[];
  n int;
begin
  -- 0. Guards: exactly these six test addresses, the QA business is not a demo and is alone in its organisation.
  select count(*) into n from auth.users where id = any(people)
    and (email like 'qa-wa-%@test.local' or email = 'delivered+kabsi-qa@resend.dev');
  if n <> 6 then raise exception 'test users: % not 6', n; end if;
  select count(*) into n from public.locations where id = qa_loc and name = 'Kabsi QA Cafe' and not is_demo and organization_id = qa_org;
  if n <> 1 then raise exception 'Kabsi QA Cafe: % not 1', n; end if;
  select count(*) into n from public.locations where organization_id = qa_org;
  if n <> 1 then raise exception 'organisation holds % businesses, not 1', n; end if;
  select count(*) into n from public.organization_members where organization_id = qa_org and not (user_id = any(people));
  if n <> 0 then raise exception 'organisation has % other members', n; end if;
  select count(*) into n from public.payments where location_id = qa_loc;
  if n <> 0 then raise exception 'Kabsi QA Cafe has % payments', n; end if;
  -- No persona may be bound to a business that is not a demo (other than Kabsi QA Cafe).
  select count(*) into n from public.location_members m join public.locations l on l.id = m.location_id
    where m.user_id = any(people) and not l.is_demo and l.id <> qa_loc;
  if n <> 0 then raise exception 'a test user is a member of % real businesses', n; end if;

  -- 1. Demo publications a persona approved through the replay harness (4 on 7 Nov, all cancelled, Harbour Lane Coffee).
  --    approved_by may not be empty, so these test rows go (the review they answered and its draft stay with the demo).
  delete from public.publications p
    using public.locations l where l.id = p.location_id and l.is_demo and p.state = 'cancelled' and p.approved_by = any(people);
  get diagnostics n = row_count; if n <> 4 then raise exception 'publications: % not 4', n; end if;
  select count(*) into n from public.publications where approved_by = any(people);
  if n <> 0 then raise exception 'publications on a real business approved by a test user: %', n; end if;

  -- 2. WhatsApp rows kept by phone (no foreign key to the user): the fictional block +1 212 555 0101 to 0109 only.
  delete from public.whatsapp_outbox where phone like '+1212555010_' or user_id = any(people) or location_id = qa_loc;
  delete from public.whatsapp_messages where phone like '+1212555010_' or user_id = any(people) or location_id = qa_loc;
  delete from public.whatsapp_conversations where phone like '+1212555010_' or active_location_id = qa_loc;
  get diagnostics n = row_count; if n > 5 then raise exception 'whatsapp_conversations: % above 5', n; end if;
  delete from public.phone_roles where phone like '+1212555010_' or user_id = any(people) or location_id = qa_loc;

  -- 3. The QA business: its email records (no cascade), then the business (its members, tasks, reviews, jobs and the
  --    rest go with it), then its organisation (subscriptions and checkouts go with it).
  delete from public.emails where location_id = qa_loc;
  get diagnostics n = row_count; if n > 2 then raise exception 'emails: % above 2', n; end if;
  delete from public.locations where id = qa_loc;
  get diagnostics n = row_count; if n <> 1 then raise exception 'locations: % not 1', n; end if;
  delete from public.organizations where id = qa_org;
  get diagnostics n = row_count; if n <> 1 then raise exception 'organizations: % not 1', n; end if;

  -- 4. The six accounts (sessions, opt-ins, memberships, windows and codes go with them).
  delete from auth.users where id = any(people);
  get diagnostics n = row_count; if n <> 6 then raise exception 'users: % not 6', n; end if;
end $$;

commit;

-- Read-back: every column 0. demo_kept must be 2 and demo_viewer_kept 1.
select
  (select count(*) from auth.users where email like 'qa-wa-%@test.local' or email = 'delivered+kabsi-qa@resend.dev') as test_users,
  (select count(*) from public.locations where id = '380a9be9-3afa-4a02-b41c-a78baefeb515') as qa_business,
  (select count(*) from public.organizations where id = '1583d936-ce8a-4e0f-8733-90baf1bbbbf2') as qa_org,
  (select count(*) from public.phone_roles where phone like '+1212555010_') as persona_roles,
  (select count(*) from public.whatsapp_optins where phone like '+1212555010_') as persona_optins,
  (select count(*) from public.whatsapp_conversations where phone like '+1212555010_') as persona_chats,
  (select count(*) from public.whatsapp_messages where phone like '+1212555010_') as persona_messages,
  (select count(*) from public.whatsapp_outbox where phone like '+1212555010_') as persona_outbox,
  (select count(*) from public.locations where is_demo) as demo_kept,
  (select count(*) from auth.users where email = 'qa-demo@test.local') as demo_viewer_kept;
