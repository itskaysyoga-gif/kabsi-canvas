-- Outbound test part G: outbound-prepare asked again for today's test drafts (the first call at 18:58 UTC read no test
-- recipients). Test mode drafts only fictional example.com businesses, to OUTBOUND_TEST_RECIPIENTS; nothing is sent.
do $$
begin
  perform public.call_internal('outbound-prepare', '{"day":"today"}'::jsonb);
end $$;
