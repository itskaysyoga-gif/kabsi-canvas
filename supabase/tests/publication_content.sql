-- P0.1-13b part A: posts, photos, special hours and Google Protection put-backs on the one publication pipeline
-- (K-38, A6, R-05, D266). The same rules as replies (publication_pipeline.sql), per kind: one publication however many
-- times it is approved, the item moves with it, undo inside 10 seconds, one claim, what Google answered, the 7 day
-- limit, and no Google work for a concierge business. The two-session race per kind is in publication_concurrency.sh;
-- the publish and reconcile jobs' Google calls are tested in supabase/functions/_shared/publish.test.ts.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- The victim business, active on the mock; the other business in concierge mode.
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/concierge-other', status = 'active', concierge = true
 where id = '00000000-0000-4000-8000-0000000000c2';

-- Two of each kind for the victim (2xx: approve and publish, 3xx: undo and refusals); one post for the concierge one.
insert into public.gbp_posts (id, location_id, owner_input, body, cta_type, cta_url)
values ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-0000000000c1', 'Fresh bread', 'Draft text', 'LEARN_MORE', 'https://example.test'),
       ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-0000000000c1', 'Fresh cake', 'Draft text', null, null),
       ('00000000-0000-4000-8000-000000000391', '00000000-0000-4000-8000-0000000000c2', 'Concierge post', 'Draft text', null, null);
insert into public.photos (id, location_id, storage_path, category, state)
values ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-0000000000c1', 'c1/front.jpg', 'EXTERIOR', 'draft'),
       ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-0000000000c1', 'c1/inside.jpg', null, 'draft');
insert into public.special_hours (id, location_id, start_date, end_date, closed, open_time, close_time)
values ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-0000000000c1', '2027-03-10', '2027-03-10', false, '09:00', '13:30'),
       ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-0000000000c1', '2027-04-01', '2027-04-02', true, null, null);
-- Google Protection changes (P0.2-04: profile_changes) against the owner's confirmed phone and website. The fixtures'
-- own phone change is closed first (one open change per field).
update public.profile_changes set status = 'expired' where location_id = '00000000-0000-4000-8000-0000000000c1';
insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, confirmed_at, uses) values
  ('00000000-0000-4000-8000-000000000214', '00000000-0000-4000-8000-0000000000c1', 'profile.phone', 'phone',
   '{"display": "+961 1 000 000", "raw": "+961 1 000 000"}', 'verified', 'owner', now(), '{profile}'),
  ('00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-0000000000c1', 'profile.website', 'website',
   '{"display": "https://old.example.test", "raw": "https://old.example.test"}', 'verified', 'owner', now(), '{profile}');
insert into public.profile_changes (id, location_id, field, previous_value, previous_fact_id, google_value, source, severity, status)
values ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-0000000000c1', 'phone',
        '{"display": "+961 1 000 000", "raw": "+961 1 000 000"}', '00000000-0000-4000-8000-000000000214',
        '{"display": "+961 1 999 999", "raw": "+961 1 999 999"}', 'scheduled_check', 'urgent', 'awaiting_review'),
       ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-0000000000c1', 'website',
        '{"display": "https://old.example.test", "raw": "https://old.example.test"}', '00000000-0000-4000-8000-000000000314',
        '{"display": "https://new.example.test", "raw": "https://new.example.test"}', 'scheduled_check', 'recommended', 'awaiting_review');

create temp table k (kind text, n int, target uuid, payload jsonb, primary key (kind, n));
insert into k values
  ('local_post', 2, '00000000-0000-4000-8000-000000000201', '{"summary": "Fresh bread every Friday morning.", "language": "en"}'),
  ('photo', 2, '00000000-0000-4000-8000-000000000202', '{"category": "INTERIOR"}'),
  ('special_hours', 2, '00000000-0000-4000-8000-000000000203', '{}'),
  ('listing_revert', 2, '00000000-0000-4000-8000-000000000204', '{}'),
  ('local_post', 3, '00000000-0000-4000-8000-000000000301', '{"summary": "Our new cake menu is here.", "language": "en"}'),
  ('photo', 3, '00000000-0000-4000-8000-000000000302', '{}'),
  ('special_hours', 3, '00000000-0000-4000-8000-000000000303', '{}'),
  ('listing_revert', 3, '00000000-0000-4000-8000-000000000304', '{}');

