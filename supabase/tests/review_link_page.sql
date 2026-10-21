-- P0.8-05 (K-132): the review link page. Every link starts on "Go straight to Google" so no printed QR code changes;
-- only an owner or manager switches it; the edge copy follows the switch; the manager's WhatsApp number is a
-- Business Knowledge fact with a country code that drafts never use.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.cards set kind = 'link' where code = 'VCTM22';

select is((select page_mode from public.cards where code = 'VCTM22'), 'direct', 'a link starts on Go straight to Google');
select throws_ok($$ update public.cards set page_mode = 'maybe' where code = 'VCTM22' $$, '23514', null, 'page_mode is direct or page');
select ok(not has_function_privilege('anon', 'public.set_review_link_mode(text,text)', 'execute'), 'anon cannot switch a link');

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.set_review_link_mode('VCTM22', 'sideways') $$, 'P0001', 'bad_mode', 'only direct or page');
select throws_ok($$ select public.set_review_link_mode('ZZZZZZ', 'page') $$, 'P0001', 'unknown_link', 'an unknown code is refused');
select lives_ok($$ select public.set_review_link_mode('vctm22', 'page') $$, 'the owner switches the link to the page');
reset role;
select is((select page_mode from public.cards where code = 'VCTM22'), 'page', 'the link now shows the page');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.set_review_link_mode('VCTM22', 'direct') $$, 'and back to Google');
reset role;
select is((select page_mode from public.cards where code = 'VCTM22'), 'direct', 'the link goes straight to Google again');

-- Another business's owner cannot switch it.
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.set_review_link_mode('VCTM22', 'page') $$, '42501', null, 'another owner cannot switch the link');
reset role;
select is((select page_mode from public.cards where code = 'VCTM22'), 'direct', 'and nothing changed');

-- The manager's WhatsApp number.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'manager_whatsapp', '"050 123 4567"') $$,
  'P0001', null, 'a number without its country code is refused');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'manager_whatsapp', '"+12"') $$,
  'P0001', null, 'a number that is too short is refused');
select lives_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'manager_whatsapp', '"+971 50 123 4567"') $$,
  'the owner saves the manager''s WhatsApp number');
reset role;
select is((select value from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.manager_whatsapp' and superseded_by is null),
  '{"kind": "whatsapp", "text": "+971 50 123 4567"}'::jsonb, 'it is a verified contact fact of kind whatsapp');
select is((select status from public.knowledge_facts where slot = 'card.manager_whatsapp' and superseded_by is null), 'verified', 'verified at once, from the owner');
select is((select count(*) from public.draft_facts('00000000-0000-4000-8000-0000000000c1', 'replies') where slot = 'card.manager_whatsapp'), 0::bigint,
  'replies never get the number');
select is((select count(*) from public.draft_facts('00000000-0000-4000-8000-0000000000c1', 'posts') where slot = 'card.manager_whatsapp'), 0::bigint,
  'posts never get the number');

select * from finish();
rollback;
