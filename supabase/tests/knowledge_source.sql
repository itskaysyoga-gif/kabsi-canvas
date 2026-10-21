-- P0.3-01: Business Knowledge is the source for every draft (K-10, K-11, K-120, guardrail 4). Drafts get only verified,
-- current facts within their ask-again date (an AI suggestion or an unconfirmed website fact never); review_after is
-- set per key and applies; two answers that disagree on something customers see make one open question and never a
-- guess; the owner confirms, edits, rejects and removes facts (removal takes the row and every version); every action
-- is in the audit log without the value; update_knowledge_card is retired (no callers, nobody may run it).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1): owner A (..a1), a manager M (..b4). P (..a2) is outside the team, B (..b2) owns another business.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated',
        'victim-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'manager');

create temp table f (name text primary key, id uuid);
grant all on f to authenticated;
create function pg_temp.draft(p_use text default 'replies') returns text[] language sql as $$
  select coalesce(array_agg(slot || '=' || coalesce(value ->> 'text', value ->> 'name', value::text) order by slot), '{}')
    from public.draft_facts('00000000-0000-4000-8000-0000000000c1', p_use)
$$;

-- Who may do what ----------------------------------------------------------------------------------------------------

select ok(not has_table_privilege('authenticated', 'public.knowledge_confirms', 'insert')
  and not has_table_privilege('authenticated', 'public.knowledge_confirms', 'update')
  and not has_table_privilege('authenticated', 'public.knowledge_confirms', 'delete')
  and not has_table_privilege('anon', 'public.knowledge_confirms', 'select'), 'the browser reads open questions, never writes them');
select ok(not has_function_privilege('authenticated', 'public.draft_facts(uuid,text)', 'execute')
  and not has_function_privilege('anon', 'public.draft_facts(uuid,text)', 'execute')
  and has_function_privilege('service_role', 'public.draft_facts(uuid,text)', 'execute'), 'draft_facts is for the Edge Functions only');
select ok(not has_function_privilege('authenticated', 'public.propose_fact(uuid,text,text,jsonb,text,text,text[])', 'execute')
  and has_function_privilege('service_role', 'public.propose_fact(uuid,text,text,jsonb,text,text,text[])', 'execute'),
  'only the Edge Functions propose facts');
select ok(not has_function_privilege('authenticated', 'public.update_knowledge_card(uuid,jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.update_knowledge_card(uuid,jsonb)', 'execute')
  and not has_function_privilege('service_role', 'public.update_knowledge_card(uuid,jsonb)', 'execute'),
  'update_knowledge_card: nobody may run it');
select throws_ok($$ select public.update_knowledge_card('00000000-0000-4000-8000-0000000000c1', '{"about": "x"}') $$,
  '0A000', null, 'update_knowledge_card raises even for the table owner');
select is((select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
            where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
              and p.prosrc ilike '%update_knowledge_card%' and p.proname <> 'update_knowledge_card'),
  '{}'::text[], 'no database function calls update_knowledge_card');
select is((select confdeltype::text from pg_constraint where conname = 'knowledge_confirms_location_id_fkey'), 'c',
  'questions go with their business');

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'about', '"x"') $$, '42501', 'sign_in_required',
  'signed out, nothing is saved (an email link has no user)');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a2');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'about', '"x"') $$, '42501', null, 'someone outside the team cannot save a fact');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'about', '"x"') $$, '42501', null, 'another owner cannot save a fact');
reset role;

-- The owner's facts, saved fact by fact ------------------------------------------------------------------------------

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
insert into f select 'about', public.save_fact('00000000-0000-4000-8000-0000000000c1', 'about', '"Family bakery in Hamra"');
insert into f select 'price', public.save_fact('00000000-0000-4000-8000-0000000000c1', 'price_notes', '"Cakes from $20"');
insert into f select 'hours', public.save_fact('00000000-0000-4000-8000-0000000000c1', 'hours_note', '"Open 9 to 18, closed Sundays"');
insert into f select 'staff', public.save_fact('00000000-0000-4000-8000-0000000000c1', 'staff_names', '"Rami"');
insert into f select 'wifi', public.save_fact('00000000-0000-4000-8000-0000000000c1', 'wifi', '"Free for customers"');
insert into f select 'sign', public.save_fact('00000000-0000-4000-8000-0000000000c1', 'signature', '"The Hamra team"');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'slogan', '"Best"') $$, 'P0001', 'unknown field: slogan', 'only the fields of About your business');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'tone', '"angry"') $$, 'P0001', 'tone: warm, formal or short', 'tone is one of three');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'about', '"   "') $$, 'P0001', 'about: empty', 'an empty value is not a fact');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'faqs', '{"q": "Vegan?"}') $$, 'P0001', 'faqs: a question and an answer', 'a question needs its answer');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'wifi', to_jsonb(repeat('x', 101))) $$, 'P0001', 'wifi: too long', 'lengths are capped');
reset role;

