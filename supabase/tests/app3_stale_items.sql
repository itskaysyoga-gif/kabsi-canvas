-- APP-3 item 3 (R-169): a post planned for a month that has ended expires; an unanswered "Anything new this month?"
-- expires 14 days after it was asked; expired items leave the open tasks (Home and the waiting count) and nothing is
-- published from them; an expired question is not asked again for its month.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active', time_zone = 'UTC'
 where id = '00000000-0000-4000-8000-0000000000c1';

select ok(not has_function_privilege('authenticated', 'private.expire_stale_items()', 'execute'), 'only cron runs the expiry');

-- A post planned for last month, still a draft, with its month task; one for this month.
insert into public.gbp_posts (id, location_id, owner_input, body, topic_type, publish_at, state)
values ('00000000-0000-4000-8000-00000000a301', '00000000-0000-4000-8000-0000000000c1', 'x',
        'Our birthday cakes are made to order with two days notice. Tell us the flavour.', 'STANDARD',
        date_trunc('month', now()) - interval '3 days', 'draft'),
       ('00000000-0000-4000-8000-00000000a302', '00000000-0000-4000-8000-0000000000c1', 'x',
        'Sourdough comes out of the oven at 7 every morning. Come early for a warm loaf.', 'STANDARD',
        date_trunc('month', now()) + interval '40 days', 'draft');
select private.detect_post_drafts('00000000-0000-4000-8000-0000000000c1');
select is((select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
            and source_type = 'post_month' and state = 'open'), 2, 'two month tasks before');

-- A question asked 20 days ago for this month, and one asked today for next month.
select ok(public.post_question('00000000-0000-4000-8000-0000000000c1', to_char(now(), 'YYYY-MM'), 'Anything new this month? A dish, a service, an event?'), 'old question');
update public.tasks set created_at = now() - interval '20 days'
 where dedupe_key = 'post_question:' || to_char(now(), 'YYYY-MM');
select ok(public.post_question('00000000-0000-4000-8000-0000000000c1', to_char(now() + interval '1 month', 'YYYY-MM'), 'Anything new this month? A dish, a service, an event?'), 'new question');

select private.expire_stale_items();

select is((select state from public.gbp_posts where id = '00000000-0000-4000-8000-00000000a301'), 'expired', 'last month''s draft expired');
select is((select state from public.gbp_posts where id = '00000000-0000-4000-8000-00000000a302'), 'draft', 'this month''s draft stays');
select is((select state from public.tasks where dedupe_key = 'post_month:' || to_char(date_trunc('month', now()) - interval '3 days', 'YYYY-MM')),
  'expired', 'the ended month''s task expired, not done');
select is((select state from public.tasks where dedupe_key = 'post_question:' || to_char(now(), 'YYYY-MM') and source_type = 'post_question'),
  case when now() > date_trunc('month', now()) + interval '14 days' then 'expired' else 'open' end,
  'the question expires 14 days after it was asked (counted from its month''s first day)');
select is((select state from public.tasks where dedupe_key = 'post_question:' || to_char(now() + interval '1 month', 'YYYY-MM')), 'open', 'a question asked today stays');

-- Nothing is published from an expired post.
select throws_ok($$ select public.approve_publication('local_post', '00000000-0000-4000-8000-00000000a301',
  jsonb_build_object('summary', 'Our birthday cakes are made to order with two days notice.', 'language', 'en', 'photo_id', null, 'photo_sig', null),
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, null, null, 'an expired post cannot be approved');
select is((select count(*)::int from public.publications where target_id = '00000000-0000-4000-8000-00000000a301'), 0, 'no publication');

-- An expired question is not asked again for its month.
update public.tasks set state = 'expired', resolved_at = now() where dedupe_key = 'post_question:' || to_char(now() + interval '1 month', 'YYYY-MM');
select is(public.post_question('00000000-0000-4000-8000-0000000000c1', to_char(now() + interval '1 month', 'YYYY-MM'), 'Anything new this month? A dish, a service, an event?'),
  false, 'the care routine does not ask it again');
select is((select count(*)::int from public.tasks where dedupe_key = 'post_question:' || to_char(now() + interval '1 month', 'YYYY-MM') and state = 'open'), 0, 'no new open question');

select * from finish();
rollback;
