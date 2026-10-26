-- V2: AI Visibility tables. RLS on, members read their own business only, nobody writes from the API, and a Gemini answer
-- text can never be stored (Google's Additional Terms for Grounding with Google Maps).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.ai_visibility_prompts'::regclass, 'public.ai_visibility_runs'::regclass, 'public.ai_visibility_answers'::regclass)),
  'RLS is on for the three AI Visibility tables');
select is(
  (select coalesce(array_agg(t || ':' || r || ':' || p order by t, r, p), '{}')
     from unnest(array['public.ai_visibility_prompts', 'public.ai_visibility_runs', 'public.ai_visibility_answers']) t, unnest(array['anon', 'authenticated']) r,
          unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
    where has_table_privilege(r, t, p)),
  '{}'::text[], 'nobody writes the AI Visibility tables from the API');
select ok(not has_table_privilege('anon', 'public.ai_visibility_runs', 'select'), 'anon reads nothing');
select is((select value from public.app_settings where key = 'ai_visibility_mode'), 'mock', 'mock mode by default');
select is((select value from public.app_settings where key = 'ai_visibility_gemini'), 'off', 'Gemini is off by default');
select ok((select value::numeric > 0 from public.app_settings where key = 'provider_cap_ai_visibility_usd'), 'a monthly cap exists');

-- A Gemini answer text is refused; a ChatGPT one is kept.
insert into public.locations (id, name, place_id) values ('a1000000-0000-4000-8000-000000000002', 'AI test cafe', 'ai-test-place');
insert into public.ai_visibility_prompts (id, location_id, text) values ('a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'best cafe in shoreditch');
insert into public.ai_visibility_runs (id, location_id, prompt_id, provider) values
  ('a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'chatgpt'),
  ('a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'gemini');
select lives_ok($$insert into public.ai_visibility_answers (run_id, location_id, answer) values ('a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 'text')$$, 'a ChatGPT answer is kept');
select throws_ok($$insert into public.ai_visibility_answers (run_id, location_id, answer) values ('a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'text')$$,
  '23514', 'gemini_answer_not_kept', 'a Gemini answer text is refused');

-- Expired Gemini rows go; the answers go with their run.
update public.ai_visibility_runs set expires_at = now() - interval '1 day' where id = 'a1000000-0000-4000-8000-000000000005';
select is(private.purge_ai_expired(), 1, 'one expired Gemini run is purged');
select is((select count(*)::int from public.ai_visibility_runs where location_id = 'a1000000-0000-4000-8000-000000000002'), 1, 'the ChatGPT run stays');

select * from finish();
rollback;
