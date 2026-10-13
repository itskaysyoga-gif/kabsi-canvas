-- P0.3-02: the grounded reply pipeline's records and edit learning (K-39, K-120.2). ai_runs and style_edits are for the
-- Edge Functions only and hold no text; three edits of one kind make one "Save this as a rule?" offer, a fact the
-- owner added makes one "Save this as a fact?" offer, each asked once; only the owner or a manager answers, and a yes
-- becomes a verified owner fact through save_fact while a no is never asked again.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Who may do what ----------------------------------------------------------------------------------------------------

select ok(not has_table_privilege('authenticated', 'public.ai_runs', 'select') and not has_table_privilege('anon', 'public.ai_runs', 'select')
  and not has_table_privilege('authenticated', 'public.ai_runs', 'insert'), 'ai_runs: the browser neither reads nor writes');
select ok(not has_table_privilege('authenticated', 'public.style_edits', 'select') and not has_table_privilege('authenticated', 'public.style_edits', 'insert'),
  'style_edits: the browser neither reads nor writes');
select ok(has_table_privilege('authenticated', 'public.style_offers', 'select') and not has_table_privilege('authenticated', 'public.style_offers', 'insert')
  and not has_table_privilege('authenticated', 'public.style_offers', 'update') and not has_table_privilege('anon', 'public.style_offers', 'select'),
  'style_offers: members read, nobody writes from the browser');
select ok(not has_function_privilege('authenticated', 'public.record_draft_edit(uuid,uuid,text[],jsonb,text[])', 'execute')
  and has_function_privilege('service_role', 'public.record_draft_edit(uuid,uuid,text[],jsonb,text[])', 'execute'), 'record_draft_edit: Edge Functions only');
select ok(has_function_privilege('authenticated', 'public.answer_style_offer(uuid,boolean)', 'execute')
  and not has_function_privilege('anon', 'public.answer_style_offer(uuid,boolean)', 'execute'), 'answer_style_offer: signed-in users');

-- The record of a run ------------------------------------------------------------------------------------------------

select lives_ok($$ insert into public.ai_runs (location_id, review_id, workflow, prompt_version, model, input_hash, output_hash, memory_version, ok, checks)
  values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', 'review_reply', 'reply.v1', 'claude-sonnet-5-5',
          repeat('a', 64), repeat('b', 64), 'abcdef012345', true, '[{"name": "facts_in_trusted_set", "ok": true}]') $$, 'a run is recorded with its prompt version');
select throws_ok($$ insert into public.ai_runs (location_id, workflow, prompt_version, model, input_hash, ok)
  values ('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'my prompt', 'm', repeat('a', 64), true) $$, '23514', null, 'a prompt version looks like reply.v1');
select throws_ok($$ insert into public.ai_runs (location_id, workflow, prompt_version, model, input_hash, ok)
  values ('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'reply.v1', 'm', 'the review text', true) $$, '23514', null, 'the input is a hash, never text');
select lives_ok($$ insert into public.reply_drafts (review_id, version, body, source, safety_ok, prompt_version, facts_used)
  values ('00000000-0000-4000-8000-0000000000e1', 2, 'Thank you.', 'ai', true, 'reply.v1', '{}') $$, 'a draft records its prompt version and the facts it used');

-- Three similar edits make one offer ---------------------------------------------------------------------------------

select is(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, array['shorter'],
  '{"shorter": "Keep replies short: two or three sentences."}', '{}'), '[]'::jsonb, 'first shorter edit: no offer');
select is(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, array['shorter', 'adds_name'],
  '{"shorter": "Keep replies short: two or three sentences.", "adds_name": "Thank the reviewer by their first name."}', '{}'), '[]'::jsonb, 'second: no offer');
select is((select jsonb_agg(o - 'id') from jsonb_array_elements(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, array['shorter'],
  '{"shorter": "Keep replies short: two or three sentences."}', '{}')) o),
  '[{"kind": "shorter", "text": "Keep replies short: two or three sentences."}]'::jsonb, 'the third shorter edit offers "Save this as a rule?"');
select is(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, array['shorter'],
  '{"shorter": "Keep replies short: two or three sentences."}', '{}'), '[]'::jsonb, 'a fourth does not ask again');