select is((select array_agg(slot || ':' || key || ':' || status || ':' || source || ':' || (confirmed_by = '00000000-0000-4000-8000-0000000000a1') order by slot)
             from public.knowledge_facts where id in (select id from f)),
  array['card.about:description:verified:owner:true', 'card.hours_note:hours_note:verified:owner:true',
        'card.price_notes:price_note:verified:owner:true', 'card.signature:signature:verified:owner:true',
        'card.staff_names:' || md5('"Rami"') || ':staff_member:verified:owner:true', 'card.wifi:wifi:verified:owner:true'],
  'each saved value is one verified owner fact, confirmed by the owner, in the slot the card copy uses');

-- K-10 review_after: prices 90 days, staff 180, hours notes 60, others never.
select is((select array_agg(key || '=' || coalesce((review_after::date - now()::date)::text, 'none') order by key)
             from public.knowledge_facts where id in (select id from f)),
  array['description=none', 'hours_note=60', 'price_note=90', 'signature=none', 'staff_member=180', 'wifi=none'],
  'ask-again dates: prices 90 days, staff 180, hours notes 60');

-- Drafts use only verified facts ------------------------------------------------------------------------------------

select is(pg_temp.draft(), array['card.about=Family bakery in Hamra', 'card.hours_note=Open 9 to 18, closed Sundays',
  'card.price_notes=Cakes from $20', 'card.signature=The Hamra team', 'card.staff_names:' || md5('"Rami"') || '=Rami',
  'card.tone=warm', 'card.wifi=Free for customers'], 'the reply facts are the verified ones (the tone came with the business)');
select ok(not ('card.signature=The Hamra team' = any (pg_temp.draft('posts'))) and not exists (
  select 1 from unnest(pg_temp.draft('posts')) s where s like 'card.staff_names%'), 'posts get neither the sign-off nor staff names');

-- K-11: an AI suggestion arrives as needs_confirmation and never reaches a prompt.
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.parking', 'parking',
  '{"text": "Free valet parking"}', 'ai_suggestion', 'edit:review-reply'), 'added', 'an AI suggestion is added');
select is((select status || ':' || source from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.parking' and superseded_by is null),
  'needs_confirmation:ai_suggestion', 'it waits for the owner');
select ok(not exists (select 1 from unnest(pg_temp.draft()) s where s like '%valet%')
  and not exists (select 1 from unnest(pg_temp.draft('posts')) s where s like '%valet%')
  and not exists (select 1 from unnest(pg_temp.draft(null)) s where s like '%valet%'), 'an unconfirmed AI suggestion is in no draft');
select throws_ok($$ insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_at)
                    values ('00000000-0000-4000-8000-0000000000c1', 'card.x', 'faq', '{}', 'verified', 'ai_suggestion', now()) $$,
  '23514', null, 'an AI suggestion cannot be made verified without a person');

-- A website fact nobody confirmed stays out too.
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.booking', 'booking',
  '{"text": "Book online any time"}', 'website', 'https://victim.example/book'), 'added', 'a website fact is added');
select ok(not exists (select 1 from unnest(pg_temp.draft()) s where s like '%Book online%'), 'an unconfirmed website fact is in no draft');

-- Trust (K-11): a higher source replaces an unconfirmed lower one; a lower one never overrides.
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.parking', 'parking',
  '{"text": "Street parking only"}', 'website', 'https://victim.example'), 'replaced', 'a website fact replaces an AI suggestion, still unconfirmed');
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.parking', 'parking',
  '{"text": "Free valet parking"}', 'ai_suggestion', null), 'held', 'an AI suggestion does not override a website fact');
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.wifi', 'wifi',
  '{"text": "No wifi"}', 'website', null), 'held', 'a website value never overrides the owner (not something to ask about)');
select is((select value ->> 'text' from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.wifi' and superseded_by is null), 'Free for customers', 'the owner''s wifi fact is unchanged');
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.wifi', 'wifi',
  '{"text": "Free for customers"}', 'website', null), 'same', 'the same value is nothing new');

