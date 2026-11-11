-- Cards 2, partner side (master plan 30.50 item 9): partners mint card links within their limit (200 to start); only their
-- own unclaimed cards take a business (the Google Place ID only), 50 businesses set a day; the partner sees taps only until
-- an owner claims the card; a partner card whose business is set links only to a business at the same Google place (on
-- WhatsApp and on the web); an unknown phone that sends a partner card's code gets the partner's code and the WhatsApp
-- touch is noted for attribution; browsers run none of the new functions; a partner's card never sees another business.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000050d1'::uuid, 'seller-a@example.test'),
             ('00000000-0000-4000-8000-0000000050d2'::uuid, 'seller-b@example.test'),
             ('00000000-0000-4000-8000-0000000050d3'::uuid, 'card-owner@example.test')) as u(id, email);
create function pg_temp.join(p_user uuid, p_email text) returns jsonb language sql as $$
  select public.partner_join(p_user, jsonb_build_object('name', 'Seller ' || p_email, 'email', p_email, 'kind', 'card_seller', 'country', 'GB',
    'reach', 'The review cards I sell', 'terms_version', '2026-11-10.2')) $$;
select pg_temp.join('00000000-0000-4000-8000-0000000050d1', 'seller-a@example.test');
select pg_temp.join('00000000-0000-4000-8000-0000000050d2', 'seller-b@example.test');
create function pg_temp.pid(p_user uuid) returns uuid language sql as $$ select id from public.partner_accounts where user_id = p_user $$;
create function pg_temp.pcode(p_user uuid) returns text language sql as $$ select code from public.partner_accounts where user_id = p_user $$;
create function pg_temp.cards(p_user uuid) returns text[] language sql as $$
  select array_agg(code order by code) from public.cards where partner_id = pg_temp.pid(p_user) $$;

-- The owner of a real business (place ChIJcardowner01) with WhatsApp.
insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
values ('00000000-0000-4000-8000-0000000050b1', 'Card Owner Cafe', 'ChIJcardowner01', '00000000-0000-4000-8000-0000000050d3', 'Europe/London', 'self');
insert into public.location_members (location_id, user_id, role) values ('00000000-0000-4000-8000-0000000050b1', '00000000-0000-4000-8000-0000000050d3', 'owner');
insert into public.phone_roles (phone, role, user_id, location_id, source)
values ('+447700900501', 'owner', '00000000-0000-4000-8000-0000000050d3', '00000000-0000-4000-8000-0000000050b1', 'membership') on conflict do nothing;

-- ─── access rules ────────────────────────────────────────────────────────────────────────────────────────────────
select ok(not has_function_privilege(r, f, 'execute'), r || ' cannot run ' || f)
from unnest(array['anon', 'authenticated']) r,
     unnest(array['public.partner_cards(uuid)', 'public.partner_cards_mint(uuid,integer)', 'public.partner_cards_place(uuid,text[],text)',
                  'public.card_link_check(text,text)', 'public.card_link_whatsapp(text,text,uuid)']) f;
select ok(has_function_privilege('authenticated', 'public.activate_card(text,uuid,text)', 'execute'), 'the activate page still runs activate_card');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('partner_cards', 'partner_cards_mint', 'partner_cards_place', 'card_link_check',
              'card_link_whatsapp', 'activate_card')
              and not coalesce(p.proconfig, '{}') @> array['search_path=""']), 0, 'every function here has an empty search_path');

-- ─── minting ─────────────────────────────────────────────────────────────────────────────────────────────────────
select is((public.partner_cards('00000000-0000-4000-8000-0000000050d1') ->> 'limit')::int, 200, '200 card links to start');
select is(public.partner_cards_mint('00000000-0000-4000-8000-0000000050d3', 10) ->> 'result', 'not_partner', 'only a partner mints');
select is(public.partner_cards_mint('00000000-0000-4000-8000-0000000050d1', 51) ->> 'result', 'bad_count', 'at most 50 at a time');
select is(jsonb_array_length(public.partner_cards_mint('00000000-0000-4000-8000-0000000050d1', 10) -> 'codes'), 10, 'a batch of 10');
select is((select count(*)::int from public.cards where partner_id = pg_temp.pid('00000000-0000-4000-8000-0000000050d1')
            and kind = 'card' and status = 'unassigned' and location_id is null and destination is null and code ~ '^[2-9A-HJKMNP-Z]{6}$'), 10,
  'each a new, unclaimed card with a card code, carrying the partner');
update public.partner_accounts set card_limit = 12 where user_id = '00000000-0000-4000-8000-0000000050d1';
select is(public.partner_cards_mint('00000000-0000-4000-8000-0000000050d1', 3), '{"result": "over_limit", "left": 2, "limit": 12}'::jsonb,
  'the limit holds until staff raise it');
update public.partner_accounts set status = 'paused' where user_id = '00000000-0000-4000-8000-0000000050d2';
select is(public.partner_cards_mint('00000000-0000-4000-8000-0000000050d2', 1) ->> 'result', 'not_active', 'a paused partner mints none');
update public.partner_accounts set status = 'approved' where user_id = '00000000-0000-4000-8000-0000000050d2';
select public.partner_cards_mint('00000000-0000-4000-8000-0000000050d2', 1);

-- ─── the business of a card ──────────────────────────────────────────────────────────────────────────────────────
select is(public.partner_cards_place('00000000-0000-4000-8000-0000000050d1', (pg_temp.cards('00000000-0000-4000-8000-0000000050d1'))[1:2],
  'ChIJcardowner01') ->> 'count', '2', 'two cards set for one business');
select is((select destination from public.cards where code = (pg_temp.cards('00000000-0000-4000-8000-0000000050d1'))[1]),
  'https://search.google.com/local/writereview?placeid=ChIJcardowner01', 'straight to that business''s Google review form');
