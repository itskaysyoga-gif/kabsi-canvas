-- Session 13b part 2 (master plan 9.9, R-64): the Slack leftovers in the database. Slack is retired: the slack function,
-- its three cron jobs and the Slack calls in ops_emit, ops_digest and staff_system_health were removed by the migration
-- 20261025230000_whatsapp_13b_part2.sql. Claude does not drop columns or delete data (CLAUDE.md, R-35, R-44), so these
-- are here. Rashid runs this file once, in the Supabase SQL editor (project ynjdqjlmdwjgbfezevxy), after saying yes to
-- the list. One transaction: it stops and changes nothing if anything differs from the list.
--
-- 1. public.ops_events.slack_channel and slack_ts: where Slack put each message. Nothing reads or writes them now.
-- 2. app_settings rows slack_channels and slack_staff_users: the Slack channel ids and the Slack user ids of staff.
-- 3. public.ops_digest(integer): the numbers of the old Slack daily digest; nothing calls it now (the morning digest on
--    WhatsApp uses public.whatsapp_staff_summary). Only a pgTAP check names it (supabase/tests/review_risk.sql lines 32
--    and 33); the next database session removes those two lines.
-- 4. public.leads, 0 rows: read only by ops_digest (Clean 1 left it for this session).
--
-- Expected before: 2 slack columns, 2 slack settings, ops_digest exists, leads has 0 rows.
-- Expected read-back after (the last select): 0 | 0 | 0 | 0.
begin;
do $$
begin
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'ops_events'
        and column_name in ('slack_channel', 'slack_ts')) <> 2 then raise exception 'ops_events: expected the 2 slack columns'; end if;
  if (select count(*) from public.app_settings where key in ('slack_channels', 'slack_staff_users')) <> 2 then
    raise exception 'app_settings: expected the 2 slack rows';
  end if;
  if to_regprocedure('public.ops_digest(integer)') is null then raise exception 'ops_digest: not found'; end if;
  if (select count(*) from public.leads) <> 0 then raise exception 'leads: has rows, stop and ask'; end if;
end $$;
alter table public.ops_events drop column slack_channel, drop column slack_ts;
delete from public.app_settings where key in ('slack_channels', 'slack_staff_users');
drop function public.ops_digest(integer);
drop table public.leads;
commit;

select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'ops_events' and column_name like 'slack%') as slack_columns,
  (select count(*) from public.app_settings where key like 'slack%') as slack_settings,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ops_digest') as ops_digest,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'leads') as leads;
