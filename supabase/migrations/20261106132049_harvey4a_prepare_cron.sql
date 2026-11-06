-- Harvey 4A part B (master plan 30.39): outbound-prepare on weekdays at 05:00 UTC. The function itself does nothing
-- unless sending is open or test mode is on, and it never sends.
select cron.schedule('kabsi_outbound_prepare', '0 5 * * 1-5', $$select public.call_internal('outbound-prepare')$$);
