-- Scope 1 (30 Oct 2026, master plan 30.19 section 3 item 5): WhatsApp messages are deleted 12 months after they were sent
-- or received, through private.retention_sources (switched on). Nothing younger than 12 months is touched. A dry run (the
-- switch off) deletes nothing. The outbox is covered by private.whatsapp_tick (30 days) and needs no case here.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into public.whatsapp_messages (phone, direction, kind, state, dedupe_key, created_at) values
  ('+15550031001', 'in',  'text',   'received',  'scope1-in-old',    now() - interval '13 months'),
  ('+15550031001', 'out', 'reply',  'delivered', 'scope1-out-old',   now() - interval '12 months 1 day'),
  ('+15550031001', 'in',  'text',   'received',  'scope1-in-edge',   now() - interval '11 months 29 days'),
  ('+15550031001', 'out', 'reply',  'sent',      'scope1-out-mid',   now() - interval '6 months'),
  ('+15550031001', 'in',  'text',   'received',  'scope1-in-new',    now() - interval '1 day');

-- The switch is off in the test database: a dry run counts and deletes nothing.
delete from public.app_settings where key = 'retention_sources';
select is((private.retention_sources() ->> 'mode'), 'dry_run', 'without the switch the job is a dry run');
select is((select count(*) from public.whatsapp_messages where dedupe_key like 'scope1-%'), 5::bigint, 'a dry run deletes no message');

-- Switched on.
insert into public.app_settings (key, value) values ('retention_sources', 'on') on conflict (key) do update set value = 'on';
select is((private.retention_sources() ->> 'mode'), 'on', 'switched on, the job deletes');
select is((select array_agg(dedupe_key order by dedupe_key) from public.whatsapp_messages where dedupe_key like 'scope1-%'),
  array['scope1-in-edge', 'scope1-in-new', 'scope1-out-mid'],
  'messages older than 12 months go (incoming and outgoing); nothing younger is touched');
-- Running it again changes nothing that is young.
select is((select count(*) from public.whatsapp_messages where dedupe_key like 'scope1-%'), 3::bigint, 'a second run deletes nothing more');

select * from finish();
rollback;
