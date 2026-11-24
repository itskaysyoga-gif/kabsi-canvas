-- OFFER-2 (blueprint 11.2 rows 4b and 6a): a weekly hours, phone or website change shown back on WhatsApp and approved with a
-- tap goes through the existing owner writes (apply_regular_hours, apply_profile_field) and the listing_revert publication.
-- Staff never approve; the phone comes from WhatsApp only; the main category never comes from WhatsApp; a wrong phone is
-- refused; what is recorded is exactly the value sent. And the founding price end is a column the billing code writes.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-offer2', status = 'active', country = 'US', time_zone = 'America/New_York', concierge = false
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.profile_changes set status = 'expired' where location_id = '00000000-0000-4000-8000-0000000000c1';
delete from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot in ('profile.website', 'profile.phone', 'profile.regular_hours');
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'staff') on conflict do nothing;

create function pg_temp.apply(p_field text, p_display text, p_user text default '00000000-0000-4000-8000-0000000000a1',
  p_channel text default 'whatsapp') returns jsonb language sql as $$
  select public.apply_profile_field('00000000-0000-4000-8000-0000000000c1', p_user::uuid, p_channel, p_field, p_display, null)
$$;

-- The phone from WhatsApp, approved by the owner: one owner fact with exactly the number sent, and one publication.
select is(pg_temp.apply('phone', '+1 205 555 0100') ->> 'state', 'approved', 'the owner approves a new phone number from WhatsApp');
select is((select value ->> 'display' from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'profile.phone' and superseded_by is null), '+1 205 555 0100', 'the fact is exactly the number shown');
select is((select value -> 'raw' ->> 'primaryPhone' from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'profile.phone' and superseded_by is null), '+1 205 555 0100', 'and Google gets that number as the primary phone');
select is((select count(*)::int from public.publications p join public.profile_changes c on c.id = p.target_id
            where p.location_id = '00000000-0000-4000-8000-0000000000c1' and p.target_type = 'listing_revert' and c.field = 'phone'), 1,
  'one publication through the one pipeline');
select is((select explanation from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'phone'
            and source = 'owner_edit' order by created_at desc limit 1), 'You changed your phone number in Kabsi.', 'the history says the owner did it');

-- The website from WhatsApp.
select is(pg_temp.apply('website', 'https://offer2-shop.example') ->> 'state', 'approved', 'the owner approves a new website from WhatsApp');

-- Refused: a phone that is not a phone, a phone from the dashboard, the main category from WhatsApp, a member of staff.
select throws_ok($$ select pg_temp.apply('phone', 'call us') $$, 'P0001', 'bad_value', 'a phone that is not a number is refused');
select throws_ok($$ select pg_temp.apply('phone', '12') $$, 'P0001', 'bad_value', 'and a number too short to be a phone');
select throws_ok($$ select pg_temp.apply('phone', '+1 205 555 0199', '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'bad_field',
  'the phone is accepted from WhatsApp only');
select throws_ok($$ select public.apply_profile_field('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'whatsapp',
  'main_category', 'Bakery', '{"primaryCategory": {"name": "categories/gcid:bakery", "displayName": "Bakery"}}') $$, 'P0001', 'bad_channel',
  'the main category is never changed from WhatsApp');
select throws_ok($$ select pg_temp.apply('name', 'A New Name') $$, 'P0001', 'bad_field', 'nor the business name');
select throws_ok($$ select pg_temp.apply('phone', '+1 205 555 0111', '00000000-0000-4000-8000-0000000000b1') $$, '42501', null,
  'a member of staff cannot approve a change');

-- A phone change Google made is still never approved on WhatsApp (only the owner's own typed number is).
insert into public.profile_changes (id, location_id, field, previous_value, google_value, source, severity, status, explanation)
values ('00000000-0000-4000-8000-00000000f2c1', '00000000-0000-4000-8000-0000000000c1', 'phone', '{"display": "+1 205 555 0100"}',
        '{"display": "+1 205 555 0999"}', 'google_update', 'recommended', 'detected', 'Google shows a different phone number.');
select throws_ok($$ select public.approve_publication('listing_revert', '00000000-0000-4000-8000-00000000f2c1', '{}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'whatsapp') $$, 'P0001', 'not_on_whatsapp', 'a phone change Google made is not approved on WhatsApp');

-- The weekly hours from WhatsApp: the week shown is the week recorded.
select is((public.apply_regular_hours('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'whatsapp',
  'Mon 09:00 to 17:00, Sat 10:00 to 16:00',
  '{"periods": [{"openDay": "MONDAY", "openTime": {"hours": 9}, "closeDay": "MONDAY", "closeTime": {"hours": 17}},
                {"openDay": "SATURDAY", "openTime": {"hours": 10}, "closeDay": "SATURDAY", "closeTime": {"hours": 16}}]}'::jsonb)) ->> 'state',
  'approved', 'the owner approves a weekly hours change from WhatsApp');
select is((select value ->> 'display' from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'profile.regular_hours' and superseded_by is null), 'Mon 09:00 to 17:00, Sat 10:00 to 16:00', 'the hours recorded are the hours shown');

-- The founding price end (billing.ts sets it 12 months after the first payment).
select has_column('public', 'subscriptions', 'founding_ends_at', 'subscriptions has founding_ends_at');
-- The settings OFFER-2 switched off.
select is((select string_agg(key || '=' || value, ',' order by key) from public.app_settings
            where key in ('request_book', 'ai_visibility_mode', 'ai_visibility_free_scan', 'dataforseo_mode', 'new_pro_signups', 'trial_mode', 'founding_public')),
  'ai_visibility_free_scan=off,ai_visibility_mode=off,dataforseo_mode=off,founding_public=off,new_pro_signups=off,request_book=off,trial_mode=card',
  'the offer settings are off');

select * from finish();
rollback;
