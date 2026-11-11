-- Cards 2, owner side (master plan 30.50 item 9): "Link card CODE" on WhatsApp links a card only to one of the phone's own
-- businesses (owner or manager); a card of another business reads as unknown and is never named; refused codes are
-- limited per phone; the label is a short place; taps per card are counted per week for this business only, bots left out;
-- browsers run none of the new functions.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000040c1'::uuid, 'card-a@example.test'),
             ('00000000-0000-4000-8000-0000000040c2'::uuid, 'card-b@example.test')) as u(id, email);

create function pg_temp.biz(p_id uuid, p_user uuid, p_name text, p_place text) returns void language plpgsql as $$
begin
  insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
  values (p_id, p_name, p_place, p_user, 'Europe/London', 'self');
  insert into public.location_members (location_id, user_id, role) values (p_id, p_user, 'owner');
end $$;
select pg_temp.biz('00000000-0000-4000-8000-0000000040b1', '00000000-0000-4000-8000-0000000040c1', 'Card Shop A', 'place-card-a');
select pg_temp.biz('00000000-0000-4000-8000-0000000040b2', '00000000-0000-4000-8000-0000000040c1', 'Card Shop A2', 'place-card-a2');
select pg_temp.biz('00000000-0000-4000-8000-0000000040b3', '00000000-0000-4000-8000-0000000040c2', 'Card Shop B', 'place-card-b');
insert into public.phone_roles (phone, role, user_id, location_id, source) values
  ('+447700900401', 'owner', '00000000-0000-4000-8000-0000000040c1', '00000000-0000-4000-8000-0000000040b1', 'test'),
  ('+447700900401', 'owner', '00000000-0000-4000-8000-0000000040c1', '00000000-0000-4000-8000-0000000040b2', 'test'),
  ('+447700900402', 'owner', '00000000-0000-4000-8000-0000000040c2', '00000000-0000-4000-8000-0000000040b3', 'test');

insert into public.cards (code, kind, status) values ('CAR2AA', 'card', 'unassigned'), ('CAR2BB', 'card', 'unassigned'),
  ('CAR2DD', 'card', 'disabled'), ('CAR2LK', 'link', 'unassigned');
insert into public.cards (code, kind, status, location_id, destination, label, activated_at)
values ('CAR2CC', 'card', 'active', '00000000-0000-4000-8000-0000000040b3', 'https://search.google.com/local/writereview?placeid=place-card-b', 'Till', now());

-- ─── access rules ────────────────────────────────────────────────────────────────────────────────────────────────
select ok(not has_function_privilege(r, f, 'execute'), r || ' cannot run ' || f)
from unnest(array['anon', 'authenticated']) r,
     unnest(array['public.card_link_check(text,text)', 'public.card_link_whatsapp(text,text,uuid)', 'public.card_label_whatsapp(text,text,text)',
                  'public.card_taps_weeks(uuid,date)', 'public.card_list_whatsapp(text,uuid)', 'private.card_phone_locations(text)']) f;
select ok(has_function_privilege('service_role', 'public.card_link_check(text,text)', 'execute'), 'the whatsapp function can run card_link_check');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public', 'private') and p.proname in ('card_phone_locations', 'card_link_check', 'card_link_whatsapp',
              'card_label_whatsapp', 'card_taps_weeks', 'card_list_whatsapp')
              and not coalesce(p.proconfig, '{}') @> array['search_path=""']), 0, 'every Cards 2 function has an empty search_path');

-- ─── "Link card CODE" ────────────────────────────────────────────────────────────────────────────────────────────
select is(public.card_link_check('+447700900401', 'car2aa') ->> 'result', 'ask', 'an owner with businesses is asked (code read in any case)');
select is(public.card_link_check('+447700900499', 'CAR2AA') ->> 'result', 'signup', 'an unknown phone is sent to sign up');
select is(public.card_link_check('+447700900401', 'CAR2CC') ->> 'result', 'unknown', 'a card of another business reads as unknown');
select ok(public.card_link_check('+447700900401', 'CAR2CC') ->> 'location_id' is null, 'and its business is never named');
select is(public.card_link_check('+447700900402', 'CAR2CC') ->> 'result', 'already', 'its own owner sees it is already linked');
select is(public.card_link_check('+447700900401', 'CAR2DD') ->> 'result', 'disabled', 'a card switched off says so');
select is(public.card_link_check('+447700900401', 'CAR2LK') ->> 'result', 'unknown', 'a review link is not a card');
select is(public.card_link_check('+447700900401', 'ABC') ->> 'result', 'unknown', 'a malformed code is unknown');

-- The tap: only to one of the phone's own businesses.
select is(public.card_link_whatsapp('+447700900401', 'CAR2AA', '00000000-0000-4000-8000-0000000040b3') ->> 'result', 'unknown',
  'a button naming another business is refused');