select is((select status from public.cards where code = (pg_temp.cards('00000000-0000-4000-8000-0000000050d1'))[1]), 'unassigned',
  'still unclaimed: no business in Kabsi');
select is(public.partner_cards_place('00000000-0000-4000-8000-0000000050d2', pg_temp.cards('00000000-0000-4000-8000-0000000050d1'),
  'ChIJsomeoneelse') ->> 'count', '0', 'another partner''s cards are never set');
select is(public.partner_cards_place('00000000-0000-4000-8000-0000000050d1', (pg_temp.cards('00000000-0000-4000-8000-0000000050d1'))[3:3],
  'not a place') ->> 'result', 'bad_request', 'only a Place ID');
insert into public.rate_limits (key, window_start, hits) values ('partner_card_place:' || pg_temp.pid('00000000-0000-4000-8000-0000000050d2'), now(), 50)
on conflict (key) do update set hits = 50, window_start = now();
select is(public.partner_cards_place('00000000-0000-4000-8000-0000000050d2', pg_temp.cards('00000000-0000-4000-8000-0000000050d2'),
  'ChIJsomeoneelse') ->> 'result', 'limited', '50 businesses set a day per partner');

-- ─── claiming ────────────────────────────────────────────────────────────────────────────────────────────────────
create function pg_temp.c(n int) returns text language sql as $$ select (pg_temp.cards('00000000-0000-4000-8000-0000000050d1'))[n] $$;
-- An unknown phone: the partner's code for its sign-up link, and the WhatsApp touch is noted.
select is(public.card_link_check('+447700900599', pg_temp.c(1)),
  jsonb_build_object('result', 'signup', 'partner_code', pg_temp.pcode('00000000-0000-4000-8000-0000000050d1')), 'sign up through the partner');
select is((select partner_code from public.whatsapp_conversations where phone = '+447700900599'), pg_temp.pcode('00000000-0000-4000-8000-0000000050d1'),
  'the touch Partners 2''s attribution reads');
select is(public.card_link_check('+447700900598', pg_temp.c(3)) ->> 'partner_code', pg_temp.pcode('00000000-0000-4000-8000-0000000050d1'),
  'a card with no business yet still carries the partner');
-- The owner at the same place is asked about that business only.
select is(public.card_link_check('+447700900501', pg_temp.c(1)),
  '{"result": "ask", "only": ["00000000-0000-4000-8000-0000000050b1"]}'::jsonb, 'the owner at that place is asked');
update public.cards set place_id = 'ChIJotherplace1', destination = 'https://search.google.com/local/writereview?placeid=ChIJotherplace1'
 where code = pg_temp.c(2);
select is(public.card_link_check('+447700900501', pg_temp.c(2)) ->> 'result', 'other_business', 'a card set for another place is refused');
select is(public.card_link_whatsapp('+447700900501', pg_temp.c(2), '00000000-0000-4000-8000-0000000050b1') ->> 'result', 'other_business',
  'and cannot be linked by a button');
select is((select location_id from public.cards where code = pg_temp.c(2)), null, 'it stays unclaimed');
-- The web: the same rule.
select tests.act_as('00000000-0000-4000-8000-0000000050d3');
select is(public.activate_card(pg_temp.c(2), '00000000-0000-4000-8000-0000000050b1'), 'card_in_use', 'the activate page refuses another place');
reset role;
select is(public.card_link_whatsapp('+447700900501', pg_temp.c(1), '00000000-0000-4000-8000-0000000050b1') ->> 'result', 'linked',
  'the owner at that place links it');
select is((select row(status, location_id)::text from public.cards where code = pg_temp.c(1)),
  row('active', '00000000-0000-4000-8000-0000000050b1'::uuid)::text, 'now the business''s card');
select tests.act_as('00000000-0000-4000-8000-0000000050d3');
select ok(public.activate_card(pg_temp.c(4), '00000000-0000-4000-8000-0000000050b1') like 'https://%', 'a card with no business set links on the web');
reset role;

-- ─── what the partner sees ───────────────────────────────────────────────────────────────────────────────────────
insert into public.taps (code, location_id, source, is_bot) values
  (pg_temp.c(3), null, 'nfc', false), (pg_temp.c(3), null, 'qr', false), (pg_temp.c(3), null, 'nfc', true),
  (pg_temp.c(1), null, 'nfc', false), (pg_temp.c(1), '00000000-0000-4000-8000-0000000050b1', 'nfc', false);
select is((select e ->> 'taps' from jsonb_array_elements(public.partner_cards('00000000-0000-4000-8000-0000000050d1') -> 'cards') e
            where e ->> 'code' = pg_temp.c(3)), '2', 'taps on an unclaimed card, bots left out');
select is((select e ->> 'state' from jsonb_array_elements(public.partner_cards('00000000-0000-4000-8000-0000000050d1') -> 'cards') e
            where e ->> 'code' = pg_temp.c(1)), 'claimed', 'a claimed card shows as claimed');
select is((select e ->> 'taps' from jsonb_array_elements(public.partner_cards('00000000-0000-4000-8000-0000000050d1') -> 'cards') e
            where e ->> 'code' = pg_temp.c(1)), '1', 'only the taps before the claim; the business''s taps are never the partner''s');
select is((select e -> 'destination' from jsonb_array_elements(public.partner_cards('00000000-0000-4000-8000-0000000050d1') -> 'cards') e
            where e ->> 'code' = pg_temp.c(1)), 'null'::jsonb, 'nor its destination');
select is(public.partner_cards('00000000-0000-4000-8000-0000000050d3') ->> 'result', 'not_partner', 'an owner is not a partner');

select * from finish();
rollback;
