-- Fix 2 part C (master plan 30.27 item 2): the AI answer's button and Pricing. Pricing names each plan's nearby check and AI answer with the allowance the
-- entitlement code gives (src/components/kabsi/plans.ts PLAN_CHECKS). If plan_limits() changes, this fails and the
-- Pricing page and the facts' plan table change with it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);
select is(private.plan_limits('essentials') ->> 'map_keywords', '1', 'Essentials: the nearby check, 1 search');
select is(private.plan_limits('essentials') ->> 'map_every', 'month', 'Essentials: every month');
select is(private.plan_limits('essentials') ->> 'ai_prompts', '3', 'Essentials: the AI answer, 3 questions');
select is(private.plan_limits('essentials') ->> 'ai_every', 'month', 'Essentials: every month');
select is(private.plan_limits('pro') ->> 'map_keywords', '5', 'Pro: the nearby check, 5 searches');
select is(private.plan_limits('pro') ->> 'map_every', 'week', 'Pro: every week');
select is(private.plan_limits('pro') ->> 'ai_prompts', '10', 'Pro: the AI answer, 10 questions');
select is(private.plan_limits('pro') ->> 'ai_every', '2 weeks', 'Pro: every 2 weeks');
-- The AI answer's task opens the screen its button names (tests/fix2-ai-answer-button.test.ts holds the same table).
select is(private.task_path('ai_answer', 'hours'), '/app/hours', 'hours: the hours');
select is(private.task_path('ai_answer', 'services'), '/app/knowledge', 'services: business details');
select is(private.task_path('ai_answer', 'price'), '/app/knowledge', 'price: business details');
select is(private.task_path('ai_answer', 'phone'), '/app/shield', 'phone: the Google profile');
select is(private.task_path('ai_answer', 'address'), '/app/shield', 'address: the Google profile');
select is(private.task_path('ai_answer', 'website'), '/app/shield', 'website: the Google profile');
select * from finish();
rollback;
