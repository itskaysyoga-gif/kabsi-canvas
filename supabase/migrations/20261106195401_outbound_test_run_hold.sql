-- Outbound test part G: hold sending for 25 minutes (next_send_at moved forward) so the test email still waiting is not
-- cancelled by the test-inbox suppression bug before its fix (PR 467) is deployed. Sending stays locked, test mode on.
do $$
begin
  update public.outbound_settings set next_send_at = now() + interval '25 minutes'
   where id and not sending_open and test_mode;
end $$;
