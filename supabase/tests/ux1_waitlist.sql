-- UX 1: the free check's waiting list. Closed to the browser; every value the visibility function writes fits the checks;
-- one place per contact and business; the tips box needs an email; the purge keeps a year.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select ok(not has_table_privilege('anon', 'public.free_check_waitlist', 'select')
  and not has_table_privilege('anon', 'public.free_check_waitlist', 'insert')
  and not has_table_privilege('authenticated', 'public.free_check_waitlist', 'select')
  and not has_table_privilege('authenticated', 'public.free_check_waitlist', 'insert'),
  'the waiting list is closed to anon and authenticated');
select ok(not has_function_privilege('authenticated', 'private.purge_free_check_waitlist()', 'execute'),
  'the purge is not the browser''s');

-- Every value supabase/functions/_shared/visibility/waitlist.ts can write (the notice words, the tips words, each page).
select lives_ok(format($$insert into public.free_check_waitlist (email, phone, business, country, place_id, term, industry,
    notice_consent_text, marketing_consent, marketing_consent_text, page)
  values (%L, %L, 'Rose Lane Salon', 'AE', 'ChIJroselanesalon000001', 'hair salon', 'hair-salons',
    'The free scan opens soon. Leave your email or WhatsApp and Kabsi sends your map the day it opens.',
    true, 'Send me tips on managing my Google profile', %L)$$,
  'owner' || p || '@example.com', '+97150123456' || i, p), 'the page ' || p || ' and both consent texts can be stored')
  from unnest(array['/scan', '/scan/result', '/google-profile-check', '/for/hair-salon', '/for/auto-repair']) with ordinality as t(p, i);
select lives_ok($$insert into public.free_check_waitlist (phone, business, notice_consent_text)
  values ('+447700900123', 'Harbor Bakes', 'The free scan opens soon. Leave your email or WhatsApp and Kabsi sends your map the day it opens.')$$,
  'a WhatsApp number alone, with no country, term or tips, can be stored');

-- Asking again changes nothing.
select is((select count(*)::int from public.free_check_waitlist where business = 'Rose Lane Salon' and email = 'owner/scan@example.com'), 1, 'one row');
insert into public.free_check_waitlist (email, phone, business, place_id, notice_consent_text, page)
  values ('owner/scan@example.com', '+971501234561', 'Rose Lane Salon', 'ChIJroselanesalon000001',
          'The free scan opens soon. Leave your email or WhatsApp and Kabsi sends your map the day it opens.', '/scan')
  on conflict do nothing;
select is((select count(*)::int from public.free_check_waitlist where email = 'owner/scan@example.com'), 1, 'the same contact and business is kept once');

select throws_ok($$insert into public.free_check_waitlist (business, notice_consent_text)
  values ('No Contact', 'The free scan opens soon. Leave your email or WhatsApp and Kabsi sends your map the day it opens.')$$,
  '23514', null, 'an email or a WhatsApp number is needed');
select throws_ok($$insert into public.free_check_waitlist (phone, business, notice_consent_text, marketing_consent, marketing_consent_text)
  values ('+447700900124', 'Tips Only', 'The free scan opens soon. Leave your email or WhatsApp and Kabsi sends your map the day it opens.',
          true, 'Send me tips on managing my Google profile')$$,
  '23514', null, 'tips need an email');

update public.free_check_waitlist set created_at = now() - interval '400 days' where business = 'Harbor Bakes';
select is(private.purge_free_check_waitlist(), 1, 'a place older than a year is purged');
-- The test database has no cron jobs (scripts/db-test.sh): the daily schedule is read back on the live project after the migration.

select * from finish();
rollback;
