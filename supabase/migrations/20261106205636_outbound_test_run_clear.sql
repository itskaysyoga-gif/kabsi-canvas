-- Outbound test part G ends: the test rows are cleared so the dashboard counts show zero real emails, and the test-only
-- setting is switched off. Only fictional example.com test businesses exist (checked below); their messages and events
-- go with them (on delete cascade), the two suppression hashes the test's opt-out added for the fictional address and
-- domain are removed, and today's tally (test traffic only) is removed. Sending stays locked, test mode on. The inbox
-- position is kept, so the test emails are never read again.
do $$
begin
  if exists (select 1 from public.outbound_prospects where not test) then
    raise exception 'outbound: a real business exists; nothing cleared';
  end if;
  delete from public.outbound_suppression s
   using public.outbound_prospects p
   where p.test and s.hash in (private.outbound_sha(p.email), private.outbound_sha(p.email_domain));
  delete from public.outbound_prospects where test;
  delete from public.outbound_days where day = date '2026-11-06';
  update public.outbound_settings set test_fast_until = null, next_send_at = null
   where id and not sending_open and test_mode;
end $$;