-- The owner confirms the website's parking: it becomes verified, confirmed by them, and drafts may use it.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
insert into f select 'parking', public.confirm_fact((select id from public.knowledge_facts
  where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.parking' and superseded_by is null));
reset role;
select is((select status || ':' || source || ':' || (confirmed_by = '00000000-0000-4000-8000-0000000000a1')
             from public.knowledge_facts where id = (select id from f where name = 'parking')),
  'verified:website:true', 'a confirmed website fact is verified with the owner as who confirmed it');
select ok('card.parking=Street parking only' = any (pg_temp.draft()), 'once confirmed, drafts may use it');

-- "Not right": a rejected suggestion never comes back.
select public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.languages', 'language', '{"text": "French"}', 'ai_suggestion', null);
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.reject_fact((select id from public.knowledge_facts
  where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.languages' and superseded_by is null));
select throws_ok($$ select public.reject_fact((select id from f where name = 'about')) $$, 'P0001', 'edit_or_remove_instead',
  'a verified fact is edited or removed, not rejected');
reset role;
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.languages', 'language', '{"text": "French"}', 'ai_suggestion', null),
  'rejected_before', 'a value the owner rejected is not suggested again');
select ok(not exists (select 1 from unnest(pg_temp.draft()) s where s like 'card.languages%'), 'a rejected fact is in no draft');

-- review_after applies: a price past its 90 days is out of date and leaves the drafts until the owner confirms it.
update public.knowledge_facts set review_after = now() - interval '1 day' where id = (select id from f where name = 'price');
select ok(not exists (select 1 from unnest(pg_temp.draft()) s where s like 'card.price_notes%'), 'a price past its date is in no draft');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.confirm_fact((select id from f where name = 'price'));
reset role;
select is((select review_after::date - now()::date from public.knowledge_facts where id = (select id from f where name = 'price')), 90,
  'confirming it asks again in 90 days');
select ok('card.price_notes=Cakes from $20' = any (pg_temp.draft()), 'and drafts use it again');
update public.knowledge_facts set review_after = now() - interval '1 day' where id = (select id from f where name = 'staff');
select ok(not exists (select 1 from unnest(pg_temp.draft()) s where s like 'card.staff_names%'), 'a staff name past its 180 days is in no draft');

-- K-11: two answers about the hours make one question, never a guess ---------------------------------------------

select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.hours_note', 'hours_note',
  '{"text": "Open 9 to 20, closed Sundays"}', 'website', 'https://victim.example/contact'), 'asked', 'the website disagrees on the hours: asked');
select is(public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.hours_note', 'hours_note',
  '{"text": "Open 9 to 21"}', 'website', 'https://victim.example/contact'), 'asked', 'and again');
