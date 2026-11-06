-- Harvey 4A part E (master plan 30.39): outbound-inbox every 10 minutes, between the send runs, applied after the
-- function is deployed. It reads the mailbox read only and never answers a person.
select cron.schedule('kabsi_outbound_inbox', '5-55/10 * * * *', $$select public.call_internal('outbound-inbox')$$);
