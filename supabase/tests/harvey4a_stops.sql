-- Harvey 4A part F: the stop rules and the data rules of 30.39, with fictional example.com rows.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select ok(not has_function_privilege('authenticated', 'public.outbound_stop(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.outbound_check_stops(text)', 'execute')
  and not has_function_privilege('authenticated', 'private.outbound_retention()', 'execute'), 'the stop and retention functions are not the browser''s');

-- Prospects for the retention checks below.
insert into public.outbound_prospects (id, harvey_company_id, country, industry, city, business_name, email, email_domain, source_page,
  source_date, detail_kind, detail_used, status, last_email_at, created_at, updated_at)
select ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'stops-' || i, 'GB', 'hair salon', 'Exampleton', 'Salon ' || i,
  'hello@salon' || i || '.example.com', 'salon' || i || '.example.com', 'https://salon' || i || '.example.com/contact', current_date,
  'hours', 'Your site lists your opening hours, and keeping Google''s hours the same saves wasted trips.', 'written', now(), now(), now()
from generate_series(1, 6) i;

-- The rate comes from the tallies, which deletions never touch: 40 sends with 1 bounce is 2.5 percent, 2 is 5 percent.
insert into public.outbound_days (day, sent, bounces) values (current_date, 40, 1);
select is(public.outbound_check_stops('bounce'), 'ok', '1 bounce in 40 sends is 2.5 percent: no stop');
update public.outbound_days set bounces = 2 where day = current_date;
select is(public.outbound_check_stops('bounce'), 'stopped', '2 bounces in 40 sends is 5 percent: stop');
select is((select row(sending_open, stopped_reason is not null)::text from public.outbound_settings), row(false, true)::text,
  'sending is off with a reason');
select ok(exists (select 1 from public.ops_events where kind = 'outbound_stop'), 'Rashid is alerted');
select is(public.outbound_stop('again'), false, 'a second stop changes nothing');
-- Only the last 100 sends count: an old bad day beyond them does not.
update public.outbound_settings set stopped_reason = null, stopped_at = null;
update public.outbound_days set day = current_date - 30 where day = current_date;
update public.outbound_days set bounces = 9, sent = 60 where day = current_date - 30;
insert into public.outbound_days (day, sent, bounces) values (current_date, 100, 1);
select is(public.outbound_check_stops('bounce'), 'ok', '1 in the last 100; the 9 older bounces are outside them');
delete from public.outbound_days;
select is(public.outbound_check_stops('complaint'), 'stopped', 'any complaint stops');
update public.outbound_settings set stopped_reason = null, stopped_at = null;

-- Retention.
update public.outbound_prospects set last_email_at = now() - interval '91 days', updated_at = now() - interval '91 days'
 where id = '00000000-0000-4000-8000-000000000003';
update public.outbound_prospects set status = 'answered', interested = true, last_email_at = now() - interval '200 days', updated_at = now() - interval '200 days'
 where id = '00000000-0000-4000-8000-000000000004';
update public.outbound_prospects set status = 'opted_out', updated_at = now() - interval '2 days' where id = '00000000-0000-4000-8000-000000000005';
insert into public.outbound_prospects (id, harvey_company_id, country, industry, city, business_name, email, email_domain, source_page,
  source_date, detail_kind, detail_used, status, created_at)
values ('00000000-0000-4000-8000-000000000099', 'stops-99', 'GB', 'cafe', 'Exampleton', 'Old Draft Cafe', 'hello@olddraft.example.com',
  'olddraft.example.com', 'https://olddraft.example.com/', current_date, 'hours',
  'Your site lists your opening hours, and keeping Google''s hours the same saves wasted trips.', 'skipped', now() - interval '31 days');
select is(private.outbound_retention(), '{"unsent": 1, "contacted": 1, "no_or_bounce": 1}'::jsonb, 'one of each rule');
select ok(not exists (select 1 from public.outbound_prospects where id = '00000000-0000-4000-8000-000000000003'), 'no reply after 90 days: deleted');
select ok(public.outbound_is_suppressed('anyone@salon3.example.com'), 'and its domain is on the never-contact list');
select is((select reason from public.outbound_suppression where hash = private.outbound_sha('salon3.example.com')), 'contacted', 'reason contacted');
select ok(exists (select 1 from public.outbound_prospects where id = '00000000-0000-4000-8000-000000000004'), 'a yes stays as a contact');
select ok(not exists (select 1 from public.outbound_prospects where id = '00000000-0000-4000-8000-000000000005'), 'a no keeps only the hash');
select ok(not public.outbound_is_suppressed('hello@olddraft.example.com'), 'a draft never sent leaves no hash');
update public.outbound_prospects set status = 'needs_you', last_email_at = now() - interval '200 days', updated_at = now() - interval '200 days'
 where id = '00000000-0000-4000-8000-000000000006';
select is(private.outbound_retention() ->> 'contacted', '0', 'a reply nobody has handled is never deleted by the 90-day rule');

select * from finish();
rollback;
