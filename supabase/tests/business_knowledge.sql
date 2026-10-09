-- P0.2-03: Business Knowledge facts and the owner-approved baseline (K-10, K-18, K-20, A2, A5). The card is copied
-- as verified owner facts and follows every later edit as a new version; baselines arrive as not yet confirmed; only
-- the signed-in owner confirms details; a newer change supersedes the open one (never "kept"); a change nobody answers
-- in 14 days expires; Google's values in both tables follow K-40; members read their own rows only.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1, owner A ..a1) with a full card and a manager M (..b4). A demo business DC (..c9).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated',
        'victim-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'manager');
insert into public.locations (id, name, place_id, is_demo) values ('00000000-0000-4000-8000-0000000000c9', 'Demo Cafe', 'demo-bk', true);

-- The browser reads, never writes -----------------------------------------------------------------------------------

select ok(not has_table_privilege('authenticated', 'public.knowledge_facts', 'insert')
  and not has_table_privilege('authenticated', 'public.knowledge_facts', 'update')
  and not has_table_privilege('authenticated', 'public.knowledge_facts', 'delete'), 'the browser cannot write knowledge_facts');
select ok(not has_table_privilege('authenticated', 'public.profile_changes', 'insert')
  and not has_table_privilege('authenticated', 'public.profile_changes', 'update')
  and not has_table_privilege('authenticated', 'public.profile_changes', 'delete'), 'the browser cannot write profile_changes');
select ok(not has_table_privilege('anon', 'public.knowledge_facts', 'select')
  and not has_table_privilege('anon', 'public.profile_changes', 'select'), 'anon cannot read either table');
select ok(not has_function_privilege('anon', 'public.confirm_business_details(uuid,jsonb)', 'execute'), 'anon cannot confirm details');
select ok(not has_function_privilege('authenticated', 'private.profile_daily()', 'execute')
  and not has_function_privilege('authenticated', 'private.sync_card_facts(uuid,uuid)', 'execute'), 'the daily job and the sync are closed to the browser');

-- K-10: the card becomes verified owner facts, row counts match per key -------------------------------------------

update public.locations set knowledge_card = jsonb_build_object(
  'about', 'Family bakery since 1990', 'services', 'Bread, cakes', 'price_notes', 'Cakes from $20', 'tone', 'warm',
  'tone_notes', 'Keep it short', 'signature', 'The Victim team', 'signature_ar', 'فريق', 'contact_phone', '+961 1 000 000',
  'hours_note', 'Closed on holidays', 'parking', '', 'wifi', 'Free', 'delivery', true, 'mention', 'Fresh every morning',
  'avoid', 'Discounts', 'staff_names', '["Rami", "Lina", "Rami"]'::jsonb, 'faqs', '[]'::jsonb,
  'custom_rules', '["Allergies go to the owner"]'::jsonb)
 where id = '00000000-0000-4000-8000-0000000000c1';

create temp table expected (card_key text primary key, n int);
insert into expected values ('about', 1), ('services', 1), ('price_notes', 1), ('tone', 1), ('tone_notes', 1),
  ('signature', 1), ('signature_ar', 1), ('contact_phone', 1), ('hours_note', 1), ('wifi', 1), ('delivery', 1),
  ('mention', 1), ('avoid', 1), ('staff_names', 2), ('custom_rules', 1);
select is(
  (select coalesce(array_agg(substr(f.source_ref, 16) || '=' || f.n order by f.source_ref), '{}') from (
     select source_ref, count(*) n from public.knowledge_facts
      where location_id = '00000000-0000-4000-8000-0000000000c1' and slot like 'card.%' and superseded_by is null
        and status = 'verified' group by 1) f),
  (select array_agg(card_key || '=' || n order by card_key) from expected),
  'every card value is one current fact (lists: one per distinct item; empty values none)');
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot like 'card.%' and superseded_by is null and (status <> 'verified' or source <> 'owner')), 0,
  'card facts are verified, source owner');
