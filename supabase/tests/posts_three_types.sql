-- P0.5-02 part A: posts of three types and the month (K-24, K-80). An Offer without dates or terms cannot be stored;
-- an Event needs its title and dates; the month's prepared posts make one task; the one question closes when a post
-- is planned; approving a post with a time waits in Kabsi's queue until that time (the publish job runs then), once.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active', time_zone = 'UTC'
 where id = '00000000-0000-4000-8000-0000000000c1';

select is((select posts_per_month from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), 2::smallint, 'two posts a month by default');
select ok(not has_function_privilege('authenticated', 'public.post_prepare(uuid,text,text,uuid,jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'public.post_question(uuid,text,text)', 'execute')
      and not has_function_privilege('authenticated', 'public.post_month_plan(uuid,text)', 'execute'), 'the care routine functions are service role only');
select ok(not exists (select 1 from cron.job where jobname = 'kabsi_posts_weekly')
      and exists (select 1 from cron.job where jobname = 'kabsi_care_posts'), 'posts-weekly is replaced by the care routine');

select throws_ok($$ insert into public.gbp_posts (location_id, owner_input, body, topic_type, offer_terms)
  values ('00000000-0000-4000-8000-0000000000c1', 'x', 'Two croissants for one on Fridays.', 'OFFER', 'Fridays only') $$,
  '23514', null, 'an Offer without dates is refused');
select throws_ok($$ insert into public.gbp_posts (location_id, owner_input, body, topic_type, start_date, end_date)
  values ('00000000-0000-4000-8000-0000000000c1', 'x', 'Two croissants for one on Fridays.', 'OFFER', '2027-01-01', '2027-01-31') $$,
  '23514', null, 'an Offer without terms is refused');
select throws_ok($$ insert into public.gbp_posts (location_id, owner_input, body, topic_type, start_date, end_date)
  values ('00000000-0000-4000-8000-0000000000c1', 'x', 'A sourdough class on Saturday morning.', 'EVENT', '2027-01-09', '2027-01-09') $$,
  '23514', null, 'an Event without a title is refused');
select throws_ok($$ insert into public.gbp_posts (location_id, owner_input, body, topic_type, start_date, end_date, offer_terms, recurs_monthly)
  values ('00000000-0000-4000-8000-0000000000c1', 'x', 'Two croissants for one on Fridays.', 'OFFER', '2027-01-01', '2027-01-31', 'Fridays', true) $$,
  '23514', null, 'only a plain Update can recur');

-- The one question, then a planned post answers it.
select ok(public.post_question('00000000-0000-4000-8000-0000000000c1', '2027-01', 'Anything new this month? A dish, a service, an event?'), 'the question is asked');
select is((select title from public.tasks where dedupe_key = 'post_question:2027-01' and state = 'open'),
  'Anything new this month? A dish, a service, an event?', 'one question task');
select isnt(public.post_prepare('00000000-0000-4000-8000-0000000000c1', '2027-01-07T09:00',
  'Our birthday cakes are made to order with two days notice. Tell us the flavour and the name, then pick it up on the day.', null), null, 'a prepared post');
select isnt(public.post_prepare('00000000-0000-4000-8000-0000000000c1', '2027-01-21T09:00',
  'Sourdough comes out of the oven at 7 every morning. Come early for a warm loaf and a croissant with your coffee.', null), null, 'a second prepared post');
select is((select state from public.tasks where dedupe_key = 'post_question:2027-01'), 'done', 'a planned post answers the question');
select is(jsonb_array_length(public.post_month_plan('00000000-0000-4000-8000-0000000000c1', '2027-01')), 2, 'the month holds both');
select is((select (public.post_month_plan('00000000-0000-4000-8000-0000000000c1', '2027-01')) -> 0 ->> 'publish_local'), '2027-01-07T09:00', 'at their local times');

select private.detect_post_drafts('00000000-0000-4000-8000-0000000000c1');
select is((select title from public.tasks where dedupe_key = 'post_month:2027-01' and state = 'open'), '2 posts for January are ready', 'one task for the month');
select is((select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'post'
            and source_type = 'gbp_post' and state = 'open' and title = 'A Google post is ready for you'
            and source_id in (select id::text from public.gbp_posts where publish_at is not null)), 0, 'no task per prepared post');

-- Approving each post of the month: published at its time from Kabsi's queue, once.
create temp table r (n int, j jsonb);
insert into r select row_number() over (order by publish_at), public.approve_publication('local_post', id,
  jsonb_build_object('summary', body, 'language', 'en'), '00000000-0000-4000-8000-0000000000a1', 'dashboard')
  from public.gbp_posts where location_id = '00000000-0000-4000-8000-0000000000c1' and publish_at is not null;
select is((select count(*)::int from r where j ->> 'created' = 'true'), 2, 'two publications');
select ok((select max(abs(extract(epoch from p.publish_after - g.publish_at))) <= 1 from public.publications p
            join public.gbp_posts g on g.id = p.target_id where p.target_type = 'local_post'), 'each waits until its own time');
select is((select count(*)::int from public.jobs j join public.publications p on j.dedupe_key = 'publish:' || p.id
            join public.gbp_posts g on g.id = p.target_id
           where p.target_type = 'local_post' and j.next_run_at = p.publish_after), 2, 'the publish job runs then');
select is((public.approve_publication('local_post', (select target_id from public.publications where target_type = 'local_post' limit 1),
  jsonb_build_object('summary', 'Our birthday cakes are made to order.', 'language', 'en'), '00000000-0000-4000-8000-0000000000a1', 'dashboard')) ->> 'created',
  'false', 'approving again is the same publication');
select is((select payload ->> 'topic_type' from public.publications where target_type = 'local_post' limit 1), 'STANDARD', 'the type goes with it');
select private.detect_post_drafts('00000000-0000-4000-8000-0000000000c1');
select is((select state from public.tasks where dedupe_key = 'post_month:2027-01'), 'done', 'nothing left to approve: the month is done');

-- The cadence.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select is(public.set_post_cadence('00000000-0000-4000-8000-0000000000c1', 4), 4, 'the owner chooses 4 a month');
select throws_ok($$ select public.set_post_cadence('00000000-0000-4000-8000-0000000000c1', 3) $$, 'P0001', 'bad_cadence', 'only 1, 2 or 4');
reset role;
set local request.jwt.claims = '';

select * from finish();
rollback;
