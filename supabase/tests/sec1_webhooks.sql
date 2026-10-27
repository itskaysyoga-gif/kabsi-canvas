-- Sec 1 (master plan 25.7, 30.15 section 8): the database side of the webhooks. A repeated delivery is stored once
-- (Creem, Pub/Sub, Resend, Kapso), and an event that arrives out of order cannot undo a newer one. The Edge side
-- (signatures, replay windows, malformed and oversized bodies) is supabase/functions/_shared/sec1/webhooks.test.ts.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Duplicates are stored once.
insert into public.billing_events (provider, event_key, payment_status) values ('creem', 'evt_sec1_dup', 'subscription.active');
select throws_ok($$ insert into public.billing_events (provider, event_key, payment_status) values ('creem', 'evt_sec1_dup', 'subscription.active') $$,
  '23505', null, 'a Creem event id is stored once');
select col_is_unique('public', 'subscriptions', array['provider', 'provider_subscription_id'], 'one row per Creem subscription');
insert into public.google_events (message_id, type) values ('m-sec1-dup', 'NEW_REVIEW');
select throws_ok($$ insert into public.google_events (message_id, type) values ('m-sec1-dup', 'NEW_REVIEW') $$, '23505', null,
  'a Pub/Sub message is stored once');
insert into public.email_suppressions (address, scope, reason) values ('sec1@example.test', '*', 'bounce') on conflict do nothing;
insert into public.email_suppressions (address, scope, reason) values ('sec1@example.test', '*', 'bounce') on conflict do nothing;
select is((select count(*)::int from public.email_suppressions where address = 'sec1@example.test'), 1, 'a repeated bounce adds no row');
select isnt(public.enqueue_job('google_state_check', null, 'sec1:dedupe', '{}'::jsonb), null, 'the first offer of a job is taken');
select is(public.enqueue_job('google_state_check', null, 'sec1:dedupe', '{}'::jsonb), null, 'a repeated push offers nothing more');

-- Creem out of order: an older event never overwrites a newer one, whatever order the jobs write in.
insert into public.subscriptions (organization_id, plan, state, provider, provider_subscription_id, last_event_at)
select organization_id, 'pro', 'active', 'creem', 'sub_sec1', '2026-10-27 12:00Z' from public.locations
 where id = '00000000-0000-4000-8000-0000000000c2';
update public.subscriptions set state = 'cancelled', ended_at = now(), last_event_at = '2026-10-27 11:00Z'
 where provider_subscription_id = 'sub_sec1';
select is((select state || '/' || coalesce(ended_at::text, 'none') || '/' || last_event_at::text from public.subscriptions
            where provider_subscription_id = 'sub_sec1'),
  'active/none/' || ('2026-10-27 12:00Z'::timestamptz)::text, 'an older subscription.canceled after a newer subscription.active changes nothing');
update public.subscriptions set state = 'cancelled', ended_at = now(), last_event_at = '2026-10-27 13:00Z'
 where provider_subscription_id = 'sub_sec1';
select is((select state from public.subscriptions where provider_subscription_id = 'sub_sec1'), 'cancelled', 'a newer event applies');
update public.subscriptions set founding = true where provider_subscription_id = 'sub_sec1';
select is((select founding from public.subscriptions where provider_subscription_id = 'sub_sec1'), true,
  'a change that carries no event time is not blocked');

-- WhatsApp receipts out of order: read stays read.
insert into public.whatsapp_messages (direction, kind, phone, state, provider_id)
values ('out', 'text', '+15550003001', 'sent', 'wamid.out.sec1');
select is(public.whatsapp_status_update('wamid.out.sec1', 'read'), true, 'read is recorded');
select is(public.whatsapp_status_update('wamid.out.sec1', 'delivered'), false, 'a late delivered receipt changes nothing');
select is((select state from public.whatsapp_messages where provider_id = 'wamid.out.sec1'), 'read', 'the message stays read');
select is(public.whatsapp_status_update('wamid.out.sec1', 'failed'), true, 'failed still applies');
select throws_ok($$ select public.whatsapp_status_update('wamid.out.sec1', 'bad') $$, 'P0001', 'bad_state', 'an unknown state is refused');
select is(public.whatsapp_status_update('wamid.out.sec1', 'delivered', 'x'), false, 'an unknown or older receipt for a failed message changes nothing');

select * from finish();
rollback;