select is((select key from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.about'),
  'description', 'about is the description');
select is((select value from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.contact_phone'),
  '{"kind": "phone", "text": "+961 1 000 000"}'::jsonb, 'the contact phone is a contact fact');
select is((select uses from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.contact_phone'),
  '{}'::text[], 'the contact phone is never used in a reply or a post (K-113)');
select ok((select review_after::date = (now() + interval '90 days')::date from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.price_notes'), 'prices are asked again after 90 days');
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and key = 'staff_member' and review_after::date = (now() + interval '180 days')::date), 2, 'staff after 180 days');
select ok((select review_after::date = (now() + interval '60 days')::date from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.hours_note'), 'hours notes after 60 days');

-- A later edit is a new version; the old one stays for the audit trail; a removed value is outdated.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.update_knowledge_card('00000000-0000-4000-8000-0000000000c1',
  (select knowledge_card || '{"about": "Family bakery since 1985", "tone_notes": "", "staff_names": ["Lina", "Rami"]}'::jsonb
     from public.locations where id = '00000000-0000-4000-8000-0000000000c1'));
reset role;
select is((select array_agg(version || ':' || (value ->> 'text') || ':' || (superseded_by is null) order by version)
             from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.about'),
  array['1:Family bakery since 1990:false', '2:Family bakery since 1985:true'], 'a changed value is version 2, version 1 is kept');
select is((select confirmed_by from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'card.about' and superseded_by is null), '00000000-0000-4000-8000-0000000000a1'::uuid, 'confirmed by the owner who saved it');
select is((select status from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'card.tone_notes'),
  'outdated', 'a value removed from the card is outdated');
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and key = 'staff_member'),
  2, 'a new order of the same names is not a change');

-- K-18 and A2: baselines are not yet confirmed ---------------------------------------------------------------------

-- The migration copied the baselines that existed then; here the rule is shown on its statement, on LA's baseline.
update public.listing_baselines set updated_by = 'system', updated_at = now() - interval '20 days',
  fields = '{"title": {"display": "Victim Bakery", "raw": "Victim Bakery"}, "phone": {"display": "+961 1 111 111", "raw": "+961 1 111 111"},
             "hours": {"display": "Mon to Sat 7:00 to 19:00", "raw": {}}, "website": {"display": "", "raw": null}}'
 where location_id = '00000000-0000-4000-8000-0000000000c1';
insert into public.knowledge_facts (location_id, slot, key, value, status, source, source_ref, uses, created_at, updated_at)
select b.location_id, 'profile.' || private.profile_key(f.k), private.profile_key(f.k), f.v, 'needs_confirmation', 'google',
       'listing_baselines.' || f.k || ' (' || b.updated_by || ')', array['profile'], b.updated_at, b.updated_at
  from public.listing_baselines b cross join lateral jsonb_each(b.fields) as f(k, v)
 where b.location_id = '00000000-0000-4000-8000-0000000000c1'
   and f.k in ('title', 'phone', 'address', 'website', 'hours', 'categories')
   and jsonb_typeof(f.v) = 'object' and nullif(btrim(f.v ->> 'display'), '') is not null;
select is((select array_agg(key || ':' || status || ':' || source order by key) from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot like 'profile.%'),
  array['name:needs_confirmation:google', 'phone:needs_confirmation:google', 'regular_hours:needs_confirmation:google'],
  'baseline values arrive as not yet confirmed, source google; an empty value gives no fact');
select throws_ok($$ insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_at)
                    values ('00000000-0000-4000-8000-0000000000c1', 'card.x', 'faq', '{}', 'verified', 'ai_suggestion', now()) $$,
  '23514', null, 'an AI suggestion cannot be verified without a person (K-11)');
select throws_ok($$ insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_at)
                    values ('00000000-0000-4000-8000-0000000000c1', 'card.about', 'description', '{}', 'verified', 'owner', now()) $$,
  '23505', null, 'one current fact per slot');

-- K-18: confirm your details -----------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": {"display": "+961 1 222 222"}}') $$,
  '42501', 'sign_in_required', 'without a signed-in user nothing is confirmed (an email link has no user)');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": {"display": "+961 1 222 222"}}') $$,
  '42501', null, 'a manager cannot confirm');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a2');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": {"display": "+961 1 222 222"}}') $$,
  '42501', null, 'the partner cannot confirm');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": {"display": "+961 1 222 222"}}') $$,
  '42501', null, 'the owner of another business cannot confirm');
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"slogan": {"display": "Best"}}') $$,
  'P0001', 'unknown detail: slogan', 'only the K-18 details');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": "+961 1"}') $$,
  'P0001', 'phone: display text is required', 'each detail carries the text the owner saw');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"website": {"display": "victim.example"}}') $$,
  'P0001', 'website: must start with https://', 'a website is an address');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"open_status": {"display": "Shut"}}') $$,
  'P0001', null, 'open status is one of Google''s three');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{}') $$,
  'P0001', null, 'nothing to confirm is refused');