select is((select count(*)::int from public.knowledge_confirms where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.hours_note' and state = 'open'), 1, 'one open question, however often the website disagrees');
select is((select proposed_value ->> 'text' || ':' || proposed_source from public.knowledge_confirms
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note' and state = 'open'),
  'Open 9 to 21:website', 'the question holds the latest other answer and its source');
select is((select array_agg(value ->> 'text' || ':' || status || ':' || source || ':' || (superseded_by is null) order by version)
             from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note'),
  array['Open 9 to 18, closed Sundays:verified:owner:true'], 'the owner''s hours stay as they are; the website''s value is no fact');
select ok(not exists (select 1 from unnest(pg_temp.draft()) s where s like 'card.hours_note%')
  and not exists (select 1 from unnest(pg_temp.draft('posts')) s where s like 'card.hours_note%'),
  'while the question is open, drafts say nothing about the hours (no guess)');
-- Something customers do not see is not asked about.
select is((select count(*)::int from public.knowledge_confirms where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.wifi'), 0, 'the wifi disagreement made no question');

-- Only the owner or a manager answers.
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.answer_knowledge_confirm((select id from public.knowledge_confirms
  where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note' and state = 'open'), 'proposed') $$,
  '42501', null, 'another owner cannot answer');
reset role;
-- The owner says theirs is right: the question is answered and the hours are back in the drafts.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.answer_knowledge_confirm((select id from public.knowledge_confirms
  where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note' and state = 'open'), 'current');
select throws_ok($$ select public.answer_knowledge_confirm((select id from public.knowledge_confirms
  where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note'), 'current') $$,
  'P0001', 'already_answered', 'a question is answered once');
reset role;
select ok('card.hours_note=Open 9 to 18, closed Sundays' = any (pg_temp.draft()), 'the owner''s hours are back in the drafts');
-- Asked again; this time the website is right: a new version, verified, confirmed by the manager who answered.
select public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.hours_note', 'hours_note',
  '{"text": "Open 9 to 20, closed Sundays"}', 'website', 'https://victim.example/contact');
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select public.answer_knowledge_confirm((select id from public.knowledge_confirms
  where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note' and state = 'open'), 'proposed');
reset role;
select is((select array_agg(version || ':' || (value ->> 'text') || ':' || status || ':' || source || ':' || (superseded_by is null) order by version)
             from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note'),
  array['1:Open 9 to 18, closed Sundays:verified:owner:false', '2:Open 9 to 20, closed Sundays:verified:website:true'],
  'the chosen answer is version 2; version 1 is kept');
select is((select confirmed_by from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.hours_note' and superseded_by is null), '00000000-0000-4000-8000-0000000000b4'::uuid, 'confirmed by who answered');
-- An owner's own edit answers an open question too.
select public.propose_fact('00000000-0000-4000-8000-0000000000c1', 'card.price_notes', 'price_note', '{"text": "Cakes from $25"}', 'website', null);
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'price_notes', '"Cakes from $22"');
reset role;
select is((select answer from public.knowledge_confirms where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.price_notes'), 'owner_edit', 'the owner''s edit answers the question');

-- Edits are versions --------------------------------------------------------------------------------------------------

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'about', '"Family bakery in Hamra since 1990"');
select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'about', '"Family bakery in Hamra since 1990"');
select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'staff_names', '"Rami Haddad"', (select id from f where name = 'staff'));
reset role;
select is((select array_agg(version || ':' || (superseded_by is null) order by version) from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.about'),
  array['1:false', '2:true'], 'an edit is a new version; saving the same value again is not');
select is((select array_agg(value ->> 'name' || ':' || (superseded_by is null) order by version) from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.staff_names:' || md5('"Rami"')),
  array['Rami:false', 'Rami Haddad:true'], 'editing a list item keeps its history together');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'faqs', jsonb_build_object('q', 'Question ' || n, 'a', 'Answer')) from generate_series(1, 8) n;
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'faqs', '{"q": "Ninth?", "a": "No"}') $$,
  'P0001', 'faqs: up to 8', 'up to 8 questions');
reset role;

-- Removing is real (K-120.5) ------------------------------------------------------------------------------------------

select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.remove_fact((select id from f where name = 'about')) $$, '42501', null, 'another owner cannot remove a fact');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.remove_fact((select id from f where name = 'about')) $$, 'P0001', 'not_current',
  'an old version is not what the owner removes');
select is(public.remove_fact((select id from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
  and slot = 'card.about' and superseded_by is null)), 2, 'removing the about fact removes both versions');
select is(public.remove_fact((select id from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
  and slot = 'card.hours_note' and superseded_by is null)), 2, 'and the hours');
reset role;
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot in ('card.about', 'card.hours_note')), 0, 'no row and no version is left');
select is((select count(*)::int from public.knowledge_confirms where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.hours_note'), 0, 'nor any question about it, with the other answer');
select ok(not exists (select 1 from unnest(pg_temp.draft()) s where s like 'card.about%' or s like 'card.hours_note%'),
  'a removed fact is in no draft');
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.signature' and superseded_by is null), 1, 'other facts stay');

-- The audit log records who did what, never the value ---------------------------------------------------------------

select is((select array_agg(distinct action order by action) from public.audit_events
            where location_id = '00000000-0000-4000-8000-0000000000c1' and object_type in ('knowledge_facts', 'knowledge_confirms')),
  array['fact_confirmed', 'fact_rejected', 'fact_removed', 'knowledge_confirm_answered', 'knowledge_edit'], 'every action is audited');
select is((select count(*)::int from public.audit_events where location_id = '00000000-0000-4000-8000-0000000000c1'
            and object_type in ('knowledge_facts', 'knowledge_confirms')
            and (coalesce(after::text, '') ~* '(Hamra|Cakes|Open 9|Rami|Street parking|valet|Free for customers|French)' or before is not null)), 0,
  'no audit event holds a value');
select is((select after ->> 'versions' from public.audit_events where action = 'fact_removed' and after ->> 'key' = 'description'),
  '2', 'the removal records how many versions went');

select * from finish();
rollback;