select is((select status from public.cards where code = 'CAR2AA'), 'unassigned', 'and the card is unchanged');
select is(public.card_link_whatsapp('+447700900402', 'CAR2CC', '00000000-0000-4000-8000-0000000040b3') ->> 'result', 'linked',
  'linking again to the same business is fine');
select is(public.card_link_whatsapp('+447700900401', 'CAR2CC', '00000000-0000-4000-8000-0000000040b1') ->> 'result', 'unknown',
  'a card linked elsewhere is never moved by another phone');
select is((select location_id from public.cards where code = 'CAR2CC'), '00000000-0000-4000-8000-0000000040b3'::uuid, 'it stays with its business');
select is(public.card_link_whatsapp('+447700900401', 'CAR2AA', '00000000-0000-4000-8000-0000000040b2') ->> 'result', 'linked', 'the owner links it');
select is((select row(status, location_id, destination)::text from public.cards where code = 'CAR2AA'),
  row('active', '00000000-0000-4000-8000-0000000040b2'::uuid, 'https://search.google.com/local/writereview?placeid=place-card-a2')::text,
  'active, for that business, to its Google review form');
select ok(exists (select 1 from public.audit_events a where a.action = 'card_linked' and a.object_id = 'CAR2AA'), 'the link is in the audit log');

-- ─── the label ───────────────────────────────────────────────────────────────────────────────────────────────────
select is(public.card_label_whatsapp('+447700900401', 'CAR2AA', '  Front   desk ') ->> 'label', 'Front desk', 'a label is trimmed');
select is((select label from public.cards where code = 'CAR2AA'), 'Front desk', 'and saved');
select is(public.card_label_whatsapp('+447700900401', 'CAR2AA', 'x') ->> 'result', 'bad_label', 'one letter is not a label');
select is(public.card_label_whatsapp('+447700900401', 'CAR2AA', repeat('a', 31)) ->> 'result', 'bad_label', 'over 30 is not a label');
select is(public.card_label_whatsapp('+447700900401', 'CAR2CC', 'Bar') ->> 'result', 'unknown', 'another business''s card cannot be labelled');
select is((select label from public.cards where code = 'CAR2CC'), 'Till', 'its label is unchanged');

-- ─── taps per card ───────────────────────────────────────────────────────────────────────────────────────────────
insert into public.taps (code, location_id, source, is_bot, created_at) values
  ('CAR2CC', '00000000-0000-4000-8000-0000000040b3', 'nfc', false, '2026-11-10 09:00+00'),
  ('CAR2CC', '00000000-0000-4000-8000-0000000040b3', 'qr', false, '2026-11-15 23:30+00'),
  ('CAR2CC', '00000000-0000-4000-8000-0000000040b3', 'nfc', true, '2026-11-11 10:00+00'),   -- a bot
  ('CAR2CC', '00000000-0000-4000-8000-0000000040b3', 'nfc', false, '2026-11-04 10:00+00'),  -- the week before
  ('CAR2CC', '00000000-0000-4000-8000-0000000040b1', 'nfc', false, '2026-11-11 10:00+00'),  -- logged for another business
  ('CAR2CC', '00000000-0000-4000-8000-0000000040b3', 'nfc', false, '2026-11-17 00:30+00');  -- next week
select is(public.card_taps_weeks('00000000-0000-4000-8000-0000000040b3', '2026-11-09'),
  '[{"code": "CAR2CC", "label": "Till", "this_week": 2, "last_week": 1}]'::jsonb,
  'this week and last week, bots and other businesses left out');
select is(public.card_taps_weeks('00000000-0000-4000-8000-0000000040b1', '2026-11-09'), '[]'::jsonb, 'a business with no card has an empty list');
select is(public.card_list_whatsapp('+447700900401', '00000000-0000-4000-8000-0000000040b3') ->> 'result', 'unknown',
  '"cards" never lists another business''s cards');
select is(public.card_list_whatsapp('+447700900401', '00000000-0000-4000-8000-0000000040b2') -> 'cards' -> 0 ->> 'label', 'Front desk',
  '"cards" lists the phone''s own business');

-- ─── refused codes are limited per phone ─────────────────────────────────────────────────────────────────────────
select public.card_link_check('+447700900403', 'ZZZZZ' || n::text) from generate_series(2, 9) n;
select public.card_link_check('+447700900403', 'ZZZZZA'), public.card_link_check('+447700900403', 'ZZZZZB');
select is(public.card_link_check('+447700900403', 'CAR2BB') ->> 'result', 'limited', 'ten refused codes in an hour stop the phone');
select is(public.card_link_check('+447700900401', 'CAR2BB') ->> 'result', 'ask', 'another phone is not affected');

select * from finish();
rollback;