select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1',
  '{"phone": {"display": "+961 1 222 222", "raw": "+961 1 222 222"}, "website": {"display": "https://victim.example"},
    "open_status": {"display": "Open", "raw": "OPEN"}, "main_category": {"display": "Bakery", "raw": "gcid:bakery"}}');
reset role;
select is((select array_agg(key || ':' || status || ':' || source || ':' || version order by key) from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot like 'profile.%' and superseded_by is null),
  array['main_category:verified:owner:1', 'name:needs_confirmation:google:1', 'open_status:verified:owner:1',
        'phone:verified:owner:2', 'regular_hours:needs_confirmation:google:1', 'website:verified:owner:1'],
  'confirmed details are verified owner facts; the Google value they replace is version 1; the rest stay unconfirmed');
select is((select confirmed_by from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'profile.phone' and superseded_by is null), '00000000-0000-4000-8000-0000000000a1'::uuid, 'confirmed by the owner');
select is((select value from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'profile.phone' and version = 1), '{"display": "+961 1 111 111", "raw": "+961 1 111 111"}'::jsonb,
  'the Google value stays as the older version');
select is((select count(*)::int from public.audit_events where action = 'details_confirmed'
            and location_id = '00000000-0000-4000-8000-0000000000c1' and actor_id = '00000000-0000-4000-8000-0000000000a1'
            and after -> 'changed' @> '["main_category", "open_status", "phone", "website"]'::jsonb
            and jsonb_array_length(after -> 'changed') = 4), 1, 'one audit event names the details');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": {"display": "+961 1 222 222", "raw": "+961 1 222 222"}}');
reset role;
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'profile.phone'),
  2, 'confirming the same value again only re-dates it');

-- RLS: members read their own facts and changes ----------------------------------------------------------------------

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select ok((select count(*) from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1') > 10,
  'the owner reads the business''s facts');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select ok((select count(*) from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1') > 10,
  'a manager reads them too');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'), 0,
  'the owner of another business reads none');
select is((select count(*)::int from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'), 0,
  'and none of its changes');
select throws_ok($$ update public.knowledge_facts set status = 'verified' $$, '42501', null, 'and cannot write');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ insert into public.profile_changes (location_id, field, source, severity)
                    values ('00000000-0000-4000-8000-0000000000c1', 'phone', 'scheduled_check', 'urgent') $$,
  '42501', null, 'even the owner cannot write a change from the browser');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select ok((select count(*) from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1') >= 1,
  'staff read the changes');
reset role;

-- K-20 and A5: profile changes ---------------------------------------------------------------------------------------

select is((select row(c.field, c.status, c.severity, c.source)::text from public.profile_changes c
            join public.listing_changes l on l.id = c.listing_change_id
           where l.location_id = '00000000-0000-4000-8000-0000000000c1' and l.field = 'phone' and l.state = 'open'),
  row('phone', 'awaiting_review', 'urgent', 'scheduled_check')::text, 'every change the detector writes is mirrored');

insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by) values
  ('00000000-0000-4000-8000-0000000007c1', '00000000-0000-4000-8000-0000000000c1', 'phone',
   '{"display": "+961 1 222 222", "raw": "+961 1 222 222"}', '{"display": "+961 1 333 333", "raw": "+961 1 333 333"}', 'scheduled_check');
insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by) values
  ('00000000-0000-4000-8000-0000000007c2', '00000000-0000-4000-8000-0000000000c1', 'phone',
   '{"display": "+961 1 222 222", "raw": "+961 1 222 222"}', '{"display": "+961 1 444 444", "raw": "+961 1 444 444"}', 'pubsub');
select is((select state from public.listing_changes where id = '00000000-0000-4000-8000-0000000007c1'), 'superseded',
  'a newer change to the same field supersedes the open one, it is not kept (A5)');
