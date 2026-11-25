-- PILOT-READY (R-165): the replay card scenarios need the QA review waiting again with its draft (tests/e2e/seed/qa-reset.sql did this by
-- hand before each run; on 25 Nov 2026 it was "posted", so no approval card could be made). The reset step of the replay harness calls this.
-- Updates only, on the fixed demo ids; refuses unless the review belongs to a demo business.
create or replace function public.qa_reset_replay_fixtures() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.reviews r join public.locations l on l.id = r.location_id where r.id = 'de300000-0000-4000-8000-0000000000f1' and l.is_demo) then
    return;
  end if;
  update public.reviews set state = 'drafted', reply_state = null, existing_reply = null where id = 'de300000-0000-4000-8000-0000000000f1';
  update public.mock_google_reviews set reply_comment = null, reply_update_time = null where review_id = 'demo-hlc-qa1';
  update public.publications set state = 'cancelled' where target_id in ('de300000-0000-4000-8000-0000000000f1', 'de300000-0000-4000-8000-0000000000f2') and state <> 'cancelled';
  update public.gbp_posts set state = 'draft', publish_at = now() + interval '20 days' where id = 'de300000-0000-4000-8000-0000000000f2';
end $$;
revoke all on function public.qa_reset_replay_fixtures() from public, anon, authenticated;
grant execute on function public.qa_reset_replay_fixtures() to service_role;