create temp table pub (kind text, n int, id uuid, r jsonb, primary key (kind, n));
create function pg_temp.approve(p_kind text, p_n int, p_user text default '00000000-0000-4000-8000-0000000000a1',
  p_channel text default 'dashboard') returns jsonb language sql as $$
  select public.approve_publication(p_kind, (select target from k where kind = p_kind and n = p_n),
    (select payload from k where kind = p_kind and n = p_n), p_user::uuid, p_channel)
$$;
create function pg_temp.pid(p_kind text, p_n int) returns uuid language sql as $$
  select id from pub where kind = p_kind and n = p_n
$$;
create function pg_temp.due(p_id uuid) returns void language sql as $$
  update public.publications set publish_after = now() - interval '1 second' where id = p_id
$$;
-- The item's own state, whatever its table.
create function pg_temp.item(p_kind text, p_n int) returns text language sql as $$
  select case p_kind
    when 'local_post' then (select state from public.gbp_posts where id = (select target from k where kind = p_kind and n = p_n))
    when 'photo' then (select state from public.photos where id = (select target from k where kind = p_kind and n = p_n))
    when 'special_hours' then (select state from public.special_hours where id = (select target from k where kind = p_kind and n = p_n))
    else (select status from public.profile_changes where id = (select target from k where kind = p_kind and n = p_n)) end
$$;

-- Shape and privileges.
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'))
     from unnest(array['public.approve_publication(text,uuid,jsonb,uuid,text,integer)',
                       'public.approve_publication(text,uuid,text,uuid,text,integer)']) f),
  'both forms of the approval run for the service role only');

-- Approve: one publication per item, whatever the channel or how many times; the item is on its way.
insert into pub select kind, 2, (r ->> 'publication_id')::uuid, r from (select kind, pg_temp.approve(kind, 2) r from k where n = 2) x;
select is((select count(*) from pub where n = 2 and r ->> 'created' = 'true' and r ->> 'state' = 'approved' and r ->> 'route' = 'api'),
  4::bigint, 'each kind: the first approval creates an approved publication on the api route');
select is(pg_temp.approve(kind, 2, p_channel => 'email_link') ->> 'publication_id', pg_temp.pid(kind, 2)::text,
  kind || ': an approval from the other channel returns the same publication')
  from k where n = 2;
select is(pg_temp.approve(kind, 2) ->> 'created', 'false', kind || ': a second tap creates nothing') from k where n = 2;
select is((select count(*) from public.publications p where p.target_id = k.target), 1::bigint, kind || ': one publication')
  from k where n = 2;
select is((select count(*) from public.jobs j where j.dedupe_key = 'publish:' || pg_temp.pid(k.kind, 2)), 1::bigint,
  kind || ': one publish job') from k where n = 2;
select is((select idempotency_key from public.publications where id = pg_temp.pid(kind, 2)), kind || ':' || target || ':1',
  kind || ': the idempotency key names the item and the attempt') from k where n = 2;
select is((select publish_after - approved_at from public.publications where id = pg_temp.pid(kind, 2)), interval '10 seconds',
  kind || ': sent 10 seconds after the approval') from k where n = 2;
select is(pg_temp.item(kind, 2), case when kind = 'listing_revert' then 'rejected' else 'publishing' end,
  kind || ': the item is on its way') from k where n = 2;
