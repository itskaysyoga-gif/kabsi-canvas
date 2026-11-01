-- AI Answers 1 (lane R, 1 Nov 2026; master plan 30.22 item 4): what an AI answer says about the business, against the
-- facts Kabsi has. A clear difference is kept on the run it came from and becomes one Needs attention item on Home.
--
-- Additive: one new column, the task kind widened by one value (inside a DO block, the same check with one more value),
-- the task's page, and one function for the service role. Nothing is dropped and no row is removed.
-- What is kept: which fact differs, the assistant's sentence (already part of the answer Kabsi keeps), the question, the
-- date and the owner's own fact. It lives on ai_visibility_runs, so it goes with the run: 30 days after the business
-- leaves (private.purge_visibility_after_leaving). The free check keeps its result in free_checks.ai (no new column).

-- 1. The finding on the run --------------------------------------------------------------------------------------------
alter table public.ai_visibility_runs add column if not exists accuracy jsonb
  constraint ai_visibility_runs_accuracy_object check (accuracy is null or jsonb_typeof(accuracy) = 'object');
comment on column public.ai_visibility_runs.accuracy is
  'AI Answers 1: {checked_at, finding} where finding is null or {fact, detail, sentence, assistant, question, asked_at, kabsi}. Deleted with the run.';

-- 2. The task kind -----------------------------------------------------------------------------------------------------
do $$
begin
  alter table public.tasks drop constraint if exists tasks_kind_check;
  alter table public.tasks add constraint tasks_kind_check check (kind in ('review_reply', 'profile_change', 'photo_batch',
    'post', 'hours_confirm', 'knowledge_confirm', 'profile_gap', 'reconnect', 'billing', 'google_needs_action', 'ai_answer'));
end $$;

create or replace function private.task_path(p_kind text, p_source_id text) returns text
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'review_reply' then '/app/inbox'
    when 'profile_change' then '/app/shield'
    when 'knowledge_confirm' then '/app/knowledge'
    when 'post' then '/app/posts'
    when 'photo_batch' then '/app/photos'
    when 'hours_confirm' then '/app/hours'
    when 'reconnect' then '/app/settings'
    when 'billing' then '/app/plan'
    when 'google_needs_action' then '/app/shield'
    -- AI Answers 1: hours to the hours, services and price to Business Knowledge, the rest to the Google profile.
    when 'ai_answer' then case p_source_id
      when 'hours' then '/app/hours' when 'services' then '/app/knowledge' when 'price' then '/app/knowledge'
      else '/app/shield' end
    when 'profile_gap' then case
      when p_source_id like 'coach\_%' then '/app/coach'
      when p_source_id = 'facts' then '/app/knowledge' when p_source_id = 'review_link' then '/app/cards'
      when p_source_id = 'posts' then '/app/posts' when p_source_id like 'photos%' then '/app/photos' else '/app/shield' end
    else '/app' end
$$;

-- 3. Keep the finding, open its item, close the items an answer now gives right ----------------------------------------
-- p_finding: {fact, detail, sentence, assistant, question, asked_at, kabsi, title, why, recommendation, evidence} or null.
-- One item per business and fact (dedupe ai_answer:<fact>): a newer difference updates it, it never piles up. A later
-- answer that gives the same fact right closes it as done. Returns true when a new item was made.
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
     and source_id = any (coalesce(p_agree, '{}')) and source_id is distinct from v_fact;
  if p_finding is not null then
    v_new := private.task_put(r.location_id, 'ai_answer', 'ai_answer', v_fact, 'recommended',
      left(p_finding ->> 'title', 200), left(p_finding ->> 'why', 500), left(p_finding ->> 'recommendation', 300),
      coalesce(p_finding -> 'evidence', '{}'::jsonb) || jsonb_build_object('run_id', p_run), null, 'ai_answer:' || v_fact);
  end if;
  return v_new;
end $$;
revoke all on function public.ai_answer_finding(uuid, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.ai_answer_finding(uuid, jsonb, text[]) to service_role;
