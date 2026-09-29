-- D295: health checks that a job succeeded in the last 30 minutes (jobs_log heartbeat from api cron-tick)
-- and alerts #kabsi-alerts if not. Runs every 10 minutes, in the cheap "jobs only" mode.
select cron.schedule('kabsi_health_jobs', '*/10 * * * *', $$select public.call_internal('health', '{"only":"jobs"}'::jsonb)$$);
