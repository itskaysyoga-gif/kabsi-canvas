-- Harvey 4A part A: Outbound's tables are closed to the browser, staff read them and act only through the RPCs, the
-- lock cannot be opened by anyone but lane R, suppression uses Harvey's hash rule, and the dashboard views hold numbers.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select ok(not has_table_privilege('anon', 'public.' || t, 'select') and not has_table_privilege('authenticated', 'public.' || t, 'insert')
  and not has_table_privilege('authenticated', 'public.' || t, 'update') and not has_table_privilege('authenticated', 'public.' || t, 'delete'),
  t || ' is closed to the browser for writes and to anon for reads')
  from unnest(array['outbound_settings', 'outbound_prospects', 'outbound_messages', 'outbound_events', 'outbound_suppression', 'outbound_days']) t;
select ok(not has_table_privilege('authenticated', 'public.outbound_suppression', 'select'), 'the suppression list is not readable by the browser');
select ok(not has_table_privilege('authenticated', 'public.outbound_dashboard_counts', 'select')
  and not has_table_privilege('anon', 'public.outbound_dashboard_days', 'select')
  and has_table_privilege('service_role', 'public.outbound_dashboard_counts', 'select'), 'the counts views are for the service role');

-- The lock starts shut, in test mode, with the ramp of R-151 (Outbound 2, master plan 30.51).
select is((select row(sending_open, test_mode, open_countries, ramp_week1, ramp_week2, ramp_after, monthly_cap, started_on)::text
  from public.outbound_settings), row(false, true, '{}'::text[], 5, 10, 10, 300, null::date)::text, 'locked, test mode, 5/10/10, 300 a month');

-- Only postgres (a lane R migration) may open sending; the service role may not.
set local role service_role;
select throws_ok($$update public.outbound_settings set sending_open = true$$, '42501', 'outbound: sending opens only by lane R',
  'the service role cannot open sending');
select lives_ok($$update public.outbound_settings set stopped_reason = 'test stop'$$, 'the service role can stop');
select throws_ok($$update public.outbound_settings set stopped_reason = null$$, '42501', 'outbound: a stop is cleared only by lane R',
  'the service role cannot clear a stop');
reset role;
update public.outbound_settings set stopped_reason = null;

-- Harvey's hash rule: sha256 of the lower-cased, trimmed text; an address is covered by its domain and parent domains.
select is(private.outbound_sha(' Info@Shop.Example '), encode(sha256(convert_to('info@shop.example', 'UTF8')), 'hex'), 'sha256 of the lower-cased address');
select is(private.outbound_keys('a@mail.shop.example'), array['a@mail.shop.example', 'mail.shop.example', 'shop.example'],
  'address, domain and parent domains with a dot');
select is(public.outbound_suppress('hello@shop.example', 'opt_out', true), 2, 'an opt-out on its own domain suppresses address and domain');
select ok(public.outbound_is_suppressed('someone.else@shop.example'), 'the whole business is covered by its domain');
select ok(public.outbound_is_suppressed('x@mail.shop.example'), 'a subdomain is covered by its parent');
select is(public.outbound_suppress('owner@gmail.com', 'customer', true), 1, 'free mail: the address only');
select ok(not public.outbound_is_suppressed('another@gmail.com'), 'never the whole free mail provider');

-- The ramp.
update public.outbound_settings set started_on = current_date - 3;
select is(public.outbound_daily_cap(current_date), 5, 'week 1: 5 a day');
update public.outbound_settings set started_on = current_date - 6;
select is(public.outbound_daily_cap(current_date), 5, 'day 7: still 5');
update public.outbound_settings set started_on = current_date - 7;
select is(public.outbound_daily_cap(current_date), 10, 'day 8: 10 a day');
update public.outbound_settings set started_on = current_date - 29;
select is(public.outbound_daily_cap(current_date), 10, 'day 30: 10 a day');

