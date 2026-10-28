-- Sec 2 (27 Oct 2026): switch on the retention job for the sources no earlier job covered
-- (private.retention_sources, daily 03:31 UTC; docs/security/retention.md). Until this runs the job is a dry run: it
-- counts what it would delete and keeps only the counts in jobs_log. Rashid runs this in the Supabase SQL editor.
--
-- 1. Read what the first real run will delete (the newest dry run, or run one now):
select detail from public.jobs_log where job = 'retention_sources' order by created_at desc limit 1;
select private.retention_sources();
-- Expect a mode of "dry_run" and counts such as jobs (finished jobs older than 30 days), google_events, product_events,
-- whatsapp_buttons, number_health, notifications. Nothing is deleted by these two lines.
--
-- 2. Switch it on and run it once:
insert into public.app_settings (key, value) values ('retention_sources', 'on')
on conflict (key) do update set value = 'on', updated_at = now();
select private.retention_sources();
--
-- 3. Read-back. Expect: on | 0 | 0 (no finished job older than 30 days, no Pub/Sub notice older than 90 days).
select (select value from public.app_settings where key = 'retention_sources') as mode,
       (select count(*) from public.jobs where state in ('succeeded', 'dead', 'failed')
          and coalesce(finished_at, created_at) < now() - interval '30 days') as old_jobs,
       (select count(*) from public.google_events where received_at < now() - interval '90 days') as old_events;
