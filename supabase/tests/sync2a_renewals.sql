-- Sync 2a part 2 (R-142 item 3, master plan 30.46): the renewal reminders are retired. Nothing schedules the
-- renewal_reminders job any more: private.produce_jobs() no longer offers it, and still offers the trial reminders
-- (a retired no-op) and the other whole-system steps.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
select is(position('renewal_reminders' in (select prosrc from pg_proc where oid = 'private.produce_jobs()'::regprocedure)), 0,
  'produce_jobs no longer offers renewal_reminders');
select ok(position('access_check' in (select prosrc from pg_proc where oid = 'private.produce_jobs()'::regprocedure)) > 0,
  'it still offers the access check');
select ok(position('trial_reminders' in (select prosrc from pg_proc where oid = 'private.produce_jobs()'::regprocedure)) > 0,
  'and the (retired, no-op) trial reminders');
select is((select count(*)::int from public.jobs where kind = 'renewal_reminders' and state in ('pending', 'running', 'retrying')), 0,
  'no renewal job waits');
select * from finish();
rollback;