select is((select count(*)::int from public.style_offers where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'adds_name'), 0,
  'two name edits are not enough');
select is((select count(*)::int from public.style_edits where location_id = '00000000-0000-4000-8000-0000000000c1'), 4, 'every edit is noted');

-- A fact the owner added is asked about once.
select is((select jsonb_agg(o ->> 'kind') from jsonb_array_elements(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, '{}', '{}',
  array['We now open on Sundays from 8am.'])) o), '["fact"]'::jsonb, 'an added fact offers "Save this as a fact?"');
select is(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, '{}', '{}', array['We now open on Sundays from 8am.']),
  '[]'::jsonb, 'the same sentence is not asked again');
select is((select count(*)::int from public.style_edits where location_id = '00000000-0000-4000-8000-0000000000c1'), 4, 'an edit with no kind is not a style edit');

-- Answering ------------------------------------------------------------------------------------------------------------

select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.answer_style_offer((select id from public.style_offers where kind = 'shorter' limit 1), true) $$,
  '42501', null, 'another owner cannot answer (and cannot see the offer)');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((select count(*)::int from public.style_offers), 3, 'the owner sees their open offers (the fixture one too)');
select isnt(public.answer_style_offer((select id from public.style_offers where kind = 'shorter'), true), null, 'yes to the rule');
select throws_ok($$ select public.answer_style_offer((select id from public.style_offers where kind = 'shorter'), false) $$,
  'P0001', 'already_answered', 'an offer is answered once');
select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'mention', '"Fresh bread every morning."');
select isnt(public.answer_style_offer((select id from public.style_offers where kind = 'fact' and text like 'We now open%'), true), null, 'yes to the fact');
reset role;
select is((select array_agg(key || ':' || status || ':' || source || ':' || (value ->> 'text') order by key) from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and superseded_by is null
              and (slot like 'card.custom_rules:%' or slot = 'card.mention')),
  array['phrase_use:verified:owner:Fresh bread every morning. We now open on Sundays from 8am.',
        'special_rule:verified:owner:Keep replies short: two or three sentences.'],
  'the rule is one of the owner''s rules and the fact joins what to mention, both verified owner facts');
select is((select array_agg(kind || ':' || state || ':' || (fact_id is not null) order by kind) from public.style_offers
            where location_id = '00000000-0000-4000-8000-0000000000c1' and kind in ('shorter', 'fact') and text not like 'Victim%'),
  array['fact:saved:true', 'shorter:saved:true'], 'both offers are saved with their fact');
select is((select count(*)::int from public.audit_events where action = 'style_offer_answered'
            and location_id = '00000000-0000-4000-8000-0000000000c1' and after::text not like '%Sundays%'), 2, 'each answer is audited without the text');

-- A no is final (two more name edits make three).
select public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, array['adds_name'], '{"adds_name": "Thank the reviewer by their first name."}', '{}');
select is((select jsonb_agg(o ->> 'kind') from jsonb_array_elements(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null,
  array['adds_name'], '{"adds_name": "Thank the reviewer by their first name."}', '{}')) o), '["adds_name"]'::jsonb, 'the third name edit offers the rule');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.answer_style_offer((select id from public.style_offers where kind = 'adds_name'), false), null, 'no to the name rule');
reset role;
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and value ->> 'text' like 'Thank the reviewer%'), 0, 'a no saves nothing');
select is(public.record_draft_edit('00000000-0000-4000-8000-0000000000c1', null, array['adds_name'], '{"adds_name": "Thank the reviewer by their first name."}', '{}'),
  '[]'::jsonb, 'and is never asked again');

select * from finish();
rollback;