select is((select count(*) from public.audit_events e where e.action = 'approval' and e.object_type = k.kind
            and e.object_id = k.target::text), 1::bigint, kind || ': the approval is in the audit log') from k where n = 2;

-- The publication carries exactly what was approved, built from the stored item.
select is((select payload from public.publications where id = pg_temp.pid('local_post', 2)),
  '{"summary": "Fresh bread every Friday morning.", "language": "en", "cta_type": "LEARN_MORE", "cta_url": "https://example.test"}'::jsonb,
  'post: the approved text, its language and the stored button');
select is((select body from public.gbp_posts where id = '00000000-0000-4000-8000-000000000201'), 'Fresh bread every Friday morning.',
  'post: the stored text is the approved text');
select is((select payload from public.publications where id = pg_temp.pid('photo', 2)),
  '{"storage_path": "c1/front.jpg", "category": "INTERIOR"}'::jsonb, 'photo: the stored file and the chosen category');
select is((select payload from public.publications where id = pg_temp.pid('special_hours', 2)),
  '{"start_date": "2027-03-10", "end_date": "2027-03-10", "closed": false, "open_time": "09:00", "close_time": "13:30"}'::jsonb,
  'special hours: the stored dates and times');
select is((select payload from public.publications where id = pg_temp.pid('listing_revert', 2)),
  '{"field": "phone", "value": "+961 1 000 000", "raw": "+961 1 000 000", "fact_id": "00000000-0000-4000-8000-000000000214"}'::jsonb,
  'put-back: the owner''s approved value from Business Knowledge, never one from the screen');

-- Refusals.
select throws_ok($$ select pg_temp.approve('local_post', 3, '00000000-0000-4000-8000-0000000000b2') $$,
  'P0001', 'approver_not_member', 'someone outside the business cannot approve a post');