-- Outbound 2: only the follow-up may carry the Founding 25 invite link, in the slug's 24 character shape (fake slug).
select ok(private.outbound_links_ok('Details: kabsi.co/founding/FakeSlug0000000000Test12', 'follow_up'), 'the follow-up may carry the invite link');
select ok(not private.outbound_links_ok('Details: kabsi.co/founding/FakeSlug0000000000Test12', 'first'), 'Email 1 may not');
select ok(not private.outbound_links_ok('kabsi.co/founding/short', 'follow_up'), 'only the 24 character shape');
update public.outbound_settings set started_on = null;

-- A draft with its follow-up; staff approve Email 1 and the follow-up is approved with it; a non-staff user is refused.
insert into public.outbound_prospects (id, harvey_company_id, country, industry, city, business_name, email, email_domain,
  source_page, source_date, detail_kind, detail_used, test)
values ('00000000-0000-4000-8000-0000000000a1', 'test-1', 'GB', 'hair salon', 'Exampleton', 'Rose Lane Salon', 'hello@roselane.example',
  'roselane.example', 'https://roselane.example/contact', current_date, 'hours',
  'Your site lists your opening hours, and keeping Google''s hours the same saves wasted trips.', true);
insert into public.outbound_messages (id, prospect_id, kind, to_address, subject, body)
values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'first', 'test@example.com',
  'Rose Lane Salon''s Google profile', 'Hi Rose Lane Salon team, a test body long enough. kabsi.co kabsi.co/privacy');
insert into public.outbound_messages (prospect_id, parent_id, kind, to_address, subject, body)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1', 'follow_up', 'test@example.com',
  'Re: Rose Lane Salon''s Google profile', 'Hi again. A follow-up body long enough. kabsi.co');

select throws_ok($$select public.staff_outbound_approve('00000000-0000-4000-8000-0000000000b1')$$, '42501', 'forbidden',
  'someone who is not staff cannot approve');
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated',
  'staff-test@example.com', now(), '{}', '{}', now(), now()) on conflict do nothing;
insert into public.staff (user_id, name, role) values ('00000000-0000-4000-8000-0000000000c1', 'Outbound Test', 'admin') on conflict do nothing;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select throws_ok($$select public.staff_outbound_edit('00000000-0000-4000-8000-0000000000b1', 'A subject', 'Hi team, see https://elsewhere.example now')$$,
  'P0001', 'links', 'an edit with a link to another site is refused');
select throws_ok($$select public.staff_outbound_edit('00000000-0000-4000-8000-0000000000b1', 'A subject', 'Hi team, this is great! Really it is.')$$,
  'P0001', 'house_style', 'an edit with an exclamation mark is refused');
select is((public.staff_outbound_approve('00000000-0000-4000-8000-0000000000b1') ->> 'changed')::int, 2, 'Email 1 and its follow-up approved together');
select is((select count(*)::int from public.outbound_messages where prospect_id = '00000000-0000-4000-8000-0000000000a1' and status = 'approved'
  and approved_by = '00000000-0000-4000-8000-0000000000c1'), 2, 'both carry the approver');

-- Tallies survive and the views hold numbers only.
update public.outbound_messages set status = 'sent', sent_at = now() where id = '00000000-0000-4000-8000-0000000000b1';
select is((select sent_today from public.outbound_dashboard_counts), 1, 'sent_today counts the send');
select is((select first_emails from public.outbound_dashboard_counts), 1, 'first_emails counts it');
select is((select array_agg(column_name::text order by ordinal_position) from information_schema.columns
  where table_schema = 'public' and table_name = 'outbound_dashboard_counts'),
  array['sent_today', 'sent_7_days', 'sent_this_month', 'sent_ever', 'first_emails', 'follow_ups', 'businesses_written_to',
    'waiting_approval', 'approved_queued', 'skipped', 'failed', 'replied', 'interested', 'needs_you', 'opted_out', 'bounced',
    'suppressed', 'reply_rate', 'bounce_rate', 'daily_limit', 'monthly_limit'], 'the counts view has exactly the agreed columns');
select is((select count(*)::int from information_schema.columns where table_schema = 'public'
  and table_name in ('outbound_dashboard_counts', 'outbound_dashboard_days') and data_type not in ('integer', 'numeric', 'date')), 0,
  'every column of both views is a number or a date');

select * from finish();
rollback;