select is((select row(status, decided_by, decided_at)::text from public.profile_changes
            where listing_change_id = '00000000-0000-4000-8000-0000000007c1'), row('superseded', null::uuid, null::timestamptz)::text,
  'the profile change is superseded, with no decision recorded');
select is((select superseded_by from public.profile_changes where listing_change_id = '00000000-0000-4000-8000-0000000007c1'),
  (select id from public.profile_changes where listing_change_id = '00000000-0000-4000-8000-0000000007c2'), 'and points to the newer one');
select is((select count(*)::int from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
            and field = 'phone' and status in ('detected', 'awaiting_review')), 1, 'one open change per field');
select is((select row(source, previous_fact_id is not null)::text from public.profile_changes
            where listing_change_id = '00000000-0000-4000-8000-0000000007c2'), row('notification', true)::text,
  'the previous value is the owner''s confirmed fact when it matches');
insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by) values
  ('00000000-0000-4000-8000-0000000007c3', '00000000-0000-4000-8000-0000000000c1', 'title',
   '{"display": "Victim Bakery", "raw": "Victim Bakery"}', '{"display": "Victim Bakery Beirut", "raw": "Victim Bakery Beirut"}', 'scheduled_check');
select is((select row(field, severity, previous_fact_id)::text from public.profile_changes
            where listing_change_id = '00000000-0000-4000-8000-0000000007c3'), row('name', 'recommended', null::uuid)::text,
  'a field the owner never confirmed has no approved value ("Not yet confirmed by you")');

-- The owner keeps Google's value: accepted, with who decided.
update public.listing_changes set state = 'kept', decided_at = now(), decided_by = '00000000-0000-4000-8000-0000000000a1'
 where id = '00000000-0000-4000-8000-0000000007c3';
select is((select row(status, decided_by)::text from public.profile_changes where listing_change_id = '00000000-0000-4000-8000-0000000007c3'),
  row('accepted', '00000000-0000-4000-8000-0000000000a1'::uuid)::text, 'keep is accepted, decided by the owner');

-- The owner keeps their information: rejected with the put-back publication, then corrected or failed.
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel) values
  ('00000000-0000-4000-8000-0000000007d2', '00000000-0000-4000-8000-0000000000c1', 'listing_revert',
   '00000000-0000-4000-8000-0000000007c2', '{}', '00000000-0000-4000-8000-0000000000a1', 'dashboard');
update public.listing_changes set state = 'reverting', decided_at = now() where id = '00000000-0000-4000-8000-0000000007c2';
select is((select row(status, decided_by, publication_id)::text from public.profile_changes where listing_change_id = '00000000-0000-4000-8000-0000000007c2'),
  row('rejected', '00000000-0000-4000-8000-0000000000a1'::uuid, '00000000-0000-4000-8000-0000000007d2'::uuid)::text,
  'keep my information is rejected, with the approval and its publication');
update public.listing_changes set state = 'open', decided_at = null where id = '00000000-0000-4000-8000-0000000007c2';
select is((select row(status, decided_by, decided_at)::text from public.profile_changes where listing_change_id = '00000000-0000-4000-8000-0000000007c2'),
  row('awaiting_review', null::uuid, null::timestamptz)::text, 'a cancelled put-back (disconnect, undo) is back with the owner');
update public.listing_changes set state = 'reverting', decided_at = now() where id = '00000000-0000-4000-8000-0000000007c2';
update public.listing_changes set state = 'revert_failed', decided_at = now() where id = '00000000-0000-4000-8000-0000000007c2';
select is((select status from public.profile_changes where listing_change_id = '00000000-0000-4000-8000-0000000007c2'), 'failed',
  'a put-back Google did not take is failed');

-- K-20: no answer in 14 days is expired (not on a demo business) --------------------------------------------------------

insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by, created_at) values
  ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000000c1', 'website', '{"display": "https://victim.example"}',
   '{"display": "https://other.example"}', 'scheduled_check', now() - interval '15 days'),
  ('00000000-0000-4000-8000-0000000007e2', '00000000-0000-4000-8000-0000000000c1', 'address', '{"display": "Hamra"}',
   '{"display": "Verdun"}', 'scheduled_check', now() - interval '13 days'),
  ('00000000-0000-4000-8000-0000000007e3', '00000000-0000-4000-8000-0000000000c9', 'hours', '{"display": "9 to 5"}',
   '{"display": "9 to 3"}', 'scheduled_check', now() - interval '20 days');
