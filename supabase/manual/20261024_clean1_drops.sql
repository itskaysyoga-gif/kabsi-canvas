-- Clean 1 (master plan 28.9, 24 Oct 2026): things in the database that nothing uses. Claude does not drop tables or
-- delete data (CLAUDE.md), and the connector's confirmation for the two function drops got no answer in the session,
-- so all four drops are here. Rashid runs this file once, in the Supabase SQL editor (project ynjdqjlmdwjgbfezevxy),
-- after saying yes to the list. One transaction: it stops and changes nothing if any count differs from the list.
--
-- 1. public.profile_check_emails, 0 rows. Made for the email step of the old Profile Check (20261012110000); no
--    function, view, trigger, policy, Edge Function or page reads or writes it (checked in pg_proc, pg_views,
--    pg_policies and with grep over src, supabase/functions, scripts and tests).
-- 2. private.publications_status_backup_20261008, 18 rows. The copy of publications.id and status taken before the
--    8 Oct migration dropped that column; the read-back that day found 0 rows that differ from the live state, and
--    nothing reads it since. Its rows are real data, so say no if you want to keep the copy.
-- 3. public.plan_price(text): the old Pro prices (19, 190, 75); nothing calls it.
-- 4. public.trial_reminder_candidates(): the plans v1 trial reminder query; nothing calls it.
--    For 3 and 4: no other function, trigger, view, policy or cron job names them, pg_depend lists nothing that depends
--    on them, and no file in src, supabase/functions, supabase/tests, scripts or tests calls them.
--
-- Not in this file: public.leads (0 rows) is still read by ops_digest, the Slack digest that session 13b part 2
-- removes; drop it there. public.billing_events (0 rows) is the NOWPayments log; session 10 decides.
-- After it runs: the next database session adds the same drops as a migration (so a fresh database matches) and removes
-- the pgTAP checks that name these objects (supabase/tests/profile_check.sql, publication_pipeline.sql lines 52 to 55).
-- The read-back at the end must show 0 in every line.
begin;

do $$
declare n int;
begin
  select count(*) into n from public.profile_check_emails;
  if n <> 0 then raise exception 'profile_check_emails has % rows, expected 0', n; end if;
  select count(*) into n from private.publications_status_backup_20261008;
  if n <> 18 then raise exception 'publications_status_backup_20261008 has % rows, expected 18', n; end if;
end $$;

drop table public.profile_check_emails;
drop table private.publications_status_backup_20261008;
drop function public.plan_price(text);
drop function public.trial_reminder_candidates();

commit;

-- Read-back: every line must be 0.
select 'profile_check_emails' what, count(*) from pg_class where oid = to_regclass('public.profile_check_emails')
union all select 'publications_status_backup_20261008', count(*) from pg_class where oid = to_regclass('private.publications_status_backup_20261008')
union all select 'plan_price', count(*) from pg_proc where proname = 'plan_price' and pronamespace = 'public'::regnamespace
union all select 'trial_reminder_candidates', count(*) from pg_proc where proname = 'trial_reminder_candidates' and pronamespace = 'public'::regnamespace;
