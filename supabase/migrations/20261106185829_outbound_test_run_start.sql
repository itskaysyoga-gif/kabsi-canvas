-- Outbound test part G (30.39 item 12): the test run starts. Lane R's test-only setting is on for 3 hours (sending stays
-- locked, test mode on), and outbound-prepare is asked for today's drafts: test mode drafts only the fictional example.com
-- businesses, addressed to OUTBOUND_TEST_RECIPIENTS. Nothing is sent until Rashid approves on kabsi.co/staff/outbound.
do $$
begin
  update public.outbound_settings set test_fast_until = now() + interval '3 hours'
   where id and not sending_open and test_mode and stopped_reason is null;
  perform public.call_internal('outbound-prepare', '{"day":"today"}'::jsonb);
end $$;