insert into public.profile_changes (id, location_id, field, google_value, source, detected_at, severity, status) values
  ('00000000-0000-4000-8000-0000000007e4', '00000000-0000-4000-8000-0000000000c1', 'open_status', '"CLOSED_PERMANENTLY"',
   'google_update', now() - interval '15 days', 'urgent', 'awaiting_review');
select is(private.profile_daily() ->> 'expired', '2', 'the daily job expires the two changes older than 14 days');
select is((select array_agg(l.field || ':' || l.state || ':' || c.status order by l.field) from public.listing_changes l
            join public.profile_changes c on c.listing_change_id = l.id
           where l.id in ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007e2', '00000000-0000-4000-8000-0000000007e3')),
  array['address:open:awaiting_review', 'hours:open:awaiting_review', 'website:expired:expired'],
  '15 days expired, 13 days still waiting, a demo change stays for recordings');
select is((select row(status, decided_at)::text from public.profile_changes where id = '00000000-0000-4000-8000-0000000007e4'),
  row('expired', null::timestamptz)::text, 'a change written directly to profile_changes expires too, with no decision');

-- K-40: Google's values 30 days, the owner's for life ------------------------------------------------------------------

update public.knowledge_facts set created_at = now() - interval '31 days'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and slot in ('profile.name', 'profile.phone', 'card.about');
update public.knowledge_facts set created_at = now() - interval '29 days'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'profile.regular_hours';
update public.profile_changes set detected_at = now() - interval '31 days'
 where listing_change_id in ('00000000-0000-4000-8000-0000000007c1', '00000000-0000-4000-8000-0000000007c2', '00000000-0000-4000-8000-0000000007c3');
update public.profile_changes set detected_at = now() - interval '31 days' where listing_change_id = (
  select id from public.listing_changes where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'address' and state = 'open');
select private.profile_daily();
select is((select array_agg(slot || ':' || status || ':' || (value is null) order by slot, version) from public.knowledge_facts
            where location_id = '00000000-0000-4000-8000-0000000000c1' and slot in ('profile.name', 'profile.phone', 'profile.regular_hours', 'card.about')),
  array['card.about:verified:false', 'card.about:verified:false', 'profile.name:outdated:true', 'profile.phone:outdated:true',
        'profile.phone:verified:false', 'profile.regular_hours:needs_confirmation:false'],
  'Google values older than 30 days are cleared (an open one becomes outdated); 29 days and the owner''s values stay');
select is((select row(google_value, previous_value is not null, values_cleared_at is not null)::text from public.profile_changes
            where listing_change_id = '00000000-0000-4000-8000-0000000007c2'), row(null::jsonb, true, true)::text,
  'a decided change older than 30 days loses Google''s value and keeps the owner''s approved one');
select is((select row(google_value, previous_value)::text from public.profile_changes
            where listing_change_id = '00000000-0000-4000-8000-0000000007c3'), row(null::jsonb, null::jsonb)::text,
  'an unconfirmed previous value was Google''s, so it goes too');
select ok((select google_value is not null from public.profile_changes c join public.listing_changes l on l.id = c.listing_change_id
            where l.location_id = '00000000-0000-4000-8000-0000000000c1' and l.field = 'address' and l.state = 'open'),
  'a change still waiting for the owner keeps its values');

-- Access lost 30 days ago: every Google value of the business goes.
update public.knowledge_facts set created_at = now() where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'profile.regular_hours';
update public.locations set access_granted_at = null, access_lost_at = now() - interval '31 days', status = 'paused'
 where id = '00000000-0000-4000-8000-0000000000c1';
select private.profile_daily();
select is((select row(status, value)::text from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'profile.regular_hours'), row('outdated', null::jsonb)::text, 'after access is lost 30 days, Google facts are cleared');
select is((select count(*)::int from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
            and (google_value is not null or (previous_fact_id is null and previous_value is not null))), 0,
  'and every change keeps no Google value');
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and source = 'owner' and value is null), 0, 'the owner''s facts stay');

select * from finish();
rollback;
