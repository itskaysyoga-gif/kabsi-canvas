-- UX 1: owners add, edit and remove their own AI questions. Members of the business only, after the first task, the plan's
-- limit, promptFrom's rules, one question once; every value the website sends fits the table's checks.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

select ok(has_function_privilege('authenticated', 'public.save_ai_prompt(uuid,text,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.save_ai_prompt(uuid,text,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.remove_ai_prompt(uuid)', 'execute'), 'members call them, anon does not');

-- The victim business, on the demo plan (Pro's limit), before its first task.
update public.locations set is_demo = true, first_task_done_at = null where id = '00000000-0000-4000-8000-0000000000c1';
delete from public.ai_visibility_prompts where location_id = '00000000-0000-4000-8000-0000000000c1';

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$select public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'best hair salon in jumeirah')$$,
  'P0001', 'after_first_task', 'held back until the first task is done');
reset role;
update public.locations set first_task_done_at = now() where id = '00000000-0000-4000-8000-0000000000c1';

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select ok(public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', '  "Best hair salon in Jumeirah for colour."  ') is not null, 'the owner adds a question');
select is((select text from public.ai_visibility_prompts where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'owner'),
  'best hair salon in jumeirah for colour', 'cleaned like promptFrom: no quotes, no full stop, lower case');
select is((select count(*)::int from public.ai_visibility_prompts where location_id = '00000000-0000-4000-8000-0000000000c1'
  and active and confirmed_at is not null and cadence in ('monthly', 'biweekly')), 1, 'confirmed, active, with a cadence the table allows');
select throws_ok($$select public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'BEST hair salon in Jumeirah for colour')$$,
  '23505', 'duplicate', 'one question once');
select throws_ok($$select public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'short')$$, '22023', 'bad_prompt', 'too short');
select throws_ok($$select public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'best salon see www.example.com')$$, '22023', 'bad_prompt', 'no links');
select throws_ok(format('select public.save_ai_prompt(%L, %L)', '00000000-0000-4000-8000-0000000000c1', 'best salon ' || chr(8212) || ' near the beach'),
  '22023', 'bad_prompt', 'no dashes');
select throws_ok($$select public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'call 0501234567 for a salon')$$, '22023', 'bad_prompt', 'no long numbers');
select ok(public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'where to get a blow dry in dubai marina') is not null, 'a second');
select ok(public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'good nail and hair salon near al wasl road') is not null, 'a third');
reset role;
-- Fill the rest of the plan's limit with suggested questions.
insert into public.ai_visibility_prompts (location_id, text, kind, confirmed_at)
select '00000000-0000-4000-8000-0000000000c1', 'suggested salon question number ' || g, 'suggested', now()
  from generate_series(1, (public.entitlements(null, '00000000-0000-4000-8000-0000000000c1') -> 'limits' ->> 'ai_prompts')::int - 3) g;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$select public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'one more question about salons here')$$,
  'P0001', 'prompt_limit', 'the plan limit holds');

-- Edit within the limit, then remove.
select ok(public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'where to get a keratin treatment in dubai marina',
  (select id from public.ai_visibility_prompts where location_id = '00000000-0000-4000-8000-0000000000c1' and text like 'where to get a blow dry%')) is not null,
  'editing does not count against the limit');
select public.remove_ai_prompt((select id from public.ai_visibility_prompts where location_id = '00000000-0000-4000-8000-0000000000c1' and text like 'good nail%'));
select is((select count(*)::int from public.ai_visibility_prompts where location_id = '00000000-0000-4000-8000-0000000000c1' and active and kind = 'owner'), 2, 'removed');
reset role;

-- Another business's owner can do neither.
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$select public.save_ai_prompt('00000000-0000-4000-8000-0000000000c1', 'a question for someone else entirely')$$,
  '42501', 'forbidden', 'owner B cannot add to business A');
select throws_ok(format('select public.remove_ai_prompt(%L)', (select id from public.ai_visibility_prompts where location_id = '00000000-0000-4000-8000-0000000000c1' and active limit 1)),
  '42501', 'forbidden', 'owner B cannot remove business A''s question');
reset role;

select * from finish();
rollback;
