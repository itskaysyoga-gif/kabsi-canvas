-- Outbound test part G: outbound-prepare asked a third time for today's test drafts, after Rashid saved
-- OUTBOUND_TEST_RECIPIENTS again. Test mode drafts only fictional example.com businesses, to the test addresses.
do $$
begin
  perform public.call_internal('outbound-prepare', '{"day":"today"}'::jsonb);
end $$;
