-- AI Answers 1: the accuracy finding on the run, its Home item and its page, every value the code writes into the new
-- checks, and the function closed to the browser.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select ok(not has_function_privilege('authenticated', 'public.ai_answer_finding(uuid,jsonb,text[])', 'execute')
  and not has_function_privilege('anon', 'public.ai_answer_finding(uuid,jsonb,text[])', 'execute'),
  'only the server keeps a finding');

insert into public.locations (id, name, place_id) values ('a2000000-0000-4000-8000-000000000001', 'Rose Lane Salon', 'ai-answers-place');
insert into public.ai_visibility_prompts (id, location_id, text) values ('a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'best hair salon in williamsburg');
insert into public.ai_visibility_runs (id, location_id, prompt_id, provider) values
  ('a2000000-0000-4000-8000-000000000003', 'a2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'chatgpt'),
  ('a2000000-0000-4000-8000-000000000004', 'a2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'perplexity');

-- Every task kind the code writes fits the check, the new one included.
select lives_ok(format($$select private.task_put('a2000000-0000-4000-8000-000000000001', %L, 'test', %L, 'nice', 'Title', 'Why', null, '{}', null, %L)$$, k, k, 'kind:' || k),
  'the task kind ' || k || ' can be stored')
  from unnest(array['review_reply', 'profile_change', 'photo_batch', 'post', 'hours_confirm', 'knowledge_confirm', 'profile_gap',
    'reconnect', 'billing', 'google_needs_action', 'ai_answer']) k;
select throws_ok($$select private.task_put('a2000000-0000-4000-8000-000000000001', 'ai_answers', 'test', 'x', 'nice', 'T', 'W', null, '{}', null, 'kind:bad')$$,
  '23514', null, 'an unknown kind is still refused');
delete from public.tasks where location_id = 'a2000000-0000-4000-8000-000000000001';

-- The accuracy column holds an object or nothing.
select lives_ok($$update public.ai_visibility_runs set accuracy = '{"checked_at": "2026-11-01", "finding": null}' where id = 'a2000000-0000-4000-8000-000000000003'$$, 'an object is kept');
select throws_ok($$update public.ai_visibility_runs set accuracy = '"text"' where id = 'a2000000-0000-4000-8000-000000000003'$$, '23514', null, 'anything else is refused');

-- Every fact the code can report opens its item on the right page.
select is(private.task_path('ai_answer', f), p, f || ' opens ' || p)
  from (values ('hours', '/app/hours'), ('phone', '/app/shield'), ('address', '/app/shield'), ('website', '/app/shield'),
               ('services', '/app/knowledge'), ('price', '/app/knowledge')) v(f, p);

select is(public.ai_answer_finding('a2000000-0000-4000-8000-000000000003', jsonb_build_object(
  'fact', 'hours', 'detail', 'closing_time', 'sentence', 'Rose Lane Salon is open Monday to Saturday from 9 am to 8 pm.',
  'assistant', 'chatgpt', 'question', 'best hair salon in williamsburg', 'asked_at', '2026-11-01T10:00:00Z', 'kabsi', 'Monday 09:00 to 18:00',
  'title', 'ChatGPT''s answer gives a different closing time for your business', 'why', 'ChatGPT was asked ...',
  'recommendation', 'Make sure your Google profile and website say this. AI assistants read them.', 'evidence', '{"fact": "hours"}'::jsonb), '{}'),
  true, 'a difference opens one item');
select is((select kind || ' ' || state || ' ' || priority from public.tasks where location_id = 'a2000000-0000-4000-8000-000000000001'),
  'ai_answer open recommended', 'one open item, recommended, never urgent');
select is((select accuracy -> 'finding' ->> 'fact' from public.ai_visibility_runs where id = 'a2000000-0000-4000-8000-000000000003'), 'hours', 'the finding is on its run');
select is(public.ai_answer_finding('a2000000-0000-4000-8000-000000000003', jsonb_build_object('fact', 'hours', 'detail', 'closing_time',
  'sentence', 's', 'assistant', 'chatgpt', 'question', 'q', 'asked_at', '2026-11-01T10:00:00Z', 'kabsi', 'k', 'title', 'T2', 'why', 'W2', 'recommendation', 'R'), '{}'),
  false, 'the same fact again updates the item, it does not add one');
select is((select count(*)::int from public.tasks where location_id = 'a2000000-0000-4000-8000-000000000001'), 1, 'still one item');
select throws_ok($$select public.ai_answer_finding('a2000000-0000-4000-8000-000000000004', '{"fact": "rating"}', '{}')$$, 'P0001', null, 'an unknown fact is refused');

-- A later answer that gives the hours right closes the item.
select is(public.ai_answer_finding('a2000000-0000-4000-8000-000000000004', null, array['hours']), false, 'no difference opens nothing');
select is((select state from public.tasks where location_id = 'a2000000-0000-4000-8000-000000000001'), 'done', 'the item closes when an answer gives the fact right');
select is((select accuracy ->> 'finding' from public.ai_visibility_runs where id = 'a2000000-0000-4000-8000-000000000004'), null, 'a checked answer with no difference keeps no finding');

select * from finish();
rollback;
