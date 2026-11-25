-- APP-2 item 8 (Rashid approved, 25 Nov 2026): keep 14 days of cron.job_run_details. The first statement clears what is older
-- now; the daily job keeps it that way, so staff_job_health() stays fast. Nothing else reads this table's old rows.
delete from cron.job_run_details where start_time < now() - interval '14 days';

select cron.unschedule(jobid) from cron.job where jobname = 'kabsi_prune_cron_history';
select cron.schedule(
  'kabsi_prune_cron_history',
  '23 3 * * *',
  $job$delete from cron.job_run_details where start_time < now() - interval '14 days'$job$
);
