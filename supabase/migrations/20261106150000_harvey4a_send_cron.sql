-- Harvey 4A part D (master plan 30.39): outbound-send every 10 minutes. The function sends at most one approved, due
-- message a tick, only when sending is open or, in test mode, only to the test addresses; otherwise it does nothing.
select cron.schedule('kabsi_outbound_send', '*/10 * * * *', $$select public.call_internal('outbound-send')$$);
