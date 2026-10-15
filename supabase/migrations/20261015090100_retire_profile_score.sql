-- P0.3-05 contract step (K-07, D308 retired): the score and the old list's functions go. Run by Hussein in the SQL
-- editor after the code that reads tasks through list_tasks is merged and live (Home and Nora no longer call these);
-- the Supabase connector holds every DROP for a confirmation the build session cannot give. Nothing else calls them:
-- profile_score was only read by profile_tasks_list.
--
-- The profile_tasks table itself (13 rows on 15 Oct 2026, moved into tasks by 20261015090000_task_engine.sql) stays
-- until Hussein says yes to dropping it (plan section 2.3); private.migrate_profile_tasks() goes with it.
drop function public.profile_tasks_list(uuid);
drop function public.profile_task_action(uuid, text);
drop function public.profile_score(uuid);
