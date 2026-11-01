-- AI Answers 1, from the independent review (finding 7): an answer that gives a fact right closes the open item only
-- when it comes from the same assistant, and never for hours (agreement on Monday says nothing about Sunday). Before,
-- Perplexity giving one day right closed ChatGPT's item about another day, and the next ChatGPT run opened it again.
-- Additive: CREATE OR REPLACE of the function from 20261101075711 only.
create or replace function public.ai_answer_finding(p_run uuid, p_finding jsonb, p_agree text[] default '{}')
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  r public.ai_visibility_runs;
  v_fact text := p_finding ->> 'fact';
  v_new boolean := false;
begin
  select * into r from public.ai_visibility_runs where id = p_run;
  if not found then return false; end if;
  if p_finding is not null and (v_fact is null or v_fact not in ('hours', 'phone', 'address', 'website', 'services', 'price')) then
    raise exception 'fact: hours, phone, address, website, services or price';
  end if;
  update public.ai_visibility_runs
     set accuracy = jsonb_build_object('checked_at', now(), 'finding',
       case when p_finding is null then null
            else jsonb_build_object('fact', v_fact, 'detail', p_finding ->> 'detail', 'sentence', left(p_finding ->> 'sentence', 400),
              'assistant', p_finding ->> 'assistant', 'question', left(p_finding ->> 'question', 500),
              'asked_at', p_finding ->> 'asked_at', 'kabsi', left(p_finding ->> 'kabsi', 300)) end)
   where id = p_run;
  update public.tasks set state = 'done', resolved_at = now(), snooze_until = null
   where location_id = r.location_id and kind = 'ai_answer' and state in ('open', 'snoozed')
     and source_id = any (coalesce(p_agree, '{}')) and source_id is distinct from v_fact
     and source_id <> 'hours' and evidence ->> 'assistant' = r.provider;
  if p_finding is not null then
    v_new := private.task_put(r.location_id, 'ai_answer', 'ai_answer', v_fact, 'recommended',
      left(p_finding ->> 'title', 200), left(p_finding ->> 'why', 500), left(p_finding ->> 'recommendation', 300),
      coalesce(p_finding -> 'evidence', '{}'::jsonb) || jsonb_build_object('run_id', p_run), null, 'ai_answer:' || v_fact);
  end if;
  return v_new;
end $$;
revoke all on function public.ai_answer_finding(uuid, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.ai_answer_finding(uuid, jsonb, text[]) to service_role;
