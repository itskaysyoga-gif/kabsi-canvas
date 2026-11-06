-- Outbound test part G: after PR 467 is deployed, the test Email 1 cancelled by the test-inbox suppression bug goes back
-- to approved (Rashid approved it on the staff page at 19:49 UTC), and the hold on sending ends. Test businesses only;
-- sending stays locked and test mode on.
do $$
begin
  update public.outbound_messages m set status = 'approved', error = null, claimed_at = null, updated_at = now()
    from public.outbound_prospects p
   where p.id = m.prospect_id and p.test and m.kind = 'first' and m.status = 'cancelled' and m.error = 'suppressed'
     and m.sent_at is null and m.approved_at is not null;
  update public.outbound_settings set next_send_at = null where id and not sending_open and test_mode;
end $$;
