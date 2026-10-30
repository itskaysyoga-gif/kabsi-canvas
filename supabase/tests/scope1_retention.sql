-- Scope 1 (30 Oct 2026, master plan 30.19 section 3 item 5): WhatsApp messages and the outbox text are deleted 12 months
-- after they were sent, through private.retention_sources (switched on). Nothing younger than 12 months is touched, and a
-- message still waiting to go is never deleted. A dry run (the switch off) deletes nothing.
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
insert into public.whatsapp_outbox (phone, kind, body, state, sent_at, created_at, dedupe_key) values
  ('+15550031002', 'review_alert', 'Old sent text.',        'sent',   now() - interval '13 months', now() - interval '13 months', 'scope1-ob-old-sent'),
  ('+15550031002', 'review_alert', 'Old dropped text.',     'dropped', null,                        now() - interval '13 months', 'scope1-ob-old-dropped'),
  ('+15550031002', 'review_alert', 'Old queued text.',      'queued', null,                        now() - interval '13 months', 'scope1-ob-old-queued'),
  ('+15550031002', 'review_alert', 'Old sending text.',     'sending', null,                       now() - interval '13 months', 'scope1-ob-old-sending'),
  ('+15550031002', 'review_alert', 'Almost a year, sent.',  'sent',   now() - interval '11 months 29 days', now() - interval '12 months 5 days', 'scope1-ob-edge-sent'),
  ('+15550031002', 'review_alert', 'Recent sent text.',     'sent',   now() - interval '2 days',    now() - interval '2 days',    'scope1-ob-new-sent'),
  ('+15550031002', 'review_alert', 'Recent queued text.',   'queued', null,                        now() - interval '1 day',     'scope1-ob-new-queued');

-- The switch is off in the test database: a dry run counts and deletes nothing.
delete from public.app_settings where key = 'retention_sources';
select is((private.retention_sources() ->> 'mode'), 'dry_run', 'without the switch the job is a dry run');
select is((select count(*) from public.whatsapp_messages where dedupe_key like 'scope1-%'), 5::bigint, 'a dry run deletes no message');
select is((select count(*) from public.whatsapp_outbox where dedupe_key like 'scope1-%'), 7::bigint, 'and no outbox row');

-- Switched on.
insert into public.app_settings (key, value) values ('retention_sources', 'on') on conflict (key) do update set value = 'on';
select is((private.retention_sources() ->> 'mode'), 'on', 'switched on, the job deletes');
select is((select array_agg(dedupe_key order by dedupe_key) from public.whatsapp_messages where dedupe_key like 'scope1-%'),
  array['scope1-in-edge', 'scope1-in-new', 'scope1-out-mid'],
  'messages older than 12 months go (incoming and outgoing); nothing younger is touched');
select is((select array_agg(dedupe_key order by dedupe_key) from public.whatsapp_outbox where dedupe_key like 'scope1-%'),
  array['scope1-ob-edge-sent', 'scope1-ob-new-queued', 'scope1-ob-new-sent', 'scope1-ob-old-queued', 'scope1-ob-old-sending'],
  'outbox rows sent (or never sent) over 12 months ago go; a queued or sending row stays; nothing younger is touched');
-- The age counts from when the row was sent, not from when it was created: queued a year ago, sent 2 days ago, stays.
insert into public.whatsapp_outbox (phone, kind, body, state, sent_at, created_at, dedupe_key)
values ('+15550031002', 'review_alert', 'Held a year, sent now.', 'sent', now() - interval '2 days', now() - interval '13 months', 'scope1-ob-late-sent');
select private.retention_sources();
select is((select count(*) from public.whatsapp_outbox where dedupe_key = 'scope1-ob-late-sent'), 1::bigint,
  'an outbox row is aged from when it was sent, so one queued long ago and sent two days ago stays');
-- Running it again changes nothing that is young.
select is((select count(*) from public.whatsapp_messages where dedupe_key like 'scope1-%'), 3::bigint, 'a second run deletes nothing more');

select * from finish();
rollback;