select throws_ok($$ select public.approve_publication('local_post', '00000000-0000-4000-8000-000000000301', '{"summary": "Too short"}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'bad_post_text', 'a post under 10 characters is refused');
select throws_ok($$ select public.approve_publication('photo', '00000000-0000-4000-8000-000000000302', '{"category": "SELFIE"}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'bad_category', 'an unknown photo category is refused');
select throws_ok($$ select public.approve_publication('local_post', '00000000-0000-4000-8000-000000000391', '{"summary": "Concierge post text."}'::jsonb,
  '00000000-0000-4000-8000-0000000000b2', 'dashboard') $$, 'P0001', 'concierge_profile',
  'a concierge business has no Google profile work yet');
select throws_ok($$ select public.approve_publication('listing_edit', '00000000-0000-4000-8000-000000000304', '{}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'unsupported_target', 'an unknown kind is refused');
select throws_like($$ insert into public.special_hours (location_id, start_date, end_date, closed)
  values ('00000000-0000-4000-8000-0000000000c1', '2027-03-10', '2027-03-10', true) $$,
  '%special_hours_dates_unique%', 'the same dates cannot be saved again while they are on their way');

-- Claim: not before publish_after, once, with everything the publish job needs.
select is(public.claim_publication(pg_temp.pid(kind, 2)) ->> 'result', 'not_due', kind || ': no claim inside the undo window')
  from k where n = 2;
select pg_temp.due(pg_temp.pid(kind, 2)) from k where n = 2;
create temp table claimed as select kind, public.claim_publication(pg_temp.pid(kind, 2)) c from k where n = 2;
select is(c ->> 'result', 'claimed', kind || ': claimed once due') from claimed;
select is(c -> 'payload', (select payload from public.publications where id = pg_temp.pid(kind, 2)), kind || ': the claim carries the payload')
  from claimed;
select is(c ->> 'google_location_id', 'locations/mock-victim', kind || ': and the profile') from claimed;
select is(public.claim_publication(pg_temp.pid(kind, 2)) ->> 'result', 'not_approved', kind || ': a second claim gets nothing')
  from k where n = 2;

-- Google answered: published, then verified; the item follows.
select is(public.record_publication(pg_temp.pid(kind, 2), 'published', p_google_ref => 'ref-' || kind), 'published', kind || ': published')
  from k where n = 2;
select is(pg_temp.item(kind, 2), case when kind = 'listing_revert' then 'rejected' else 'publishing' end,
  kind || ': still on its way until Google shows it') from k where n = 2;
select is(public.record_publication(pg_temp.pid(kind, 2), 'verified'), 'verified', kind || ': verified') from k where n = 2;
select is(pg_temp.item(kind, 2), case when kind = 'listing_revert' then 'corrected' else 'posted' end, kind || ': the item is done')
  from k where n = 2;
select is((select state from public.publications where id = pg_temp.pid(kind, 2)), 'verified',
  kind || ': the publication is verified') from k where n = 2;
select is((select count(*) from public.audit_events e where e.action = 'publication' and e.result = 'live'
            and e.object_id = k.target::text), 1::bigint, kind || ': the publication is in the audit log') from k where n = 2;
select is(pg_temp.approve(kind, 2) ->> 'created', 'false', kind || ': approving a finished item again creates nothing')
  from k where n = 2;

-- Undo (K-70): the item goes back where it was, and is never claimed.
insert into pub select kind, 3, (r ->> 'publication_id')::uuid, r from (select kind, pg_temp.approve(kind, 3) r from k where n = 3) x;
select throws_ok(format('select public.undo_publication(%L, %L)', pg_temp.pid('photo', 3), '00000000-0000-4000-8000-0000000000b2'),
  'P0001', 'not_member', 'someone outside the business cannot undo');
select is(public.undo_publication(pg_temp.pid(kind, 3), '00000000-0000-4000-8000-0000000000a1') ->> 'state', 'cancelled',
  kind || ': undo inside the 10 seconds cancels') from k where n = 3;
select is(pg_temp.item(kind, 3), case when kind = 'listing_revert' then 'awaiting_review' else 'draft' end, kind || ': the item is back with the owner')
  from k where n = 3;
select pg_temp.due(pg_temp.pid(kind, 3)) from k where n = 3;
select is(public.claim_publication(pg_temp.pid(kind, 3)) ->> 'result', 'not_approved', kind || ': an undone approval is never claimed')
  from k where n = 3;

-- Rejected by Google: the item is marked, the reason kept; a post can be approved again only as a new draft.
delete from pub where n = 3;
insert into pub select kind, 3, (r ->> 'publication_id')::uuid, r from (select kind, pg_temp.approve(kind, 3) r from k where n = 3) x;
select is((select idempotency_key from public.publications where id = pg_temp.pid(kind, 3)), kind || ':' || target || ':2',
  kind || ': approving again after undo is a new attempt') from k where n = 3;
select pg_temp.due(pg_temp.pid(kind, 3)) from k where n = 3;
select public.claim_publication(pg_temp.pid(kind, 3)) from k where n = 3;
select is(public.record_publication(pg_temp.pid('local_post', 3), 'rejected', 'Google did not accept this post. Edit it and approve again.',
  'google 400 mock'), 'rejected', 'post: rejected while sending');
select is(public.record_publication(pg_temp.pid('photo', 3), 'published', p_google_ref => 'accounts/test/locations/mock-victim/media/1'),
  'published', 'photo: created');
select is(public.record_publication(pg_temp.pid('photo', 3), 'rejected', 'Google did not accept this photo. Nothing changed on Google.'),
  'rejected', 'photo: Google refusing it after it was created is recorded');
select is(public.record_publication(pg_temp.pid('special_hours', 3), 'rejected', 'Google did not accept this change to your hours.',
  'google 400 mock'), 'rejected', 'special hours: rejected');
select is(public.record_publication(pg_temp.pid('listing_revert', 3), 'checking', p_moderation => 'pending'), 'checking',
  'put-back: Google has not applied it yet');
select is(pg_temp.item(kind, 3), case kind when 'listing_revert' then 'rejected' else 'failed' end,
  kind || ': the item shows what happened') from k where n = 3;
select is((select error from public.publications where id = pg_temp.pid('local_post', 3)), 'google 400 mock', 'the technical error is kept for staff');

-- Seven days without it on Google: failed, never sent again.
update public.publications set approved_at = now() - interval '8 days', next_check_at = now() - interval '1 second'
 where id = pg_temp.pid('listing_revert', 3);
select is(public.claim_publication_check(pg_temp.pid('listing_revert', 3)) -> 'payload',
  '{"raw": "https://old.example.test", "field": "website", "value": "https://old.example.test", "fact_id": "00000000-0000-4000-8000-000000000314"}'::jsonb,
  'the reconcile claim carries the payload');
select is(public.record_publication(pg_temp.pid('listing_revert', 3), 'checking'), 'failed', 'after 7 days a put-back not shown is failed');
select is((select error from public.publications where id = pg_temp.pid('listing_revert', 3)),
  'Google has not shown this change after 7 days. Kabsi did not send it again.', 'with the reason');
select is(pg_temp.item('listing_revert', 3), 'failed', 'and the change shows it could not be put back');

-- A business that became concierge after the approval: stopped, nothing sent.
insert into public.gbp_posts (id, location_id, owner_input, body)
values ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-0000000000c1', 'Late post', 'Draft text');
select public.approve_publication('local_post', '00000000-0000-4000-8000-000000000401', '{"summary": "A post approved before the switch."}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') ->> 'publication_id' as late_id \gset
update public.locations set concierge = true, google_location_id = 'locations/concierge-victim'
 where id = '00000000-0000-4000-8000-0000000000c1';
select pg_temp.due(:'late_id');
select is(public.claim_publication(:'late_id') ->> 'result', 'stopped', 'a concierge business stops a post at the claim');
select is((select state from public.gbp_posts where id = '00000000-0000-4000-8000-000000000401'), 'failed', 'and the post shows it');
update public.locations set concierge = false, google_location_id = 'locations/mock-victim'
 where id = '00000000-0000-4000-8000-0000000000c1';

-- The reply form still works and is the same approval.
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-0000000000c1', 'content-review', 5, now(), 'drafted');
select is(public.approve_publication('review_reply', '00000000-0000-4000-8000-000000000501', 'Thank you.',
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') ->> 'created', 'true', 'the reply form still approves a reply');
select is((select payload from public.publications where target_id = '00000000-0000-4000-8000-000000000501'), '{"text": "Thank you."}'::jsonb,
  'with the same payload as before');
select throws_ok($$ select public.approve_publication('local_post', '00000000-0000-4000-8000-000000000301', 'text',
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'unsupported_target', 'the reply form approves replies only');

-- The mock listing takes one field at a time (P0.1-13b fix): two writes side by side never undo each other.
insert into public.mock_listings (google_location_id, fields) values ('locations/mock-set-test', '{"phone": "1", "title": "Victim Bakery"}');
select public.mock_listing_set('locations/mock-set-test', 'phone', '"2"');
select public.mock_listing_set('locations/mock-set-test', 'specialHours', '[{"closed": true}]');
select is((select fields from public.mock_listings where google_location_id = 'locations/mock-set-test'),
  '{"phone": "2", "title": "Victim Bakery", "specialHours": [{"closed": true}]}'::jsonb, 'each write sets its own field and keeps the others');
select is(public.mock_listing_set('locations/mock-none', 'phone', '"3"'), null::jsonb, 'no mock listing: nothing written');
select ok(not has_function_privilege('authenticated', 'public.mock_listing_set(text,text,jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.mock_listing_set(text,text,jsonb)', 'execute'), 'mock_listing_set runs for the service role only');

select * from finish();
rollback;
